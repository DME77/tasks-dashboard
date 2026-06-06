import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SHEET_ID   = "1M4UkX_G3TKctUv44lzvPCruHlVobOI1gcJFncbxbx9c";
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
    return (json.table.rows as any[]).map((row: any) =>
      ((row.c as any[]) || []).map((cell: any) => ({
        v:    cell?.v ?? null,
        f:    cell?.f ?? null,
        link: cell?.p?.linkToUrl ?? null,
      }))
    );
  } catch { return null; }
}

function val(cell: Cell | undefined): CellValue { return cell?.v ?? null; }
function str(cell: Cell | undefined): string {
  const v = val(cell);
  if (v == null) return "";
  return String(v).trim();
}

/** Convert GViz "Date(2026,5,4)" → "04-Jun-26". Falls back to f then raw string. */
function formatDate(cell: Cell | undefined): string {
  if (!cell) return "";
  const v = cell.v;
  if (typeof v === "string") {
    const m = v.match(/^Date\((\d+),(\d+),(\d+)\)$/);
    if (m) {
      const day = parseInt(m[3]);
      const mon = MONTHS_SHORT[parseInt(m[2])] ?? "?";
      const yr  = parseInt(m[1]) % 100;
      return `${String(day).padStart(2,"0")}-${mon}-${String(yr).padStart(2,"0")}`;
    }
    if (v.trim()) return v.trim();
  }
  if (cell.f) return cell.f.trim();
  return "";
}

/** Returns true if the value looks like a status word rather than a date. */
function isStatusValue(s: string): boolean {
  if (!s || s === "-") return true;
  // Match known status words; also reject if it looks like a date (has digits and separators)
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(s)) return false; // DD-MM-YYYY or similar
  if (/^\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4}$/.test(s)) return false; // DD-Mon-YY
  return /^(received|shared|approved|n\/a|pending|done|engg|comments)/i.test(s) || !/\d/.test(s);
}

/* ── HGP Upcoming (sheet: "Upcoming") ───────────────────────────────────── */
export interface HgpUpcoming {
  srNo: number;
  name: string;
  location: string;
  date: string;    // formatted "DD-Mon-YY", empty if status instead
  status: string;  // e.g. "Received" when dates column has a status word
  comments: string;
}

function parseUpcoming(rows: Cell[][]): HgpUpcoming[] {
  if (!rows.length) return [];

  // Find header row (contains "Sr. No." or "Description")
  const headerIdx = rows.findIndex(row =>
    row.some(c => /^(sr\.?\s*no|s\.?\s*no|description)/i.test(str(c).trim()))
  );

  // Auto-detect column indices from header row
  // Sheet columns: Sr. No. | Description | Location | Status | Comments
  // The "Status" column in this sheet doubles as expected date OR a status word (e.g. "Received")
  let srCol = 0, nameCol = 1, locCol = 2, dateStatusCol = 3, commentsCol = 4;

  if (headerIdx >= 0) {
    rows[headerIdx].forEach((cell, i) => {
      const h = str(cell).toLowerCase().trim();
      if (/^(sr\.?\s*no|s\.?\s*no|#)/.test(h))          srCol = i;
      else if (/description|drawing|name/i.test(h))       nameCol = i;
      else if (/location|area|zone/i.test(h))             locCol = i;
      else if (/^(status|date|expected)/i.test(h))        dateStatusCol = i;
      else if (/comment|remark/i.test(h))                 commentsCol = i;
    });
  }

  const dataRows = rows.slice(headerIdx >= 0 ? headerIdx + 1 : 0);
  const items: HgpUpcoming[] = [];

  for (const row of dataRows) {
    if (!row || row.length < 2) continue;
    const v0   = val(row[srCol]);
    const srNo = typeof v0 === "number" ? v0 : parseFloat(str(row[srCol]));
    if (isNaN(srNo)) continue;
    const name = str(row[nameCol]);
    if (!name) continue;

    // The "Status" column holds either a date string or a status word like "Received"
    const rawVal = formatDate(row[dateStatusCol]);
    let date = "";
    let status = "";
    if (rawVal && rawVal !== "-") {
      if (isStatusValue(rawVal)) {
        status = rawVal;
      } else {
        date = rawVal;
      }
    }

    items.push({
      srNo, name,
      location: str(row[locCol]),
      date,
      status,
      comments: str(row[commentsCol]),
    });
  }
  return items;
}

/* ── Structural drawings (sheet: "Quart City DWGs") ─────────────────────── */
export interface StructuralDrawing {
  srNo: number;
  name: string;
  dateToArch: string;
  remarks: string;
  dateToProof: string;
}

function parseStructural(rows: Cell[][]): StructuralDrawing[] {
  if (!rows.length) return [];

  // Find header row (contains "Partculars" or "Particular")
  const headerIdx = rows.findIndex(row =>
    row.some(c => /partcul|particul|drawing/i.test(str(c)))
  );
  const dataRows = rows.slice(headerIdx >= 0 ? headerIdx + 1 : 0);
  const items: StructuralDrawing[] = [];

  for (const row of dataRows) {
    if (!row || row.length < 2) continue;
    const v0   = val(row[0]);
    const srNo = typeof v0 === "number" ? v0 : parseFloat(str(row[0]));
    if (isNaN(srNo)) continue;
    const name = str(row[1]);
    if (!name) continue;

    const rawDate = formatDate(row[2]);
    const dateToArch = (rawDate === "-" || rawDate === "") ? "" : rawDate;

    items.push({
      srNo, name,
      dateToArch,
      remarks:     str(row[3]),
      dateToProof: str(row[4]),
    });
  }
  return items;
}

/* ── MEP drawings (sheet: "MEP Dwg GFCs Date Ph-1") ─────────────────────── */
export interface MepDrawing {
  srNo: string;
  discipline: string;
  title: string;
  drawingNo: string;
  date: string;
}

function parseMep(rows: Cell[][]): MepDrawing[] {
  if (!rows.length) return [];

  const items: MepDrawing[] = [];
  let discipline = "";

  for (const row of rows) {
    if (!row || row.length === 0) continue;
    const c0 = str(row[0]);
    const c1 = str(row[1]);

    // Discipline header rows: "A)" → col 1 has discipline name
    if (/^[A-Z]\)$/i.test(c0.trim())) {
      discipline = c1 || c0;
      continue;
    }
    // Skip any header/title rows
    if (/^s\.?\s*no/i.test(c0) || /drawing title/i.test(c1) || /mep drawing/i.test(c1)) continue;

    const srNo = c0;
    if (!srNo || isNaN(parseFloat(srNo))) continue;
    const title = c1;
    if (!title) continue;

    const rawDate = formatDate(row[3]);
    items.push({
      srNo,
      discipline,
      title,
      drawingNo: str(row[2]),
      date: (rawDate === "-" ? "" : rawDate),
    });
  }
  return items;
}

/* ── GET ─────────────────────────────────────────────────────────────────── */
export async function GET() {
  const [upcomingRows, structuralRows, mepRows] = await Promise.all([
    fetchGViz("Upcoming"),
    fetchGViz("Quart City DWGs"),
    fetchGViz("MEP Dwg GFCs Date Ph-1"),
  ]);

  const upcoming   = upcomingRows   ? parseUpcoming(upcomingRows)   : [];
  const structural = structuralRows ? parseStructural(structuralRows) : [];
  const mep        = mepRows        ? parseMep(mepRows)               : [];

  return NextResponse.json(
    { upcoming, structural, mep },
    { headers: { "Cache-Control": "no-store" } }
  );
}
