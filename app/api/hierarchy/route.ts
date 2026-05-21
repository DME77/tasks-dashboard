import { NextResponse } from "next/server";
import { pgGet } from "@/lib/postgrest";

export const dynamic = "force-dynamic";

const PROJECT_ID = "cmnjvabgp0077keve33sbnh4c";

export async function GET() {
  try {
    const projects = await pgGet(
      `/Project?select=projectId,projectName,projectStatus,Tower(towerId,towerName,towerStatus,Area(areaId,areaName,areaStatus,SubArea(subAreaId,subAreaName,subAreaStatus)))&projectId=eq.${PROJECT_ID}&order=projectName.asc`
    );
    return NextResponse.json({ projects });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
