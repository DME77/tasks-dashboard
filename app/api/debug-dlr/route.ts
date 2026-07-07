import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function fetchGViz(sheetId: string, tabName: string) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const match = text.match(/setResponse\(([\s\S]*)\)/);
  if (!match) return null;
  const json = JSON.parse(match[1]);
  return (json.table.rows as any[]).map((row: any) =>
    ((row.c as any[]) || []).map((cell: any) => cell?.v ?? null)
  );
}

export async function GET() {
  const rows = await fetchGViz("1md6Cw7SE7Wla_h6URUYVNk588D83zjlZ0X72dsGwaTo", "01-July");
  if (!rows) return NextResponse.json({ error: "fetch failed" });

  const totalRows = rows
    .map((row, i) => {
      const c0 = typeof row[0] === "string" ? row[0].trim() : "";
      const c1 = typeof row[1] === "string" ? row[1].trim() : "";
      const c2 = typeof row[2] === "string" ? row[2].trim().toLowerCase() : "";
      const isTotal = c2 === "nos" && (c1.toUpperCase() === "TOTAL" || c0.toUpperCase() === "TOTAL");
      return { rowIndex: i, isTotal, row };
    })
    .filter((r) => r.isTotal);

  // Also return all rows with any numeric data near col 15-25
  const allRows = rows.map((row, i) => ({ i, vals: row }));

  return NextResponse.json({ totalRows, allRows: allRows.slice(0, 30) });
}
