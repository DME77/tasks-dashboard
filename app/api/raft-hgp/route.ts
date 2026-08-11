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
    "SubArea!inner(subAreaName,Area!inner(areaName,Tower!inner(towerName,Project!inner(projectId))))",
  ].join(",");

type PourState = "completed" | "overdue" | "upcoming";

/**
 * A sub-area is:
 *   "completed" — every task in it is completed, OR all incomplete tasks have
 *                 endDate in the past (auto-green when scheduled date passes)
 *   "overdue"   — (unused — overdue is now auto-completed)
 *   "upcoming"  — has incomplete tasks, none overdue yet
 *
 * Sub-areas with no tasks are omitted (no colour on drawing).
 */
export async function GET() {
  try {
    const rows: any[] = await pgGet(
      `/Task?${SELECT}` +
        `&SubArea.Area.areaName=eq.${encodeURIComponent(AREA_NAME)}` +
        `&SubArea.Area.Tower.towerName=eq.${encodeURIComponent(TOWER_NAME)}` +
        `&SubArea.Area.Tower.Project.projectId=eq.${PROJECT_ID}` +
        `&limit=500`
    );

    // Key state by TASK NAME (e.g. "NTP -2") — this matches the pour-box labels on the drawing.
    // Sub-area names (e.g. "Zone -1 (Part 1)") are a grouping layer above the individual zones.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const state: Record<string, PourState> = {};
    let doneCount = 0;

    for (const r of rows) {
      const name = r.taskName as string | undefined;
      if (!name) continue;

      const completed = !!r.completed;
      const due = r.endDate ? new Date(r.endDate) : null;

      let s: PourState;
      if (completed) {
        s = "completed";
        doneCount++;
      } else if (due && due < today) {
        // Auto-complete: scheduled date passed → treat as completed (green)
        s = "completed";
        doneCount++;
      } else {
        s = "upcoming";
      }

      // If the same task name appears multiple times, "completed" wins over others
      if (!(name in state) || s === "completed") {
        state[name] = s;
      }
    }

    return NextResponse.json(
      { state, total: Object.keys(state).length, doneCount, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
