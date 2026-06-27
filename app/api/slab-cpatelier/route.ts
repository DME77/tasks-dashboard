import { NextResponse } from "next/server";
import { pgGet } from "@/lib/postgrest";

export const dynamic = "force-dynamic";

const PROJECT_ID = "cmnjvabgp0077keve33sbnh4c";
const TOWER_NAME = "CP -ATELIER";
const AREA_NAME = "Column and Slab work";

const SELECT =
  "select=" +
  [
    "completed",
    "endDate",
    "taskName",
    "SubArea!inner(subAreaName,subAreaStatus,Area!inner(areaName,Tower!inner(towerName,Project!inner(projectId))))",
  ].join(",");

/**
 * Live state of each slab pour. Each pour has multiple tasks; a pour is:
 *   completed -> ALL its tasks are complete
 *   hold      -> not complete AND the sub-area is inactive (paused)
 *   overdue   -> not all complete AND some incomplete task's deadline has passed
 *   upcoming  -> otherwise
 */
export async function GET() {
  try {
    const rows: any[] = await pgGet(
      `/Task?${SELECT}` +
        `&SubArea.Area.areaName=eq.${encodeURIComponent(AREA_NAME)}` +
        `&SubArea.Area.Tower.towerName=eq.${encodeURIComponent(TOWER_NAME)}` +
        `&SubArea.Area.Tower.Project.projectId=eq.${PROJECT_ID}` +
        `&limit=1000`
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // group tasks by pour (sub-area)
    const byPour: Record<string, { total: number; done: number; overdueOpen: boolean; active: boolean }> = {};
    for (const r of rows) {
      const name = r.SubArea?.subAreaName;
      if (!name) continue;
      const p = (byPour[name] ??= { total: 0, done: 0, overdueOpen: false, active: true });
      p.total++;
      if (r.SubArea?.subAreaStatus && r.SubArea.subAreaStatus !== "active") p.active = false;
      if (r.completed) p.done++;
      else if (r.endDate && new Date(r.endDate) < today) p.overdueOpen = true;
    }

    const state: Record<string, "completed" | "overdue" | "upcoming" | "hold"> = {};
    let done = 0;
    for (const [name, p] of Object.entries(byPour)) {
      if (p.done === p.total) { state[name] = "completed"; done++; }
      else if (!p.active) state[name] = "hold";
      else if (p.overdueOpen) state[name] = "overdue";
      else state[name] = "upcoming";
    }

    return NextResponse.json(
      { state, byPour, total: Object.keys(state).length, doneCount: done, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
