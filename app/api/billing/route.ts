import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* ── Sheet config ─────────────────────────────────────────────────────────── */
const DLR_SHEET_ID = "1udrYoj4G9IeAuTzYJqZoPS9OYJTFXdKOk1iIqUNcxuA";
const DPR_SHEET_ID = "1yzPpZR6HonSLlFk4c046AR5cgYtmD0UGhbO280FzoTk";

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

/* ── DPR fallback ────────────────────────────────────────────────────────── */
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
  dpr("04-May", [["Raft Reinforcement Works", "MT", 11], ["HY-Rib", "RMT", 18]]),
  dpr("05-May", [["Raft Reinforcement Works", "MT", 8], ["Footing & Raft Side Shuttering", "Sqm", 55]]),
  dpr("06-May", [["Raft Concrete", "Cum", 727], ["Footing & Raft Side Shuttering", "Sqm", 10], ["Column & Shear Wall Reinforcement", "MT", 1]]),
  dpr("07-May", [["Footing & Raft Side Shuttering", "Sqm", 28], ["Raft Concrete", "Cum", 739], ["Column & Shear Wall Reinforcement", "MT", 3]]),
  dpr("08-May", [["Raft Reinforcement Works", "MT", 1], ["Footing & Raft Side Shuttering", "Sqm", 32], ["Raft Concrete", "Cum", 245], ["Column & Shear Wall Reinforcement", "MT", 2]]),
  dpr("09-May", [["Footing & Raft Side Shuttering", "Sqm", 60], ["Raft Concrete", "Cum", 206], ["Column & Shear Wall Reinforcement", "MT", 3]]),
  dpr("10-May", [["Footing & Raft Side Shuttering", "Sqm", 66], ["Column & Shear Wall Shuttering", "Sqm", 12]]),
  dpr("11-May", [["Raft Reinforcement Works", "MT", 2], ["Footing & Raft Side Shuttering", "Sqm", 55], ["Raft Concrete", "Cum", 104], ["Column & Shear Wall Reinforcement", "MT", 5.5], ["Column & Shear Wall Shuttering", "Sqm", 12]]),
  dpr("12-May", [["Raft Reinforcement Works", "MT", 1.5], ["Footing & Raft Side Shuttering", "Sqm", 72], ["Column & Shear Wall Reinforcement", "MT", 6]]),
  dpr("13-May", [["Column & Shear Wall Reinforcement", "MT", 7], ["Column & Shear Wall Shuttering", "Sqm", 22]]),
  dpr("14-May", [["Footing & Raft Side Shuttering", "Sqm", 42], ["Column & Shear Wall Reinforcement", "MT", 2.5], ["Column & Shear Wall Shuttering", "Sqm", 5], ["Column & Shear Wall Concreting", "Cum", 19.2]]),
  dpr("15-May", [["Footing & Raft Side Shuttering", "Sqm", 48], ["Raft Concrete", "Cum", 62.5], ["Column & Shear Wall Reinforcement", "MT", 6], ["Column & Shear Wall Shuttering", "Sqm", 28.8]]),
  dpr("16-May", [["Column & Shear Wall Reinforcement", "MT", 5], ["Column & Shear Wall Shuttering", "Sqm", 26]]),
  dpr("17-May", [["Footing & Raft Side Shuttering", "Sqm", 36], ["Column & Shear Wall Reinforcement", "MT", 4], ["Column & Shear Wall Concreting", "Cum", 20]]),
  dpr("18-May", [["Column & Shear Wall Reinforcement", "MT", 6], ["Column & Shear Wall Shuttering", "Sqm", 62], ["Column & Shear Wall Concreting", "Cum", 9]]),
  dpr("19-May", [["Column & Shear Wall Reinforcement", "MT", 7], ["Column & Shear Wall Shuttering", "Sqm", 40], ["Column & Shear Wall Concreting", "Cum", 15]]),
  dpr("20-May", [["Column & Shear Wall Reinforcement", "MT", 5], ["Column & Shear Wall Shuttering", "Sqm", 52]]),
  dpr("21-May", [["Column & Shear Wall Reinforcement", "MT", 7], ["Column & Shear Wall Shuttering", "Sqm", 72], ["Slab Shuttering (B2 Level)", "Sqm", 60]]),
];

/* ── Date helpers ────────────────────────────────────────────────────────── */
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}-${MONTH_NAMES[d.getMonth()]}`;
}

function getMayDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mayEnd  = new Date(2026, 4, 31);
  const cap     = todayMidnight <= mayEnd ? todayMidnight : mayEnd;
  const cursor  = new Date(2026, 4, 1);
  while (cursor <= cap) {
    dates.push(formatDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
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

/* ── DLR parser ──────────────────────────────────────────────────────────── */
function parseDLR(rows: CellValue[][], date: string): DailyBilling | null {
  const categories: CategoryBilling[] = [];
  let totalDayLabour    = 0, totalNightLabour   = 0, totalDailyExpense  = 0;
  let totalDaySupply    = 0, totalNightSupply   = 0, totalSupplyExpense = 0;
  let totalLabour       = 0, totalAmount        = 0;
  let foundTotal        = false;

  for (const row of rows) {
    if (!row || row.length < 2) continue;

    const srRaw = row[0];
    const srNo  = typeof srRaw === "number" ? srRaw
                : typeof srRaw === "string" ? parseFloat(srRaw) : NaN;

    const catRaw = typeof row[1] === "string" ? row[1].trim() : "";
    const catLc  = catRaw.toLowerCase();

    // Skip header / empty rows
    if (!catRaw) continue;
    if (catLc === "category" || catLc.startsWith("s.no") || catLc.startsWith("sr.no")) continue;

    // "Total labour" row — grab grand totals
    if (catLc.includes("total")) {
      totalDayLabour     = toNum(row[2]);
      totalNightLabour   = toNum(row[3]);
      totalDailyExpense  = parseAmount(row[4]);
      totalDaySupply     = toNum(row[5]);
      totalNightSupply   = toNum(row[6]);
      totalSupplyExpense = parseAmount(row[7]);
      totalLabour        = toNum(row[8]);
      totalAmount        = parseAmount(row[9]);
      foundTotal = true;
      continue;
    }

    // Category rows: SR.NO. 1–10
    if (!isNaN(srNo) && srNo >= 1 && srNo <= 10) {
      categories.push({
        srNo,
        category:      catRaw,
        dayLabour:     toNum(row[2]),
        nightLabour:   toNum(row[3]),
        dailyExpense:  parseAmount(row[4]),
        daySupply:     toNum(row[5]),
        nightSupply:   toNum(row[6]),
        supplyExpense: parseAmount(row[7]),
        totalLabour:   toNum(row[8]),
        totalAmount:   parseAmount(row[9]),
      });
    }
  }

  if (!categories.length && !foundTotal) return null;

  // Derive totals from categories if "Total labour" row not found
  if (!foundTotal && categories.length > 0) {
    totalDayLabour     = categories.reduce((s, c) => s + c.dayLabour,     0);
    totalNightLabour   = categories.reduce((s, c) => s + c.nightLabour,   0);
    totalDailyExpense  = categories.reduce((s, c) => s + c.dailyExpense,  0);
    totalDaySupply     = categories.reduce((s, c) => s + c.daySupply,     0);
    totalNightSupply   = categories.reduce((s, c) => s + c.nightSupply,   0);
    totalSupplyExpense = categories.reduce((s, c) => s + c.supplyExpense, 0);
    totalLabour        = categories.reduce((s, c) => s + c.totalLabour,   0);
    totalAmount        = categories.reduce((s, c) => s + c.totalAmount,   0);
  }

  if (totalAmount === 0 && totalLabour === 0) return null;

  return {
    date,
    rows: categories,
    totalDayLabour,
    totalNightLabour,
    totalDailyExpense,
    totalDaySupply,
    totalNightSupply,
    totalSupplyExpense,
    totalLabour,
    totalAmount,
  };
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
function aggregateActivities(dprData: DailyDPR[]) {
  const m = new Map<string, { unit: string; total: number }>();
  for (const day of dprData) {
    for (const a of day.activities) {
      const v = m.get(a.name) ?? { unit: a.unit, total: 0 };
      v.total += a.quantity;
      m.set(a.name, v);
    }
  }
  return [...m.entries()]
    .map(([name, vals]) => ({ name, unit: vals.unit, total: vals.total }))
    .sort((a, b) => b.total - a.total);
}

/* ── GET handler ─────────────────────────────────────────────────────────── */
export async function GET() {
  const dates = getMayDates();

  const [dlrResults, dprResults, mainSheetRows] = await Promise.all([
    Promise.all(dates.map(async (date) => ({ date, rows: await fetchGViz(DLR_SHEET_ID, date) }))),
    Promise.all(dates.map(async (date) => ({ date, rows: await fetchGViz(DPR_SHEET_ID, date) }))),
    fetchGViz(DLR_SHEET_ID, "Main sheet"),
  ]);

  const dprFallbackMap = new Map(DPR_FALLBACK.map((d) => [d.date, d]));

  const emptyDay = (date: string): DailyBilling => ({
    date, rows: [],
    totalDayLabour: 0, totalNightLabour: 0, totalDailyExpense: 0,
    totalDaySupply: 0, totalNightSupply: 0, totalSupplyExpense: 0,
    totalLabour: 0, totalAmount: 0,
  });

  const finalBilling: DailyBilling[] = dates.map((date) => {
    const live = dlrResults.find((r) => r.date === date);
    if (live?.rows) {
      const parsed = parseDLR(live.rows, date);
      if (parsed) return parsed;
    }
    return emptyDay(date);
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
  const monthly = mainSheetRows ? parseDLR(mainSheetRows, "May-2026") : null;

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
      daily:             finalBilling,
      monthly,
      summary:           { totalDailyExp, totalSupplyExp, totalAll, activeDays, peakDay, avgDaily },
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
