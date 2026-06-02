import { NextResponse } from "next/server";
import { pgGet } from "@/lib/postgrest";

export const dynamic = "force-dynamic";

const PROJECT_ID = "cmnjvabgp0077keve33sbnh4c";

// !inner joins so the project filter propagates through the hierarchy
const SELECT =
  "select=" +
  [
    "taskId",
    "taskName",
    "completed",
    "completedAt",
    "startDate",
    "endDate",
    "createdAt",
    "taskWeight",
    "order",
    "SubArea!inner(subAreaId,subAreaName,subAreaStatus,Area!inner(areaId,areaName,Tower!inner(towerId,towerName,Project!inner(projectId,projectName,projectStatus))))",
    "Department(Id,name)",
    "User(userId,firstName,lastName)",
  ].join(",");

export async function GET() {
  try {
    const PAGE = 500;
    let offset = 0;
    let all: any[] = [];
    while (true) {
      const batch = await pgGet(
        `/Task?${SELECT}&SubArea.Area.Tower.Project.projectId=eq.${PROJECT_ID}&order=createdAt.desc&limit=${PAGE}&offset=${offset}`
      );
      all = all.concat(batch);
      if (batch.length < PAGE) break;
      offset += PAGE;
      if (offset > 20000) break;
    }
    return NextResponse.json({ tasks: all, count: all.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
