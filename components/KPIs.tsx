"use client";
import type { Task, ActiveFilter } from "./types";

function todayMidnight() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function isOverdue(t: Task) {
  if (t.completed) return false;
  if (!t.endDate) return false;
  // Overdue = due date is strictly BEFORE today (past days only)
  // Today's tasks remain "pending" until the day is over
  return new Date(t.endDate).getTime() < todayMidnight();
}

interface KpiItem {
  label: string;
  value: number;
  delta?: string;
  icon: string;
  colorClass: string;        // kpi-blue | kpi-green | kpi-gray | kpi-red | kpi-amber
  filter?: ActiveFilter;
}

export default function KPIs({
  tasks,
  selected,
  onSelect,
}: {
  tasks: Task[];
  selected: ActiveFilter;
  onSelect: (f: ActiveFilter) => void;
}) {
  const total     = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const overdue   = tasks.filter(isOverdue).length;
  const pending   = total - completed - overdue;
  const pct       = total ? Math.round((completed / total) * 100) : 0;

  const now          = Date.now();
  const sevenDayMs   = 7 * 24 * 60 * 60 * 1000;
  const completedThisWeek = tasks.filter(
    (t) =>
      t.completed &&
      t.completedAt &&
      now - new Date(t.completedAt).getTime() < sevenDayMs
  ).length;

  const items: KpiItem[] = [
    {
      label: "Total Tasks",
      value: total,
      icon: "📋",
      colorClass: "kpi-blue",
    },
    {
      label: "Completed",
      value: completed,
      delta: `${pct}% of all tasks`,
      icon: "✅",
      colorClass: "kpi-green",
      filter: "completed",
    },
    {
      label: "Pending",
      value: pending,
      delta: "In progress",
      icon: "🔄",
      colorClass: "kpi-gray",
      filter: "pending",
    },
    {
      label: "Overdue",
      value: overdue,
      delta: overdue > 0 ? "Needs attention" : "All on track",
      icon: "⚠️",
      colorClass: "kpi-red",
      filter: "overdue",
    },
    {
      label: "Done last 7 days",
      value: completedThisWeek,
      delta: "Recent activity",
      icon: "📅",
      colorClass: "kpi-amber",
      filter: "week",
    },
  ];

  return (
    <div className="kpis">
      {items.map((it) => {
        const isActive = it.filter != null && selected === it.filter;
        return (
          <div
            key={it.label}
            className={[
              "kpi",
              it.colorClass,
              it.filter ? "clickable" : "",
              isActive ? "active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => it.filter && onSelect(it.filter)}
            title={
              it.filter
                ? isActive
                  ? "Click to close"
                  : `Click to see ${it.label.toLowerCase()}`
                : undefined
            }
          >
            <span className="kpi-icon">{it.icon}</span>
            <div className="label">{it.label}</div>
            <div className="value">{it.value}</div>
            {it.delta && <div className="delta">{it.delta}</div>}
            {it.filter && (
              <div className="kpi-action">
                {isActive ? "Hide ▲" : "View all →"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
