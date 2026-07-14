import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HGP_SHEET_ID = "1HMhOuyKtRh64ndlPuP9SfRXB8UEi6KXYDAyvWP7MNgo";
const HGP_GID        = "1406742693";
const HGP_MASTER_TAB = "Master sheet";

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

async function fetchByGid(gid: string)  { return fetchGViz(`https://docs.google.com/spreadsheets/d/${HGP_SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`); }
async function fetchByTab(tab: string)   { return fetchGViz(`https://docs.google.com/spreadsheets/d/${HGP_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`); }

async function fetchDateTab(date: string): Promise<{ result: GVizResult; tabUsed: string } | null> {
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
    const result = await fetchByTab(tab);
    if (result) return { result, tabUsed: tab };
  }
  return null;
}

function toNum(val: CellValue): number {
  if (typeof val === "number") return val;          // keep sign (negatives!)
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

  // ── Map columns using GViz col labels (GViz puts header row into cols, not rows) ──
  const lower = cols.map((c) => c.toLowerCase());

  let catCol   = lower.findIndex((v) => v.includes("category") || v.includes("description") || v.includes("trade"));
  let reqCol   = lower.findIndex((v) => v.includes("required") || v.includes("target"));
  let availCol = lower.findIndex((v) => v.includes("available") || v.includes("actual") || v.includes("avail"));
  let sfCol    = lower.findIndex((v) => v.includes("shortfall") || v.includes("short fall") || v.includes("deficit"));

  // Fallback if cols don't have labels (e.g. cols are ["A","B","C","D"])
  const colsHaveLabels = catCol >= 0 || reqCol >= 0 || availCol >= 0;
  if (!colsHaveLabels) {
    // Scan first few rows for a header row
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const rl = rows[i].map((v) => str(v).toLowerCase());
      const ci = rl.findIndex((v) => v.includes("category") || v.includes("description"));
      const ri = rl.findIndex((v) => v.includes("required") || v.includes("target"));
      const ai = rl.findIndex((v) => v.includes("available") || v.includes("actual"));
      if (ri >= 0 || ai >= 0) { headerIdx = i; catCol = ci >= 0 ? ci : 0; reqCol = ri; availCol = ai; sfCol = rl.findIndex((v) => v.includes("shortfall")); break; }
    }
    // If still no header found default to A=0 B=1 C=2 D=3
    if (catCol < 0)   catCol   = 0;
    if (reqCol < 0)   reqCol   = 1;
    if (availCol < 0) availCol = 2;
    if (sfCol < 0)    sfCol    = 3;
    // Skip rows up to and including the header
    const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
    return buildRows(rows.slice(startIdx), catCol, reqCol, availCol, sfCol);
  }

  if (catCol   < 0) catCol   = 0;
  if (reqCol   < 0) reqCol   = 1;
  if (availCol < 0) availCol = 2;
  if (sfCol    < 0) sfCol    = 3;

  // GViz already stripped the header row into cols — parse ALL rows as data
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
    // Use sheet shortfall if present; otherwise compute
    const shortfall = sfRaw !== 0 ? sfRaw : required - available;

    result.push({ category, requiredManpower: required, availableManpower: available, shortfall });
  }
  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  let gviz: GVizResult | null = null;
  let source = `gid:${HGP_GID}`;

  if (date) {
    const hit = await fetchDateTab(date);
    if (hit) { gviz = hit.result; source = `tab:${hit.tabUsed}`; }
  }

  if (!gviz) {
    // Try "Master sheet" tab first, fall back to gid
    gviz = await fetchByTab(HGP_MASTER_TAB);
    source = `tab:${HGP_MASTER_TAB}`;
  }
  if (!gviz) {
    gviz = await fetchByGid(HGP_GID);
    source = `gid:${HGP_GID}`;
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
