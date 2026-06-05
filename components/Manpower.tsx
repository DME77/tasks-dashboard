"use client";
import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid, LineChart, Line,
} from "recharts";

/* ── Types (mirrored from billing API) ───────────────────────────────────── */
interface CategoryBilling {
  srNo: number;
  category: string;
  dayLabour: number;
  nightLabour: number;
  daySupply: number;
  nightSupply: number;
  totalLabour: number;
}
interface DailyBilling {
  date: string;
  rows: CategoryBilling[];
  totalDayLabour: number;
  totalNightLabour: number;
  totalDaySupply: number;
  totalNightSupply: number;
  totalLabour: number;
}
interface BillingData {
  month: number;
  year: number;
  monthLabel: string;
  daily: DailyBilling[];
  monthly: DailyBilling | null;
  summary: { activeDays: number; peakDay: DailyBilling | null; avgDaily: number };
}

/* ── Month helpers ───────────────────────────────────────────────────────── */
const MONTH_NAMES_FULL = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function getAvailableMonths() {
  const result: { year: number; month: number; label: string }[] = [];
  const now    = new Date();
  const cursor = new Date(2026, 4, 1); // May 2026
  while (
    cursor.getFullYear() < now.getFullYear() ||
    (cursor.getFullYear() === now.getFullYear() && cursor.getMonth() <= now.getMonth())
  ) {
    result.push({
      year:  cursor.getFullYear(),
      month: cursor.getMonth(),
      label: `${MONTH_NAMES_FULL[cursor.getMonth()]} ${cursor.getFullYear()}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result.reverse();
}

/* ── Category icon ───────────────────────────────────────────────────────── */
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

/* ── Custom Tooltip ──────────────────────────────────────────────────────── */
function ManpowerTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--panel-bg)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--text)",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
      <div style={{ marginTop: 4, borderTop: "1px solid var(--border)", paddingTop: 4, fontWeight: 700 }}>
        Total: {payload.reduce((s: number, p: any) => s + (p.value || 0), 0)}
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
        const hasData = datesWithData.has(d), isSel = selected === d;
        return (
          <button key={d} onClick={() => onSelect(isSel ? null : d)} style={{
            padding: "4px 10px", borderRadius: 20, border: "1px solid var(--border)",
            background: isSel ? "var(--accent)" : "var(--sidebar-bg)",
            color: isSel ? "#fff" : hasData ? "var(--text)" : "var(--muted)",
            cursor: "pointer", fontSize: 12,
            opacity: hasData ? 1 : 0.5, fontStyle: hasData ? "normal" : "italic",
          }}>{d}</button>
        );
      })}
    </div>
  );
}

/* ── Category table (labour only, no amounts) ────────────────────────────── */
function ManpowerTable({ rows, totalDayLabour, totalNightLabour, totalDaySupply, totalNightSupply, totalLabour }: {
  rows: CategoryBilling[];
  totalDayLabour: number; totalNightLabour: number;
  totalDaySupply: number; totalNightSupply: number;
  totalLabour: number;
}) {
  const active = rows.filter(r => r.totalLabour > 0);
  if (!active.length) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 13 }}>
        No workers recorded for this date.
      </div>
    );
  }

  const thStyle = (color?: string): React.CSSProperties => ({
    padding: "8px 12px", textAlign: "right" as const,
    borderBottom: "2px solid var(--border)",
    color: color ?? "var(--muted)", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap",
  });
  const tdStyle = (color?: string): React.CSSProperties => ({
    padding: "8px 12px", textAlign: "right" as const,
    borderBottom: "1px solid var(--border)",
    color: color, fontWeight: 600,
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--sidebar-bg)" }}>
            <th style={{ ...thStyle(), textAlign: "left", width: "35%" }}>Category</th>
            <th style={thStyle("#6ea8ff")}>Regular Day</th>
            <th style={thStyle("#a78bfa")}>Regular Night</th>
            <th style={thStyle("#fbbf24")}>Supply Day</th>
            <th style={thStyle("#fb923c")}>Supply Night</th>
            <th style={thStyle("var(--text)")}>Total Workers</th>
          </tr>
        </thead>
        <tbody>
          {active.map((r, i) => (
            <tr key={r.srNo} style={{ background: i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
              <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>
                {catIcon(r.category)} {r.category}
              </td>
              <td style={tdStyle("#6ea8ff")}>{r.dayLabour   || "—"}</td>
              <td style={tdStyle("#a78bfa")}>{r.nightLabour || "—"}</td>
              <td style={tdStyle("#fbbf24")}>{r.daySupply   || "—"}</td>
              <td style={tdStyle("#fb923c")}>{r.nightSupply || "—"}</td>
              <td style={{ ...tdStyle(), fontSize: 14, color: "var(--text)" }}>
                <strong>{r.totalLabour}</strong>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "var(--sidebar-bg)", fontWeight: 700 }}>
            <td style={{ padding: "8px 12px", borderTop: "2px solid var(--border)", fontWeight: 700 }}>
              ∑ TOTAL
            </td>
            <td style={{ ...tdStyle("#6ea8ff"), borderTop: "2px solid var(--border)" }}>{totalDayLabour}</td>
            <td style={{ ...tdStyle("#a78bfa"), borderTop: "2px solid var(--border)" }}>{totalNightLabour}</td>
            <td style={{ ...tdStyle("#fbbf24"), borderTop: "2px solid var(--border)" }}>{totalDaySupply}</td>
            <td style={{ ...tdStyle("#fb923c"), borderTop: "2px solid var(--border)" }}>{totalNightSupply}</td>
            <td style={{ padding: "8px 12px", textAlign: "right", borderTop: "2px solid var(--border)", fontSize: 15, fontWeight: 800 }}>
              {totalLabour}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ── All-dates master view ───────────────────────────────────────────────── */
function ManpowerAll({ daily, monthly, summary, theme }: {
  daily: DailyBilling[]; monthly: DailyBilling | null;
  summary: BillingData["summary"]; theme: "dark" | "light";
}) {
  const isDark    = theme === "dark";
  const gridColor = isDark ? "#25305a" : "#ccd4ee";
  const axisColor = isDark ? "#9aa6cc" : "#5a6890";

  // KPI cards
  const totalWorkers  = daily.reduce((s, d) => s + d.totalLabour, 0);
  const peakWorkers   = daily.length ? Math.max(...daily.map(d => d.totalLabour)) : 0;
  const activeDays    = daily.filter(d => d.totalLabour > 0).length;
  const avgWorkers    = activeDays ? Math.round(totalWorkers / activeDays) : 0;
  const peakDay       = daily.find(d => d.totalLabour === peakWorkers);

  const kpis = [
    { label: "Total Man-days",    value: totalWorkers, icon: "👷", color: "kpi-blue",  sub: "Cumulative workers" },
    { label: "Active Work Days",  value: activeDays,   icon: "📅", color: "kpi-green", sub: "Days with workers" },
    { label: "Avg Workers / Day", value: avgWorkers,   icon: "📊", color: "kpi-amber", sub: "Per active day" },
    { label: "Peak Day Workers",  value: peakWorkers,  icon: "⬆️", color: "kpi-red",   sub: peakDay?.date ?? "—" },
  ];

  // Daily stacked bar data
  const chartData = daily
    .filter(d => d.totalLabour > 0)
    .map(d => ({
      date:        d.date,
      "Reg. Day":  d.totalDayLabour,
      "Reg. Night":d.totalNightLabour,
      "Sup. Day":  d.totalDaySupply,
      "Sup. Night":d.totalNightSupply,
    }));

  // Trend line
  const trendData = daily.map(d => ({
    date: d.date,
    total: d.totalLabour,
  }));

  return (
    <>
      {/* KPIs */}
      <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        {kpis.map(k => (
          <div key={k.label} className={`kpi ${k.color}`}>
            <span className="kpi-icon">{k.icon}</span>
            <div className="label">{k.label}</div>
            <div className="value">{k.value}</div>
            <div className="delta">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Stacked bar — category breakdown per day */}
      {chartData.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Daily Manpower — Category Breakdown</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -4, marginBottom: 12 }}>
            Stacked: Regular Day · Regular Night · Supply Day · Supply Night
          </p>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 44, left: 0 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={axisColor} tick={{ fontSize: 10 }}
                  angle={-35} textAnchor="end" height={55} interval={0} />
                <YAxis stroke={axisColor} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<ManpowerTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Reg. Day"   stackId="a" fill="#6ea8ff" />
                <Bar dataKey="Reg. Night" stackId="a" fill="#a78bfa" />
                <Bar dataKey="Sup. Day"   stackId="a" fill="#fbbf24" />
                <Bar dataKey="Sup. Night" stackId="a" fill="#fb923c" radius={[3, 3, 0, 0]} />
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
                <Tooltip content={<ManpowerTooltip />} />
                <Line type="monotone" dataKey="total" name="Total Workers"
                  stroke="#6ea8ff" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly category summary */}
      {monthly && monthly.rows.length > 0 && (
        <div className="panel">
          <h3>📋 Monthly Summary — Category Wise</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -4, marginBottom: 12 }}>
            Accumulated totals from the Main sheet
          </p>
          <ManpowerTable
            rows={monthly.rows}
            totalDayLabour={monthly.totalDayLabour}
            totalNightLabour={monthly.totalNightLabour}
            totalDaySupply={monthly.totalDaySupply}
            totalNightSupply={monthly.totalNightSupply}
            totalLabour={monthly.totalLabour}
          />
        </div>
      )}

      {/* Master register — date-wise totals */}
      <div className="panel" style={{ marginTop: 16 }}>
        <h3>📋 Master Register — Date-wise Worker Count</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--sidebar-bg)" }}>
                {[
                  { h: "Date",          color: undefined  },
                  { h: "Reg. Day",      color: "#6ea8ff"  },
                  { h: "Reg. Night",    color: "#a78bfa"  },
                  { h: "Sup. Day",      color: "#fbbf24"  },
                  { h: "Sup. Night",    color: "#fb923c"  },
                  { h: "Total Workers", color: undefined  },
                ].map(({ h, color }) => (
                  <th key={h} style={{
                    padding: "7px 10px",
                    textAlign: h === "Date" ? "left" : "right",
                    borderBottom: "2px solid var(--border)",
                    color: color ?? "var(--muted)", fontWeight: 600, fontSize: 11,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daily.map((row, i) => (
                <tr key={row.date} style={{ background: i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
                  <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
                    {row.date}{summary.peakDay?.date === row.date ? " ⬆️" : ""}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#6ea8ff" }}>
                    {row.totalDayLabour || "—"}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#a78bfa" }}>
                    {row.totalNightLabour || "—"}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#fbbf24" }}>
                    {row.totalDaySupply || "—"}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#fb923c" }}>
                    {row.totalNightSupply || "—"}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>
                    {row.totalLabour || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "var(--sidebar-bg)", fontWeight: 700 }}>
                <td style={{ padding: "7px 10px", borderTop: "2px solid var(--border)" }}>TOTAL</td>
                <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#6ea8ff" }}>
                  {daily.reduce((s, d) => s + d.totalDayLabour, 0)}
                </td>
                <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#a78bfa" }}>
                  {daily.reduce((s, d) => s + d.totalNightLabour, 0)}
                </td>
                <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#fbbf24" }}>
                  {daily.reduce((s, d) => s + d.totalDaySupply, 0)}
                </td>
                <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#fb923c" }}>
                  {daily.reduce((s, d) => s + d.totalNightSupply, 0)}
                </td>
                <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)", fontSize: 13 }}>
                  {daily.reduce((s, d) => s + d.totalLabour, 0)}
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
function ManpowerDay({ row }: { row: DailyBilling }) {
  const kpis = [
    { icon: "☀️",  label: "Regular Day",   value: row.totalDayLabour   || "—", color: "#6ea8ff" },
    { icon: "🌙",  label: "Regular Night",  value: row.totalNightLabour || "—", color: "#a78bfa" },
    { icon: "🔆",  label: "Supply Day",     value: row.totalDaySupply   || "—", color: "#fbbf24" },
    { icon: "🌒",  label: "Supply Night",   value: row.totalNightSupply || "—", color: "#fb923c" },
    { icon: "👷",  label: "Total Workers",  value: row.totalLabour      || "—", color: "var(--text)" },
  ];

  return (
    <div>
      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
        {kpis.map(c => (
          <div key={c.label} style={{
            background: "var(--sidebar-bg)", borderRadius: 8,
            padding: "10px 12px", border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 18 }}>{c.icon}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{c.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Category table */}
      <div className="panel">
        <h3 style={{ marginBottom: 12 }}>👷 Category Wise — {row.date}</h3>
        <ManpowerTable
          rows={row.rows}
          totalDayLabour={row.totalDayLabour}
          totalNightLabour={row.totalNightLabour}
          totalDaySupply={row.totalDaySupply}
          totalNightSupply={row.totalNightSupply}
          totalLabour={row.totalLabour}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ── Main Manpower component ────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Manpower({ theme }: { theme: "dark" | "light" }) {
  const availableMonths = useMemo(() => getAvailableMonths(), []);

  const [selMonth,     setSelMonth]     = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [data,         setData]         = useState<BillingData | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [refreshTick,  setRefreshTick]  = useState(0);
  const [refreshing,   setRefreshing]   = useState(false);

  useEffect(() => {
    setRefreshing(true);
    setSelectedDate(null);
    const url = `/api/billing?month=${selMonth.month}&year=${selMonth.year}&t=${Date.now()}`;
    fetch(url, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setRefreshing(false));
  }, [selMonth.month, selMonth.year, refreshTick]);

  const activeDates = useMemo(() => data?.daily.map(d => d.date) ?? [], [data]);

  const datesWithData = useMemo(() => {
    const s = new Set<string>();
    data?.daily.forEach(d => { if (d.totalLabour > 0) s.add(d.date); });
    return s;
  }, [data]);

  const dayRow = useMemo(
    () => (selectedDate ? data?.daily.find(d => d.date === selectedDate) ?? null : null),
    [data, selectedDate]
  );

  const monthLabel = `${MONTH_NAMES_FULL[selMonth.month]} ${selMonth.year}`;

  if (error) return <div className="error">⚠️ {error}</div>;

  return (
    <div>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>MONTH</span>
        <select
          value={`${selMonth.year}-${selMonth.month}`}
          onChange={e => {
            const [y, m] = e.target.value.split("-").map(Number);
            setSelMonth({ year: y, month: m });
          }}
          style={{
            padding: "7px 12px", borderRadius: 8, border: "2px solid var(--border)",
            background: "var(--sidebar-bg)", color: "var(--text)",
            fontSize: 13, fontWeight: 600, cursor: "pointer", minWidth: 160,
          }}
        >
          {availableMonths.map(({ year, month, label }) => (
            <option key={`${year}-${month}`} value={`${year}-${month}`}>{label}</option>
          ))}
        </select>
        <button
          onClick={() => setRefreshTick(n => n + 1)}
          disabled={refreshing}
          style={{
            padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13,
            border: "2px solid var(--border)", background: "var(--sidebar-bg)",
            color: "var(--text)", cursor: refreshing ? "default" : "pointer",
            opacity: refreshing ? 0.6 : 1,
          }}
        >{refreshing ? "⟳ Loading…" : "🔄 Refresh"}</button>
      </div>

      {refreshing && (
        <div className="loading" style={{ marginBottom: 16 }}>
          Loading {monthLabel} manpower data…
        </div>
      )}

      {!refreshing && data && (
        <>
          {/* Month header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
            padding: "8px 14px", borderRadius: 8,
            background: "var(--sidebar-bg)", border: "1px solid var(--border)",
          }}>
            <span style={{ fontSize: 15 }}>👷</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{monthLabel}</span>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>
              — {datesWithData.size} day{datesWithData.size !== 1 ? "s" : ""} with workers recorded
            </span>
          </div>

          <DateChips
            dates={activeDates}
            selected={selectedDate}
            onSelect={setSelectedDate}
            datesWithData={datesWithData}
          />

          {/* Content */}
          {selectedDate ? (
            dayRow && dayRow.totalLabour > 0
              ? <ManpowerDay row={dayRow} />
              : (
                <div className="panel" style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>👷</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>No workers recorded for {selectedDate}</div>
                  <div style={{ fontSize: 12 }}>Data hasn&apos;t been entered in the sheet yet.</div>
                </div>
              )
          ) : (
            <ManpowerAll
              daily={data.daily}
              monthly={data.monthly}
              summary={data.summary}
              theme={theme}
            />
          )}
        </>
      )}
    </div>
  );
}
