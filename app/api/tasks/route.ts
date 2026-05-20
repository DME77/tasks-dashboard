import { NextResponse } from "next/server";
import { pgGet } from "@/lib/postgrest";

export const dynamic = "force-dynamic";

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
    "SubArea(subAreaId,subAreaName,Area(areaId,areaName,Tower(towerId,towerName,Project(projectId,projectName,projectStatus))))",
    "Department(Id,name)",
    "User(userId,firstName,lastName)"
  ].join(",");

export async function GET() {
  try {
    const PAGE = 500;
    let offset = 0;
    let all: any[] = [];
    while (true) {
      const batch = await pgGet(
        `/Task?${SELECT}&order=createdAt.desc&limit=${PAGE}&offset=${offset}`
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
