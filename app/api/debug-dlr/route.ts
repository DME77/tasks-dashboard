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

  // Return first 20 rows so we can see B3:B9 (0-indexed rows 2-8)
  const first20 = rows.slice(0, 20).map((row, i) => ({
    spreadsheetRow: i + 1,
    colA: row[0],
    colB: row[1],
    colC: row[2],
    colD: row[3],
    fullRow: row.slice(0, 8),
  }));

  // B3:B9 specifically (0-indexed rows 2-8)
  const b3b9 = rows.slice(2, 9).map((row, i) => ({
    spreadsheetRow: i + 3,
    colB: row[1],
    colC: row[2],
    fullRow: row.slice(0, 8),
  }));

  return NextResponse.json({ b3b9, first20 });
}
