import { NextResponse } from "next/server";
import { pgGet } from "@/lib/postgrest";

export const dynamic = "force-dynamic";

const PROJECT_ID = "cmnjvabgp0077keve33sbnh4c";
const TOWER_NAME = "CP -ATELIER";
const AREA_NAME = "Basement Raft work";

const SELECT =
  "select=" +
  [
    "completed",
    "completedAt",
    "endDate",
    "taskName",
    "SubArea!inner(subAreaName,subAreaStatus,Area!inner(areaName,Tower!inner(towerName,Project!inner(projectId))))",
  ].join(",");

/** Live state of each CP-Atelier raft pour: completed | overdue | upcoming | hold. */
export async function GET() {
  try {
    const rows: any[] = await pgGet(
      `/Task?${SELECT}` +
        `&SubArea.Area.areaName=eq.${encodeURIComponent(AREA_NAME)}` +
        `&SubArea.Area.Tower.towerName=eq.${encodeURIComponent(TOWER_NAME)}` +
        `&SubArea.Area.Tower.Project.projectId=eq.${PROJECT_ID}` +
        `&limit=500`
    );

    const state: Record<string, "completed" | "overdue" | "upcoming" | "hold"> = {};
    const detail: Record<string, { completed: boolean; completedAt: string | null; endDate: string | null }> = {};
    let done = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const r of rows) {
      const name = r.SubArea?.subAreaName;
      if (!name) continue;
      const completed = !!r.completed;
      detail[name] = { completed, completedAt: r.completedAt ?? null, endDate: r.endDate ?? null };
      if (completed) {
        state[name] = "completed";
        done++;
      } else if (r.SubArea?.subAreaStatus && r.SubArea.subAreaStatus !== "active") {
        state[name] = "hold";
      } else {
        const due = r.endDate ? new Date(r.endDate) : null;
        state[name] = due && due < today ? "overdue" : "upcoming";
      }
    }

    return NextResponse.json(
      { state, detail, total: Object.keys(state).length, doneCount: done, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
