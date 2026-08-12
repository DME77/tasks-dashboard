import { NextResponse } from "next/server";
import { pgGet } from "@/lib/postgrest";

export const dynamic = "force-dynamic";

const PROJECT_ID  = "cmnjvabgp0077keve33sbnh4c";
const TOWER_NAME  = "HOMELAND -ATELIER";

const AREA_BY_LEVEL: Record<string, string> = {
  b2: "Slab Casting - B2 Level",
  b1: "Slab Casting - B1 Level",
  gf: "Slab Casting - GF Level",
};

const SELECT =
  "select=" +
  [
    "completed",
    "completedAt",
    "endDate",
    "SubArea!inner(subAreaName,Area!inner(areaName,Tower!inner(towerName,Project!inner(projectId))))",
  ].join(",");

/**
 * Live pour state for Homeland Atelier slab areas.
 * ?level=b2 | b1 | gf
 * Returns { state: { "Pour - 1": "completed"|"overdue"|"upcoming", … } }
 * A pour (sub-area) is completed when ALL its tasks are done.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const level = (searchParams.get("level") ?? "b2").toLowerCase();
  const areaName = AREA_BY_LEVEL[level];
  if (!areaName) {
    return NextResponse.json({ error: `Unknown level: ${level}` }, { status: 400 });
  }

  try {
    const rows: any[] = await pgGet(
      `/Task?${SELECT}` +
        `&SubArea.Area.areaName=eq.${encodeURIComponent(areaName)}` +
        `&SubArea.Area.Tower.towerName=eq.${encodeURIComponent(TOWER_NAME)}` +
        `&SubArea.Area.Tower.Project.projectId=eq.${PROJECT_ID}` +
        `&limit=500`
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group tasks by pour (sub-area)
    const byPour: Record<string, { total: number; done: number; overdueOpen: boolean }> = {};
    for (const r of rows) {
      const name = r.SubArea?.subAreaName as string | undefined;
      if (!name) continue;
      const p = (byPour[name] ??= { total: 0, done: 0, overdueOpen: false });
      p.total++;
      if (r.completed) p.done++;
      else if (r.endDate && new Date(r.endDate) < today) p.overdueOpen = true;
    }

    const state: Record<string, "completed" | "overdue" | "upcoming"> = {};
    let doneCount = 0;
    for (const [name, p] of Object.entries(byPour)) {
      if (p.done === p.total && p.total > 0) { state[name] = "completed"; doneCount++; }
      else if (p.overdueOpen)                 state[name] = "overdue";
      else                                    state[name] = "upcoming";
    }

    return NextResponse.json(
      { state, byPour, level, total: Object.keys(state).length, doneCount, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
