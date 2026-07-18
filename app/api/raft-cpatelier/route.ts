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
    "SubArea!inner(subAreaName,Area!inner(areaName,Tower!inner(towerName,Project!inner(projectId))))",
  ].join(",");

/** Live state of each CP-Atelier raft pour: completed | overdue | upcoming. */
export async function GET() {
  try {
    const rows: any[] = await pgGet(
      `/Task?${SELECT}` +
        `&SubArea.Area.areaName=eq.${encodeURIComponent(AREA_NAME)}` +
        `&SubArea.Area.Tower.towerName=eq.${encodeURIComponent(TOWER_NAME)}` +
        `&SubArea.Area.Tower.Project.projectId=eq.${PROJECT_ID}` +
        `&limit=500`
    );

    // Group tasks by sub-area
    const bySubArea = new Map<string, { completed: boolean; endDate: string | null }[]>();
    for (const r of rows) {
      const name = r.SubArea?.subAreaName;
      if (!name) continue;
      if (!bySubArea.has(name)) bySubArea.set(name, []);
      bySubArea.get(name)!.push({ completed: !!r.completed, endDate: r.endDate ?? null });
    }

    const state: Record<string, "completed" | "overdue" | "upcoming"> = {};
    let done = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const [name, tasks] of bySubArea) {
      if (tasks.length === 0) continue;
      // A pour is "completed" only when ALL its tasks are done
      const allDone = tasks.every((t) => t.completed);
      if (allDone) {
        state[name] = "completed";
        done++;
        continue;
      }
      // Any incomplete task overdue?
      const hasOverdue = tasks.some((t) => {
        if (t.completed) return false;
        const due = t.endDate ? new Date(t.endDate) : null;
        return due !== null && due < today;
      });
      state[name] = hasOverdue ? "overdue" : "upcoming";
    }

    return NextResponse.json(
      { state, total: bySubArea.size, doneCount: done, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
