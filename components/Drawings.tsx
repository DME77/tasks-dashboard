"use client";
import { useEffect, useState, useMemo } from "react";

/* ── Types ───────────────────────────────────────────────────────────────── */
type DrawingStatus = "Received" | "N/A" | "Advance Copy" | "Partial" | "Pending";

interface TrackerDrawing {
  srNo: number; discipline: string; category: string;
  name: string; link: string | null; type: string; remarks: string; status: DrawingStatus;
}
interface UpcomingDrawing {
  srNo: number; name: string; location: string; date: string; status: string; comments: string;
}
interface DrawingsData {
  tracker: TrackerDrawing[];
  upcoming: UpcomingDrawing[];
  summary: { total: number; received: number; advCopy: number; partial: number; na: number; pending: number };
}

/* ── HGP-specific types ──────────────────────────────────────────────────── */
interface StructuralDrawing {
  srNo: number; name: string; dateToArch: string; remarks: string; dateToProof: string;
}
interface MepDrawing {
  srNo: string; discipline: string; title: string; drawingNo: string; date: string;
}
interface HgpData {
  upcoming: UpcomingDrawing[];
  structural: StructuralDrawing[];
  mep: MepDrawing[];
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const MONTH_MAP: Record<string, number> = {
  Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11
};

function parseDate(s: string): Date | null {
  if (!s) return null;
  // DD-Mon-YY or DD-Mon-YYYY  e.g. "08-Jun-26"
  const m1 = s.match(/^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{2,4})$/);
  if (m1) {
    const yr = parseInt(m1[3]);
    return new Date(yr < 100 ? 2000 + yr : yr, MONTH_MAP[m1[2]] ?? 0, parseInt(m1[1]));
  }
  // DD-MM-YYYY  e.g. "08-06-2026"
  const m2 = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m2) {
    return new Date(parseInt(m2[3]), parseInt(m2[2]) - 1, parseInt(m2[1]));
  }
  return null;
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

/** Returns true if the sheet status means the drawing is already fulfilled. */
function isReceived(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("received") || s.includes("n/a");
}

/** Color for the status badge — driven by sheet status, falls back to urgency. */
function statusBadgeColor(status: string, days: number | null): string {
  const s = status.toLowerCase();
  if (s.includes("received"))                                           return "#16a34a"; // green
  if (s.includes("adv") || s.includes("advance"))                      return "#854d0e"; // amber-dark
  if (s.includes("partial"))                                            return "#c2410c"; // orange
  if (s.includes("n/a"))                                                return "#6b7280"; // gray
  if (s.includes("pending") || s === "")                                return urgencyColor(days);
  return urgencyColor(days);
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
    // Received items appear after pending/overdue rows but before undated rows
    const aDone = isReceived(a.status);
    const bDone = isReceived(b.status);
    if (aDone && bDone) return 0;
    if (aDone) return 1;
    if (bDone) return -1;
    if (a.days === null && b.days === null) return 0;
    if (a.days === null) return 1;
    if (b.days === null) return -1;
    return a.days - b.days;
  }), [upcoming]);

  const received  = enriched.filter(u => isReceived(u.status));
  const overdue   = enriched.filter(u => u.days !== null && u.days < 0 && !isReceived(u.status));
  const dueToday  = enriched.filter(u => u.days === 0 && !isReceived(u.status));
  const upcoming7 = enriched.filter(u => u.days !== null && u.days > 0 && u.days <= 7 && !isReceived(u.status));
  const later     = enriched.filter(u => u.days !== null && u.days > 7 && !isReceived(u.status));
  const noDate    = enriched.filter(u => u.days === null && !isReceived(u.status));

  return (
    <div>
      {/* Summary strips */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total Drawings", value: upcoming.length,                       color: "kpi-blue" },
          { label: "Received",       value: received.length,                       color: received.length > 0 ? "kpi-green" : "kpi-gray" },
          { label: "Overdue",        value: overdue.length,                        color: overdue.length > 0 ? "kpi-red" : "kpi-green" },
          { label: "Due This Week",  value: dueToday.length + upcoming7.length,    color: "kpi-amber" },
          { label: "Upcoming",       value: later.length,                          color: "kpi-green" },
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
                const done    = isReceived(u.status);
                const urgCol  = urgencyColor(u.days);
                const statCol = statusBadgeColor(u.status, u.days);
                // Red row background only when truly overdue (not received)
                const bg = !done && u.days !== null && u.days < 0
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
                      <div style={{ fontWeight: 500 }}>{u.date || "—"}</div>
                      {/* Only show urgency sub-label if not already received */}
                      {!done && u.days !== null && (
                        <div style={{ fontSize: 10, color: urgCol, fontWeight: 700, marginTop: 2 }}>
                          {urgencyLabel(u.days)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", borderBottom: "1px solid var(--border)" }}>
                      {u.status ? (
                        <span style={{
                          display: "inline-block", padding: "3px 10px", borderRadius: 12,
                          background: statCol + "22", color: statCol, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                        }}>
                          {u.status}
                        </span>
                      ) : "—"}
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

/* ── Structural drawings view (HGP) ─────────────────────────────────────── */
function remarkColor(r: string): string {
  const s = r.toLowerCase();
  if (s.includes("approved") || s.includes("shared")) return "#16a34a";
  if (s.includes("engg done") || s.includes("comments")) return "#d97706";
  if (!r || r === "-") return "#9ca3af";
  return "#d97706";
}

function StructuralView({ structural }: { structural: StructuralDrawing[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search) return structural;
    const q = search.toLowerCase();
    return structural.filter(d =>
      d.name.toLowerCase().includes(q) || d.remarks.toLowerCase().includes(q)
    );
  }, [structural, search]);

  const today = new Date(); today.setHours(0,0,0,0);
  const overdue = structural.filter(d => {
    if (!d.dateToArch || /^(shared|approved|received)/i.test(d.dateToArch)) return false;
    const parsed = parseDate(d.dateToArch);
    return parsed && parsed.getTime() < today.getTime();
  }).length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total Drawings", value: structural.length, color: "kpi-blue" },
          { label: "Shared / Done",  value: structural.filter(d => /shared|approved/i.test(d.remarks)).length, color: "kpi-green" },
          { label: "Overdue",        value: overdue, color: overdue > 0 ? "kpi-red" : "kpi-green" },
          { label: "Pending",        value: structural.filter(d => !d.remarks && d.dateToArch).length, color: "kpi-amber" },
        ].map(k => (
          <div key={k.label} className={`kpi ${k.color}`}>
            <div className="label">{k.label}</div>
            <div className="value" style={{ fontSize: 22 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>🏗️ Structural Drawing Schedule</h3>
          <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)",
              background: "var(--surface-2)", color: "var(--text)", fontSize: 12, minWidth: 160 }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                {[
                  { h: "#",              w: 40,  align: "center" as const },
                  { h: "Drawing",        w: undefined, align: "left" as const },
                  { h: "Date to Arch",   w: 110, align: "center" as const },
                  { h: "Remarks",        w: 140, align: "center" as const },
                  { h: "Date to Proof",  w: 200, align: "left" as const },
                ].map(({ h, w, align }) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: align,
                    borderBottom: "2px solid var(--border)", color: "var(--muted)",
                    fontWeight: 700, fontSize: 11, width: w, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const days = d.dateToArch ? daysUntil(d.dateToArch) : null;
                const done = /shared|approved/i.test(d.remarks);
                const bg = !done && days !== null && days < 0
                  ? "rgba(220,38,38,0.04)"
                  : i % 2 === 0 ? "transparent" : "var(--surface-2)";
                const rc = remarkColor(d.remarks);
                return (
                  <tr key={d.srNo} style={{ background: bg }}>
                    <td style={{ padding: "8px 10px", textAlign: "center", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: 12 }}>{d.srNo}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>{d.name}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 500 }}>{d.dateToArch || "—"}</div>
                      {!done && days !== null && (
                        <div style={{ fontSize: 10, color: urgencyColor(days), fontWeight: 700, marginTop: 2 }}>
                          {urgencyLabel(days)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", borderBottom: "1px solid var(--border)" }}>
                      {d.remarks ? (
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12,
                          background: rc + "22", color: rc, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                          {d.remarks}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: 12 }}>{d.dateToProof || "—"}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 32 }}>No drawings found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── MEP drawings view (HGP) ─────────────────────────────────────────────── */
function MepView({ mep }: { mep: MepDrawing[] }) {
  const [discFilter, setDiscFilter] = useState("All");
  const disciplines = useMemo(() => ["All", ...Array.from(new Set(mep.map(d => d.discipline).filter(Boolean)))], [mep]);
  const filtered = useMemo(() =>
    discFilter === "All" ? mep : mep.filter(d => d.discipline === discFilter),
    [mep, discFilter]
  );

  // Group by discipline for display
  const groups = useMemo(() => {
    const m = new Map<string, MepDrawing[]>();
    for (const d of filtered) {
      const key = d.discipline || "Other";
      const arr = m.get(key) ?? [];
      arr.push(d);
      m.set(key, arr);
    }
    return m;
  }, [filtered]);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <div className={`kpi kpi-blue`} style={{ minWidth: 120, padding: "10px 16px" }}>
          <div className="label">Total MEP Dwgs</div>
          <div className="value" style={{ fontSize: 22 }}>{mep.length}</div>
        </div>
        {disciplines.filter(d => d !== "All").map(d => (
          <div key={d} className="kpi kpi-gray" style={{ minWidth: 120, padding: "10px 16px" }}>
            <div className="label">{d}</div>
            <div className="value" style={{ fontSize: 22 }}>{mep.filter(m => m.discipline === d).length}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <select value={discFilter} onChange={e => setDiscFilter(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)",
            background: "var(--surface-2)", color: "var(--text)", fontSize: 13 }}>
          {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {Array.from(groups.entries()).map(([disc, items]) => (
        <div key={disc} className="panel" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12, fontSize: 14 }}>⚡ {disc}</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  {["#", "Drawing Title", "Drawing No.", "GFC Date"].map((h, i) => (
                    <th key={h} style={{ padding: "8px 10px",
                      textAlign: i === 0 ? "center" : "left",
                      borderBottom: "2px solid var(--border)",
                      color: "var(--muted)", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((d, i) => (
                  <tr key={`${d.discipline}-${d.srNo}`} style={{ background: i % 2 === 0 ? "transparent" : "var(--surface-2)" }}>
                    <td style={{ padding: "7px 10px", textAlign: "center", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: 12, width: 40 }}>{d.srNo}</td>
                    <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>{d.title}</td>
                    <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: 12 }}>
                      {d.drawingNo ? (
                        <span style={{ background: "var(--surface-2)", border: "1px solid var(--border)",
                          borderRadius: 5, padding: "2px 7px", fontSize: 11, fontWeight: 600 }}>{d.drawingNo}</span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border)", fontSize: 12, color: d.date ? "var(--text)" : "var(--muted)" }}>
                      {d.date || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Project card selector ───────────────────────────────────────────────── */
type ProjectId = "cp-atelier" | "hgp";

const PROJECTS: { id: ProjectId; label: string; icon: string; sub: string }[] = [
  { id: "cp-atelier", label: "CP Atelier",           icon: "🏗️", sub: "Homeland Global Park – Tower" },
  { id: "hgp",        label: "HGP",                  icon: "🏘️", sub: "Homeland Global Park – Master" },
];

function ProjectCards({
  active, onSelect,
}: { active: ProjectId; onSelect: (id: ProjectId) => void }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
      {PROJECTS.map(p => {
        const isActive = active === p.id;
        return (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              cursor: "pointer", borderRadius: 10, padding: "14px 22px",
              border: isActive ? "2px solid var(--accent)" : "2px solid var(--border)",
              background: isActive ? "var(--accent)" : "var(--panel-bg)",
              color: isActive ? "#fff" : "var(--text)",
              minWidth: 160, transition: "all 0.15s",
              boxShadow: isActive ? "0 2px 8px rgba(37,99,235,0.18)" : "none",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 4 }}>{p.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{p.label}</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{p.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── Main Drawings component ─────────────────────────────────────────────── */
export default function Drawings() {
  const [project,    setProject]    = useState<ProjectId>("cp-atelier");

  // CP Atelier state
  const [data,       setData]       = useState<DrawingsData | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [subTab,     setSubTab]     = useState<"upcoming" | "status">("upcoming");
  const [refreshTick,setRefreshTick]= useState(0);

  // HGP state
  const [hgpData,       setHgpData]       = useState<HgpData | null>(null);
  const [hgpError,      setHgpError]      = useState<string | null>(null);
  const [hgpLoading,    setHgpLoading]    = useState(false);
  const [hgpSubTab,     setHgpSubTab]     = useState<"upcoming" | "structural" | "mep">("upcoming");
  const [hgpRefreshTick,setHgpRefreshTick]= useState(0);

  // Fetch CP Atelier data whenever it's the active project
  useEffect(() => {
    if (project !== "cp-atelier") return;
    setLoading(true);
    fetch(`/api/drawings?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [project, refreshTick]);

  // Fetch HGP data whenever it's the active project
  useEffect(() => {
    if (project !== "hgp") return;
    setHgpLoading(true);
    fetch(`/api/drawings/hgp?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setHgpData(d); setHgpError(null); })
      .catch(e => setHgpError(e.message))
      .finally(() => setHgpLoading(false));
  }, [project, hgpRefreshTick]);

  return (
    <div>
      {/* Project cards */}
      <ProjectCards active={project} onSelect={p => { setProject(p); setSubTab("upcoming"); setHgpSubTab("upcoming"); }} />

      {/* ── CP Atelier ─────────────────────────────────────────────────── */}
      {project === "cp-atelier" && (
        <>
          {/* Sub-tab bar */}
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

          {error   && <div className="error">⚠️ {error}</div>}
          {loading && <div className="loading">Loading CP Atelier drawings tracker…</div>}
          {!loading && data && (
            <>
              {subTab === "upcoming" && <UpcomingView upcoming={data.upcoming} />}
              {subTab === "status"   && <StatusView tracker={data.tracker} summary={data.summary} />}
            </>
          )}
        </>
      )}

      {/* ── HGP ────────────────────────────────────────────────────────── */}
      {project === "hgp" && (
        <>
          {/* Sub-tab bar */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
            <SubTabBtn active={hgpSubTab === "upcoming"}   icon="📅" label="Upcoming"
              onClick={() => setHgpSubTab("upcoming")} />
            <SubTabBtn active={hgpSubTab === "structural"} icon="🏗️" label="Structural"
              onClick={() => setHgpSubTab("structural")} />
            <SubTabBtn active={hgpSubTab === "mep"}        icon="⚡" label="MEP"
              onClick={() => setHgpSubTab("mep")} />
            <div style={{ flex: 1 }} />
            <a
              href="https://docs.google.com/spreadsheets/d/1M4UkX_G3TKctUv44lzvPCruHlVobOI1gcJFncbxbx9c/edit"
              target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
              📄 Open Tracker →
            </a>
            <button onClick={() => setHgpRefreshTick(n => n + 1)} disabled={hgpLoading}
              style={{ padding: "7px 14px", borderRadius: 8, fontWeight: 600, fontSize: 13,
                border: "2px solid var(--border)", background: "var(--surface-2)",
                color: "var(--text)", cursor: hgpLoading ? "default" : "pointer",
                opacity: hgpLoading ? 0.6 : 1 }}>
              {hgpLoading ? "⟳ Loading…" : "🔄 Refresh"}
            </button>
          </div>

          {hgpError   && <div className="error">⚠️ {hgpError}</div>}
          {hgpLoading && <div className="loading">Loading HGP drawings tracker…</div>}
          {!hgpLoading && hgpData && (
            <>
              {hgpSubTab === "upcoming"   && <UpcomingView   upcoming={hgpData.upcoming} />}
              {hgpSubTab === "structural" && <StructuralView structural={hgpData.structural} />}
              {hgpSubTab === "mep"        && <MepView        mep={hgpData.mep} />}
            </>
          )}
        </>
      )}
    </div>
  );
}
