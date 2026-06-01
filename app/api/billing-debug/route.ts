import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SHEET_ID = "18MtCmgE1fzgxkWOCADki5exegyA76_8bie0TXOP4e8o"; // June 2026 DLR

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") || "01-June";

  // Try both GViz JSON and CSV export so we can see which works
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`;
  const csvUrl  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${encodeURIComponent(tab)}`;

  const result: Record<string, any> = { tab };

  // ── Try GViz ──────────────────────────────────────────────────────────────
  try {
    const res = await fetch(gvizUrl, { cache: "no-store" });
    result.gviz_http_status = res.status;
    const text = await res.text();
    result.gviz_raw_snippet = text.slice(0, 600);

    const match = text.match(/setResponse\(([\s\S]*)\)/);
    if (match) {
      const json = JSON.parse(match[1]);
      result.gviz_status = json.status;
      result.gviz_cols = json.table?.cols?.map((c: any) => ({ label: c.label, type: c.type }));
      result.gviz_row_count = json.table?.rows?.length ?? 0;
      result.gviz_rows = (json.table?.rows || []).map((row: any, i: number) => ({
        i,
        cells: ((row.c as any[]) || []).map((c: any) => c?.v ?? null),
      }));
    } else {
      result.gviz_parse_error = "setResponse(...) not found in response";
    }
  } catch (e: any) {
    result.gviz_fetch_error = e.message;
  }

  // ── Try CSV ───────────────────────────────────────────────────────────────
  try {
    const res = await fetch(csvUrl, { cache: "no-store" });
    result.csv_http_status = res.status;
    const text = await res.text();
    result.csv_raw = text.slice(0, 3000); // first 3000 chars of CSV
    result.csv_lines = text.split("\n").slice(0, 40); // first 40 lines as array
  } catch (e: any) {
    result.csv_fetch_error = e.message;
  }

  return NextResponse.json(result, { status: 200 });
}
