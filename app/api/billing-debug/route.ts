import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SHEETS: Record<string, string> = {
  may_dlr:  "1udrYoj4G9IeAuTzYJqZoPS9OYJTFXdKOk1iIqUNcxuA",
  june_dlr: "18MtCmgE1fzgxkWOCADki5exegyA76_8bie0TXOP4e8o",
};

type CellValue = string | number | null;

async function fetchGViz(sheetId: string, tabName: string): Promise<CellValue[][] | null> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  try {
    const res  = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/setResponse\(([\s\S]*)\)/);
    if (!match) return null;
    const json = JSON.parse(match[1]);
    if (json.status !== "ok") return null;
    return (json.table.rows as any[]).map((row: any) =>
      ((row.c as any[]) || []).map((cell: any) => cell?.v ?? null)
    );
  } catch { return null; }
}

function parseAmount(val: CellValue): number {
  if (typeof val === "number") return Math.round(val);
  if (typeof val === "string") {
    const t = val.trim();
    if (t === "-" || t === "") return 0;
    const n = parseFloat(t.replace(/[₹,\s]/g, ""));
    return isNaN(n) ? 0 : Math.round(n);
  }
  return 0;
}
function toNum(val: CellValue): number {
  if (typeof val === "number") return Math.round(val);
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[^\d.]/g, ""));
    return isNaN(n) ? 0 : Math.round(n);
  }
  return 0;
}

function parseDayRow(rows: CellValue[][], date: string) {
  let totalAmount = 0, totalLabour = 0, foundTotal = false;
  const cats: any[] = [];

  for (const row of rows) {
    if (!row || row.length < 2) continue;
    const srRaw = row[0];
    const srNo  = typeof srRaw === "number" ? srRaw : parseFloat(String(srRaw ?? ""));
    const cat   = typeof row[1] === "string" ? row[1].trim() : "";
    if (!cat || cat.toLowerCase() === "category") continue;

    if (cat.toLowerCase().includes("total")) {
      totalAmount = parseAmount(row[9]);
      totalLabour = toNum(row[8]);
      foundTotal  = true;
      continue;
    }
    if (!isNaN(srNo) && srNo >= 1 && srNo <= 20) {
      cats.push({
        sr: srNo, cat,
        dayL: toNum(row[2]), nightL: toNum(row[3]),
        dayS: toNum(row[5]), nightS: toNum(row[6]),
        totalL: toNum(row[8]), amt: parseAmount(row[9]),
        raw_col9: row[9],
      });
    }
  }

  if (!foundTotal && cats.length > 0) {
    totalAmount = cats.reduce((s, c) => s + c.amt, 0);
    totalLabour = cats.reduce((s, c) => s + c.totalL, 0);
  }

  return { date, totalAmount, totalLabour, foundTotal, cats };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode    = searchParams.get("mode")  || "may_summary";   // may_summary | tab | main
  const tab     = searchParams.get("tab")   || "01-May";
  const sheetKey= searchParams.get("sheet") || "may_dlr";
  const sheetId = SHEETS[sheetKey] ?? SHEETS.may_dlr;

  /* ── mode=tab: inspect one specific tab's raw cells + parsed result ── */
  if (mode === "tab") {
    const rows = await fetchGViz(sheetId, tab);
    if (!rows) return NextResponse.json({ error: "fetch failed", sheetId, tab });
    const parsed = parseDayRow(rows, tab);
    return NextResponse.json({ sheetId, tab, raw_rows: rows, parsed });
  }

  /* ── mode=main: inspect Main sheet ──────────────────────────────────── */
  if (mode === "main") {
    const rows = await fetchGViz(sheetId, "Main sheet");
    if (!rows) return NextResponse.json({ error: "fetch failed", sheetId, tab: "Main sheet" });
    const parsed = parseDayRow(rows, "Main sheet");
    return NextResponse.json({ sheetId, tab: "Main sheet", raw_rows: rows, parsed });
  }

  /* ── mode=may_summary (default): scan ALL May daily tabs ────────────── */
  const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function getMayDates() {
    const dates: string[] = [];
    for (let d = 1; d <= 31; d++) {
      dates.push(`${String(d).padStart(2, "0")}-May`);
    }
    return dates;
  }

  const dates   = getMayDates();
  const results = await Promise.all(
    dates.map(async (date) => {
      const rows = await fetchGViz(sheetId, date);
      if (!rows) return { date, status: "no_data", totalAmount: 0, totalLabour: 0 };
      const p = parseDayRow(rows, date);
      return { date, status: "ok", ...p };
    })
  );

  const daysWithData = results.filter((r: any) => r.totalAmount > 0 || r.totalLabour > 0);
  const grandTotal   = daysWithData.reduce((s: number, r: any) => s + r.totalAmount, 0);

  // Main sheet for comparison
  const mainRows   = await fetchGViz(sheetId, "Main sheet");
  const mainParsed = mainRows ? parseDayRow(mainRows, "Main sheet") : null;

  return NextResponse.json({
    sheetId,
    grandTotal_daily_sum: grandTotal,
    main_sheet_total:     mainParsed?.totalAmount ?? "N/A",
    active_days:          daysWithData.length,
    day_breakdown:        daysWithData.map((r: any) => ({
      date: r.date,
      totalAmount: r.totalAmount,
      totalLabour: r.totalLabour,
      foundTotal:  r.foundTotal,
      categories:  r.cats?.length ?? 0,
    })),
  });
}
