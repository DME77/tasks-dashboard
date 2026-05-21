"use client";
import { useEffect, useMemo, useState } from "react";
import KPIs from "./KPIs";
import Charts from "./Charts";
import TaskTable from "./TaskTable";
import DrillDown from "./DrillDown";
import type { Task, ProjectNode } from "./types";

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [projects, setProjects] = useState<ProjectNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved === "light") {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("theme", next);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [t, h] = await Promise.all([
          fetch("/api/tasks").then((r) => r.json()),
          fetch("/api/hierarchy").then((r) => r.json()),
        ]);
        if (cancelled) return;
        if (t.error) throw new Error(t.error);
        if (h.error) throw new Error(h.error);
        setTasks(t.tasks || []);
        setProjects(h.projects || []);
      } catch (e: any) {
        setError(e.message || String(e));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const lastUpdated = useMemo(() => new Date().toLocaleString(), [tasks]);

  return (
    <div className="container">
      <header className="app">
        <div>
          <h1>Tasks Dashboard</h1>
          <div className="sub">
            Homeland Group — all tasks across projects, towers and areas.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <div className="sub">Loaded at {lastUpdated}</div>
        </div>
      </header>

      {error && <div className="error">Error loading data: {error}</div>}

      {!tasks && !error && <div className="loading">Loading tasks…</div>}

      {tasks && (
        <>
          <KPIs tasks={tasks} />
          <Charts tasks={tasks} />
          <div className="grid-2">
            <div className="panel">
              <h3>Drill-down</h3>
              <DrillDown projects={projects || []} tasks={tasks} />
            </div>
            <div className="panel">
              <h3>Task list ({tasks.length})</h3>
              <TaskTable tasks={tasks} />
            </div>
          </div>
        </>
      )}

      <div className="footer">
        Data via PostgREST · readonly · auto-refreshes every 60s
      </div>
    </div>
  );
}
