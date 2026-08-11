import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SHEET_IDS: Record<string, string> = {
  acc:    "12-LjA4f1s58ye7O0Ng-LM4EsEHfCMOtVFz_uZ48GfkE",
  ethimo: "1Gmswb5qlJntyNRiiSfGoAIEoZ8y0KiJzuBup6Qvnj6g",
};

type CellValue = string | number | null;

async function fetchGViz(sheetId: string, tab?: string): Promise<CellValue[][] | null> {
  const url =
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq` +
    `?tqx=out:json${tab ? `&sheet=${encodeURIComponent(tab)}` : ""}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/setResponse\(([\s\S]*)\)/);
    if (!match) return null;
    const json = JSON.parse(match[1]);
    if (json.status !== "ok") return null;
    // Also extract column labels
    const cols: string[] = (json.table.cols as any[]).map((c: any) => c.label || c.id || "");
    const rows: CellValue[][] = (json.table.rows as any[]).map((row: any) =>
      ((row.c as any[]) || []).map((cell: any) => {
        if (cell === null) return null;
        return cell.f ?? cell.v ?? null;   // prefer formatted string over raw value
      })
    );
    return [cols, ...rows];
  } catch {
    return null;
  }
}

/** Fetch sheet tab names from GViz (trick: request bogus tab → error lists real tabs). */
async function fetchTabNames(sheetId: string): Promise<string[]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=__INVALID__`;
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    // Error message contains: "Invalid query: No such sheet: __INVALID__. Available sheets: Sheet1, Sheet2 ..."
    const m = text.match(/Available sheets?:\s*([^"<]+)/i);
    if (m) return m[1].split(",").map((s) => s.trim()).filter(Boolean);
  } catch {}
  return [];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const source = (searchParams.get("source") || "acc").toLowerCase();
  const tab    = searchParams.get("tab") || undefined;

  const sheetId = SHEET_IDS[source];
  if (!sheetId) return NextResponse.json({ error: "Unknown source" }, { status: 400 });

  const [tabs, rows] = await Promise.all([
    fetchTabNames(sheetId),
    fetchGViz(sheetId, tab),
  ]);

  return NextResponse.json(
    { source, tab: tab ?? null, tabs, rows },
    { headers: { "Cache-Control": "no-store" } }
  );
}
