"use client";
import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid, LineChart, Line,
} from "recharts";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface ManpowerCounts {
  date: string;
  mason: number; mHelper: number; f: number; fH: number;
  cr: number; crH: number; supFor: number; weld: number;
  weldH: number; scaff: number; elecPlum: number; cook: number;
  totalDay: number; nightMason: number; nightHelper: number;
  totalNight: number; total: number;
}
interface DailyBilling {
  date: string; rows: any[]; totalDayLabour: number;
  totalNightLabour: number; totalDaySupply: number;
  totalNightSupply: number; totalLabour: number;
}
interface BillingData {
  month: number; year: number; monthLabel: string;
  daily: DailyBilling[];
  monthly: DailyBilling | null;
  dailyManpower: ManpowerCounts[];
  summary: { activeDays: number; peakDay: DailyBilling | null; avgDaily: number };
}

/* ── Category config ─────────────────────────────────────────────────────── */
const CATEGORIES: { key: keyof ManpowerCounts; label: string; icon: string; color: string }[] = [
  { key: "mason",    label: "Mason",      icon: "🧱", color: "#6ea8ff" },
  { key: "mHelper",  label: "M.Helper",   icon: "🔧", color: "#a78bfa" },
  { key: "f",        label: "F",          icon: "🏗️", color: "#34d399" },
  { key: "fH",       label: "F-H",        icon: "🔩", color: "#6ee7b7" },
  { key: "cr",       label: "CR",         icon: "🏗️", color: "#fbbf24" },
  { key: "crH",      label: "CR-H",       icon: "⚙️", color: "#fb923c" },
  { key: "supFor",   label: "SUP/FOR",    icon: "👷", color: "#f472b6" },
  { key: "weld",     label: "WELD",       icon: "🔥", color: "#ef4444" },
  { key: "weldH",    label: "WELD-H",     icon: "⚡", color: "#f97316" },
  { key: "scaff",    label: "SCAFF",      icon: "🪜", color: "#84cc16" },
  { key: "elecPlum", label: "ELEC/PLUM",  icon: "💡", color: "#22d3ee" },
  { key: "cook",     label: "COOK",       icon: "🍳", color: "#e879f9" },
];

/* ── Month helpers ───────────────────────────────────────────────────────── */
const MONTH_NAMES_FULL = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
function getAvailableMonths() {
  const result: { year: number; month: number; label: string }[] = [];
  const now = new Date(); const cursor = new Date(2026, 4, 1);
  while (cursor.getFullYear() < now.getFullYear() ||
    (cursor.getFullYear() === now.getFullYear() && cursor.getMonth() <= now.getMonth())) {
    result.push({ year: cursor.getFullYear(), month: cursor.getMonth(),
      label: `${MONTH_NAMES_FULL[cursor.getMonth()]} ${cursor.getFullYear()}` });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result.reverse();
}

/* ── Custom Tooltip ──────────────────────────────────────────────────────── */
function MpTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "var(--text)" }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
      <div style={{ marginTop: 6, borderTop: "1px solid var(--border)", paddingTop: 4, fontWeight: 700 }}>
        Total: {total}
      </div>
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
      <span style={{ fontSize: 11, color: "var(--muted)", marginRight: 4, fontWeight: 600 }}>DATE</span>
      <button onClick={() => onSelect(null)} style={{
        padding: "4px 10px", borderRadius: 20, border: "1px solid var(--border)",
        background: selected === null ? "var(--accent)" : "var(--sidebar-bg)",
        color: selected === null ? "#fff" : "var(--text)",
        cursor: "pointer", fontSize: 12, fontWeight: 600,
      }}>All (Master)</button>
      {dates.map((d) => {
        const has = datesWithData.has(d), isSel = selected === d;
        return (
          <button key={d} onClick={() => onSelect(isSel ? null : d)} style={{
            padding: "4px 10px", borderRadius: 20, border: "1px solid var(--border)",
            background: isSel ? "var(--accent)" : "var(--sidebar-bg)",
            color: isSel ? "#fff" : has ? "var(--text)" : "var(--muted)",
            cursor: "pointer", fontSize: 12, opacity: has ? 1 : 0.5,
            fontStyle: has ? "normal" : "italic",
          }}>{d}</button>
        );
      })}
    </div>
  );
}

/* ── Category table ──────────────────────────────────────────────────────── */
function ManpowerTable({ row, showNight = false }: { row: ManpowerCounts; showNight?: boolean }) {
  const active = CATEGORIES.filter(c => (row[c.key] as number) > 0 ||
    (showNight && c.key === "mason" && row.nightMason > 0) ||
    (showNight && c.key === "mHelper" && row.nightHelper > 0));

  if (!active.length && row.total === 0) {
    return <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 13 }}>
      No workers recorded for this date.
    </div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--sidebar-bg)" }}>
            <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 700, fontSize: 11 }}>Category</th>
            <th style={{ padding: "8px 12px", textAlign: "right", borderBottom: "2px solid var(--border)", color: "#6ea8ff", fontWeight: 700, fontSize: 11 }}>Day (1st Half)</th>
            {showNight && <th style={{ padding: "8px 12px", textAlign: "right", borderBottom: "2px solid var(--border)", color: "#a78bfa", fontWeight: 700, fontSize: 11 }}>Night (2nd Half)</th>}
            <th style={{ padding: "8px 12px", textAlign: "right", borderBottom: "2px solid var(--border)", color: "var(--text)", fontWeight: 700, fontSize: 11 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((c, i) => {
            const dayVal = row[c.key] as number;
            const nightVal = c.key === "mason" ? row.nightMason : c.key === "mHelper" ? row.nightHelper : 0;
            const total = dayVal + nightVal;
            if (total === 0) return null;
            return (
              <tr key={c.key} style={{ background: i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>
                  <span style={{ marginRight: 6 }}>{c.icon}</span>{c.label}
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#6ea8ff", fontWeight: 600 }}>
                  {dayVal || "—"}
                </td>
                {showNight && (
                  <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#a78bfa", fontWeight: 600 }}>
                    {nightVal || "—"}
                  </td>
                )}
                <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 14, color: c.color }}>
                  {total}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: "var(--sidebar-bg)", fontWeight: 700 }}>
            <td style={{ padding: "8px 12px", borderTop: "2px solid var(--border)" }}>∑ TOTAL</td>
            <td style={{ padding: "8px 12px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#6ea8ff" }}>{row.totalDay}</td>
            {showNight && <td style={{ padding: "8px 12px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#a78bfa" }}>{row.totalNight}</td>}
            <td style={{ padding: "8px 12px", textAlign: "right", borderTop: "2px solid var(--border)", fontSize: 15 }}>{row.total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ── All-dates master view ───────────────────────────────────────────────── */
function ManpowerAll({ dailyManpower, theme }: { dailyManpower: ManpowerCounts[]; theme: "dark" | "light" }) {
  const isDark    = theme === "dark";
  const gridColor = isDark ? "#25305a" : "#ccd4ee";
  const axisColor = isDark ? "#9aa6cc" : "#5a6890";

  const activeDays   = dailyManpower.filter(d => d.total > 0);
  const totalMandays = activeDays.reduce((s, d) => s + d.total, 0);
  const peakWorkers  = activeDays.length ? Math.max(...activeDays.map(d => d.total)) : 0;
  const avgWorkers   = activeDays.length ? Math.round(totalMandays / activeDays.length) : 0;
  const peakDay      = activeDays.find(d => d.total === peakWorkers);

  // Aggregate totals per category
  const categoryTotals = CATEGORIES.map(c => ({
    ...c,
    total: dailyManpower.reduce((s, d) => s + (d[c.key] as number), 0),
  })).filter(c => c.total > 0);

  // Daily stacked bar data
  const chartData = activeDays.map(d => ({
    date: d.date,
    Mason: d.mason, "M.Helper": d.mHelper, F: d.f, "F-H": d.fH,
    CR: d.cr, "CR-H": d.crH, "SUP/FOR": d.supFor, WELD: d.weld,
    "WELD-H": d.weldH, SCAFF: d.scaff, "ELEC/PLUM": d.elecPlum, COOK: d.cook,
  }));

  // Trend line
  const trendData = dailyManpower.map(d => ({ date: d.date, total: d.total }));

  // Monthly cumulative from all days
  const monthlyTotal: ManpowerCounts = {
    date: "Monthly",
    mason:    dailyManpower.reduce((s, d) => s + d.mason,    0),
    mHelper:  dailyManpower.reduce((s, d) => s + d.mHelper,  0),
    f:        dailyManpower.reduce((s, d) => s + d.f,        0),
    fH:       dailyManpower.reduce((s, d) => s + d.fH,       0),
    cr:       dailyManpower.reduce((s, d) => s + d.cr,       0),
    crH:      dailyManpower.reduce((s, d) => s + d.crH,      0),
    supFor:   dailyManpower.reduce((s, d) => s + d.supFor,   0),
    weld:     dailyManpower.reduce((s, d) => s + d.weld,     0),
    weldH:    dailyManpower.reduce((s, d) => s + d.weldH,    0),
    scaff:    dailyManpower.reduce((s, d) => s + d.scaff,    0),
    elecPlum: dailyManpower.reduce((s, d) => s + d.elecPlum, 0),
    cook:     dailyManpower.reduce((s, d) => s + d.cook,     0),
    totalDay:    dailyManpower.reduce((s, d) => s + d.totalDay,    0),
    nightMason:  dailyManpower.reduce((s, d) => s + d.nightMason,  0),
    nightHelper: dailyManpower.reduce((s, d) => s + d.nightHelper, 0),
    totalNight:  dailyManpower.reduce((s, d) => s + d.totalNight,  0),
    total:       totalMandays,
  };

  return (
    <>
      {/* KPI cards */}
      <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        {[
          { label: "Total Man-days",    value: totalMandays, icon: "👷", color: "kpi-blue",  sub: "Cumulative worker-days" },
          { label: "Active Work Days",  value: activeDays.length, icon: "📅", color: "kpi-green", sub: "Days with workers" },
          { label: "Avg Workers / Day", value: avgWorkers,   icon: "📊", color: "kpi-amber", sub: "Per active day" },
          { label: "Peak Day Workers",  value: peakWorkers,  icon: "⬆️", color: "kpi-red",   sub: peakDay?.date ?? "—" },
          { label: "Work Categories",   value: categoryTotals.length, icon: "🏗️", color: "kpi-blue", sub: "Active labour types" },
        ].map(k => (
          <div key={k.label} className={`kpi ${k.color}`}>
            <span className="kpi-icon">{k.icon}</span>
            <div className="label">{k.label}</div>
            <div className="value">{k.value}</div>
            <div className="delta">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Stacked bar chart */}
      {chartData.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Daily Manpower — All 12 Categories (Stacked)</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -4, marginBottom: 12 }}>
            Each bar segment = one labour category. Hover for breakdown.
          </p>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 44, left: 0 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={axisColor} tick={{ fontSize: 10 }}
                  angle={-35} textAnchor="end" height={55} interval={0} />
                <YAxis stroke={axisColor} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<MpTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {CATEGORIES.map(c => (
                  <Bar key={c.key} dataKey={c.label} stackId="a" fill={c.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Trend line */}
      {trendData.some(d => d.total > 0) && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Total Worker Count — Daily Trend</h3>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 44, left: 0 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={axisColor} tick={{ fontSize: 10 }}
                  angle={-35} textAnchor="end" height={55} interval={0} />
                <YAxis stroke={axisColor} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<MpTooltip />} />
                <Line type="monotone" dataKey="total" name="Total Workers"
                  stroke="#6ea8ff" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly summary table */}
      {monthlyTotal.total > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>📋 Monthly Cumulative — Category Wise</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -4, marginBottom: 12 }}>
            Total worker-days per category for the month
          </p>
          <ManpowerTable row={monthlyTotal} showNight={monthlyTotal.totalNight > 0} />
        </div>
      )}

      {/* Date-wise register */}
      <div className="panel">
        <h3>📋 Date-wise Manpower Register</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--sidebar-bg)" }}>
                <th style={{ padding: "7px 8px", textAlign: "left", borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>Date</th>
                {CATEGORIES.map(c => (
                  <th key={c.key} style={{ padding: "7px 6px", textAlign: "right", borderBottom: "2px solid var(--border)", color: c.color, fontWeight: 600, fontSize: 10, whiteSpace: "nowrap" }}>
                    {c.icon} {c.label}
                  </th>
                ))}
                <th style={{ padding: "7px 8px", textAlign: "right", borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 600, fontSize: 11 }}>Night</th>
                <th style={{ padding: "7px 8px", textAlign: "right", borderBottom: "2px solid var(--border)", fontWeight: 700, fontSize: 11 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {dailyManpower.map((row, i) => (
                <tr key={row.date} style={{ background: i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {row.date}{peakDay?.date === row.date ? " ⬆️" : ""}
                  </td>
                  {CATEGORIES.map(c => {
                    const v = row[c.key] as number;
                    return (
                      <td key={c.key} style={{ padding: "6px 6px", textAlign: "right", borderBottom: "1px solid var(--border)", color: v > 0 ? c.color : "var(--muted)", fontWeight: v > 0 ? 600 : 400 }}>
                        {v > 0 ? v : "—"}
                      </td>
                    );
                  })}
                  <td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#a78bfa" }}>
                    {row.totalNight > 0 ? row.totalNight : "—"}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>
                    {row.total > 0 ? row.total : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "var(--sidebar-bg)", fontWeight: 700 }}>
                <td style={{ padding: "7px 8px", borderTop: "2px solid var(--border)" }}>TOTAL</td>
                {CATEGORIES.map(c => (
                  <td key={c.key} style={{ padding: "7px 6px", textAlign: "right", borderTop: "2px solid var(--border)", color: c.color }}>
                    {dailyManpower.reduce((s, d) => s + (d[c.key] as number), 0) || "—"}
                  </td>
                ))}
                <td style={{ padding: "7px 8px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#a78bfa" }}>
                  {dailyManpower.reduce((s, d) => s + d.totalNight, 0) || "—"}
                </td>
                <td style={{ padding: "7px 8px", textAlign: "right", borderTop: "2px solid var(--border)", fontSize: 13 }}>
                  {totalMandays}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Single-date view ────────────────────────────────────────────────────── */
function ManpowerDay({ row }: { row: ManpowerCounts }) {
  const kpis = [
    { icon: "☀️",  label: "Day (1st Half)",   value: row.totalDay   || "—", color: "#6ea8ff" },
    { icon: "🌙",  label: "Night (2nd Half)",  value: row.totalNight || "—", color: "#a78bfa" },
    { icon: "👷",  label: "Total Workers",     value: row.total      || "—", color: "var(--text)" },
  ];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 10, marginBottom: 20 }}>
        {kpis.map(c => (
          <div key={c.label} style={{ background: "var(--sidebar-bg)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 18 }}>{c.icon}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{c.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
      <div className="panel">
        <h3 style={{ marginBottom: 12 }}>👷 Category Wise — {row.date}</h3>
        <ManpowerTable row={row} showNight={row.totalNight > 0} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ── Main Manpower component ────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Manpower({ theme }: { theme: "dark" | "light" }) {
  const availableMonths = useMemo(() => getAvailableMonths(), []);
  const [selMonth, setSelMonth] = useState(() => {
    const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [data,         setData]         = useState<BillingData | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [refreshTick,  setRefreshTick]  = useState(0);
  const [refreshing,   setRefreshing]   = useState(false);

  useEffect(() => {
    setRefreshing(true); setSelectedDate(null);
    const url = `/api/billing?month=${selMonth.month}&year=${selMonth.year}&t=${Date.now()}`;
    fetch(url, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setRefreshing(false));
  }, [selMonth.month, selMonth.year, refreshTick]);

  const activeDates   = useMemo(() => data?.dailyManpower.map(d => d.date) ?? [], [data]);
  const datesWithData = useMemo(() => {
    const s = new Set<string>();
    data?.dailyManpower.forEach(d => { if (d.total > 0) s.add(d.date); });
    return s;
  }, [data]);

  const dayRow = useMemo(
    () => selectedDate ? (data?.dailyManpower.find(d => d.date === selectedDate) ?? null) : null,
    [data, selectedDate]
  );

  const monthLabel = `${MONTH_NAMES_FULL[selMonth.month]} ${selMonth.year}`;
  if (error) return <div className="error">⚠️ {error}</div>;

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>MONTH</span>
        <select value={`${selMonth.year}-${selMonth.month}`}
          onChange={e => { const [y,m] = e.target.value.split("-").map(Number); setSelMonth({year:y,month:m}); }}
          style={{ padding: "7px 12px", borderRadius: 8, border: "2px solid var(--border)",
            background: "var(--sidebar-bg)", color: "var(--text)", fontSize: 13, fontWeight: 600,
            cursor: "pointer", minWidth: 160 }}>
          {availableMonths.map(({year, month, label}) => (
            <option key={`${year}-${month}`} value={`${year}-${month}`}>{label}</option>
          ))}
        </select>
        <button onClick={() => setRefreshTick(n => n+1)} disabled={refreshing}
          style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13,
            border: "2px solid var(--border)", background: "var(--sidebar-bg)",
            color: "var(--text)", cursor: refreshing ? "default" : "pointer",
            opacity: refreshing ? 0.6 : 1 }}>
          {refreshing ? "⟳ Loading…" : "🔄 Refresh"}
        </button>
      </div>

      {refreshing && <div className="loading" style={{ marginBottom: 16 }}>Loading {monthLabel} manpower data…</div>}

      {!refreshing && data && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
            padding: "8px 14px", borderRadius: 8, background: "var(--sidebar-bg)", border: "1px solid var(--border)" }}>
            <span style={{ fontSize: 15 }}>👷</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{monthLabel}</span>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>
              — {datesWithData.size} day{datesWithData.size !== 1 ? "s" : ""} with workers recorded
            </span>
          </div>

          <DateChips dates={activeDates} selected={selectedDate}
            onSelect={setSelectedDate} datesWithData={datesWithData} />

          {selectedDate ? (
            dayRow && dayRow.total > 0
              ? <ManpowerDay row={dayRow} />
              : <div className="panel" style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>👷</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>No workers recorded for {selectedDate}</div>
                  <div style={{ fontSize: 12 }}>Data hasn&apos;t been entered in the sheet yet.</div>
                </div>
          ) : (
            <ManpowerAll dailyManpower={data.dailyManpower ?? []} theme={theme} />
          )}
        </>
      )}
    </div>
  );
}
