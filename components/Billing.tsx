"use client";
import { useEffect, useState, useMemo, useRef, type ReactNode, type CSSProperties } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid,
  LineChart, Line,
} from "recharts";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface CategoryBilling {
  srNo: number;
  category: string;
  dayLabour: number;
  nightLabour: number;
  dailyExpense: number;
  daySupply: number;
  nightSupply: number;
  supplyExpense: number;
  totalLabour: number;
  totalAmount: number;
}
interface DailyBilling {
  date: string;
  rows: CategoryBilling[];
  totalDayLabour: number;
  totalNightLabour: number;
  totalDailyExpense: number;
  totalDaySupply: number;
  totalNightSupply: number;
  totalSupplyExpense: number;
  totalLabour: number;
  totalAmount: number;
}
interface ActivityItem { name: string; unit: string; quantity: number }
interface DailyDPR     { date: string; activities: ActivityItem[] }
interface ActAggrRow   { name: string; unit: string; total: number }
interface DprSummary   {
  activeDays: number; peakDate: string | null; peakActivityCount: number; avgActivitiesPerDay: number;
}
interface BillingSummary {
  totalDailyExp: number; totalSupplyExp: number; totalAll: number;
  activeDays: number; peakDay: DailyBilling | null; avgDaily: number;
}
interface WorkRow {
  description: string;
  subTotal: number;
  targetDay: number;
  shortFall: number;
}
interface ManpowerCounts {
  date: string;
  mason: number; mHelper: number; f: number; fH: number;
  cr: number; crH: number; supFor: number; weld: number;
  weldH: number; scaff: number; elecPlum: number; cook: number;
  totalDay: number; targetDay: number; shortFall: number;
  nightMason: number; nightHelper: number; totalNight: number;
  total: number;
  workRows: WorkRow[];
}

interface BillingData {
  month: number;
  year: number;
  monthLabel: string;
  daily: DailyBilling[];
  monthly: DailyBilling | null;
  summary: BillingSummary;
  dailyManpower: ManpowerCounts[];
  dpr: DailyDPR[];
  activityAggregate: ActAggrRow[];
  dprSummary: DprSummary;
}
type SubTab = "dlr" | "dpr";
type Contractor = "ACC" | "Ethimo";

/* ── Month helpers ───────────────────────────────────────────────────────── */
const MONTH_NAMES_FULL = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const MONTH_NAMES_SHORT = ["Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"];

function getAvailableMonths(): { year: number; month: number; label: string }[] {
  // Project started May 2026 — list every month from then to current
  const result = [];
  const now    = new Date();
  const start  = new Date(2026, 4, 1); // May 2026
  const cursor = new Date(start);
  while (cursor.getFullYear() < now.getFullYear() ||
        (cursor.getFullYear() === now.getFullYear() && cursor.getMonth() <= now.getMonth())) {
    result.push({
      year:  cursor.getFullYear(),
      month: cursor.getMonth(),
      label: `${MONTH_NAMES_FULL[cursor.getMonth()]} ${cursor.getFullYear()}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result.reverse(); // newest first
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const fmt    = (n: number) => "₹" + n.toLocaleString("en-IN");
const fmtQty = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);

function catIcon(cat: string): string {
  const lc = cat.toLowerCase().trim();
  if (lc === "mason")                       return "🧱";
  if (lc === "m.helper" || lc === "m helper") return "🔧";
  if (lc === "f" || lc === "fabricator")    return "🏗️";
  if (lc === "f-h" || lc === "f-helper")    return "🔩";
  if (lc === "cr" || lc === "crane")        return "🏗️";
  if (lc === "cr-h" || lc === "cr-helper")  return "⚙️";
  if (lc.includes("sup") || lc.includes("for")) return "👷";
  if (lc === "weld" || lc === "welder")     return "🔥";
  if (lc === "weld-h" || lc === "weld-helper") return "⚡";
  if (lc === "scaff" || lc.includes("scaffold")) return "🪜";
  if (lc.includes("elec") || lc.includes("plum")) return "💡";
  if (lc.includes("cook"))                  return "🍳";
  if (lc.includes("helper"))                return "🔧";
  if (lc.includes("chowk") || lc.includes("local")) return "🏘️";
  if (lc.includes("fare"))                  return "🚌";
  return "👥";
}

function AmountTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--text)" }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</div>)}
    </div>
  );
}
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--text)" }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</div>)}
    </div>
  );
}

/* ── Date chip strip ─────────────────────────────────────────────────────── */
function DateChips({ dates, selected, onSelect, datesWithData }: {
  dates: string[]; selected: string | null;
  onSelect: (d: string | null) => void; datesWithData: Set<string>;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "0 0 16px 0", alignItems: "center" }}>
      <span style={{ fontSize: 11, color: "var(--muted)", marginRight: 4, fontWeight: 600 }}>DATE FILTER</span>
      <button onClick={() => onSelect(null)} style={{
        padding: "4px 10px", borderRadius: 20, border: "1px solid var(--border)",
        background: selected === null ? "var(--accent)" : "var(--sidebar-bg)",
        color: selected === null ? "#fff" : "var(--text)",
        cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s",
      }}>All (Master)</button>
      {dates.map((d) => {
        const hasData = datesWithData.has(d), isSel = selected === d;
        return (
          <button key={d} onClick={() => onSelect(isSel ? null : d)} title={hasData ? d : `${d} — no data yet`} style={{
            padding: "4px 10px", borderRadius: 20, border: "1px solid var(--border)",
            background: isSel ? "var(--accent)" : "var(--sidebar-bg)",
            color: isSel ? "#fff" : hasData ? "var(--text)" : "var(--muted)",
            cursor: "pointer", fontSize: 12, transition: "all 0.15s",
            opacity: hasData ? 1 : 0.5, fontStyle: hasData ? "normal" : "italic",
          }}>{d}</button>
        );
      })}
    </div>
  );
}

function SubTabBtn({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: string }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.15s",
      border: active ? "2px solid var(--accent)" : "2px solid var(--border)",
      background: active ? "var(--accent)" : "var(--sidebar-bg)",
      color: active ? "#fff" : "var(--text)",
    }}>{icon} {label}</button>
  );
}

function SectionBadge({ color, label }: { color: string; label: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: color + "22", border: `1px solid ${color}55`,
      borderRadius: 6, padding: "3px 10px", marginBottom: 12,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.04em" }}>{label}</span>
    </div>
  );
}

/* ── Category table shared component ────────────────────────────────────── */
function CategoryTable({
  rows, showDailyExp, showSupplyExp,
  totalDayLabour, totalNightLabour, totalDailyExpense,
  totalDaySupply, totalNightSupply, totalSupplyExpense,
  totalLabour, totalAmount,
}: {
  rows: CategoryBilling[];
  showDailyExp: boolean;
  showSupplyExp: boolean;
  totalDayLabour: number; totalNightLabour: number; totalDailyExpense: number;
  totalDaySupply: number; totalNightSupply: number; totalSupplyExpense: number;
  totalLabour: number; totalAmount: number;
}) {
  const th = (label: string, align: "left" | "right" | "center" = "right", color?: string) => (
    <th key={label} style={{
      padding: "7px 10px", textAlign: align,
      borderBottom: "2px solid var(--border)",
      color: color ?? "var(--muted)", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap",
    }}>{label}</th>
  );
  const td = (content: ReactNode, align: "left" | "right" = "right", extra?: CSSProperties) => (
    <td style={{ padding: "7px 10px", textAlign: align, borderBottom: "1px solid var(--border)", ...extra }}>{content}</td>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "var(--sidebar-bg)" }}>
            {th("Category", "left")}
            {/* Regular Labour */}
            {th("Day Labour", "right", "#6ea8ff")}
            {th("Night Labour", "right", "#a78bfa")}
            {showDailyExp && th("Daily Exp", "right", "#4ade80")}
            {/* Supply Labour */}
            {th("Day Supply", "right", "#fbbf24")}
            {th("Night Supply", "right", "#fb923c")}
            {showSupplyExp && th("Supply Exp", "right", "#4ade80")}
            {/* Totals */}
            {th("Total Labour", "right")}
            {th("Total Amount", "right", "#4ade80")}
          </tr>
        </thead>
        <tbody>
          {rows.filter(r => r.totalLabour > 0 || r.totalAmount > 0).map((r, i) => (
            <tr key={r.srNo} style={{ background: i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
              {td(
                <span style={{ fontWeight: 500 }}>{catIcon(r.category)} {r.category}</span>,
                "left"
              )}
              {td(<span style={{ color: "#6ea8ff", fontWeight: 600 }}>{r.dayLabour || "—"}</span>)}
              {td(<span style={{ color: "#a78bfa", fontWeight: 600 }}>{r.nightLabour || "—"}</span>)}
              {showDailyExp && td(<span style={{ color: "#4ade80" }}>{r.dailyExpense > 0 ? fmt(r.dailyExpense) : "—"}</span>)}
              {td(<span style={{ color: "#fbbf24", fontWeight: 600 }}>{r.daySupply || "—"}</span>)}
              {td(<span style={{ color: "#fb923c", fontWeight: 600 }}>{r.nightSupply || "—"}</span>)}
              {showSupplyExp && td(<span style={{ color: "#4ade80" }}>{r.supplyExpense > 0 ? fmt(r.supplyExpense) : "—"}</span>)}
              {td(<span style={{ fontWeight: 600 }}>{r.totalLabour}</span>)}
              {td(<span style={{ fontWeight: 700, color: "#4ade80", fontSize: 13 }}>{r.totalAmount > 0 ? fmt(r.totalAmount) : "—"}</span>)}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "var(--sidebar-bg)", fontWeight: 700 }}>
            {td(<span style={{ fontWeight: 700, fontSize: 12 }}>∑ TOTAL</span>, "left", { borderTop: "2px solid var(--border)" })}
            {td(<span style={{ color: "#6ea8ff" }}>{totalDayLabour}</span>, "right", { borderTop: "2px solid var(--border)" })}
            {td(<span style={{ color: "#a78bfa" }}>{totalNightLabour}</span>, "right", { borderTop: "2px solid var(--border)" })}
            {showDailyExp && td(<span style={{ color: "#4ade80" }}>{fmt(totalDailyExpense)}</span>, "right", { borderTop: "2px solid var(--border)" })}
            {td(<span style={{ color: "#fbbf24" }}>{totalDaySupply}</span>, "right", { borderTop: "2px solid var(--border)" })}
            {td(<span style={{ color: "#fb923c" }}>{totalNightSupply}</span>, "right", { borderTop: "2px solid var(--border)" })}
            {showSupplyExp && td(<span style={{ color: "#4ade80" }}>{fmt(totalSupplyExpense)}</span>, "right", { borderTop: "2px solid var(--border)" })}
            {td(<span style={{ fontSize: 13 }}>{totalLabour}</span>, "right", { borderTop: "2px solid var(--border)" })}
            {td(<span style={{ color: "#4ade80", fontSize: 14 }}>{fmt(totalAmount)}</span>, "right", { borderTop: "2px solid var(--border)" })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ── DLR All (master overview) ──────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════════ */
/* ── HGP Manpower Table ──────────────────────────────────────────────────── */
interface HGPManpowerRow { category: string; requiredManpower: number; availableManpower: number; shortfall: number; }

function HGPManpowerTable({ date }: { date?: string | null }) {
  const [rows,    setRows]    = useState<HGPManpowerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = date ? `/api/hgp-manpower?date=${encodeURIComponent(date)}` : "/api/hgp-manpower";
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setRows(d.rows ?? []); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [date]);

  if (loading) return <div className="panel" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>Loading HGP manpower data…</div>;
  if (error)   return <div className="panel" style={{ padding: 32, textAlign: "center", color: "#f87171" }}>⚠️ {error}</div>;
  if (!rows.length) return <div className="panel" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No manpower data found in HGP sheet.</div>;

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <h3 style={{ marginBottom: 12 }}>📊 Required vs Available Manpower{date ? ` — ${date}` : " (Month Overview)"}</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--sidebar-bg)" }}>
              {[
                { h: "Category",           color: "var(--muted)", align: "left"  as const },
                { h: "Required Manpower",  color: "#4ade80",      align: "right" as const },
                { h: "Available Manpower", color: "#6ea8ff",      align: "right" as const },
                { h: "Shortfall",          color: "#f87171",      align: "right" as const },
              ].map(({ h, color, align }) => (
                <th key={h} style={{ padding: "7px 12px", textAlign: align, borderBottom: "2px solid var(--border)", color, fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ category, requiredManpower, availableManpower, shortfall }, i) => {
              const flagged = shortfall < 0;
              return (
                <tr key={category} style={{ background: flagged ? "rgba(248,113,113,0.07)" : i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", fontWeight: 500, color: flagged ? "#f87171" : "inherit" }}>{category}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#4ade80", fontWeight: 600 }}>{requiredManpower  || "—"}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#6ea8ff", fontWeight: 600 }}>{availableManpower || "—"}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: flagged ? "#f87171" : "var(--muted)", fontWeight: flagged ? 700 : 400 }}>{shortfall !== 0 ? shortfall : "—"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: "var(--sidebar-bg)", fontWeight: 700, borderTop: "2px solid var(--border)" }}>
              <td style={{ padding: "8px 12px" }}>∑ TOTAL</td>
              <td style={{ padding: "8px 12px", textAlign: "right", color: "#4ade80" }}>{rows.reduce((s, r) => s + r.requiredManpower,  0) || "—"}</td>
              <td style={{ padding: "8px 12px", textAlign: "right", color: "#6ea8ff" }}>{rows.reduce((s, r) => s + r.availableManpower, 0) || "—"}</td>
              <td style={{ padding: "8px 12px", textAlign: "right", color: "#f87171" }}>{rows.reduce((s, r) => s + r.shortfall,         0) || "—"}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ── DLR All (master overview) ──────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════════ */
function DLRAll({ daily, dailyManpower, summary, theme, monthLabel, contractor }: {
  daily: DailyBilling[]; monthly: DailyBilling | null;
  dailyManpower: ManpowerCounts[];
  summary: BillingSummary; theme: "dark" | "light"; monthLabel: string;
  contractor: Contractor;
}) {
  const isDark    = theme === "dark";
  const gridColor = isDark ? "#25305a" : "#ccd4ee";
  const axisColor = isDark ? "#9aa6cc" : "#5a6890";

  // Build a quick lookup: date → ManpowerCounts
  const mpMap = new Map<string, ManpowerCounts>();
  dailyManpower.forEach((m) => mpMap.set(m.date, m));

  // Per-day merged rows: use ManpowerCounts for Reg, DailyBilling for Sup
  const merged = daily.map((d) => {
    const mp = mpMap.get(d.date);
    return {
      date:     d.date,
      regDay:   mp?.totalDay   ?? d.totalDayLabour,
      regNight: mp?.totalNight ?? d.totalNightLabour,
      supDay:   d.totalDayLabour,    // supply billing day nos
      supNight: d.totalNightLabour,  // supply billing night nos
    };
  });

  const totalRegDay   = merged.reduce((s, d) => s + d.regDay,   0);
  const totalRegNight = merged.reduce((s, d) => s + d.regNight, 0);
  const totalSupDay   = merged.reduce((s, d) => s + d.supDay,   0);
  const totalSupNight = merged.reduce((s, d) => s + d.supNight, 0);
  const totalWorkers  = totalRegDay + totalRegNight + totalSupDay + totalSupNight;

  const kpis = [
    { label: "Active Work Days", value: String(summary.activeDays), icon: "📅", color: "kpi-green", sub: "Days with workers"       },
    { label: "Regular Day",      value: String(totalRegDay),        icon: "☀️", color: "kpi-blue",  sub: "Total reg. day workers"  },
    { label: "Regular Night",    value: String(totalRegNight),      icon: "🌙", color: "kpi-blue",  sub: "Total reg. night workers" },
    { label: "Supply Day",       value: String(totalSupDay),        icon: "🔆", color: "kpi-amber", sub: "Supply billing day nos"   },
    { label: "Supply Night",     value: String(totalSupNight),      icon: "🌒", color: "kpi-amber", sub: "Supply billing night nos" },
    { label: "Total Manpower",   value: String(totalWorkers),       icon: "👷", color: "kpi-red",   sub: "Reg + Supply combined"   },
  ];

  const workerData = merged
    .filter((d) => d.regDay > 0 || d.regNight > 0 || d.supDay > 0 || d.supNight > 0)
    .map((d) => ({
      date:        d.date,
      "Reg Day":   d.regDay,
      "Reg Night": d.regNight,
      "Sup Day":   d.supDay,
      "Sup Night": d.supNight,
    }));

  return (
    <>
      {/* KPI cards — ACC only */}
      {contractor !== "Ethimo" && (
        <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
          {kpis.map((k) => (
            <div key={k.label} className={`kpi ${k.color}`}>
              <span className="kpi-icon">{k.icon}</span>
              <div className="label">{k.label}</div>
              <div className="value">{k.value}</div>
              <div className="delta">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Worker count trend — ACC only */}
      {contractor !== "Ethimo" && workerData.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Worker Count Trend — {monthLabel}</h3>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={workerData} margin={{ top: 8, right: 16, bottom: 44, left: 0 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={axisColor} tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={55} interval={0} />
                <YAxis stroke={axisColor} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Reg Day"   stroke="#6ea8ff" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Reg Night" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Sup Day"   stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Sup Night" stroke="#fb923c" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Master register table — ACC only */}
      {contractor !== "Ethimo" && <div className="panel">
        <h3>📋 Daily Manpower Register — {monthLabel}</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--sidebar-bg)" }}>
                {[
                  { h: "Date",      color: undefined,  align: "left"  as const },
                  { h: "Reg Day",   color: "#6ea8ff",  align: "right" as const },
                  { h: "Reg Night", color: "#a78bfa",  align: "right" as const },
                  { h: "Sup Day",   color: "#fbbf24",  align: "right" as const },
                  { h: "Sup Night", color: "#fb923c",  align: "right" as const },
                  { h: "Total",     color: undefined,  align: "right" as const },
                ].map(({ h, color, align }) => (
                  <th key={h} style={{ padding: "7px 10px", textAlign: align, borderBottom: "2px solid var(--border)", color: color ?? "var(--muted)", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {merged.map((row, i) => {
                const rowTotal = row.regDay + row.regNight + row.supDay + row.supNight;
                return (
                  <tr key={row.date} style={{ background: i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
                    <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>{row.date}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#6ea8ff" }}>{row.regDay   || "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#a78bfa" }}>{row.regNight || "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#fbbf24" }}>{row.supDay   || "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#fb923c" }}>{row.supNight || "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", fontWeight: 700  }}>{rowTotal     || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "var(--sidebar-bg)", fontWeight: 700 }}>
                <td style={{ padding: "7px 10px", borderTop: "2px solid var(--border)" }}>TOTAL</td>
                <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#6ea8ff" }}>{totalRegDay}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#a78bfa" }}>{totalRegNight}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#fbbf24" }}>{totalSupDay}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#fb923c" }}>{totalSupNight}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)", fontSize: 13      }}>{totalWorkers}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ── DLR Day (single-date drill-down) ───────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════════ */
// Day categories map to ManpowerCounts fields (same order as source sheet)
const REG_DAY_CATS: { label: string; key: keyof ManpowerCounts }[] = [
  { label: "Mason",     key: "mason"    },
  { label: "M.Helper",  key: "mHelper"  },
  { label: "F",         key: "f"        },
  { label: "F-H",       key: "fH"       },
  { label: "CR",        key: "cr"       },
  { label: "CR-H",      key: "crH"      },
  { label: "SUP/FOR",   key: "supFor"   },
  { label: "WELD",      key: "weld"     },
  { label: "WELD-H",    key: "weldH"    },
  { label: "SCAFF",     key: "scaff"    },
  { label: "ELEC/PLUM", key: "elecPlum" },
  { label: "Cook",      key: "cook"     },
];

const REG_NIGHT_CATS: { label: string; key: keyof ManpowerCounts }[] = [
  { label: "MAS/CAR",  key: "nightMason"  },
  { label: "M.Helper", key: "nightHelper" },
];

function DLRDay({ row, mp }: { row: DailyBilling; mp: ManpowerCounts | null }) {
  // Build lookup from supply billing rows by category name (case-insensitive)
  const supplyByName = new Map<string, CategoryBilling>();
  row.rows.forEach((r) => supplyByName.set(r.category.trim().toLowerCase(), r));
  const supLookup = (cat: string) => supplyByName.get(cat.trim().toLowerCase());

  // Regular Night: Mason night → "MAS/CAR", M.Helper night → "M.Helper"
  // Read from supply billing rows (nightLabour field) — more reliable than TOTAL row cols
  const nightMASCAR  = supLookup("mason")?.nightLabour    ?? 0;
  const nightMHelper = supLookup("m.helper")?.nightLabour ?? 0;
  const regNightTotal = nightMASCAR + nightMHelper;

  // Supply day/night totals from billing rows
  const supDayTotal   = row.rows.reduce((s, r) => s + r.dayLabour,   0);
  const supNightTotal = row.rows.reduce((s, r) => s + r.nightLabour, 0);

  const regDayTotal = mp?.totalDay ?? 0;
  const kpiRegDay   = mp ? mp.totalDay : 0;

  return (
    <div>
      {/* ── Summary KPI strip — manpower only ──────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { icon: "☀️", label: "Regular Day",   value: String(kpiRegDay      || "—"), color: "#6ea8ff" },
          { icon: "🌙", label: "Regular Night",  value: String(regNightTotal  || "—"), color: "#a78bfa" },
          { icon: "🔆", label: "Supply Day",     value: String(supDayTotal    || "—"), color: "#fbbf24" },
          { icon: "🌒", label: "Supply Night",   value: String(supNightTotal  || "—"), color: "#fb923c" },
          { icon: "👥", label: "Total Workers",  value: String((kpiRegDay + regNightTotal + supDayTotal + supNightTotal) || "—"), color: "var(--text)" },
        ].map((c) => (
          <div key={c.label} style={{ background: "var(--sidebar-bg)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 18 }}>{c.icon}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{c.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* ── Actual vs Required Labour ──────────────────────────────────── */}
      {mp && mp.workRows.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <SectionBadge color="#34d399" label="📊 ACTUAL VS REQUIRED LABOUR" />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--sidebar-bg)" }}>
                  <th style={{ padding: "7px 12px", textAlign: "left",  borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 600, fontSize: 11 }}>Work Description</th>
                  <th style={{ padding: "7px 12px", textAlign: "right", borderBottom: "2px solid var(--border)", color: "#6ea8ff",      fontWeight: 600, fontSize: 11 }}>Sub Total</th>
                  <th style={{ padding: "7px 12px", textAlign: "right", borderBottom: "2px solid var(--border)", color: "#4ade80",      fontWeight: 600, fontSize: 11 }}>Target Manpower</th>
                  <th style={{ padding: "7px 12px", textAlign: "right", borderBottom: "2px solid var(--border)", color: "#f87171",      fontWeight: 600, fontSize: 11 }}>Short Fall</th>
                </tr>
              </thead>
              <tbody>
                {mp.workRows.map(({ description, subTotal, targetDay, shortFall: sf }, i) => {
                  const flagged = sf < 0 || sf === 0;
                  return (
                    <tr key={description} style={{ background: flagged ? "rgba(248,113,113,0.08)" : i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", fontWeight: 500, color: flagged ? "#f87171" : "inherit" }}>{description}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#6ea8ff", fontWeight: 600 }}>{subTotal || "—"}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#4ade80", fontWeight: 600 }}>{targetDay || "—"}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: sf !== 0 ? "#f87171" : "var(--muted)", fontWeight: sf !== 0 ? 700 : 400 }}>{sf !== 0 ? sf : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--sidebar-bg)", fontWeight: 700, borderTop: "2px solid var(--border)" }}>
                  <td style={{ padding: "8px 12px" }}>∑ TOTAL</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#6ea8ff" }}>{mp.totalDay || "—"}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#4ade80" }}>{mp.targetDay || "—"}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: mp.shortFall !== 0 ? "#f87171" : "var(--muted)" }}>{mp.shortFall !== 0 ? mp.shortFall : "—"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Regular Labour — Day + Night combined ──────────────────────── */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <SectionBadge color="#6ea8ff" label="☀️🌙 REGULAR LABOUR (Day + Night)" />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--sidebar-bg)" }}>
                <th style={{ padding: "7px 12px", textAlign: "left",  borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 600, fontSize: 11 }}>Category</th>
                <th style={{ padding: "7px 12px", textAlign: "right", borderBottom: "2px solid var(--border)", color: "#6ea8ff",      fontWeight: 600, fontSize: 11 }}>Day</th>
                <th style={{ padding: "7px 12px", textAlign: "right", borderBottom: "2px solid var(--border)", color: "#a78bfa",      fontWeight: 600, fontSize: 11 }}>Night</th>
              </tr>
            </thead>
            <tbody>
              {REG_DAY_CATS.map(({ label, key }, i) => {
                const dayVal   = mp ? (mp[key] as number) : 0;
                const nightVal = label === "Mason" ? nightMASCAR : label === "M.Helper" ? nightMHelper : 0;
                return (
                  <tr key={label} style={{ background: i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>{catIcon(label)} {label}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#6ea8ff", fontWeight: 600 }}>{dayVal   || "—"}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#a78bfa", fontWeight: 600 }}>{nightVal || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "var(--sidebar-bg)", fontWeight: 700, borderTop: "2px solid var(--border)" }}>
                <td style={{ padding: "8px 12px" }}>∑ TOTAL</td>
                <td style={{ padding: "8px 12px", textAlign: "right", color: "#6ea8ff" }}>{regDayTotal   || "—"}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", color: "#a78bfa" }}>{regNightTotal || "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Supply Labour section ───────────────────────────────────────── */}
      {row.rows.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <SectionBadge color="#fbbf24" label="🔆🌒 SUPPLY LABOUR (Day + Night)" />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--sidebar-bg)" }}>
                  <th style={{ padding: "7px 12px", textAlign: "left",  borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 600, fontSize: 11 }}>Category</th>
                  <th style={{ padding: "7px 12px", textAlign: "right", borderBottom: "2px solid var(--border)", color: "#fbbf24",      fontWeight: 600, fontSize: 11 }}>Day Nos</th>
                  <th style={{ padding: "7px 12px", textAlign: "right", borderBottom: "2px solid var(--border)", color: "#fb923c",      fontWeight: 600, fontSize: 11 }}>Night Nos</th>
                </tr>
              </thead>
              <tbody>
                {row.rows.map((r, i) => (
                  <tr key={r.srNo} style={{ background: i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>{catIcon(r.category)} {r.category}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#fbbf24", fontWeight: 600 }}>{r.dayLabour   || "—"}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#fb923c", fontWeight: 600 }}>{r.nightLabour || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--sidebar-bg)", fontWeight: 700, borderTop: "2px solid var(--border)" }}>
                  <td style={{ padding: "8px 12px" }}>∑ TOTAL</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#fbbf24" }}>{supDayTotal}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#fb923c" }}>{supNightTotal}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ── DPR Views — Work Progress only ────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════════ */
const ACTIVITY_COLORS = ["#6ea8ff","#4ade80","#f87171","#fbbf24","#a78bfa","#34d399","#fb923c","#38bdf8","#e879f9","#a3e635"];

function DPRAll({ dpr, activityAggregate, dprSummary, theme, monthLabel }: {
  dpr: DailyDPR[]; activityAggregate: ActAggrRow[]; dprSummary: DprSummary; theme: "dark" | "light"; monthLabel: string;
}) {
  const isDark    = theme === "dark";
  const gridColor = isDark ? "#25305a" : "#ccd4ee";
  const axisColor = isDark ? "#9aa6cc" : "#5a6890";
  const dailyCountData = dpr.filter((d) => d.activities.length > 0).map((d) => ({ date: d.date, count: d.activities.length }));

  return (
    <>
      <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
        <div className="kpi kpi-green"><span className="kpi-icon">📅</span><div className="label">Active Progress Days</div><div className="value">{dprSummary.activeDays}</div><div className="delta">Days with work recorded</div></div>
        <div className="kpi kpi-blue"><span className="kpi-icon">⬆️</span><div className="label">Peak Progress Day</div><div className="value" style={{ fontSize: 20 }}>{dprSummary.peakDate ?? "—"}</div><div className="delta">{dprSummary.peakActivityCount} activities on that day</div></div>
        <div className="kpi kpi-amber"><span className="kpi-icon">📊</span><div className="label">Avg Activities / Day</div><div className="value">{dprSummary.avgActivitiesPerDay}</div><div className="delta">Average across active days</div></div>
        <div className="kpi kpi-red"><span className="kpi-icon">🏗️</span><div className="label">Activity Types</div><div className="value">{activityAggregate.length}</div><div className="delta">Distinct work items tracked</div></div>
      </div>

      {dailyCountData.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Activities Recorded Per Day</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -4, marginBottom: 12 }}>Number of distinct work items logged each day</p>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={dailyCountData} margin={{ top: 8, right: 16, bottom: 44, left: 0 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={axisColor} tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={55} interval={0} />
                <YAxis stroke={axisColor} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Activities" fill="#6ea8ff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activityAggregate.length > 0 && (
        <div className="panel">
          <h3>📋 Work Progress — Cumulative Quantities ({monthLabel})</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -4, marginBottom: 12 }}>Total quantities executed across all dates — all 14 activities shown in sequence</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--sidebar-bg)" }}>
                  <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 600, fontSize: 11, width: 40 }}>Sr</th>
                  <th style={{ padding: "8px 12px", textAlign: "left",   borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 600, fontSize: 11 }}>Activity</th>
                  <th style={{ padding: "8px 12px", textAlign: "right",  borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 600, fontSize: 11 }}>Unit</th>
                  <th style={{ padding: "8px 12px", textAlign: "right",  borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 600, fontSize: 11 }}>Total Quantity</th>
                </tr>
              </thead>
              <tbody>
                {activityAggregate.map((r, i) => {
                  const done = r.total > 0;
                  return (
                    <tr key={r.name} style={{ background: i % 2 === 0 ? "transparent" : "var(--sidebar-bg)", opacity: done ? 1 : 0.55 }}>
                      <td style={{ padding: "7px 12px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: done ? ACTIVITY_COLORS[i % ACTIVITY_COLORS.length] : "var(--border)", fontSize: 11, fontWeight: 700, color: done ? "#fff" : "var(--muted)" }}>{i + 1}</span>
                      </td>
                      <td style={{ padding: "7px 12px", borderBottom: "1px solid var(--border)", fontWeight: done ? 600 : 400, color: done ? "var(--text)" : "var(--muted)" }}>{r.name}</td>
                      <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{r.unit}</td>
                      <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", fontWeight: 700, color: done ? "#4ade80" : "var(--muted)", fontSize: done ? 14 : 13 }}>
                        {done ? fmtQty(r.total) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function DPRDay({ row }: { row: DailyDPR }) {
  return (
    <div className="panel card-detail">
      <h3>
        🏗️ DPR — {row.date}
        <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 8, fontSize: 13 }}>
          {row.activities.length} {row.activities.length === 1 ? "activity" : "activities"} recorded
        </span>
      </h3>
      {row.activities.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 12 }}>No work progress recorded for this date.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 16 }}>
          <thead>
            <tr style={{ background: "var(--sidebar-bg)" }}>
              {["Activity","Unit","Quantity"].map((h) => (
                <th key={h} style={{ padding: "8px 12px", textAlign: h === "Activity" ? "left" : "right", borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row.activities.map((a, i) => (
              <tr key={a.name} style={{ background: i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
                <td style={{ padding: "7px 12px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: ACTIVITY_COLORS[i % ACTIVITY_COLORS.length], marginRight: 8, verticalAlign: "middle" }} />
                  {a.name}
                </td>
                <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{a.unit}</td>
                <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", fontWeight: 700, color: "#4ade80", fontSize: 14 }}>{fmtQty(a.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ── Main Billing component ─────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Billing({ theme }: { theme: "dark" | "light" }) {
  const availableMonths = useMemo(() => getAvailableMonths(), []);

  const [selMonth,     setSelMonth]     = useState<{ year: number; month: number }>(
    () => {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() };
    }
  );
  const [contractor,   setContractor]   = useState<Contractor>("ACC");
  const [data,         setData]         = useState<BillingData | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  // Default to today's date in DD-Mon format (e.g. "08-Jul")
  const todayStr = useMemo(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    return `${day}-${MONTH_NAMES_FULL[now.getMonth()]}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);
  const [refreshTick,  setRefreshTick]  = useState(0);
  const [refreshing,   setRefreshing]   = useState(false);
  const prevMonth = useRef({ year: selMonth.year, month: selMonth.month });

  // Re-fetch whenever month, contractor, or refreshTick changes
  useEffect(() => {
    setRefreshing(true);
    // When month changes, reset to today if still in current month, else null
    const monthChanged =
      prevMonth.current.year !== selMonth.year || prevMonth.current.month !== selMonth.month;
    if (monthChanged) {
      const now = new Date();
      const isCurrentMonth = selMonth.year === now.getFullYear() && selMonth.month === now.getMonth();
      setSelectedDate(isCurrentMonth ? todayStr : null);
      prevMonth.current = { year: selMonth.year, month: selMonth.month };
    }
    const url = `/api/billing?month=${selMonth.month}&year=${selMonth.year}&contractor=${contractor}&t=${Date.now()}`;
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setRefreshing(false));
  }, [selMonth.month, selMonth.year, contractor, refreshTick]);

  const activeDates = useMemo(() => data?.daily.map((d) => d.date) ?? [], [data]);

  const datesWithData = useMemo(() => {
    const s = new Set<string>();
    data?.daily.forEach((d) => { if (d.totalLabour > 0 || d.totalAmount > 0) s.add(d.date); });
    data?.dpr.forEach((d)   => { if (d.activities.length > 0) s.add(d.date); });
    return s;
  }, [data]);

  const dlrRow = useMemo(
    () => (selectedDate ? data?.daily.find((d) => d.date === selectedDate) ?? null : null),
    [data, selectedDate]
  );

  const mpRow = useMemo(
    () => (selectedDate ? data?.dailyManpower?.find((d) => d.date === selectedDate) ?? null : null),
    [data, selectedDate]
  );

  const monthDisplayLabel = `${MONTH_NAMES_FULL[selMonth.month]} ${selMonth.year}`;

  if (error) return <div className="error">⚠️ {error}</div>;

  return (
    <div>
      {/* ── Contractor selector ────────────────────────────────────────── */}
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>⛑️</span>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase" }}>Contractor</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["ACC", "Ethimo"] as Contractor[]).map((c) => (
          <button key={c} onClick={() => setContractor(c)} style={{
            padding: "9px 28px", borderRadius: 10, cursor: "pointer",
            fontWeight: 700, fontSize: 14, letterSpacing: "0.04em",
            border: contractor === c ? "2px solid var(--accent)" : "2px solid var(--border)",
            background: contractor === c ? "var(--accent)" : "var(--sidebar-bg)",
            color: contractor === c ? "#fff" : "var(--text)",
            transition: "all 0.15s",
          }}>{c}</button>
        ))}
      </div>

      {/* ── Contractor content (ACC + HGP) ────────────────────────────── */}
      {<>

      {/* ── Top bar: month selector + refresh ────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }} />

        {/* Month selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>MONTH</span>
          <select
            value={`${selMonth.year}-${selMonth.month}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setSelMonth({ year: y, month: m });
            }}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "2px solid var(--border)",
              background: "var(--sidebar-bg)",
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
              minWidth: 160,
            }}
          >
            {availableMonths.map(({ year, month, label }) => (
              <option key={`${year}-${month}`} value={`${year}-${month}`}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setRefreshTick((n) => n + 1)}
          disabled={refreshing}
          style={{
            padding: "8px 16px", borderRadius: 8, cursor: refreshing ? "default" : "pointer",
            fontWeight: 600, fontSize: 13, border: "2px solid var(--border)",
            background: "var(--sidebar-bg)", color: "var(--text)",
            opacity: refreshing ? 0.6 : 1, transition: "all 0.15s",
          }}
        >{refreshing ? "⟳ Loading…" : "🔄 Refresh"}</button>
      </div>

      {/* ── Loading state ─────────────────────────────────────────────── */}
      {refreshing && (
        <div className="loading" style={{ marginBottom: 16 }}>
          Loading {monthDisplayLabel} data…
        </div>
      )}

      {/* ── Date filter chips ─────────────────────────────────────────── */}
      {!refreshing && data && (
        <>
          {/* Month header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
            padding: "8px 14px", borderRadius: 8,
            background: "var(--sidebar-bg)", border: "1px solid var(--border)",
          }}>
            <span style={{ fontSize: 15 }}>📅</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{monthDisplayLabel}</span>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>
              — {datesWithData.size} day{datesWithData.size !== 1 ? "s" : ""} with data
              {activeDates.length > datesWithData.size
                ? `, ${activeDates.length - datesWithData.size} without`
                : ""}
            </span>
          </div>

          <DateChips
            dates={activeDates}
            selected={selectedDate}
            onSelect={setSelectedDate}
            datesWithData={datesWithData}
          />
        </>
      )}

      {/* ── HGP: Required vs Available table (date-aware) ────────────── */}
      {contractor === "Ethimo" && <HGPManpowerTable date={selectedDate} />}

      {/* ── ACC DLR content ───────────────────────────────────────────── */}
      {contractor === "ACC" && !refreshing && data && (() => {
        if (selectedDate) {
          if (dlrRow && (dlrRow.totalLabour > 0 || dlrRow.totalAmount > 0 || (mpRow && mpRow.total > 0))) return <DLRDay row={dlrRow} mp={mpRow} />;
          return (
            <div className="panel" style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No DLR data for {selectedDate}</div>
              <div style={{ fontSize: 12 }}>Data for this date hasn&apos;t been entered in the sheet yet.</div>
            </div>
          );
        }
        return <DLRAll daily={data.daily} monthly={data.monthly} dailyManpower={data.dailyManpower ?? []} summary={data.summary} theme={theme} monthLabel={monthDisplayLabel} contractor={contractor} />;
      })()}

      </>} {/* end contractor content */}
    </div>
  );
}
