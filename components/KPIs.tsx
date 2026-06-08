"use client";
import type { Task, ActiveFilter } from "./types";

function todayMidnight() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function isOverdue(t: Task) {
  if (t.completed) return false;
  if (t.SubArea?.subAreaStatus === "inactive") return false; // hold tasks are not overdue
  if (!t.endDate) return false;
  return new Date(t.endDate).getTime() < todayMidnight();
}
function isOnHold(t: Task) {
  return !t.completed && t.SubArea?.subAreaStatus === "inactive";
}
function isOnSchedule(t: Task) {
  return !t.completed && !isOnHold(t) && !isOverdue(t) && (!!t.endDate || !!t.startDate);
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
  const total      = tasks.length;
  const completed  = tasks.filter((t) => t.completed).length;
  const hold       = tasks.filter(isOnHold).length;
  const overdue    = tasks.filter(isOverdue).length;
  const onSchedule = tasks.filter(isOnSchedule).length;
  // Pending = no dates, not completed, not on hold, not overdue
  const pending    = total - completed - overdue - hold - onSchedule;
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
      label: "On Schedule",
      value: onSchedule,
      delta: "Dates planned",
      icon: "🗓️",
      colorClass: "kpi-blue",
      filter: "on_schedule",
    },
    {
      label: "Pending",
      value: pending,
      delta: "No dates set",
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
    // Only shown when the current filter contains on-hold tasks
    ...(hold > 0 ? [{
      label: "On Hold",
      value: hold,
      delta: "Inactive sub-areas",
      icon: "⏸️",
      colorClass: "kpi-amber",
      filter: "hold" as const,
    }] : []),
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
