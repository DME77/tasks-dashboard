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
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import type { Task } from "./types";

const PALETTE = ["#6ea8ff", "#8a7dff", "#4ade80", "#fbbf24", "#f87171", "#22d3ee", "#f472b6", "#a3e635", "#facc15"];

function byKey(tasks: Task[], keyer: (t: Task) => string | undefined) {
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

export default function Charts({ tasks }: { tasks: Task[] }) {
  const byDept = useMemo(() => byKey(tasks, (t) => t.Department?.name), [tasks]);
  const byProject = useMemo(
    () => byKey(tasks, (t) => t.SubArea?.Area?.Tower?.Project?.projectName),
    [tasks]
  );
  const statusData = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const now = Date.now();
    const overdue = tasks.filter(
      (t) => !t.completed && t.endDate && new Date(t.endDate).getTime() < now
    ).length;
    const pending = total - completed - overdue;
    return [
      { name: "Completed", value: completed, color: "#4ade80" },
      { name: "Pending", value: pending, color: "#6ea8ff" },
      { name: "Overdue", value: overdue, color: "#f87171" },
    ].filter((d) => d.value > 0);
  }, [tasks]);

  const trend = useMemo(() => {
    // Last 30 days of completions
    const days: { day: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const counts = new Map<string, number>();
    for (const t of tasks) {
      if (!t.completed || !t.completedAt) continue;
      const d = new Date(t.completedAt);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: key.slice(5), count: counts.get(key) || 0 });
    }
    return days;
  }, [tasks]);

  return (
    <>
      <div className="grid-2">
        <div className="panel">
          <h3>Tasks by department</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={byDept} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="#25305a" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#9aa6cc" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="#9aa6cc" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#182142", border: "1px solid #25305a", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="completed" stackId="a" fill="#4ade80" name="Completed" />
                <Bar dataKey="total" stackId="b" fill="#6ea8ff" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <h3>Status breakdown</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#182142", border: "1px solid #25305a", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Tasks by project</h3>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={byProject} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 80 }}>
                <CartesianGrid stroke="#25305a" strokeDasharray="3 3" />
                <XAxis type="number" stroke="#9aa6cc" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" stroke="#9aa6cc" tick={{ fontSize: 11 }} width={140} />
                <Tooltip contentStyle={{ background: "#182142", border: "1px solid #25305a", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="completed" fill="#4ade80" name="Completed" />
                <Bar dataKey="total" fill="#6ea8ff" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <h3>Completions — last 30 days</h3>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="#25305a" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#9aa6cc" tick={{ fontSize: 11 }} interval={4} />
                <YAxis stroke="#9aa6cc" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#182142", border: "1px solid #25305a", borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" stroke="#8a7dff" strokeWidth={2} dot={false} name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
