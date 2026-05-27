import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* ── Sheet config ─────────────────────────────────────────────────────────── */
const DLR_SHEET_ID = "1PnmXsPlNtO_VTdgvutGyYJOTxQ5DYsIl6ufJuRfiVJM";
const DPR_SHEET_ID = "1yzPpZR6HonSLlFk4c046AR5cgYtmD0UGhbO280FzoTk";

/* ── Types ───────────────────────────────────────────────────────────────── */

/** One work-description row from the DLR sheet (rows 1-11) */
export interface WorkTypeEntry {
  srNo: number;
  description: string;
  // Day shift counts
  dayMason: number;
  dayHelper: number;
  daySup: number;         // SUP/FOR column
  dayCook: number;
  daySubTotal: number;
  // Night shift counts
  nightMason: number;
  nightHelper: number;
  nightSubTotal: number;
}

/**
 * DLR sheet layout (cols 0-based, auto-detected via "Mason" header):
 *   [descC]    = WORK DESCRIPTION
 *   [masonC]   = Mason(day)  [+1] Helper(day)  [+2] SUP/FOR(day)  [+3] COOK(day)  [+4] SUB TOTAL(day)
 *   [masonC+5] = MAS(night)  [+6] HELPER(night)  [+7] SUB-TOTAL(night)
 *
 * Special rows:
 *   "TOTAL"              → worker count totals
 *   Day expense row      → rupee amounts for Mason/Helper/SUP/COOK/SubTotal (day cols only)
 *   Night expense row    → rupee amounts for MAS/HELPER/SubTotal (night cols only)
 *                          label from col B of this row = nightCategoryLabel
 *   Combined expense row → both day & night amounts in one row
 */
export interface DailyBilling {
  date: string;
  // Day shift — worker counts (TOTAL row)
  dayMason: number;
  dayHelper: number;
  daySup: number;
  dayCook: number;
  dayWorkers: number;
  // Night shift — worker counts
  nightMason: number;
  nightHelper: number;
  nightWorkers: number;
  // Combined
  totalWorkers: number;
  // Expenditure — day categories
  dayMasonAmt: number;
  dayHelperAmt: number;
  daySupAmt: number;
  dayCookAmt: number;
  dayAmount: number;
  // Expenditure — night categories
  nightMasonAmt: number;
  nightHelperAmt: number;
  nightAmount: number;
  // Grand total
  totalAmount: number;
  // Night section label (read from col B of the night expense row, e.g. B19)
  nightCategoryLabel: string;
  // Work-type breakdown rows 1-11
  workTypes: WorkTypeEntry[];
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

/* ── DLR fallback (grand totals only; per-category data from live sheet) ──── */
function bill(
  date: string,
  dayMason: number, dayHelper: number, daySup: number, dayCook: number,
  dayAmount: number,
  nightMason: number, nightHelper: number,
  nightAmount: number
): DailyBilling {
  return {
    date,
    dayMason, dayHelper, daySup, dayCook,
    dayWorkers: dayMason + dayHelper + daySup + dayCook,
    nightMason, nightHelper,
    nightWorkers: nightMason + nightHelper,
    totalWorkers: dayMason + dayHelper + daySup + dayCook + nightMason + nightHelper,
    dayMasonAmt: 0, dayHelperAmt: 0, daySupAmt: 0, dayCookAmt: 0, dayAmount,
    nightMasonAmt: 0, nightHelperAmt: 0, nightAmount,
    totalAmount: dayAmount + nightAmount,
    nightCategoryLabel: "Night Supply Labour",
    workTypes: [],
  };
}

// Fallback uses old counts mapped to new fields (live sheet provides real breakdown)
const BILLING_FALLBACK: DailyBilling[] = [
  bill("01-May", 1,  1,  0, 0, 1500,  0, 0, 0    ),
  bill("02-May", 9,  7,  0, 0, 13700, 0, 0, 0    ),
  bill("03-May", 8,  7,  0, 0, 12850, 0, 0, 0    ),
  bill("04-May", 9,  8,  0, 0, 14350, 0, 0, 0    ),
  bill("05-May", 8,  8,  0, 0, 13500, 0, 0, 0    ),
  bill("06-May", 9,  7,  0, 0, 13700, 0, 0, 0    ),
  bill("07-May", 10, 6,  6, 0, 18950, 0, 0, 10050),
  bill("08-May", 9,  8,  6, 0, 19400, 0, 0, 19050),
  bill("09-May", 9,  8,  0, 0, 14350, 0, 0, 7700 ),
  bill("10-May", 5,  4,  0, 0, 8350,  0, 0, 6850 ),
  bill("11-May", 8,  8,  4, 0, 16900, 0, 0, 7700 ),
  bill("12-May", 10, 7,  0, 0, 14550, 0, 0, 6200 ),
  bill("13-May", 9,  7,  0, 0, 13700, 0, 0, 0    ),
  bill("14-May", 8,  7,  0, 0, 12850, 0, 0, 0    ),
  bill("15-May", 8,  8,  0, 0, 13500, 0, 0, 12000),
  bill("16-May", 7,  8,  0, 0, 12650, 0, 0, 7500 ),
  bill("17-May", 9,  8,  0, 0, 14350, 0, 0, 0    ),
  bill("18-May", 3,  2,  0, 0, 5350,  0, 0, 10500),
  bill("19-May", 2,  2,  0, 0, 4500,  0, 0, 9000 ),
  bill("20-May", 8,  6,  0, 0, 12200, 0, 0, 18000),
  bill("21-May", 6,  7,  0, 0, 11150, 0, 0, 0    ),
  bill("22-May", 6,  7,  0, 0, 11150, 0, 0, 0    ),
];

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
  // Normalize to local midnight so today's date is always included regardless
  // of server timezone vs user timezone (e.g. UTC server, IST user)
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
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[^\d.]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function parseAmount(val: CellValue): number {
  if (typeof val === "number") return Math.round(val);
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[₹,\s]/g, ""));
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
/*
 * Column layout auto-detected by scanning for a "Mason" header cell.
 * Expense rows are detected by whether amounts appear in day-only cols,
 * night-only cols, or both — so the sheet can have:
 *   • One combined "Till date expense" row  (both day + night in same row), OR
 *   • A day expense row + a separate night expense row (label from B col = nightCategoryLabel)
 * Labels are found by scanning the first few cells of each row.
 */
function parseDLR(rows: CellValue[][], date: string): DailyBilling | null {
  const workTypes: WorkTypeEntry[] = [];
  let dayMason = 0, dayHelper = 0, daySup = 0, dayCook = 0, dayWorkers = 0;
  let nightMason = 0, nightHelper = 0, nightWorkers = 0;
  let dayMasonAmt = 0, dayHelperAmt = 0, daySupAmt = 0, dayCookAmt = 0, dayAmount = 0;
  let nightMasonAmt = 0, nightHelperAmt = 0, nightAmount = 0;
  let nightCategoryLabel = "Night Supply Labour";
  let foundTotal = false, foundAmt = false;

  // ── Step 1: auto-detect column layout by finding the "Mason" header ────────
  let masonC = 3; // default: SR.NO.[0], DESC[1], UNIT[2], Mason[3]…
  for (const row of rows) {
    const idx = row.findIndex(
      (c) => typeof c === "string" && c.trim().toLowerCase() === "mason"
    );
    if (idx >= 1) { masonC = idx; break; }
  }
  const descC   = Math.max(0, masonC - 2); // WORK DESCRIPTION column
  const hDayC   = masonC + 1;  // Helper (day)
  const supC    = masonC + 2;  // SUP/FOR (day)
  const cookC   = masonC + 3;  // COOK (day)
  const subDC   = masonC + 4;  // SUB TOTAL (day)
  const masNC   = masonC + 5;  // MAS (night)
  const hNightC = masonC + 6;  // HELPER (night)
  const subNC   = masonC + 7;  // SUB-TOTAL (night)

  // ── Step 2: helper — first non-empty text in leading cells of a row ────────
  function rowLabel(row: CellValue[]): { raw: string; lc: string } {
    for (let i = 0; i <= Math.min(descC + 1, 4); i++) {
      if (typeof row[i] === "string" && (row[i] as string).trim()) {
        const raw = (row[i] as string).trim();
        return { raw, lc: raw.toLowerCase() };
      }
    }
    return { raw: "", lc: "" };
  }

  // ── Step 3: scan each row ──────────────────────────────────────────────────
  for (const row of rows) {
    const { raw: rawLabel, lc: label } = rowLabel(row);

    // SR.NO. — accept number or numeric string
    const srRaw   = row[0];
    const srNoNum = typeof srRaw === "number"
      ? srRaw
      : typeof srRaw === "string" ? parseFloat(srRaw) : NaN;

    // ── TOTAL row (worker counts) ─────────────────────────────────────────────
    if (label === "total" || (label.startsWith("total") && !label.includes("sub"))) {
      dayMason     = toNum(row[masonC]);
      dayHelper    = toNum(row[hDayC]);
      daySup       = toNum(row[supC]);
      dayCook      = toNum(row[cookC]);
      dayWorkers   = toNum(row[subDC]);
      nightMason   = toNum(row[masNC]);
      nightHelper  = toNum(row[hNightC]);
      nightWorkers = toNum(row[subNC]);
      foundTotal   = true;
      continue;
    }

    // ── Expense rows: detect by where amounts appear ──────────────────────────
    // Expense keywords in label
    const isExpenseLabel =
      label.includes("till") || label.includes("expense") ||
      label.includes("expendit") || label.includes("amount") ||
      label.includes("supply") || label.includes("night");

    // Read amounts from day and night cols for this row
    const dMason  = parseAmount(row[masonC]);
    const dHelper = parseAmount(row[hDayC]);
    const dSup    = parseAmount(row[supC]);
    const dCook   = parseAmount(row[cookC]);
    const dSub    = parseAmount(row[subDC]);
    const nMason  = parseAmount(row[masNC]);
    const nHelper = parseAmount(row[hNightC]);
    const nSub    = parseAmount(row[subNC]);

    const hasDayAmt   = dSub > 0 || (dMason + dHelper + dSup + dCook) > 0;
    const hasNightAmt = nSub > 0 || (nMason + nHelper) > 0;

    // A row is an expense row if it has an expense label OR it has large amounts
    // (>500 ₹ threshold to avoid picking up worker counts)
    const bigDay   = dSub > 500 || dMason > 500 || dHelper > 500;
    const bigNight = nSub > 500 || nMason > 500 || nHelper > 500;
    const isExpenseRow = isExpenseLabel || bigDay || bigNight;

    // Skip work-type rows (those with numeric SR.NO. 1-15 and no large amounts)
    const hasNumericSr = !isNaN(srNoNum) && srNoNum >= 1 && srNoNum <= 15;
    if (hasNumericSr && !isExpenseRow) {
      // Work-type row
      workTypes.push({
        srNo:          srNoNum,
        description:   rawLabel,
        dayMason:      toNum(row[masonC]),
        dayHelper:     toNum(row[hDayC]),
        daySup:        toNum(row[supC]),
        dayCook:       toNum(row[cookC]),
        daySubTotal:   toNum(row[subDC]),
        nightMason:    toNum(row[masNC]),
        nightHelper:   toNum(row[hNightC]),
        nightSubTotal: toNum(row[subNC]),
      });
      continue;
    }

    // Non-SR.NO. work-type rows (fallback: has subtotals but no large rupee amounts)
    if (!hasNumericSr && rawLabel && !isExpenseRow &&
        label !== "total" && !label.includes("sub") &&
        (toNum(row[subDC]) > 0 || toNum(row[subNC]) > 0) &&
        toNum(row[subDC]) <= 500 && toNum(row[subNC]) <= 500) {
      workTypes.push({
        srNo:          workTypes.length + 1,
        description:   rawLabel,
        dayMason:      toNum(row[masonC]),
        dayHelper:     toNum(row[hDayC]),
        daySup:        toNum(row[supC]),
        dayCook:       toNum(row[cookC]),
        daySubTotal:   toNum(row[subDC]),
        nightMason:    toNum(row[masNC]),
        nightHelper:   toNum(row[hNightC]),
        nightSubTotal: toNum(row[subNC]),
      });
      continue;
    }

    if (!isExpenseRow) continue;

    // ── Handle expense row(s) ──────────────────────────────────────────────────
    if (hasDayAmt && hasNightAmt) {
      // Combined expense row — both day and night amounts in same row
      dayMasonAmt  = dMason; dayHelperAmt = dHelper;
      daySupAmt    = dSup;   dayCookAmt   = dCook;
      dayAmount    = dSub > 0 ? dSub : dMason + dHelper + dSup + dCook;
      nightMasonAmt  = nMason; nightHelperAmt = nHelper;
      nightAmount    = nSub > 0 ? nSub : nMason + nHelper;
      // Use this row's label as night category if it hints at "night"
      if (label.includes("night") || label.includes("supply") || label.includes("2nd")) {
        nightCategoryLabel = rawLabel;
      }
      foundAmt = true;

    } else if (hasDayAmt && !hasNightAmt) {
      // Day-only expense row
      dayMasonAmt  = dMason; dayHelperAmt = dHelper;
      daySupAmt    = dSup;   dayCookAmt   = dCook;
      dayAmount    = dSub > 0 ? dSub : dMason + dHelper + dSup + dCook;
      foundAmt = true;

    } else if (hasNightAmt && !hasDayAmt) {
      // Night-only expense row — label from column B IS the night category (e.g. B19)
      nightMasonAmt  = nMason; nightHelperAmt = nHelper;
      nightAmount    = nSub > 0 ? nSub : nMason + nHelper;
      if (rawLabel) nightCategoryLabel = rawLabel;
      foundAmt = true;
    }
  }

  // ── Fallback: derive totals from work-type rows if TOTAL row not found ──────
  if (!foundTotal && workTypes.length > 0) {
    dayMason   = workTypes.reduce((s, w) => s + w.dayMason, 0);
    dayHelper  = workTypes.reduce((s, w) => s + w.dayHelper, 0);
    daySup     = workTypes.reduce((s, w) => s + w.daySup, 0);
    dayCook    = workTypes.reduce((s, w) => s + w.dayCook, 0);
    dayWorkers = workTypes.reduce((s, w) => s + w.daySubTotal, 0);
    nightMason   = workTypes.reduce((s, w) => s + w.nightMason, 0);
    nightHelper  = workTypes.reduce((s, w) => s + w.nightHelper, 0);
    nightWorkers = workTypes.reduce((s, w) => s + w.nightSubTotal, 0);
    foundTotal   = dayWorkers > 0 || nightWorkers > 0;
  }

  if (!foundTotal && !foundAmt) return null;
  if (dayWorkers === 0 && nightWorkers === 0 && dayAmount === 0 && nightAmount === 0) return null;

  // Derive sub-amounts from overall amount when individual amounts missing
  if (dayAmount > 0 && dayMasonAmt === 0 && dayHelperAmt === 0) {
    // Distribute proportionally by worker count
    const total = dayMason + dayHelper + daySup + dayCook;
    if (total > 0) {
      dayMasonAmt  = Math.round((dayMason  / total) * dayAmount);
      dayHelperAmt = Math.round((dayHelper / total) * dayAmount);
      daySupAmt    = Math.round((daySup    / total) * dayAmount);
      dayCookAmt   = dayAmount - dayMasonAmt - dayHelperAmt - daySupAmt;
    }
  }
  if (nightAmount > 0 && nightMasonAmt === 0 && nightHelperAmt === 0) {
    const total = nightMason + nightHelper;
    if (total > 0) {
      nightMasonAmt  = Math.round((nightMason  / total) * nightAmount);
      nightHelperAmt = nightAmount - nightMasonAmt;
    }
  }

  return {
    date,
    dayMason, dayHelper, daySup, dayCook, dayWorkers,
    nightMason, nightHelper, nightWorkers,
    totalWorkers: dayWorkers + nightWorkers,
    dayMasonAmt, dayHelperAmt, daySupAmt, dayCookAmt, dayAmount,
    nightMasonAmt, nightHelperAmt, nightAmount,
    totalAmount: dayAmount + nightAmount,
    nightCategoryLabel,
    workTypes,
  };
}

/* ── DPR parser — activity quantities (Work Progress section) only ────────── */
function parseDPR(rows: CellValue[][], date: string): DailyDPR | null {
  const activities: ActivityItem[] = [];

  // Auto-detect total-quantity column index (last non-empty header before data)
  // Default: col[12] = Total (Pour 1-9 are cols 3-11, then Total is col 12)
  let totalQtyCol = 12;

  for (const row of rows) {
    // Stop at "Manpower" section
    for (const cell of row) {
      if (typeof cell === "string" && cell.toLowerCase().includes("manpower")) {
        return activities.length ? { date, activities } : null;
      }
    }

    // SR.NO. from col[0] — accept number or numeric string
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

  const [dlrResults, dprResults] = await Promise.all([
    Promise.all(dates.map(async (date) => ({ date, rows: await fetchGViz(DLR_SHEET_ID, date) }))),
    Promise.all(dates.map(async (date) => ({ date, rows: await fetchGViz(DPR_SHEET_ID, date) }))),
  ]);

  const billingFallbackMap = new Map(BILLING_FALLBACK.map((d) => [d.date, d]));
  const dprFallbackMap     = new Map(DPR_FALLBACK.map((d) => [d.date, d]));

  const finalBilling: DailyBilling[] = dates.map((date) => {
    const live = dlrResults.find((r) => r.date === date);
    if (live?.rows) {
      const parsed = parseDLR(live.rows, date);
      if (parsed) return parsed;
    }
    return billingFallbackMap.get(date) ?? bill(date, 0, 0, 0, 0, 0, 0, 0, 0);
  });

  const finalDPR: DailyDPR[] = dates.map((date) => {
    const live = dprResults.find((r) => r.date === date);
    if (live?.rows) {
      const parsed = parseDPR(live.rows, date);
      if (parsed) return parsed;
    }
    return dprFallbackMap.get(date) ?? { date, activities: [] };
  });

  // DLR summary
  const activeBilling = finalBilling.filter((d) => d.totalAmount > 0 || d.dayWorkers > 0);
  const totalDay   = finalBilling.reduce((s, d) => s + d.dayAmount,   0);
  const totalNight = finalBilling.reduce((s, d) => s + d.nightAmount, 0);
  const totalAll   = finalBilling.reduce((s, d) => s + d.totalAmount, 0);
  const activeDays = activeBilling.length;
  const amtDays    = finalBilling.filter((d) => d.totalAmount > 0);
  const peakDay    = amtDays.length
    ? amtDays.reduce((best, d) => d.totalAmount > best.totalAmount ? d : best)
    : finalBilling[0];
  const avgDaily   = amtDays.length ? Math.round(totalAll / amtDays.length) : 0;

  // DPR summary
  const activeDprDays = finalDPR.filter((d) => d.activities.length > 0);
  const peakDprDay    = activeDprDays.length
    ? activeDprDays.reduce((best, d) => d.activities.length > best.activities.length ? d : best)
    : null;
  const avgActivitiesPerDay = activeDprDays.length
    ? Math.round((activeDprDays.reduce((s, d) => s + d.activities.length, 0) / activeDprDays.length) * 10) / 10
    : 0;

  return NextResponse.json({
    daily:             finalBilling,
    summary:           { totalDay, totalNight, totalAll, activeDays, peakDay, avgDaily },
    dpr:               finalDPR,
    activityAggregate: aggregateActivities(finalDPR),
    dprSummary:        {
      activeDays:          activeDprDays.length,
      peakDate:            peakDprDay?.date ?? null,
      peakActivityCount:   peakDprDay?.activities.length ?? 0,
      avgActivitiesPerDay,
    },
  });
}
