"use client";
import { useEffect, useState, useMemo } from "react";

/* ── Types ───────────────────────────────────────────────────────────────── */
type DrawingStatus = "Received" | "N/A" | "Advance Copy" | "Partial" | "Pending";

interface TrackerDrawing {
  srNo: number; discipline: string; category: string;
  name: string; link: string | null; type: string; remarks: string; status: DrawingStatus;
}
interface UpcomingDrawing {
  srNo: number; name: string; location: string; date: string; comments: string;
}
interface DrawingsData {
  tracker: TrackerDrawing[];
  upcoming: UpcomingDrawing[];
  summary: { total: number; received: number; advCopy: number; partial: number; na: number; pending: number };
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const MONTH_MAP: Record<string, number> = {
  Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11
};

function parseDate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{2,4})$/);
  if (!m) return null;
  const yr = parseInt(m[3]);
  return new Date(yr < 100 ? 2000 + yr : yr, MONTH_MAP[m[2]] ?? 0, parseInt(m[1]));
}

function daysUntil(dateStr: string): number | null {
  const d = parseDate(dateStr);
  if (!d) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function urgencyColor(days: number | null): string {
  if (days === null) return "var(--muted)";
  if (days < 0)  return "#dc2626";   // overdue
  if (days <= 3) return "#ea580c";   // very soon
  if (days <= 7) return "#d97706";   // this week
  return "#16a34a";                  // comfortable
}

function urgencyLabel(days: number | null): string {
  if (days === null) return "No date";
  if (days < 0)  return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Tomorrow";
  return `In ${days}d`;
}

/* ── Status badge ────────────────────────────────────────────────────────── */
const STATUS_STYLE: Record<DrawingStatus, { bg: string; color: string; label: string }> = {
  "Received":     { bg: "#dcfce7", color: "#16a34a", label: "✅ Received" },
  "N/A":          { bg: "#f1f5f9", color: "#6b7280", label: "— N/A" },
  "Advance Copy": { bg: "#fef9c3", color: "#854d0e", label: "📋 Adv. Copy" },
  "Partial":      { bg: "#ffedd5", color: "#c2410c", label: "⚡ Partial" },
  "Pending":      { bg: "#fee2e2", color: "#dc2626", label: "⏳ Pending" },
};

function StatusBadge({ status }: { status: DrawingStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE["Pending"];
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 12,
      background: s.bg, color: s.color, fontSize: 11, fontWeight: 700,
      whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

/* ── Sub-tab button ──────────────────────────────────────────────────────── */
function SubTabBtn({ active, onClick, label, icon }: {
  active: boolean; onClick: () => void; label: string; icon: string;
}) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 20px", borderRadius: 8, cursor: "pointer",
      fontWeight: 600, fontSize: 13, transition: "all 0.15s",
      border: active ? "2px solid var(--accent)" : "2px solid var(--border)",
      background: active ? "var(--accent)" : "var(--sidebar-bg)",
      color: active ? "#fff" : "var(--text)",
    }}>{icon} {label}</button>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── Upcoming sub-tab ────────────────────────────────────────────────────── */
function UpcomingView({ upcoming }: { upcoming: UpcomingDrawing[] }) {
  const today = new Date(); today.setHours(0,0,0,0);

  const enriched = useMemo(() => upcoming.map(u => ({
    ...u,
    days: daysUntil(u.date),
    parsedDate: parseDate(u.date),
  })).sort((a,b) => {
    if (a.days === null && b.days === null) return 0;
    if (a.days === null) return 1;
    if (b.days === null) return -1;
    return a.days - b.days;
  }), [upcoming]);

  const overdue = enriched.filter(u => u.days !== null && u.days < 0);
  const dueToday = enriched.filter(u => u.days === 0);
  const upcoming7 = enriched.filter(u => u.days !== null && u.days > 0 && u.days <= 7);
  const later = enriched.filter(u => u.days !== null && u.days > 7);
  const noDate = enriched.filter(u => u.days === null);

  return (
    <div>
      {/* Summary strips */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total Drawings", value: upcoming.length, color: "kpi-blue" },
          { label: "Overdue",        value: overdue.length,  color: overdue.length > 0 ? "kpi-red" : "kpi-green" },
          { label: "Due This Week",  value: dueToday.length + upcoming7.length, color: "kpi-amber" },
          { label: "Upcoming",       value: later.length,    color: "kpi-green" },
        ].map(k => (
          <div key={k.label} className={`kpi ${k.color}`}>
            <div className="label">{k.label}</div>
            <div className="value" style={{ fontSize: 22 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Full table */}
      <div className="panel">
        <h3 style={{ marginBottom: 12 }}>📋 Upcoming Drawing Schedule</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--sidebar-bg)" }}>
                {[
                  { h: "#",           w: 40,  align: "center" as const },
                  { h: "Drawing",     w: undefined, align: "left" as const },
                  { h: "Location",    w: 80,  align: "center" as const },
                  { h: "Expected Date", w: 110, align: "center" as const },
                  { h: "Status",      w: 110, align: "center" as const },
                  { h: "Comments",    w: undefined, align: "left" as const },
                ].map(({ h, w, align }) => (
                  <th key={h} style={{
                    padding: "8px 10px", textAlign: align,
                    borderBottom: "2px solid var(--border)",
                    color: "var(--muted)", fontWeight: 700, fontSize: 11,
                    width: w, whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enriched.map((u, i) => {
                const col = urgencyColor(u.days);
                const bg  = u.days !== null && u.days < 0
                  ? "rgba(220,38,38,0.04)"
                  : i % 2 === 0 ? "transparent" : "var(--sidebar-bg)";
                return (
                  <tr key={u.srNo} style={{ background: bg }}>
                    <td style={{ padding: "8px 10px", textAlign: "center", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: 12 }}>
                      {u.srNo}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>
                      {u.name}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", borderBottom: "1px solid var(--border)" }}>
                      {u.location ? (
                        <span style={{ background: "var(--sidebar-bg)", border: "1px solid var(--border)",
                          borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>
                          {u.location}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                      {u.date || "—"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", borderBottom: "1px solid var(--border)" }}>
                      <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: 12,
                        background: col + "18", color: col, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                      }}>
                        {urgencyLabel(u.days)}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: 12 }}>
                      {u.comments || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Status sub-tab ──────────────────────────────────────────────────────── */
function StatusView({
  tracker, summary,
}: {
  tracker: TrackerDrawing[];
  summary: DrawingsData["summary"];
}) {
  const [discipline, setDiscipline] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  const disciplines = useMemo(() => {
    const s = new Set(tracker.map(d => d.discipline).filter(Boolean));
    return ["All", ...Array.from(s)];
  }, [tracker]);

  const filtered = useMemo(() => tracker.filter(d => {
    if (discipline !== "All" && d.discipline !== discipline) return false;
    if (statusFilter !== "All" && d.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.name.toLowerCase().includes(q) &&
          !d.discipline.toLowerCase().includes(q) &&
          !d.remarks.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [tracker, discipline, statusFilter, search]);

  const kpis = [
    { label: "Total",       value: summary.total,    col: "#6ea8ff" },
    { label: "Received",    value: summary.received,  col: "#16a34a" },
    { label: "Adv. Copy",   value: summary.advCopy,   col: "#854d0e" },
    { label: "Partial",     value: summary.partial,   col: "#c2410c" },
    { label: "Pending",     value: summary.pending,   col: "#dc2626" },
    { label: "N/A",         value: summary.na,        col: "#6b7280" },
  ];

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px,1fr))", gap: 10, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            background: "var(--panel-bg)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "10px 12px",
            borderLeft: `4px solid ${k.col}`,
          }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.col, marginTop: 2 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filters" style={{ marginBottom: 12 }}>
        <input placeholder="Search drawings…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 180 }} />
        <select value={discipline} onChange={e => setDiscipline(e.target.value)}>
          {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="All">All statuses</option>
          <option value="Received">Received</option>
          <option value="Advance Copy">Advance Copy</option>
          <option value="Partial">Partial</option>
          <option value="Pending">Pending</option>
          <option value="N/A">N/A</option>
        </select>
        <div className="spacer" />
        <button onClick={() => { setDiscipline("All"); setStatusFilter("All"); setSearch(""); }}>Reset</button>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>{filtered.length} shown</span>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="tasks">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: "center" }}>#</th>
              <th>Discipline</th>
              <th>Drawing Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={`${d.srNo}-${i}`}>
                <td style={{ textAlign: "center", color: "var(--muted)", fontSize: 12 }}>{d.srNo}</td>
                <td>
                  <span style={{
                    background: "var(--sidebar-bg)", border: "1px solid var(--border)",
                    borderRadius: 5, padding: "2px 7px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                  }}>{d.discipline || "—"}</span>
                </td>
                <td style={{ fontWeight: 500 }}>
                  {d.link ? (
                    <a href={d.link} target="_blank" rel="noreferrer"
                      style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                      title="Open drawing">
                      🔗 {d.name}
                    </a>
                  ) : d.name}
                </td>
                <td style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>{d.type || "—"}</td>
                <td><StatusBadge status={d.status} /></td>
                <td style={{ color: "var(--muted)", fontSize: 12, maxWidth: 260 }}>{d.remarks || "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: 32 }}>
                No drawings match the current filters.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── Main Drawings component ─────────────────────────────────────────────── */
export default function Drawings() {
  const [data,      setData]      = useState<DrawingsData | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [subTab,    setSubTab]    = useState<"upcoming" | "status">("upcoming");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/drawings?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshTick]);

  if (error) return <div className="error">⚠️ {error}</div>;

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <SubTabBtn active={subTab === "upcoming"} icon="📅" label="Upcoming"
          onClick={() => setSubTab("upcoming")} />
        <SubTabBtn active={subTab === "status"}   icon="📊" label="Status"
          onClick={() => setSubTab("status")} />
        <div style={{ flex: 1 }} />
        <a
          href="https://docs.google.com/spreadsheets/d/1MJMschYqRO8p4tLtNrO-N7ctXTmU1UcEHpzW4BnjATE/edit"
          target="_blank" rel="noreferrer"
          style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
          📄 Open Tracker →
        </a>
        <button onClick={() => setRefreshTick(n => n + 1)} disabled={loading}
          style={{ padding: "7px 14px", borderRadius: 8, fontWeight: 600, fontSize: 13,
            border: "2px solid var(--border)", background: "var(--sidebar-bg)",
            color: "var(--text)", cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1 }}>
          {loading ? "⟳ Loading…" : "🔄 Refresh"}
        </button>
      </div>

      {loading && <div className="loading">Loading drawings tracker…</div>}

      {!loading && data && (
        <>
          {subTab === "upcoming" && <UpcomingView upcoming={data.upcoming} />}
          {subTab === "status"   && <StatusView tracker={data.tracker} summary={data.summary} />}
        </>
      )}
    </div>
  );
}
