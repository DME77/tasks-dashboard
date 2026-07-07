import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* ── Per-month sheet config ───────────────────────────────────────────────
 *  Key format: "YYYY-M"  (M is 0-indexed JS month, e.g. May=4, Jun=5)
 *  Add a new entry here whenever a new month's sheet is created.
 * ────────────────────────────────────────────────────────────────────────── */
interface MonthSheets {
  dlr: string | null;   // null = not available yet
  dpr: string | null;
  tabStyle?: "short" | "long"; // "short" = "01-Jun" (default), "long" = "01-June"
  /**
   * "v1" (May/Jun): night cols at [16,17,18]; expense row adds to supply total.
   * "v2" (Jul+):   night cols at [18,19,20] (Target/ShortFall inserted at 16,17);
   *                expense-summary row is already included in supply total — skip it.
   */
  sheetVersion?: "v1" | "v2";
}

const MONTH_SHEETS: Record<string, MonthSheets> = {
  "2026-4": {                                                    // May 2026
    dlr: "1PnmXsPlNtO_VTdgvutGyYJOTxQ5DYsIl6ufJuRfiVJM",       // ACC DLR May
    dpr: "1yzPpZR6HonSLlFk4c046AR5cgYtmD0UGhbO280FzoTk",
    tabStyle: "short",                                           // tabs: 01-May, 02-May …
  },
  "2026-5": {                                                    // June 2026
    dlr: "1czJph4BZLlVvxQKcDl8jeJ5WJgmANtF3SH2eRw34D10",       // ACC DLR June
    dpr: "1qP-l-KHQ394BExBGkiiTkVWOXOh4G_I63SNyPmDlhXU",
    tabStyle: "long",                                            // tabs: 01-June, 02-June …
  },
  "2026-6": {                                                    // July 2026
    dlr: "1md6Cw7SE7Wla_h6URUYVNk588D83zjlZ0X72dsGwaTo",       // ACC DLR July
    dpr: null,
    tabStyle: "long",                                            // tabs: 01-July, 02-July …
    sheetVersion: "v2",                                          // Target/ShortFall cols added
  },
};

/** Fallback — reuse May sheets so the page never breaks for unknown months */
const FALLBACK_SHEETS: MonthSheets = {
  dlr: "1PnmXsPlNtO_VTdgvutGyYJOTxQ5DYsIl6ufJuRfiVJM",
  dpr: "1yzPpZR6HonSLlFk4c046AR5cgYtmD0UGhbO280FzoTk",
};

function getSheetsForMonth(year: number, month: number): MonthSheets {
  return MONTH_SHEETS[`${year}-${month}`] ?? FALLBACK_SHEETS;
}

/* ── Types ───────────────────────────────────────────────────────────────── */

/**
 * One category row from the DLR sheet.
 * Column layout (0-indexed):
 *   [0] S.No.
 *   [1] Category  (Mason / Helper / SUP/FOR / COOK / From Local Chowk Labour / Fare)
 *   [2] Day Labour        — regular day worker count
 *   [3] Night Labour      — regular night worker count
 *   [4] Daily Expense     — ₹ for regular (day+night) workers
 *   [5] Day Supply Labour — supply day worker count
 *   [6] Night Supply Labour— supply night worker count
 *   [7] Supply Expense    — ₹ for supply (day+night) workers
 *   [8] Total Labour Category Wise — all workers combined
 *   [9] Total Amount      — all expense combined
 */
export interface CategoryBilling {
  srNo: number;
  category: string;
  dayLabour: number;
  nightLabour: number;
  dailyExpense: number;
  daySupply: number;
  nightSupply: number;
  supplyExpense: number;
  totalLabour: number;
  totalAmount: number;
}

export interface DailyBilling {
  date: string;
  rows: CategoryBilling[];
  totalDayLabour: number;
  totalNightLabour: number;
  totalDailyExpense: number;
  totalDaySupply: number;
  totalNightSupply: number;
  totalSupplyExpense: number;
  totalLabour: number;
  totalAmount: number;
}

export interface ActivityItem {
  name: string;
  unit: string;
  quantity: number;
}
export interface DailyDPR {
  date: string;
  activities: ActivityItem[];
}

/* ── Master DPR activity list — fixed order, all 14 items ────────────────── */
// Names must match exactly what parseDPR reads from the Google Sheet column B.
const MASTER_DPR_ACTIVITIES: { srNo: number; name: string; unit: string }[] = [
  { srNo: 1,  name: "Surface Dressing",                                   unit: "Sqm" },
  { srNo: 2,  name: "PCC Pour",                                            unit: "Cum" },
  { srNo: 3,  name: "Brickwork Pour",                                      unit: "Cum" },
  { srNo: 4,  name: "Water Proofing Membrane",                             unit: "Sqm" },
  { srNo: 5,  name: "Raft Reinforcement Works",                            unit: "MT"  },
  { srNo: 6,  name: "HY-Rib For Stopper",                                  unit: "RMT" },
  { srNo: 7,  name: "Footing & Raft Side Shuttering Works",                unit: "Sqm" },
  { srNo: 8,  name: "Raft Concrete",                                       unit: "Cum" },
  { srNo: 9,  name: "Column & Shear Wall Reinforcement Raft to B2 Level", unit: "MT"  },
  { srNo: 10, name: "Column & Shear Wall Shuttering Raft to B2 Level",    unit: "Sqm" },
  { srNo: 11, name: "Column & Shear Wall Concrete Raft to B2 Level",      unit: "Cum" },
  { srNo: 12, name: "Slab Shuttering B2 Level",                            unit: "Sqm" },
  { srNo: 13, name: "Slab Reinforcement B2 Level",                         unit: "MT"  },
  { srNo: 14, name: "Slab Concrete B2 Level",                              unit: "Cum" },
];

/* ── DPR fallback ────────────────────────────────────────────────────────── */
// Names updated to match the sheet exactly (same as MASTER_DPR_ACTIVITIES)
type ActRow = [string, string, number];

function dpr(date: string, acts: ActRow[]): DailyDPR {
  return {
    date,
    activities: acts.filter(([, , q]) => q > 0).map(([name, unit, quantity]) => ({ name, unit, quantity })),
  };
}

const DPR_FALLBACK: DailyDPR[] = [
  dpr("01-May", [["Raft Reinforcement Works", "MT", 12]]),
  dpr("02-May", [["Raft Reinforcement Works", "MT", 7]]),
  dpr("03-May", [["Raft Reinforcement Works", "MT", 4]]),
  dpr("04-May", [["Raft Reinforcement Works", "MT", 11], ["HY-Rib For Stopper", "RMT", 18]]),
  dpr("05-May", [["Raft Reinforcement Works", "MT", 8], ["Footing & Raft Side Shuttering Works", "Sqm", 55]]),
  dpr("06-May", [["Raft Concrete", "Cum", 727], ["Footing & Raft Side Shuttering Works", "Sqm", 10], ["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 1]]),
  dpr("07-May", [["Footing & Raft Side Shuttering Works", "Sqm", 28], ["Raft Concrete", "Cum", 739], ["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 3]]),
  dpr("08-May", [["Raft Reinforcement Works", "MT", 1], ["Footing & Raft Side Shuttering Works", "Sqm", 32], ["Raft Concrete", "Cum", 245], ["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 2]]),
  dpr("09-May", [["Footing & Raft Side Shuttering Works", "Sqm", 60], ["Raft Concrete", "Cum", 206], ["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 3]]),
  dpr("10-May", [["Footing & Raft Side Shuttering Works", "Sqm", 66], ["Column & Shear Wall Shuttering Raft to B2 Level", "Sqm", 12]]),
  dpr("11-May", [["Raft Reinforcement Works", "MT", 2], ["Footing & Raft Side Shuttering Works", "Sqm", 55], ["Raft Concrete", "Cum", 104], ["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 5.5], ["Column & Shear Wall Shuttering Raft to B2 Level", "Sqm", 12]]),
  dpr("12-May", [["Raft Reinforcement Works", "MT", 1.5], ["Footing & Raft Side Shuttering Works", "Sqm", 72], ["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 6]]),
  dpr("13-May", [["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 7], ["Column & Shear Wall Shuttering Raft to B2 Level", "Sqm", 22]]),
  dpr("14-May", [["Footing & Raft Side Shuttering Works", "Sqm", 42], ["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 2.5], ["Column & Shear Wall Shuttering Raft to B2 Level", "Sqm", 5], ["Column & Shear Wall Concrete Raft to B2 Level", "Cum", 19.2]]),
  dpr("15-May", [["Footing & Raft Side Shuttering Works", "Sqm", 48], ["Raft Concrete", "Cum", 62.5], ["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 6], ["Column & Shear Wall Shuttering Raft to B2 Level", "Sqm", 28.8]]),
  dpr("16-May", [["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 5], ["Column & Shear Wall Shuttering Raft to B2 Level", "Sqm", 26]]),
  dpr("17-May", [["Footing & Raft Side Shuttering Works", "Sqm", 36], ["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 4], ["Column & Shear Wall Concrete Raft to B2 Level", "Cum", 20]]),
  dpr("18-May", [["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 6], ["Column & Shear Wall Shuttering Raft to B2 Level", "Sqm", 62], ["Column & Shear Wall Concrete Raft to B2 Level", "Cum", 9]]),
  dpr("19-May", [["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 7], ["Column & Shear Wall Shuttering Raft to B2 Level", "Sqm", 40], ["Column & Shear Wall Concrete Raft to B2 Level", "Cum", 15]]),
  dpr("20-May", [["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 5], ["Column & Shear Wall Shuttering Raft to B2 Level", "Sqm", 52]]),
  dpr("21-May", [["Column & Shear Wall Reinforcement Raft to B2 Level", "MT", 7], ["Column & Shear Wall Shuttering Raft to B2 Level", "Sqm", 72], ["Slab Shuttering B2 Level", "Sqm", 60]]),
];

/* ── Date helpers ────────────────────────────────────────────────────────── */
const MONTH_NAMES_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_NAMES_LONG  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatDate(d: Date, style: "short" | "long" = "short"): string {
  const names = style === "long" ? MONTH_NAMES_LONG : MONTH_NAMES_SHORT;
  return `${String(d.getDate()).padStart(2, "0")}-${names[d.getMonth()]}`;
}

/** Returns all dates in the given month (year/month 0-indexed) up to today. */
function getMonthDates(year: number, month: number, tabStyle: "short" | "long" = "short"): string[] {
  const dates: string[] = [];
  const now             = new Date();
  const todayMidnight   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthEnd        = new Date(year, month + 1, 0); // last day of month
  const cap             = todayMidnight <= monthEnd ? todayMidnight : monthEnd;
  const cursor          = new Date(year, month, 1);
  while (cursor <= cap) {
    dates.push(formatDate(cursor, tabStyle));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** Human-readable label for a month, e.g. "May-2026" */
function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES_SHORT[month]}-${year}`;
}

/* ── GViz fetcher ────────────────────────────────────────────────────────── */
type CellValue = string | number | null;

async function fetchGViz(sheetId: string, tabName: string): Promise<CellValue[][] | null> {
  const url =
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq` +
    `?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/setResponse\(([\s\S]*)\)/);
    if (!match) return null;
    const json = JSON.parse(match[1]);
    if (json.status !== "ok") return null;
    return (json.table.rows as any[]).map((row: any) =>
      ((row.c as any[]) || []).map((cell: any) => cell?.v ?? null)
    );
  } catch {
    return null;
  }
}

/* ── Value parsers ───────────────────────────────────────────────────────── */
function toNum(val: CellValue): number {
  if (typeof val === "number") return Math.round(val);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "-" || trimmed === "") return 0;
    const n = parseFloat(trimmed.replace(/[^\d.]/g, ""));
    return isNaN(n) ? 0 : Math.round(n);
  }
  return 0;
}

function parseAmount(val: CellValue): number {
  if (typeof val === "number") return Math.round(val);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "-" || trimmed === "") return 0;
    const n = parseFloat(trimmed.replace(/[₹,\s]/g, ""));
    return isNaN(n) ? 0 : Math.round(n);
  }
  return 0;
}

function parseQuantity(val: CellValue): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[^\d.]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/* ── Manpower counts type ────────────────────────────────────────────────── */
export interface ManpowerCounts {
  date: string;
  mason: number; mHelper: number; f: number; fH: number;
  cr: number; crH: number; supFor: number; weld: number;
  weldH: number; scaff: number; elecPlum: number; cook: number;
  totalDay: number; targetDay: number; shortFall: number;
  nightMason: number; nightHelper: number; totalNight: number;
  total: number;
}

/* ── DLR parser — new ACC sheet format ──────────────────────────────────────
 * Sheet layout per daily tab:
 *   Section 1: ACC Staff Attendance (ignored)
 *   Section 2: DAILY MANPOWER REPORT
 *     rows 1-11 = work description rows with category counts in cols 3-14
 *     TOTAL row = col[1]="TOTAL", col[2]="Nos", cols 3-14 = category totals,
 *                 col[15]=day subtotal, col[16]=night Mason, col[17]=night Helper,
 *                 col[18]=night subtotal
 *     Expense row = immediately after TOTAL (col[0,1,2] all null),
 *                   col[15]=day expense total, col[18]=night expense total
 *     OR for Main sheet: col[1]="Till date expense"
 *   Section 3: Supply Labour billing
 *     "Description" header row
 *     Mason / M.Helper/Helper / SUP/FOR / Cook / Chowk / Fare rows
 *       col[3]=day count, col[5]=day amount, col[6]=night count, col[8]=night amount
 *     Total row: col[1]="Total", col[3]=day total, col[5]=day total amt,
 *                col[6]=night total, col[8]=night total amt
 *
 * Total expenditure = directManpowerExpense (Section 2) + supplyLabourExpense (Section 3)
 * ─────────────────────────────────────────────────────────────────────────── */
function parseDLR(rows: CellValue[][], date: string, v2 = false): DailyBilling | null {
  const categories: CategoryBilling[] = [];
  let directDayExp = 0, directNightExp = 0;   // from DAILY MANPOWER REPORT expense row
  let totalDayLabour = 0, totalNightLabour = 0;
  let totalDailyExpense = 0, totalSupplyExpense = 0;
  let totalLabour = 0, totalAmount = 0;
  let inBillingSection = false;
  let foundTotal = false;
  let lastRowWasManpowerTotal = false;
  let srNo = 1;

  for (const row of rows) {
    if (!row || row.length < 2) { lastRowWasManpowerTotal = false; continue; }

    const c0  = typeof row[0] === "string" ? row[0].trim() : "";
    const c1  = typeof row[1] === "string" ? row[1].trim() : "";
    const c2  = typeof row[2] === "string" ? row[2].trim() : "";
    const c1l = c1.toLowerCase();
    const c2l = c2.toLowerCase();

    // ── Detect DAILY MANPOWER REPORT TOTAL row ───────────────────────────
    // Daily sheets: col[0]=null, col[1]="TOTAL", col[2]="Nos"
    // Main sheet:   col[0]="TOTAL", col[1]=null,  col[2]="Nos"
    const isMpTotal = (c2l === "nos") &&
      (c1.toUpperCase() === "TOTAL" || c0.toUpperCase() === "TOTAL");

    if (isMpTotal) {
      lastRowWasManpowerTotal = true;
      continue;
    }

    // ── Expense row immediately after TOTAL (daily sheets) ───────────────
    // All of col[0], col[1], col[2] are null/empty; col[15] = day total, col[18] = night total
    // v2 sheets: this row is a per-category cost breakdown that equals the supply-section
    // total — skip it to avoid double-counting.
    if (lastRowWasManpowerTotal && !c0 && !c1 && !c2 && row.length > 15) {
      if (!v2) {
        directDayExp   = toNum(row[15]);
        directNightExp = toNum(row[18]);
      }
      lastRowWasManpowerTotal = false;
      continue;
    }

    // ── "Till date expense" row (Main sheet) ─────────────────────────────
    if (c1l === "till date expense") {
      directDayExp   = toNum(row[15]);
      directNightExp = toNum(row[18]);
      lastRowWasManpowerTotal = false;
      continue;
    }

    lastRowWasManpowerTotal = false;

    // ── Start of Supply Labour billing section ────────────────────────────
    if (c1l === "description") {
      inBillingSection = true;
      continue;
    }

    if (!inBillingSection) continue;

    // ── Supply Labour Total row: col[1]="Total", col[2] NOT "Nos" ─────────
    if (c1l === "total" && c2l !== "nos") {
      const supplyDayNos = toNum(row[3]);
      const supplyDayAmt = parseAmount(row[5]);
      const supplyNightNos = toNum(row[6]);
      const supplyNightAmt = parseAmount(row[8]);
      totalDayLabour    = supplyDayNos;
      totalNightLabour  = supplyNightNos;
      totalDailyExpense = directDayExp + supplyDayAmt;
      totalSupplyExpense= directNightExp + supplyNightAmt;
      totalLabour       = totalDayLabour + totalNightLabour;
      totalAmount       = totalDailyExpense + totalSupplyExpense;
      foundTotal = true;
      break;
    }

    // ── Fare row: col[1] empty, col[2] = "Fare" ──────────────────────────
    let category = c1;
    if (!c1 && c2.toLowerCase() === "fare") category = "Fare";
    if (!category) continue;

    const dayNos  = toNum(row[3]);
    const dayAmt  = parseAmount(row[5]);
    const nightNos= toNum(row[6]);
    const nightAmt= parseAmount(row[8]);

    categories.push({
      srNo: srNo++,
      category,
      dayLabour:    dayNos,
      nightLabour:  nightNos,
      dailyExpense: dayAmt,
      daySupply:    0,
      nightSupply:  0,
      supplyExpense:nightAmt,
      totalLabour:  dayNos + nightNos,
      totalAmount:  dayAmt + nightAmt,
    });
  }

  // Fallback: derive totals from categories when Total row not found
  if (!foundTotal && categories.length > 0) {
    totalDayLabour    = categories.reduce((s, c) => s + c.dayLabour,    0);
    totalNightLabour  = categories.reduce((s, c) => s + c.nightLabour,  0);
    const supDay      = categories.reduce((s, c) => s + c.dailyExpense, 0);
    const supNight    = categories.reduce((s, c) => s + c.supplyExpense,0);
    totalDailyExpense = directDayExp   + supDay;
    totalSupplyExpense= directNightExp + supNight;
    totalLabour       = totalDayLabour + totalNightLabour;
    totalAmount       = totalDailyExpense + totalSupplyExpense;
  }

  if (totalAmount === 0 && totalLabour === 0) return null;

  return {
    date, rows: categories,
    totalDayLabour, totalNightLabour,
    totalDailyExpense, totalDaySupply: 0,
    totalNightSupply: 0, totalSupplyExpense,
    totalLabour, totalAmount,
  };
}

/* ── Manpower parser — reads DAILY MANPOWER REPORT TOTAL row ────────────── */
function parseManpowerCounts(rows: CellValue[][], date: string, v2 = false): ManpowerCounts | null {
  for (const row of rows) {
    if (!row || row.length < 16) continue;
    const c0 = typeof row[0] === "string" ? row[0].trim() : "";
    const c1 = typeof row[1] === "string" ? row[1].trim() : "";
    const c2 = typeof row[2] === "string" ? row[2].trim().toLowerCase() : "";
    const isTotal = c2 === "nos" &&
      (c1.toUpperCase() === "TOTAL" || c0.toUpperCase() === "TOTAL");
    if (!isTotal) continue;

    const mason    = toNum(row[3]);
    const mHelper  = toNum(row[4]);
    const f        = toNum(row[5]);
    const fH       = toNum(row[6]);
    const cr       = toNum(row[7]);
    const crH      = toNum(row[8]);
    const supFor   = toNum(row[9]);
    const weld     = toNum(row[10]);
    const weldH    = toNum(row[11]);
    const scaff    = toNum(row[12]);
    const elecPlum = toNum(row[13]);
    const cook     = toNum(row[14]);
    const totalDay    = toNum(row[15]);
    // v1 (May/Jun): night cols at [16,17,18]; no Target/ShortFall
    // v2 (Jul+):   [16]=Target manpower, [17]=ShortFall; night at [18,19,20]
    const targetDay   = v2 ? toNum(row[16]) : 0;
    const shortFall   = v2 ? toNum(row[17]) : 0;
    const nightMason  = v2 ? toNum(row[18]) : toNum(row[16]);
    const nightHelper = v2 ? toNum(row[19]) : toNum(row[17]);
    const totalNight  = v2 ? toNum(row[20]) : toNum(row[18]);
    const total       = totalDay + totalNight;
    if (total === 0) return null;
    return {
      date, mason, mHelper, f, fH, cr, crH, supFor, weld, weldH,
      scaff, elecPlum, cook, totalDay, targetDay, shortFall,
      nightMason, nightHelper, totalNight, total,
    };
  }
  return null;
}

/* ── DPR parser — activity quantities (Work Progress section) only ────────── */
function parseDPR(rows: CellValue[][], date: string): DailyDPR | null {
  const activities: ActivityItem[] = [];

  // Default: col[12] = Total
  const totalQtyCol = 12;

  for (const row of rows) {
    // Stop at "Manpower" section
    for (const cell of row) {
      if (typeof cell === "string" && cell.toLowerCase().includes("manpower")) {
        return activities.length ? { date, activities } : null;
      }
    }

    const srRaw   = row[0];
    const srNoNum = typeof srRaw === "number"
      ? srRaw
      : typeof srRaw === "string" ? parseFloat(srRaw) : NaN;

    const name = typeof row[1] === "string" ? row[1].trim() : "";
    const unit = typeof row[2] === "string" ? row[2].trim() : "";

    if (
      !isNaN(srNoNum) && srNoNum >= 1 && srNoNum <= 20 &&
      name && unit && unit.toLowerCase() !== "nos" &&
      row.length > totalQtyCol
    ) {
      const qty = parseQuantity(row[totalQtyCol]);
      if (qty > 0) activities.push({ name, unit, quantity: qty });
    }
  }

  if (!activities.length) return null;
  return { date, activities };
}

/* ── Aggregate activity quantities ───────────────────────────────────────── */
// Always returns all 14 items from MASTER_DPR_ACTIVITIES in fixed order.
// Items with no data recorded yet get total = 0.
function aggregateActivities(dprData: DailyDPR[]) {
  const totals = new Map<string, number>();
  const unitMap = new Map<string, string>();
  for (const day of dprData) {
    for (const a of day.activities) {
      totals.set(a.name, (totals.get(a.name) ?? 0) + a.quantity);
      if (!unitMap.has(a.name)) unitMap.set(a.name, a.unit);
    }
  }
  // Return all 14 in master list order; total=0 for not-yet-done items
  return MASTER_DPR_ACTIVITIES.map(({ name, unit }) => ({
    name,
    unit: unitMap.get(name) ?? unit,
    total: totals.get(name) ?? 0,
  }));
}

/* ── GET handler ─────────────────────────────────────────────────────────── */
export async function GET(request: Request) {
  // Parse ?month=0-11&year=YYYY from query string (defaults to current month)
  const { searchParams } = new URL(request.url);
  const now     = new Date();
  const year    = parseInt(searchParams.get("year")  ?? String(now.getFullYear()), 10);
  const month   = parseInt(searchParams.get("month") ?? String(now.getMonth()),    10); // 0-indexed

  const sheets   = getSheetsForMonth(year, month); // per-month sheet IDs
  const tabStyle = sheets.tabStyle ?? "short";
  const v2       = sheets.sheetVersion === "v2";
  const dates    = getMonthDates(year, month, tabStyle);
  const label    = monthLabel(year, month);        // e.g. "Jun-2026"

  // Only use DPR fallback for May 2026 (the month it was originally recorded for)
  const isMay2026 = year === 2026 && month === 4;
  const dprFallbackMap = isMay2026
    ? new Map(DPR_FALLBACK.map((d) => [d.date, d]))
    : new Map<string, DailyDPR>();

  const [dlrResults, dprResults, mainSheetRows] = await Promise.all([
    sheets.dlr
      ? Promise.all(dates.map(async (date) => ({ date, rows: await fetchGViz(sheets.dlr!, date) })))
      : Promise.resolve(dates.map((date) => ({ date, rows: null }))),
    sheets.dpr
      ? Promise.all(dates.map(async (date) => ({ date, rows: await fetchGViz(sheets.dpr!, date) })))
      : Promise.resolve(dates.map((date) => ({ date, rows: null }))),
    sheets.dlr ? fetchGViz(sheets.dlr, "Main sheet") : Promise.resolve(null),
  ]);

  const emptyDay = (date: string): DailyBilling => ({
    date, rows: [],
    totalDayLabour: 0, totalNightLabour: 0, totalDailyExpense: 0,
    totalDaySupply: 0, totalNightSupply: 0, totalSupplyExpense: 0,
    totalLabour: 0, totalAmount: 0,
  });

  const finalBilling: DailyBilling[] = dates.map((date) => {
    const live = dlrResults.find((r) => r.date === date);
    if (live?.rows) {
      const parsed = parseDLR(live.rows, date, v2);
      if (parsed) return parsed;
    }
    return emptyDay(date);
  });

  // Manpower counts: parse from same DLR tab rows (DAILY MANPOWER REPORT TOTAL row)
  const emptyManpower = (date: string): ManpowerCounts => ({
    date, mason:0, mHelper:0, f:0, fH:0, cr:0, crH:0,
    supFor:0, weld:0, weldH:0, scaff:0, elecPlum:0, cook:0,
    totalDay:0, targetDay:0, shortFall:0,
    nightMason:0, nightHelper:0, totalNight:0, total:0,
  });
  const finalManpower: ManpowerCounts[] = dates.map((date) => {
    const live = dlrResults.find((r) => r.date === date);
    if (live?.rows) {
      const parsed = parseManpowerCounts(live.rows, date, v2);
      if (parsed) return parsed;
    }
    return emptyManpower(date);
  });

  const finalDPR: DailyDPR[] = dates.map((date) => {
    const live = dprResults.find((r) => r.date === date);
    if (live?.rows) {
      const parsed = parseDPR(live.rows, date);
      if (parsed) return parsed;
    }
    return dprFallbackMap.get(date) ?? { date, activities: [] };
  });

  // Monthly summary from "Main sheet" tab
  const monthly = mainSheetRows ? parseDLR(mainSheetRows, label, v2) : null;

  // DLR summary (derived from daily data)
  const activeBilling  = finalBilling.filter((d) => d.totalAmount > 0);
  const totalDailyExp  = finalBilling.reduce((s, d) => s + d.totalDailyExpense,  0);
  const totalSupplyExp = finalBilling.reduce((s, d) => s + d.totalSupplyExpense, 0);
  const totalAll       = finalBilling.reduce((s, d) => s + d.totalAmount,        0);
  const activeDays     = activeBilling.length;
  const peakDay        = activeBilling.length
    ? activeBilling.reduce((best, d) => d.totalAmount > best.totalAmount ? d : best)
    : null;
  const avgDaily       = activeDays ? Math.round(totalAll / activeDays) : 0;

  // DPR summary
  const activeDprDays = finalDPR.filter((d) => d.activities.length > 0);
  const peakDprDay    = activeDprDays.length
    ? activeDprDays.reduce((best, d) => d.activities.length > best.activities.length ? d : best)
    : null;
  const avgActivitiesPerDay = activeDprDays.length
    ? Math.round((activeDprDays.reduce((s, d) => s + d.activities.length, 0) / activeDprDays.length) * 10) / 10
    : 0;

  return NextResponse.json(
    {
      month,
      year,
      monthLabel: label,
      daily:             finalBilling,
      monthly,
      summary:           { totalDailyExp, totalSupplyExp, totalAll, activeDays, peakDay, avgDaily },
      dailyManpower:     finalManpower,
      dpr:               finalDPR,
      activityAggregate: aggregateActivities(finalDPR),
      dprSummary:        {
        activeDays:          activeDprDays.length,
        peakDate:            peakDprDay?.date ?? null,
        peakActivityCount:   peakDprDay?.activities.length ?? 0,
        avgActivitiesPerDay,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    }
  );
}
