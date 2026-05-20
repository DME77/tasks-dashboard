"use client";
import { useMemo } from "react";
import type { Task, ProjectNode } from "./types";

type Counts = { total: number; completed: number };
function emptyCounts(): Counts { return { total: 0, completed: 0 }; }

export default function DrillDown({
  projects,
  tasks,
}: {
  projects: ProjectNode[];
  tasks: Task[];
}) {
  // Bucket tasks by subAreaId for quick aggregation
  const bySub = useMemo(() => {
    const m = new Map<string, Counts>();
    for (const t of tasks) {
      const id = t.SubArea?.subAreaId;
      if (!id) continue;
      const c = m.get(id) || emptyCounts();
      c.total++;
      if (t.completed) c.completed++;
      m.set(id, c);
    }
    return m;
  }, [tasks]);

  function sum(counts: Counts[]): Counts {
    return counts.reduce(
      (a, b) => ({ total: a.total + b.total, completed: a.completed + b.completed }),
      emptyCounts()
    );
  }

  function bar(c: Counts) {
    const pct = c.total ? Math.round((c.completed / c.total) * 100) : 0;
    return (
      <>
        <span className="count">{c.completed}/{c.total} ({pct}%)</span>
        <span className="bar"><span style={{ width: `${pct}%` }} /></span>
      </>
    );
  }

  if (!projects.length) {
    return <div className="loading">No projects.</div>;
  }

  return (
    <div className="tree">
      {projects.map((p) => {
        const towerCounts = p.Tower.map((tw) => {
          const areaCounts = tw.Area.map((a) => {
            const subCounts = a.SubArea.map((s) => bySub.get(s.subAreaId) || emptyCounts());
            return sum(subCounts);
          });
          return sum(areaCounts);
        });
        const projTotal = sum(towerCounts);
        return (
          <details key={p.projectId} open>
            <summary>
              <strong>{p.projectName}</strong> {bar(projTotal)}
            </summary>
            {p.Tower.map((tw) => {
              const towerC = sum(
                tw.Area.map((a) => sum(a.SubArea.map((s) => bySub.get(s.subAreaId) || emptyCounts())))
              );
              return (
                <details key={tw.towerId}>
                  <summary>
                    {tw.towerName} {bar(towerC)}
                  </summary>
                  {tw.Area.map((a) => {
                    const areaC = sum(a.SubArea.map((s) => bySub.get(s.subAreaId) || emptyCounts()));
                    return (
                      <details key={a.areaId}>
                        <summary>
                          {a.areaName} {bar(areaC)}
                        </summary>
                        {a.SubArea.map((s) => {
                          const c = bySub.get(s.subAreaId) || emptyCounts();
                          return (
                            <div key={s.subAreaId} style={{ padding: "2px 0 2px 20px" }}>
                              {s.subAreaName} {bar(c)}
                            </div>
                          );
                        })}
                      </details>
                    );
                  })}
                </details>
              );
            })}
          </details>
        );
      })}
    </div>
  );
}
