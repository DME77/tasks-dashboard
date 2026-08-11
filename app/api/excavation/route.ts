import { NextResponse } from "next/server";
import { pgGet } from "@/lib/postgrest";

export const dynamic = "force-dynamic";

const PROJECT_ID = "cmnjvabgp0077keve33sbnh4c";
const TOWER_NAME = "HGP";
const AREA_NAME  = "Excavation"; // exact area name in the ASAP database

const SELECT =
  "select=" +
  [
    "completed",
    "completedAt",
    "endDate",
    "taskName",
    "SubArea!inner(subAreaName,Area!inner(areaName,Tower!inner(towerName,Project!inner(projectId))))",
  ].join(",");

/**
 * Returns the live completion status of every excavation pour.
 *   status = { "<sub-area name>": true|false }  e.g. "Tower Pour - 1": true
 *   "done" = the pour's task is marked completed in the ASAP database.
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

    const status: Record<string, boolean> = {};
    // state: "completed" (green) | "overdue" (red, deadline passed) | "upcoming" (blue, deadline ahead)
    const state: Record<string, "completed" | "overdue" | "upcoming"> = {};
    const detail: Record<string, { completed: boolean; completedAt: string | null; endDate: string | null; task: string }> = {};
    let done = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const r of rows) {
      // Key by TASK NAME (e.g. "NTP -2") — matches pour-box labels on the drawing.
      const name = (r.taskName as string | undefined) ?? r.SubArea?.subAreaName;
      if (!name) continue;
      const completed = !!r.completed;
      const due = r.endDate ? new Date(r.endDate) : null;

      let s: "completed" | "overdue" | "upcoming";
      if (completed) {
        s = "completed"; done++;
      } else if (due && due < today) {
        s = "overdue";
      } else {
        s = "upcoming";
      }

      // "completed" wins if same task name appears multiple times
      if (!(name in state) || s === "completed") {
        status[name] = completed;
        state[name] = s;
        detail[name] = {
          completed, completedAt: r.completedAt ?? null,
          endDate: r.endDate ?? null, task: r.taskName ?? "",
        };
      }
    }

    return NextResponse.json(
      { status, state, detail, total: Object.keys(status).length, doneCount: done, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
