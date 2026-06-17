"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import KPIs from "./KPIs";
import Charts from "./Charts";
import TaskTable from "./TaskTable";
import Billing from "./Billing";
import Manpower from "./Manpower";
import Drawings from "./Drawings";
import DWallDrawing, { type DWallData } from "./DWallDrawing";
import PCCDrawing from "./PCCDrawing";
import BasementDrawing from "./BasementDrawing";
import ExcavationDrawing from "./ExcavationDrawing";
import type { Task, ProjectNode, TowerNode, AreaNode, ActiveFilter } from "./types";

/** True when a tower/area name refers to the diaphragm (D) wall, e.g. "D -Wall Work". */
function isDWallName(name?: string | null): boolean {
  if (!name) return false;
  return name.replace(/[\s\-]/g, "").toLowerCase().includes("dwall");
}
/** True when a tower/area name refers to PCC work. */
function isPCCName(name?: string | null): boolean {
  if (!name) return false;
  return /\bpcc\b/i.test(name);
}
/** True when a tower/area name refers to basement work. */
function isBasementName(name?: string | null): boolean {
  if (!name) return false;
  return /basement/i.test(name);
}
/** True when a tower/area name refers to excavation work. */
function isExcavationName(name?: string | null): boolean {
  if (!name) return false;
  return /excavat/i.test(name);
}

/* ── Constants ──────────────────────────────────────────────────────────────── */
const PROJECT_ID   = "cmnjvabgp0077keve33sbnh4c";
const PROJECT_NAME = "Homeland Global Park";

const TABS = [
  { id: "overview",   label: "Overview",          icon: "📊" },
  { id: "tasks",      label: "Tasks",             icon: "✅" },
  { id: "drawings",   label: "Drawings",          icon: "📐" },
  { id: "billing",    label: "Billing",           icon: "💰" },
  { id: "manpower",   label: "Daily Manpower",    icon: "👷" },
] as const;
type TabId = typeof TABS[number]["id"];

const TOWER_ICONS = ["🏗️", "🏢", "🏬", "🏛️", "🏰", "⚡", "🔩", "🧱"];
const AREA_ICONS  = ["🗂️", "📐", "🔧", "🪟", "💡", "🚪", "🛗", "🪜"];

const FILTER_LABELS: Record<NonNullable<ActiveFilter>, string> = {
  completed: "Completed Tasks",
  pending:   "Pending Tasks",
  overdue:   "Overdue Tasks",
  week:      "Completed This Week",
  hold:      "On Hold Tasks",
};

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function taskPct(total: number, completed: number) {
  return total ? Math.round((completed / total) * 100) : 0;
}

/* ── Component ──────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  /* state */
  const [tasks,        setTasks]        = useState<Task[] | null>(null);
  const [projects,     setProjects]     = useState<ProjectNode[] | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [theme,        setTheme]        = useState<"dark" | "light">("light");
  const [activeTab,    setActiveTab]    = useState<TabId>("overview");
  const [selectedTower, setSelectedTower] = useState<string | null>(null); // towerId
  const [selectedArea,  setSelectedArea]  = useState<string | null>(null); // areaId
  const [activeFilter,  setActiveFilter]  = useState<ActiveFilter>(null);
  const [refreshing,    setRefreshing]    = useState(false);
  const [dwallData,     setDwallData]     = useState<DWallData | null>(null);
  const [dwallLoading,  setDwallLoading]  = useState(false);

  /* ── Theme persistence ──────────────────────────────────────────────────── */
  useEffect(() => {
    const saved = localStorage.getItem("hgp-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("hgp-theme", theme);
  }, [theme]);

  /* ── Data loading ───────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [t, h] = await Promise.all([
        fetch("/api/tasks").then((r) => r.json()),
        fetch("/api/hierarchy").then((r) => r.json()),
      ]);
      if (t.error) throw new Error(t.error);
      if (h.error) throw new Error(h.error);
      setTasks(t.tasks || []);
      setProjects(h.projects || []);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived data ───────────────────────────────────────────────────────── */

  // Client-side project filter (safety net)
  const projectTasks = useMemo(() => {
    if (!tasks) return null;
    const filtered = tasks.filter(
      (t) => t.SubArea?.Area?.Tower?.Project?.projectId === PROJECT_ID
    );
    return filtered.length > 0 ? filtered : tasks;
  }, [tasks]);

  // All towers from hierarchy
  const towers: TowerNode[] = useMemo(
    () => projects?.flatMap((p) => p.Tower) ?? [],
    [projects]
  );

  // Areas within the selected tower (or all areas if none selected)
  const areas: AreaNode[] = useMemo(() => {
    if (!projects) return [];
    if (selectedTower) {
      const tw = towers.find((t) => t.towerId === selectedTower);
      return tw?.Area ?? [];
    }
    return [];
  }, [projects, towers, selectedTower]);

  // Tasks filtered by selected tower + area
  const filteredTasks = useMemo(() => {
    if (!projectTasks) return null;
    return projectTasks.filter((t) => {
      if (selectedTower && t.SubArea?.Area?.Tower?.towerId !== selectedTower) return false;
      if (selectedArea  && t.SubArea?.Area?.areaId !== selectedArea) return false;
      return true;
    });
  }, [projectTasks, selectedTower, selectedArea]);

  // Task counts per tower (for category card badges)
  const towerStats = useMemo(() => {
    if (!projectTasks) return new Map<string, { total: number; completed: number }>();
    const m = new Map<string, { total: number; completed: number }>();
    for (const t of projectTasks) {
      const id = t.SubArea?.Area?.Tower?.towerId;
      if (!id) continue;
      const v = m.get(id) ?? { total: 0, completed: 0 };
      v.total++;
      if (t.completed) v.completed++;
      m.set(id, v);
    }
    return m;
  }, [projectTasks]);

  // Task counts per area
  const areaStats = useMemo(() => {
    if (!projectTasks) return new Map<string, { total: number; completed: number }>();
    const m = new Map<string, { total: number; completed: number }>();
    for (const t of projectTasks) {
      const id = t.SubArea?.Area?.areaId;
      if (!id) continue;
      if (selectedTower && t.SubArea?.Area?.Tower?.towerId !== selectedTower) continue;
      const v = m.get(id) ?? { total: 0, completed: 0 };
      v.total++;
      if (t.completed) v.completed++;
      m.set(id, v);
    }
    return m;
  }, [projectTasks, selectedTower]);

  // Tasks for the card-detail flyout
  const cardTasks = useMemo(() => {
    if (!filteredTasks || !activeFilter) return [];
    const now = Date.now();
    const sevenDayMs = 7 * 24 * 60 * 60 * 1000;
    const d = new Date();
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    switch (activeFilter) {
      case "completed": return filteredTasks.filter((t) => t.completed);
      case "pending":   return filteredTasks.filter(
        // Pending = not completed, not on hold, AND (no due date OR due date is today or future)
        (t) => !t.completed &&
          t.SubArea?.subAreaStatus !== "inactive" &&
          !(t.endDate && new Date(t.endDate).getTime() < midnight)
      );
      case "overdue":   return filteredTasks.filter(
        // Overdue = not completed, not on hold, AND due date is strictly before today
        (t) => !t.completed &&
          t.SubArea?.subAreaStatus !== "inactive" &&
          t.endDate && new Date(t.endDate).getTime() < midnight
      );
      case "hold":      return filteredTasks.filter(
        // Hold = not completed AND sub-area is inactive
        (t) => !t.completed && t.SubArea?.subAreaStatus === "inactive"
      );
      case "week":      return filteredTasks.filter(
        (t) => t.completed && t.completedAt &&
          now - new Date(t.completedAt).getTime() < sevenDayMs
      );
    }
  }, [filteredTasks, activeFilter]);

  const lastUpdated = useMemo(() => new Date().toLocaleString(), [filteredTasks]);

  /* ── Handlers ───────────────────────────────────────────────────────────── */
  function selectTower(towerId: string | null) {
    setSelectedTower(towerId);
    setSelectedArea(null);
    setActiveFilter(null);
  }
  function selectArea(areaId: string | null) {
    setSelectedArea(areaId);
    setActiveFilter(null);
  }
  function handleCardSelect(filter: ActiveFilter) {
    setActiveFilter((prev) => (prev === filter ? null : filter));
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  const allTotal     = projectTasks?.length ?? 0;
  const allCompleted = projectTasks?.filter((t) => t.completed).length ?? 0;

  // Named-area checks — drive inline drawing panels in Overview
  const selectedAreaName = areas.find((a) => a.areaId === selectedArea)?.areaName;
  const dwallAreaSelected    = isDWallName(selectedAreaName);
  const pccAreaSelected      = isPCCName(selectedAreaName);
  const basementAreaSelected = isBasementName(selectedAreaName);
  const excavationAreaSelected = isExcavationName(selectedAreaName);

  // Fetch live D-Wall panel status the first time the D-Wall area is opened
  useEffect(() => {
    if (!dwallAreaSelected || dwallData) return;
    setDwallLoading(true);
    fetch(`/api/dwall?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!d.error) setDwallData(d); })
      .catch(() => {})
      .finally(() => setDwallLoading(false));
  }, [dwallAreaSelected, dwallData]);

  return (
    <div className="app-shell">

      {/* ══ Dark navy header ═══════════════════════════════════════════════ */}
      <header className="app-header">
        <div className="header-top">
          <div>
            <div className="org-label">Homeland Group</div>
            <h1 className="app-title">{PROJECT_NAME} — Live Dashboard</h1>
            <p className="app-subtitle">
              Pulls fresh data from PostgREST on each open ·{" "}
              {towers.length > 0
                ? `${towers.length} tower${towers.length > 1 ? "s" : ""} live`
                : "Loading…"}
            </p>
          </div>
          <div className="header-right">
            <span className="live-pill">
              <span className="live-dot" />
              LIVE
            </span>
            <button
              className="theme-btn"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              className="theme-btn"
              onClick={loadData}
              disabled={refreshing}
              title="Refresh data"
              style={{ opacity: refreshing ? 0.6 : 1 }}
            >
              {refreshing ? "⟳" : "🔄"}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <nav className="tab-bar" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ══ Main content ═══════════════════════════════════════════════════ */}
      <main className="app-main">

        {error && <div className="error">⚠️ Error loading data: {error}</div>}
        {!filteredTasks && !error && (
          <div className="loading">Loading Homeland Global Park data…</div>
        )}

        {filteredTasks && (
          <>
            {/* ── Tower / Area category cards — hidden on Billing tab ─── */}
            {activeTab !== "billing" && activeTab !== "manpower" && activeTab !== "drawings" && <><section className="category-section">
              <div className="section-header">
                <span className="section-title">🏗️ All Towers</span>
                <span className="live-chip">LIVE</span>
              </div>

              <div className="cat-cards">
                {/* "All" card */}
                <div
                  className={`cat-card ${!selectedTower ? "active" : ""}`}
                  onClick={() => selectTower(null)}
                >
                  <span className="cat-icon">🏘️</span>
                  <span className="cat-name">All</span>
                  <span className="cat-status">
                    <span className="live-dot" style={{ width: 6, height: 6 }} />
                    Live
                  </span>
                  <span className="cat-pct">
                    {taskPct(allTotal, allCompleted)}% done
                  </span>
                </div>

                {towers.map((tw, i) => {
                  const s = towerStats.get(tw.towerId) ?? { total: 0, completed: 0 };
                  return (
                    <div
                      key={tw.towerId}
                      className={`cat-card ${selectedTower === tw.towerId ? "active" : ""}`}
                      onClick={() => selectTower(tw.towerId)}
                    >
                      <span className="cat-icon">{TOWER_ICONS[i % TOWER_ICONS.length]}</span>
                      <span className="cat-name">{tw.towerName}</span>
                      <span className="cat-status">
                        <span className="live-dot" style={{ width: 6, height: 6 }} />
                        Live
                      </span>
                      <span className="cat-pct">
                        {taskPct(s.total, s.completed)}% done
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Status bar */}
              <div className="data-status">
                <span className="status-dot" />
                <span className="status-strong">
                  Live · {filteredTasks.length} tasks
                </span>
                <span className="status-divider">·</span>
                <span>loaded {lastUpdated}</span>
                {selectedTower && (
                  <>
                    <span className="status-divider">·</span>
                    <span>
                      Tower: <strong>
                        {towers.find((t) => t.towerId === selectedTower)?.towerName}
                      </strong>
                    </span>
                    <span className="status-divider">·</span>
                    <button
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--accent)", fontSize: 12, padding: 0,
                      }}
                      onClick={() => selectTower(null)}
                    >
                      Clear filter ✕
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* ── Area sub-cards (Level 2, shown when tower is selected) ── */}
            {selectedTower && areas.length > 0 && (
              <section className="category-section" style={{ marginTop: 0 }}>
                <div className="section-header">
                  <span className="section-title">📐 Areas</span>
                </div>
                <div className="cat-cards">
                  <div
                    className={`cat-card ${!selectedArea ? "active" : ""}`}
                    onClick={() => selectArea(null)}
                  >
                    <span className="cat-icon">🗂️</span>
                    <span className="cat-name">All Areas</span>
                    <span className="cat-status">
                      <span className="live-dot" style={{ width: 6, height: 6 }} />
                      Live
                    </span>
                  </div>
                  {areas.map((area, i) => {
                    const s = areaStats.get(area.areaId) ?? { total: 0, completed: 0 };
                    return (
                      <div
                        key={area.areaId}
                        className={`cat-card ${selectedArea === area.areaId ? "active" : ""}`}
                        onClick={() => selectArea(area.areaId)}
                      >
                        <span className="cat-icon">{AREA_ICONS[i % AREA_ICONS.length]}</span>
                        <span className="cat-name">{area.areaName}</span>
                        <span className="cat-status">
                          <span className="live-dot" style={{ width: 6, height: 6 }} />
                          Live
                        </span>
                        <span className="cat-pct">
                          {taskPct(s.total, s.completed)}% done
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            </>}

            {/* ── OVERVIEW tab ─────────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <>
                <KPIs
                  tasks={filteredTasks}
                  selected={activeFilter}
                  onSelect={handleCardSelect}
                />

                {activeFilter && cardTasks && (
                  <div className="panel card-detail">
                    <div className="card-detail-header">
                      <h3>
                        {FILTER_LABELS[activeFilter]}
                        <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 8, fontSize: 13 }}>
                          ({cardTasks.length})
                        </span>
                      </h3>
                      <button className="close-btn" onClick={() => setActiveFilter(null)}>
                        ✕ Close
                      </button>
                    </div>
                    <TaskTable key={activeFilter} tasks={cardTasks} />
                  </div>
                )}

                {/* ── D-Wall drawing — shown inline only when "D -Wall Work" area is selected ── */}
                {dwallAreaSelected && (
                  <DWallDrawing inline data={dwallData} loading={dwallLoading} />
                )}

                {/* ── PCC drawing — shown inline when PCC area is selected ── */}
                {pccAreaSelected && <PCCDrawing />}

                {/* ── Basement drawing — shown inline when Basement area is selected ── */}
                {basementAreaSelected && <BasementDrawing />}

                {/* ── Excavation drawing — shown inline when Excavation area is selected ── */}
                {excavationAreaSelected && <ExcavationDrawing />}

                <Charts tasks={filteredTasks} theme={theme} />
              </>
            )}

            {/* ── TASKS tab ─────────────────────────────────────────────────── */}
            {activeTab === "tasks" && (
              <div className="panel">
                <h3>📋 Task List <span style={{ fontWeight: 400, color: "var(--muted)" }}>({filteredTasks.length})</span></h3>
                <TaskTable tasks={filteredTasks} />
              </div>
            )}

            {/* ── DRAWINGS tab ──────────────────────────────────────────────── */}
            {activeTab === "drawings" && (
              <Drawings />
            )}

            {/* ── BILLING tab ───────────────────────────────────────────────── */}
            {activeTab === "billing" && (
              <Billing theme={theme} />
            )}

            {/* ── MANPOWER tab ──────────────────────────────────────────────── */}
            {activeTab === "manpower" && (
              <Manpower theme={theme} />
            )}
          </>
        )}

        <footer className="app-footer">
          {PROJECT_NAME} · Data via PostgREST · readonly ·{" "}
          <a
            href={`https://asap.homelandgroup.org/admin/projects/${PROJECT_ID}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in admin →
          </a>
        </footer>
      </main>
    </div>
  );
}
