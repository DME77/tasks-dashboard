"use client";
import { useEffect, useMemo, useState } from "react";
import type { Task } from "./types";

type SortKey =
  | "taskName"
  | "project"
  | "tower"
  | "area"
  | "subArea"
  | "department"
  | "manager"
  | "status"
  | "endDate"
  | "completedAt";

type TaskComment = {
  message:     string;
  senderName:  string;
  senderEmail: string;
  createdAt:   string;
};

function projOf(t: Task) { return t.SubArea?.Area?.Tower?.Project?.projectName || ""; }
function towerOf(t: Task) { return t.SubArea?.Area?.Tower?.towerName || ""; }
function areaOf(t: Task) { return t.SubArea?.Area?.areaName || ""; }
function subOf(t: Task) { return t.SubArea?.subAreaName || ""; }
function deptOf(t: Task) { return t.Department?.name || ""; }
function mgrOf(t: Task) {
  if (!t.User) return "";
  return `${t.User.firstName || ""} ${t.User.lastName || ""}`.trim();
}
function statusOf(t: Task): "completed" | "overdue" | "pending" | "hold" {
  if (t.completed) return "completed";
  if (t.SubArea?.subAreaStatus === "inactive") return "hold";
  if (t.endDate) {
    const d = new Date();
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (new Date(t.endDate).getTime() < midnight) return "overdue";
  }
  return "pending";
}
function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString();
}
function fmtDateTime(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TaskTable({ tasks }: { tasks: Task[] }) {
  const [q, setQ] = useState("");
  const [proj, setProj] = useState("");
  const [tower, setTower] = useState("");
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState<"" | "completed" | "pending" | "overdue" | "hold">("");
  const [sortKey, setSortKey] = useState<SortKey>("endDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Comments: map of taskId → latest comment
  const [comments, setComments] = useState<Record<string, TaskComment>>({});

  useEffect(() => {
    fetch(`/api/task-comments?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!d.error) setComments(d); })
      .catch(() => {});
  }, []);

  const projects = useMemo(() => Array.from(new Set(tasks.map(projOf))).filter(Boolean).sort(), [tasks]);
  const towers = useMemo(
    () => Array.from(new Set(tasks.filter((t) => !proj || projOf(t) === proj).map(towerOf))).filter(Boolean).sort(),
    [tasks, proj]
  );
  const depts = useMemo(() => Array.from(new Set(tasks.map(deptOf))).filter(Boolean).sort(), [tasks]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return tasks.filter((t) => {
      if (proj && projOf(t) !== proj) return false;
      if (tower && towerOf(t) !== tower) return false;
      if (dept && deptOf(t) !== dept) return false;
      if (status && statusOf(t) !== status) return false;
      if (needle) {
        const hay =
          (t.taskName + " " + projOf(t) + " " + towerOf(t) + " " + areaOf(t) + " " + subOf(t) + " " + deptOf(t) + " " + mgrOf(t)).toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [tasks, q, proj, tower, dept, status]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const get = (t: Task): string | number => {
      switch (sortKey) {
        case "taskName":   return t.taskName || "";
        case "project":    return projOf(t);
        case "tower":      return towerOf(t);
        case "area":       return areaOf(t);
        case "subArea":    return subOf(t);
        case "department": return deptOf(t);
        case "manager":    return mgrOf(t);
        case "status":     return statusOf(t);
        case "endDate":    return t.endDate    ? new Date(t.endDate).getTime()    : Number.POSITIVE_INFINITY;
        case "completedAt":return t.completedAt? new Date(t.completedAt).getTime(): Number.POSITIVE_INFINITY;
      }
    };
    arr.sort((a, b) => {
      const va = get(a), vb = get(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function header(label: string, key: SortKey) {
    const active = sortKey === key;
    return (
      <th
        onClick={() => {
          if (active) setSortDir(sortDir === "asc" ? "desc" : "asc");
          else { setSortKey(key); setSortDir("asc"); }
        }}
      >
        {label}{active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </th>
    );
  }

  return (
    <div>
      <div className="filters">
        <input placeholder="Search tasks…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={proj} onChange={(e) => { setProj(e.target.value); setTower(""); }}>
          <option value="">All projects</option>
          {projects.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={tower} onChange={(e) => setTower(e.target.value)}>
          <option value="">All towers</option>
          {towers.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">All departments</option>
          {depts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="hold">On Hold</option>
        </select>
        <div className="spacer" />
        <button onClick={() => { setQ(""); setProj(""); setTower(""); setDept(""); setStatus(""); }}>
          Reset
        </button>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>{sorted.length} shown</span>
      </div>

      <div className="table-wrap">
        <table className="tasks">
          <thead>
            <tr>
              {header("Task", "taskName")}
              {header("Project", "project")}
              {header("Tower", "tower")}
              {header("Area", "area")}
              {header("Sub-area", "subArea")}
              {header("Dept", "department")}
              {header("Manager", "manager")}
              {header("Status", "status")}
              {header("Due", "endDate")}
              <th>Latest Comment</th>
              {header("Completed", "completedAt")}
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const s   = statusOf(t);
              const cmt = comments[t.taskId];
              return (
                <tr key={t.taskId}>
                  <td>{t.taskName}</td>
                  <td>{projOf(t) || "—"}</td>
                  <td>{towerOf(t) || "—"}</td>
                  <td>{areaOf(t) || "—"}</td>
                  <td>{subOf(t) || "—"}</td>
                  <td>{deptOf(t) || "—"}</td>
                  <td>{mgrOf(t) || "—"}</td>
                  <td>
                    {s === "completed" && <span className="badge green">Done</span>}
                    {s === "pending"   && <span className="badge gray">Pending</span>}
                    {s === "overdue"   && <span className="badge red">Overdue</span>}
                    {s === "hold"      && <span className="badge amber">On Hold</span>}
                  </td>
                  <td>{fmtDate(t.endDate)}</td>
                  <td style={{ maxWidth: 220 }}>
                    {cmt ? (
                      <div title={`${cmt.senderName} — ${new Date(cmt.createdAt).toLocaleString()}\n\n${cmt.message}`}>
                        <div style={{
                          fontSize: 12,
                          color: "var(--text)",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          lineHeight: 1.4,
                        }}>
                          {cmt.message}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                          {cmt.senderName} · {fmtDateTime(cmt.createdAt)}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>{fmtDate(t.completedAt)}</td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>No matching tasks.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
