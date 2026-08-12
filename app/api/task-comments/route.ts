import { NextResponse } from "next/server";
import { pgGet } from "@/lib/postgrest";

export const dynamic = "force-dynamic";

/**
 * Returns the latest Chatmessage per taskId across the project.
 * Chain: Chatmessage → Chatroom → Step → Task
 *
 * Response shape:
 *   { [taskId]: { message, senderName, senderEmail, createdAt } }
 */
export async function GET() {
  try {
    // Fetch all chat messages ordered newest-first, following the relation chain
    const SELECT =
      "select=id,message,senderName,senderEmail,createdAt," +
      "Chatroom!inner(Step!inner(taskId))";

    const rows: any[] = await pgGet(
      `/Chatmessage?${SELECT}&order=createdAt.desc&limit=2000`
    );

    // Group by taskId – take the first (most recent) per task since rows are newest-first
    const latest: Record<
      string,
      { message: string; senderName: string; senderEmail: string; createdAt: string }
    > = {};

    for (const row of rows) {
      const taskId = row?.Chatroom?.Step?.taskId;
      if (!taskId) continue;
      if (!latest[taskId]) {
        latest[taskId] = {
          message:     row.message     ?? "",
          senderName:  row.senderName  ?? "",
          senderEmail: row.senderEmail ?? "",
          createdAt:   row.createdAt   ?? "",
        };
      }
    }

    return NextResponse.json(latest, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
