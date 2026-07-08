import { NextResponse } from "next/server";
import { pgGet } from "@/lib/postgrest";

export const dynamic = "force-dynamic";

const PROJECT_ID = "cmnjvabgp0077keve33sbnh4c";
const TOWER_NAME = "HGP";
const AREA_NAME  = "Basement Raft Work";

const SELECT =
  "select=" +
  [
    "completed",
    "completedAt",
    "endDate",
    "taskName",
    "SubArea!inner(subAreaId,subAreaName,subAreaStatus,Area!inner(areaName,Tower!inner(towerName,Project!inner(projectId))))",
  ].join(",");

/** Live state of each HGP basement raft pour: completed | overdue | upcoming. */
export async function GET() {
  try {
    const rows: any[] = await pgGet(
      `/Task?${SELECT}` +
        `&SubArea.Area.areaName=eq.${encodeURIComponent(AREA_NAME)}` +
        `&SubArea.Area.Tower.towerName=eq.${encodeURIComponent(TOWER_NAME)}` +
        `&SubArea.Area.Tower.Project.projectId=eq.${PROJECT_ID}` +
        `&limit=500`
    );

    const state: Record<string, "completed" | "overdue" | "upcoming"> = {};
    const subAreaDone = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Also fetch sub-area status directly (subAreaStatus = "completed" marks the whole sub-area done)
    const subAreas: any[] = await pgGet(
      `/SubArea?select=subAreaId,subAreaName,subAreaStatus,Area!inner(areaName,Tower!inner(towerName,Project!inner(projectId)))` +
        `&Area.areaName=eq.${encodeURIComponent(AREA_NAME)}` +
        `&Area.Tower.towerName=eq.${encodeURIComponent(TOWER_NAME)}` +
        `&Area.Tower.Project.projectId=eq.${PROJECT_ID}`
    );

    for (const sa of subAreas) {
      const name = sa.subAreaName;
      if (!name) continue;
      if (sa.subAreaStatus?.toLowerCase() === "completed") {
        subAreaDone.add(name);
        state[name] = "completed";
      }
    }

    // Layer in task-level completions
    for (const r of rows) {
      const name = r.SubArea?.subAreaName;
      if (!name) continue;
      if (subAreaDone.has(name)) continue; // already marked done at sub-area level

      const completed = !!r.completed;
      if (completed) {
        state[name] = "completed";
      } else if (!state[name]) {
        const due = r.endDate ? new Date(r.endDate) : null;
        state[name] = due && due < today ? "overdue" : "upcoming";
      }
    }

    const doneCount = Object.values(state).filter((s) => s === "completed").length;

    return NextResponse.json(
      { state, total: Object.keys(state).length, doneCount, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
