"use client";
import type { Task } from "./types";

function isOverdue(t: Task) {
  if (t.completed) return false;
  if (!t.endDate) return false;
  return new Date(t.endDate).getTime() < Date.now();
}

export default function KPIs({ tasks }: { tasks: Task[] }) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter(isOverdue).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const now = Date.now();
  const sevenDayMs = 7 * 24 * 60 * 60 * 1000;
  const completedThisWeek = tasks.filter(
    (t) => t.completed && t.completedAt && now - new Date(t.completedAt).getTime() < sevenDayMs
  ).length;

  const items = [
    { label: "Total tasks", value: total },
    { label: "Completed", value: completed, delta: `${pct}% done` },
    { label: "Pending", value: pending },
    { label: "Overdue", value: overdue, accent: overdue > 0 ? "red" : undefined },
    { label: "Done last 7 days", value: completedThisWeek },
  ];

  return (
    <div className="kpis">
      {items.map((it) => (
        <div className="kpi" key={it.label}>
          <div className="label">{it.label}</div>
          <div className="value" style={it.accent === "red" ? { color: "var(--red)" } : undefined}>
            {it.value}
          </div>
          {it.delta && <div className="delta">{it.delta}</div>}
        </div>
      ))}
    </div>
  );
}
