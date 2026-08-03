import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* ── Per-month sheet config for Ethimo (HGP) Required vs Available Manpower ──
 * Key: "MONTH_NAME" (as it appears in date tabs, e.g. "August")
 * Add a new entry whenever a new month's sheet is created.
 * ─────────────────────────────────────────────────────────────────────────── */
interface MonthSheetConfig {
  sheetId: string;
  gid: string;         // GID of the master/summary tab
  masterTab: string;   // Tab name of the master/summary tab
}

const MONTH_SHEETS: Record<string, MonthSheetConfig> = {
  "July": {
    sheetId:   "1HMhOuyKtRh64ndlPuP9SfRXB8UEi6KXYDAyvWP7MNgo",
    gid:       "1406742693",
    masterTab: "Master sheet",
  },
  "August": {
    sheetId:   "1WXY-OLcWiKWeOsNIkKT46RV47wCkNCCvAGnI4d0yfWM",
    gid:       "14465088",
    masterTab: "03-August",   // fallback master tab for the month
  },
};

// Default fallback (most recent known month)
const DEFAULT_CONFIG = MONTH_SHEETS["August"];

/** Detect month name from a date string like "03-August", "01-July" */
function detectMonth(date: string): string | null {
  const parts = date.split(/[-\s]/);
  // Usually "DD-MonthName" — month part is index 1
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    if (p && /^[A-Za-z]/.test(p)) return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }
  return null;
}

function getConfig(date?: string | null): MonthSheetConfig {
  if (date) {
    const month = detectMonth(date);
    if (month && MONTH_SHEETS[month]) return MONTH_SHEETS[month];
  }
  return DEFAULT_CONFIG;
}

type CellValue = string | number | null;

interface GVizResult { cols: string[]; rows: CellValue[][] }

async function fetchGViz(url: string): Promise<GVizResult | null> {
  try {
    const res   = await fetch(url, { cache: "no-store" });
    const text  = await res.text();
    const match = text.match(/setResponse\(([\s\S]*)\)/);
    if (!match) return null;
    const json  = JSON.parse(match[1]);
    if (json.status !== "ok") return null;
    const cols = (json.table.cols as any[]).map((c: any) =>
      (c.label ?? c.id ?? "").toString().trim()
    );
    const rows = (json.table.rows as any[]).map((row: any) =>
      ((row.c as any[]) || []).map((cell: any) => cell?.v ?? null)
    );
    return { cols, rows };
  } catch { return null; }
}

function fetchByGid(sheetId: string, gid: string) {
  return fetchGViz(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`);
}
function fetchByTab(sheetId: string, tab: string) {
  return fetchGViz(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`);
}

async function fetchDateTab(sheetId: string, date: string): Promise<{ result: GVizResult; tabUsed: string } | null> {
  const [day, month] = date.split("-");
  const variants = [
    date,
    `${day}-${month?.toLowerCase()}`,
    `${day}-${month?.toUpperCase()}`,
    `${parseInt(day)}-${month}`,
    `${day} ${month}`,
    `${parseInt(day)} ${month}`,
  ].filter(Boolean);
  for (const tab of variants) {
    const result = await fetchByTab(sheetId, tab);
    if (result) return { result, tabUsed: tab };
  }
  return null;
}

function toNum(val: CellValue): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[^\d.-]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function str(val: CellValue): string {
  return typeof val === "string" ? val.trim() : typeof val === "number" ? String(val) : "";
}

export interface HGPManpowerRow {
  category: string;
  requiredManpower: number;
  availableManpower: number;
  shortfall: number;
}

function parseResult(result: GVizResult): HGPManpowerRow[] {
  const { cols, rows } = result;

  const lower = cols.map((c) => c.toLowerCase());

  let catCol   = lower.findIndex((v) => v.includes("category") || v.includes("description") || v.includes("trade"));
  let reqCol   = lower.findIndex((v) => v.includes("required") || v.includes("target"));
  let availCol = lower.findIndex((v) => v.includes("available") || v.includes("actual") || v.includes("avail"));
  let sfCol    = lower.findIndex((v) => v.includes("shortfall") || v.includes("short fall") || v.includes("deficit"));

  const colsHaveLabels = catCol >= 0 || reqCol >= 0 || availCol >= 0;
  if (!colsHaveLabels) {
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const rl = rows[i].map((v) => str(v).toLowerCase());
      const ci = rl.findIndex((v) => v.includes("category") || v.includes("description"));
      const ri = rl.findIndex((v) => v.includes("required") || v.includes("target"));
      const ai = rl.findIndex((v) => v.includes("available") || v.includes("actual"));
      if (ri >= 0 || ai >= 0) { headerIdx = i; catCol = ci >= 0 ? ci : 0; reqCol = ri; availCol = ai; sfCol = rl.findIndex((v) => v.includes("shortfall")); break; }
    }
    if (catCol < 0)   catCol   = 0;
    if (reqCol < 0)   reqCol   = 1;
    if (availCol < 0) availCol = 2;
    if (sfCol < 0)    sfCol    = 3;
    const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
    return buildRows(rows.slice(startIdx), catCol, reqCol, availCol, sfCol);
  }

  if (catCol   < 0) catCol   = 0;
  if (reqCol   < 0) reqCol   = 1;
  if (availCol < 0) availCol = 2;
  if (sfCol    < 0) sfCol    = 3;

  return buildRows(rows, catCol, reqCol, availCol, sfCol);
}

function buildRows(
  rows: CellValue[][],
  catCol: number, reqCol: number, availCol: number, sfCol: number
): HGPManpowerRow[] {
  const result: HGPManpowerRow[] = [];
  let lastCategory = "";

  for (const row of rows) {
    const rawCat = str(row[catCol]);
    if (rawCat) lastCategory = rawCat;
    const category = lastCategory;
    if (!category) continue;
    const catLower = category.toLowerCase();
    if (catLower === "total" || catLower === "grand total") continue;

    const required  = reqCol   >= 0 ? toNum(row[reqCol])   : 0;
    const available = availCol >= 0 ? toNum(row[availCol]) : 0;
    const sfRaw     = sfCol    >= 0 && sfCol < row.length ? toNum(row[sfCol]) : 0;
    const shortfall = sfRaw !== 0 ? sfRaw : required - available;

    result.push({ category, requiredManpower: required, availableManpower: available, shortfall });
  }
  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  const config = getConfig(date);
  const { sheetId, gid, masterTab } = config;

  let gviz: GVizResult | null = null;
  let source = `gid:${gid}`;

  if (date) {
    const hit = await fetchDateTab(sheetId, date);
    if (hit) { gviz = hit.result; source = `tab:${hit.tabUsed}`; }
  }

  if (!gviz) {
    gviz = await fetchByTab(sheetId, masterTab);
    source = `tab:${masterTab}`;
  }
  if (!gviz) {
    gviz = await fetchByGid(sheetId, gid);
    source = `gid:${gid}`;
  }

  if (!gviz) {
    return NextResponse.json({ error: "Could not fetch HGP sheet" }, { status: 500 });
  }

  const rows = parseResult(gviz);

  return NextResponse.json(
    { rows, source, cols: gviz.cols, rowCount: gviz.rows.length },
    { headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } }
  );
}
