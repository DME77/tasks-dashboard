"use client";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Area,
  Line,
  CartesianGrid,
} from "recharts";
import type { Task } from "./types";

function byKey(
  tasks: Task[],
  keyer: (t: Task) => string | undefined
): { name: string; total: number; completed: number }[] {
  const out = new Map<string, { name: string; total: number; completed: number }>();
  for (const t of tasks) {
    const k = keyer(t) || "—";
    const v = out.get(k) || { name: k, total: 0, completed: 0 };
    v.total += 1;
    if (t.completed) v.completed += 1;
    out.set(k, v);
  }
  return [...out.values()].sort((a, b) => b.total - a.total);
}

export default function Charts({
  tasks,
  theme,
}: {
  tasks: Task[];
  theme: "dark" | "light";
}) {
  const isDark = theme === "dark";

  // Theme-aware chart colours
  const tooltipStyle = {
    background: isDark ? "#182142" : "#ffffff",
    border: `1px solid ${isDark ? "#25305a" : "#ccd4ee"}`,
    borderRadius: 8,
    color: isDark ? "#e6ecff" : "#1a2040",
  };
  const gridColor = isDark ? "#25305a" : "#ccd4ee";
  const axisColor = isDark ? "#9aa6cc" : "#5a6890";

  // ── Data derivations ───────────────────────────────────────────────────
  const byTower = useMemo(
    () => byKey(tasks, (t) => t.SubArea?.Area?.Tower?.towerName),
    [tasks]
  );

  const byArea = useMemo(
    () => byKey(tasks, (t) => t.SubArea?.Area?.areaName),
    [tasks]
  );

  const statusData = useMemo(() => {
    const completed = tasks.filter((t) => t.completed).length;
    const d = new Date();
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const overdue = tasks.filter(
      (t) => !t.completed && t.endDate && new Date(t.endDate).getTime() < midnight
    ).length;
    const pending = tasks.length - completed - overdue;
    return [
      { name: "Completed", value: completed, color: "#4ade80" },
      { name: "Pending", value: pending, color: "#6ea8ff" },
      { name: "Overdue", value: overdue, color: "#f87171" },
    ].filter((d) => d.value > 0);
  }, [tasks]);

  // Cumulative burn-up: weekly snapshots from first task creation → today
  const cumulativeProgress = useMemo(() => {
    if (!tasks.length) return [];

    const sorted = [...tasks].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const startDate = new Date(sorted[0].createdAt);
    startDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const result: { week: string; total: number; completed: number }[] = [];
    const cursor = new Date(startDate);

    while (cursor <= today) {
      const cutoff = cursor.getTime();
      const label = cursor.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const total = tasks.filter(
        (t) => new Date(t.createdAt).getTime() <= cutoff
      ).length;
      const completed = tasks.filter(
        (t) =>
          t.completed &&
          t.completedAt &&
          new Date(t.completedAt).getTime() <= cutoff
      ).length;
      result.push({ week: label, total, completed });
      cursor.setDate(cursor.getDate() + 7);
    }

    return result;
  }, [tasks]);

  const tickInterval = Math.max(0, Math.floor(cumulativeProgress.length / 8) - 1);

  // Dynamic height for area chart (so many areas don't overflow)
  const areaChartHeight = Math.max(220, byArea.length * 34 + 40);

  return (
    <>
      {/* ── Cumulative progress (full width, hero chart) ──────────────── */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Project Progress Over Time</h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <ComposedChart
              data={cumulativeProgress}
              margin={{ top: 8, right: 24, bottom: 8, left: 0 }}
            >
              <defs>
                <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                stroke={axisColor}
                tick={{ fontSize: 11 }}
                interval={tickInterval}
              />
              <YAxis stroke={axisColor} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {/* Total tasks — dashed reference line */}
              <Line
                type="monotone"
                dataKey="total"
                stroke="#6ea8ff"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                name="Total tasks"
              />
              {/* Completed — filled area */}
              <Area
                type="monotone"
                dataKey="completed"
                fill="url(#completedGrad)"
                stroke="#4ade80"
                strokeWidth={2.5}
                dot={false}
                name="Completed"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Status pie + Tasks by tower ───────────────────────────────── */}
      <div className="grid-2">
        <div className="panel">
          <h3>Status breakdown</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label={({ name, percent }) =>
                    `${name} ${Math.round(percent * 100)}%`
                  }
                  labelLine={false}
                >
                  {statusData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <h3>Tasks by tower</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart
                data={byTower}
                margin={{ top: 8, right: 8, bottom: 40, left: 0 }}
              >
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  stroke={axisColor}
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke={axisColor} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="completed" fill="#4ade80" name="Completed" radius={[3, 3, 0, 0]} />
                <Bar dataKey="total" fill="#6ea8ff" name="Total" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Tasks by area (horizontal bar) ───────────────────────────── */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Tasks by area</h3>
        <div style={{ width: "100%", height: areaChartHeight }}>
          <ResponsiveContainer>
            <BarChart
              data={byArea}
              layout="vertical"
              margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
            >
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis type="number" stroke={axisColor} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                stroke={axisColor}
                tick={{ fontSize: 11 }}
                width={160}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="completed" fill="#4ade80" name="Completed" radius={[0, 3, 3, 0]} />
              <Bar dataKey="total" fill="#6ea8ff" name="Total" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
