import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SHEET_ID = "1MJMschYqRO8p4tLtNrO-N7ctXTmU1UcEHpzW4BnjATE";

type CellValue = string | number | null;

async function fetchGViz(tabName: string): Promise<CellValue[][] | null> {
  const url =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
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
  } catch { return null; }
}

function str(v: CellValue | undefined): string {
  if (v == null) return "";
  return String(v).trim();
}

/* ── Parse Upcoming Plan sheet ───────────────────────────────────────────── */
export interface UpcomingDrawing {
  srNo: number;
  name: string;
  location: string;
  date: string;        // raw "04-Jun-26"
  comments: string;
}

function parseUpcoming(rows: CellValue[][]): UpcomingDrawing[] {
  const items: UpcomingDrawing[] = [];
  for (const row of rows) {
    if (!row || row.length < 2) continue;
    const srNo = typeof row[0] === "number" ? row[0] : parseFloat(str(row[0]));
    if (isNaN(srNo)) continue;       // skip header & empty rows
    const name = str(row[1]);
    if (!name) continue;
    items.push({
      srNo,
      name,
      location: str(row[2]),
      date:     str(row[3]),
      comments: str(row[4]),
    });
  }
  return items;
}

/* ── Parse Tracker sheet ─────────────────────────────────────────────────── */
export interface TrackerDrawing {
  srNo: number;
  discipline: string;
  category: string;
  name: string;
  type: string;
  remarks: string;
  status: "Received" | "N/A" | "Advance Copy" | "Partial" | "Pending";
}

function deriveStatus(rawStatus: string, remarks: string): TrackerDrawing["status"] {
  const s = (rawStatus + " " + remarks).toLowerCase();
  if (s.includes("n/a"))                          return "N/A";
  if (s.includes("adv copy") || s.includes("adv. copy") || s.includes("advance copy")) return "Advance Copy";
  if (s.includes("partial") || s.includes("partially")) return "Partial";
  if (s.includes("received"))                     return "Received";
  return "Pending";
}

function parseTracker(rows: CellValue[][]): TrackerDrawing[] {
  const drawings: TrackerDrawing[] = [];
  let discipline = "";

  for (const row of rows) {
    if (!row || row.length < 4) continue;

    const c0 = str(row[0]);
    const c1 = str(row[1]);
    const c3 = str(row[3]);

    // Skip the header row
    if (c0 === "Folder Link" || c1 === "S.no." || c3 === "DWG") continue;

    // Discipline label (col0 has text, col1 empty or starts new group)
    if (c0 && c0 !== "Folder Link") {
      const srNo = parseFloat(c1);
      if (isNaN(srNo)) {
        // Pure discipline label row
        discipline = c0;
        continue;
      } else {
        // First drawing in a discipline (discipline + srNo on same row)
        discipline = c0;
      }
    }

    const srNo = parseFloat(c1);
    if (isNaN(srNo) || !c3) continue;

    const rawStatus = str(row[6]);
    const remarks   = str(row[5]);

    drawings.push({
      srNo,
      discipline,
      category: str(row[2]),
      name:     c3,
      type:     str(row[4]),
      remarks,
      status:   deriveStatus(rawStatus, remarks),
    });
  }
  return drawings;
}

/* ── GET ─────────────────────────────────────────────────────────────────── */
export async function GET() {
  const [trackerRows, upcomingRows] = await Promise.all([
    fetchGViz("Tracker_CP Atelier_GFC"),
    fetchGViz("Upcoming Plan"),
  ]);

  const tracker  = trackerRows  ? parseTracker(trackerRows)   : [];
  const upcoming = upcomingRows ? parseUpcoming(upcomingRows) : [];

  // Summary counts
  const received    = tracker.filter(d => d.status === "Received").length;
  const advCopy     = tracker.filter(d => d.status === "Advance Copy").length;
  const partial     = tracker.filter(d => d.status === "Partial").length;
  const na          = tracker.filter(d => d.status === "N/A").length;
  const pending     = tracker.filter(d => d.status === "Pending").length;

  return NextResponse.json(
    {
      tracker, upcoming,
      summary: { total: tracker.length, received, advCopy, partial, na, pending },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
