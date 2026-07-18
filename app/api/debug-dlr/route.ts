import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HGP_SHEET = "1HMhOuyKtRh64ndlPuP9SfRXB8UEi6KXYDAyvWP7MNgo";

async function fetchByGid(sheetId: string, gid: string) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const match = text.match(/setResponse\(([\s\S]*)\)/);
  if (!match) return null;
  try {
    const json = JSON.parse(match[1]);
    if (json.status !== "ok") return null;
    return (json.table.rows as any[]).map((row: any) =>
      ((row.c as any[]) || []).map((cell: any) => cell?.v ?? null)
    );
  } catch { return null; }
}

async function fetchByTab(sheetId: string, tab: string) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const match = text.match(/setResponse\(([\s\S]*)\)/);
  if (!match) return null;
  try {
    const json = JSON.parse(match[1]);
    if (json.status !== "ok") return null;
    return (json.table.rows as any[]).map((row: any) =>
      ((row.c as any[]) || []).map((cell: any) => cell?.v ?? null)
    );
  } catch { return null; }
}

export async function GET() {
  const gidRows = await fetchByGid(HGP_SHEET, "1406742693");

  return NextResponse.json({
    rowCount: gidRows?.length ?? 0,
    // Return ALL rows so we can see every cell including CARPENTERS
    allRows: gidRows
      ? gidRows.map((r, i) => ({ row: i + 1, vals: r.slice(0, 10) }))
      : null,
  });
}
