import { NextResponse } from "next/server";
import { pgGet } from "@/lib/postgrest";

export const dynamic = "force-dynamic";

const PROJECT_ID = "cmnjvabgp0077keve33sbnh4c";
const AREA_NAME  = "D -Wall Work"; // exact area name in the ASAP database

// Map sub-area name → panel type letter used on the drawing (A1, B2, …)
const TYPE_LETTER: Record<string, string> = {
  "Type - A": "A",
  "Type - B": "B",
  "Type - C": "C",
  "Type - D": "D",
};

const SELECT =
  "select=" +
  [
    "order",
    "completed",
    "completedAt",
    "taskName",
    "SubArea!inner(subAreaName,Area!inner(areaName,Tower!inner(Project!inner(projectId))))",
  ].join(",");

/**
 * Returns the live completion status of every diaphragm-wall panel.
 *   A panel ID = <type letter> + <task order>, e.g. Type-A / order 1 → "A1".
 *   "done" = the panel's task is marked completed in the ASAP database.
 */
export async function GET() {
  try {
    const rows: any[] = await pgGet(
      `/Task?${SELECT}` +
        `&SubArea.Area.areaName=eq.${encodeURIComponent(AREA_NAME)}` +
        `&SubArea.Area.Tower.Project.projectId=eq.${PROJECT_ID}` +
        `&order=order.asc&limit=1000`
    );

    const byType: Record<string, { total: number; done: number; donePanels: string[] }> = {
      A: { total: 0, done: 0, donePanels: [] },
      B: { total: 0, done: 0, donePanels: [] },
      C: { total: 0, done: 0, donePanels: [] },
      D: { total: 0, done: 0, donePanels: [] },
    };
    const done: string[] = [];

    for (const r of rows) {
      const letter = TYPE_LETTER[r.SubArea?.subAreaName ?? ""];
      if (!letter) continue;
      const n = typeof r.order === "number" ? r.order : parseInt(r.order, 10);
      if (!n || n < 1) continue;
      const id = `${letter}${n}`;
      byType[letter].total++;
      if (r.completed) {
        byType[letter].done++;
        byType[letter].donePanels.push(id);
        done.push(id);
      }
    }

    const total     = Object.values(byType).reduce((s, t) => s + t.total, 0);
    const doneCount = done.length;

    return NextResponse.json(
      { done, byType, total, doneCount, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
