import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SHEET_ID = "1MJMschYqRO8p4tLtNrO-N7ctXTmU1UcEHpzW4BnjATE";

type CellValue = string | number | null;
type Cell = { v: CellValue; f: string | null; link: string | null };

async function fetchGViz(tabName: string): Promise<Cell[][] | null> {
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
    // Capture cell value, formatted value, and hyperlink
    return (json.table.rows as any[]).map((row: any) =>
      ((row.c as any[]) || []).map((cell: any) => ({
        v:    cell?.v ?? null,
        f:    cell?.f ?? null,
        link: cell?.p?.linkToUrl ?? null,
      }))
    );
  } catch { return null; }
}

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Convert GViz "Date(2026,5,4)" → "04-Jun-26". Falls back to formatted value, then raw string. */
function formatDate(cell: Cell | undefined): string {
  if (!cell) return "";
  const v = cell.v;
  // GViz date cells have v = "Date(year,month,day)" with month 0-indexed
  if (typeof v === "string") {
    const m = v.match(/^Date\((\d+),(\d+),(\d+)\)$/);
    if (m) {
      const day = parseInt(m[3]);
      const mon = MONTHS_SHORT[parseInt(m[2])] ?? "?";
      const yr  = parseInt(m[1]) % 100;
      return `${String(day).padStart(2,"0")}-${mon}-${String(yr).padStart(2,"0")}`;
    }
    return v.trim();
  }
  // Use formatted value if GViz provided one
  if (cell.f) return cell.f.trim();
  return "";
}

function val(cell: Cell | undefined): CellValue { return cell?.v ?? null; }
function str(cell: Cell | undefined): string {
  const v = val(cell);
  if (v == null) return "";
  return String(v).trim();
}
function link(cell: Cell | undefined): string | null { return cell?.link ?? null; }

/* ── Parse Upcoming Plan sheet ───────────────────────────────────────────── */
export interface UpcomingDrawing {
  srNo: number;
  name: string;
  location: string;
  date: string;        // formatted "04-Jun-26"
  status: string;      // from sheet "Status" column
  comments: string;
}

function parseUpcoming(rows: Cell[][]): UpcomingDrawing[] {
  if (!rows.length) return [];

  // Detect header row by looking for a cell containing "drawing" or "name"
  const headerIdx = rows.findIndex(row =>
    row.some(c => /drawing|dwg|name/i.test(str(c)))
  );

  // Default column indices (fallback if no header found)
  let srCol = 0, nameCol = 1, locCol = 2, dateCol = 3, statusCol = 4, commentsCol = 5;

  if (headerIdx >= 0) {
    rows[headerIdx].forEach((cell, i) => {
      const h = str(cell).toLowerCase().trim();
      if (/^(sr[\s.]?no|s\.?no|#|no\.)/.test(h))   srCol = i;
      else if (/drawing|dwg|name/i.test(h))          nameCol = i;
      else if (/location|area|zone/i.test(h))        locCol = i;
      else if (/date|expected/i.test(h))             dateCol = i;
      else if (/^status/i.test(h))                   statusCol = i;
      else if (/comment|remark/i.test(h))            commentsCol = i;
    });
  }

  const items: UpcomingDrawing[] = [];
  const dataRows = rows.slice(headerIdx >= 0 ? headerIdx + 1 : 0);

  for (const row of dataRows) {
    if (!row || row.length < 2) continue;
    const v0   = val(row[srCol]);
    const srNo = typeof v0 === "number" ? v0 : parseFloat(str(row[srCol]));
    if (isNaN(srNo)) continue;
    const name = str(row[nameCol]);
    if (!name) continue;
    items.push({
      srNo, name,
      location: str(row[locCol]),
      date:     formatDate(row[dateCol]),
      status:   str(row[statusCol]),
      comments: str(row[commentsCol]),
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
  link: string | null;   // hyperlink from col C or col D if present
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

function parseTracker(rows: Cell[][]): TrackerDrawing[] {
  const drawings: TrackerDrawing[] = [];
  let discipline = "";

  for (const row of rows) {
    if (!row || row.length < 4) continue;

    const c0 = str(row[0]);
    const c1 = str(row[1]);
    const c3 = str(row[3]);

    // Skip the header row
    if (c0 === "Folder Link" || c1 === "S.no." || c3 === "DWG") continue;

    // Discipline label
    if (c0 && c0 !== "Folder Link") {
      const srNo = parseFloat(c1);
      if (isNaN(srNo)) { discipline = c0; continue; }
      else discipline = c0;
    }

    const srNo = parseFloat(c1);
    if (isNaN(srNo) || !c3) continue;

    const rawStatus = str(row[6]);
    const remarks   = str(row[5]);

    // Prefer link from col C (index 2), fall back to col D (index 3 = DWG name)
    const drawingLink = link(row[2]) ?? link(row[3]) ?? null;

    drawings.push({
      srNo, discipline,
      category: str(row[2]),
      name:     c3,
      link:     drawingLink,
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
