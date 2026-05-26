"use client";
import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid,
  LineChart, Line,
} from "recharts";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface WorkTypeEntry {
  srNo: number;
  description: string;
  dayMason: number; dayHelper: number; daySup: number; dayCook: number; daySubTotal: number;
  nightMason: number; nightHelper: number; nightSubTotal: number;
}
interface DailyBilling {
  date: string;
  dayMason: number; dayHelper: number; daySup: number; dayCook: number; dayWorkers: number;
  nightMason: number; nightHelper: number; nightWorkers: number;
  totalWorkers: number;
  dayMasonAmt: number; dayHelperAmt: number; daySupAmt: number; dayCookAmt: number; dayAmount: number;
  nightMasonAmt: number; nightHelperAmt: number; nightAmount: number;
  totalAmount: number;
  workTypes: WorkTypeEntry[];
}
interface ActivityItem { name: string; unit: string; quantity: number }
interface DailyDPR     { date: string; activities: ActivityItem[] }
interface ActAggrRow   { name: string; unit: string; total: number }
interface DprSummary   {
  activeDays: number; peakDate: string | null; peakActivityCount: number; avgActivitiesPerDay: number;
}
interface BillingSummary {
  totalDay: number; totalNight: number; totalAll: number;
  activeDays: number; peakDay: DailyBilling; avgDaily: number;
}
interface BillingData {
  daily: DailyBilling[];
  summary: BillingSummary;
  dpr: DailyDPR[];
  activityAggregate: ActAggrRow[];
  dprSummary: DprSummary;
}
type SubTab = "dlr" | "dpr";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const fmt    = (n: number) => "₹" + n.toLocaleString("en-IN");
const fmtQty = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);

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

/* ── Section header ──────────────────────────────────────────────────────── */
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

/* ── Labour expenditure table ────────────────────────────────────────────── */
function LabourTable({
  rows, totalWorkers, totalAmt, hasAmounts,
}: {
  rows: { label: string; workers: number; amt: number }[];
  totalWorkers: number; totalAmt: number; hasAmounts: boolean;
}) {
  const visible = rows.filter((r) => r.workers > 0 || r.amt > 0);
  if (!visible.length) return <p style={{ color: "var(--muted)", fontSize: 13 }}>No workers recorded.</p>;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ background: "var(--sidebar-bg)" }}>
          {["Category", "Workers", "Amount"].map((h) => (
            <th key={h} style={{ padding: "7px 12px", textAlign: h === "Category" ? "left" : "right", borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 600, fontSize: 11 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {visible.map((r, i) => (
          <tr key={r.label} style={{ background: i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
            <td style={{ padding: "7px 12px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>{r.label}</td>
            <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>{r.workers}</td>
            <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", fontWeight: 600, color: "#4ade80" }}>
              {hasAmounts && r.amt > 0 ? fmt(r.amt) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ background: "var(--sidebar-bg)", fontWeight: 700 }}>
          <td style={{ padding: "8px 12px", borderTop: "2px solid var(--border)" }}>TOTAL</td>
          <td style={{ padding: "8px 12px", textAlign: "right", borderTop: "2px solid var(--border)" }}>{totalWorkers}</td>
          <td style={{ padding: "8px 12px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#4ade80", fontSize: 14 }}>
            {totalAmt > 0 ? fmt(totalAmt) : "—"}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ── DLR All (master overview) ──────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════════ */
function DLRAll({ daily, summary, theme }: { daily: DailyBilling[]; summary: BillingSummary; theme: "dark" | "light" }) {
  const isDark    = theme === "dark";
  const gridColor = isDark ? "#25305a" : "#ccd4ee";
  const axisColor = isDark ? "#9aa6cc" : "#5a6890";

  const kpis = [
    { label: "Total Expenditure",   value: fmt(summary.totalAll),      icon: "💰", color: "kpi-blue",  sub: "May 2026 to date" },
    { label: "Day Labour Total",    value: fmt(summary.totalDay),      icon: "☀️",  color: "kpi-amber", sub: "Day shift spend" },
    { label: "Night Labour Total",  value: fmt(summary.totalNight),    icon: "🌙",  color: "kpi-gray",  sub: "Night shift spend" },
    { label: "Active Work Days",    value: String(summary.activeDays), icon: "📅",  color: "kpi-green", sub: "Days with workers" },
    { label: "Avg Daily Spend",     value: fmt(summary.avgDaily),      icon: "📊",  color: "kpi-red",   sub: "Per active day" },
    { label: "Peak Day",            value: summary.peakDay?.date ?? "—", icon: "⬆️", color: "kpi-blue", sub: summary.peakDay ? fmt(summary.peakDay.totalAmount) : "—" },
  ];

  const chartData = daily.filter((d) => d.dayAmount > 0 || d.nightAmount > 0);
  const workerData = daily.filter((d) => d.dayWorkers > 0 || d.nightWorkers > 0).map((d) => ({
    date: d.date, day: d.dayWorkers, night: d.nightWorkers,
  }));

  return (
    <>
      {/* KPI cards */}
      <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
        {kpis.map((k) => (
          <div key={k.label} className={`kpi ${k.color}`}>
            <span className="kpi-icon">{k.icon}</span>
            <div className="label">{k.label}</div>
            <div className="value" style={{ fontSize: k.value.length > 8 ? 18 : 24 }}>{k.value}</div>
            <div className="delta">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Daily expenditure chart */}
      {chartData.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Daily Expenditure — Day vs Night Labour</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -4, marginBottom: 12 }}>
            Click a date chip above to drill into a specific day
          </p>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 44, left: 16 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={axisColor} tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={55} interval={0} />
                <YAxis stroke={axisColor} tick={{ fontSize: 10 }} tickFormatter={(v) => "₹" + (v / 1000).toFixed(0) + "k"} />
                <Tooltip content={<AmountTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="dayAmount"   name="Day Labour"   stackId="a" fill="#6ea8ff" />
                <Bar dataKey="nightAmount" name="Night Labour" stackId="a" fill="#a78bfa" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Worker count trend */}
      {workerData.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Worker Count Trend — Day vs Night</h3>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={workerData} margin={{ top: 8, right: 16, bottom: 44, left: 0 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={axisColor} tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={55} interval={0} />
                <YAxis stroke={axisColor} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="day"   stroke="#6ea8ff" strokeWidth={2} dot={{ r: 3 }} name="Day Workers" />
                <Line type="monotone" dataKey="night" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} name="Night Workers" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Master register table */}
      <div className="panel">
        <h3>📋 Master Register — May 2026</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--sidebar-bg)" }}>
                {["Date", "Day Workers", "Night Workers", "Total Workers", "Day Labour", "Night Labour", "Total"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: h === "Date" ? "left" : "right", borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daily.map((row, i) => (
                <tr key={row.date} style={{ background: i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
                  <td style={{ padding: "7px 12px", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
                    {row.date}{summary.peakDay?.date === row.date ? " ⬆️" : ""}
                  </td>
                  <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#6ea8ff" }}>{row.dayWorkers || "—"}</td>
                  <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#a78bfa" }}>{row.nightWorkers || "—"}</td>
                  <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>{row.totalWorkers || "—"}</td>
                  <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#6ea8ff" }}>{row.dayAmount > 0 ? fmt(row.dayAmount) : "—"}</td>
                  <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#a78bfa" }}>{row.nightAmount > 0 ? fmt(row.nightAmount) : "—"}</td>
                  <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>{row.totalAmount > 0 ? fmt(row.totalAmount) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "var(--sidebar-bg)", fontWeight: 700 }}>
                <td style={{ padding: "8px 12px", borderTop: "2px solid var(--border)" }}>TOTAL</td>
                <td colSpan={3} style={{ padding: "8px 12px", textAlign: "right", borderTop: "2px solid var(--border)", color: "var(--muted)", fontSize: 12 }}>{summary.activeDays} active days</td>
                <td style={{ padding: "8px 12px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#6ea8ff" }}>{fmt(summary.totalDay)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#a78bfa" }}>{fmt(summary.totalNight)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", borderTop: "2px solid var(--border)" }}>{fmt(summary.totalAll)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ── DLR Day (single-date drill-down) ───────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════════ */
function DLRDay({ row }: { row: DailyBilling }) {
  const hasDayAmts   = (row.dayMasonAmt + row.dayHelperAmt + row.daySupAmt + row.dayCookAmt) > 0;
  const hasNightAmts = (row.nightMasonAmt + row.nightHelperAmt) > 0;
  const hasWorkTypes = row.workTypes.length > 0;

  const dayRows = [
    { label: "🧱 Mason",       workers: row.dayMason,  amt: row.dayMasonAmt  },
    { label: "🔧 Helper",      workers: row.dayHelper, amt: row.dayHelperAmt },
    { label: "👷 SUP/FOR",     workers: row.daySup,    amt: row.daySupAmt    },
    { label: "🍳 Cook",        workers: row.dayCook,   amt: row.dayCookAmt   },
  ];
  const nightRows = [
    { label: "🧱 Mason (Night)",  workers: row.nightMason,  amt: row.nightMasonAmt  },
    { label: "🔧 Helper (Night)", workers: row.nightHelper, amt: row.nightHelperAmt },
  ];

  return (
    <div>
      {/* ── Summary strip ──────────────────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: 12, marginBottom: 20,
      }}>
        {[
          { icon: "☀️", label: "Day Workers",    value: String(row.dayWorkers),   color: "#6ea8ff" },
          { icon: "🌙", label: "Night Workers",  value: String(row.nightWorkers), color: "#a78bfa" },
          { icon: "👥", label: "Total Workers",  value: String(row.totalWorkers), color: "var(--text)" },
          { icon: "💰", label: "Day Labour",     value: row.dayAmount   > 0 ? fmt(row.dayAmount)   : "—", color: "#6ea8ff" },
          { icon: "💜", label: "Night Labour",   value: row.nightAmount > 0 ? fmt(row.nightAmount) : "—", color: "#a78bfa" },
          { icon: "🏦", label: "Total Expenditure", value: row.totalAmount > 0 ? fmt(row.totalAmount) : "—", color: "#4ade80" },
        ].map((c) => (
          <div key={c.label} style={{ background: "var(--sidebar-bg)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 18 }}>{c.icon}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{c.label}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* ── Day Labour ─────────────────────────────────────────────────── */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <SectionBadge color="#6ea8ff" label="☀️ DAY LABOUR" />
        <LabourTable
          rows={dayRows}
          totalWorkers={row.dayWorkers}
          totalAmt={row.dayAmount}
          hasAmounts={hasDayAmts}
        />
        {!hasDayAmts && row.dayWorkers > 0 && (
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
            * Expenditure amounts load from the live sheet — refresh to update.
          </p>
        )}
      </div>

      {/* ── Night Labour ───────────────────────────────────────────────── */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <SectionBadge color="#a78bfa" label="🌙 NIGHT LABOUR" />
        <LabourTable
          rows={nightRows}
          totalWorkers={row.nightWorkers}
          totalAmt={row.nightAmount}
          hasAmounts={hasNightAmts}
        />
        {!hasNightAmts && row.nightWorkers > 0 && (
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
            * Expenditure amounts load from the live sheet — refresh to update.
          </p>
        )}
      </div>

      {/* ── Work-type breakdown ────────────────────────────────────────── */}
      {hasWorkTypes && (
        <div className="panel">
          <h3 style={{ marginBottom: 12 }}>📋 Work Description Wise Breakdown</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--sidebar-bg)" }}>
                  {["#", "Work Description", "Mason", "Helper", "SUP/FOR", "Cook", "Day Total", "Night Mason", "Night Helper", "Night Total"].map((h) => (
                    <th key={h} style={{
                      padding: "7px 10px", textAlign: h === "#" || h === "Work Description" ? "left" : "right",
                      borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 600, fontSize: 10, whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {row.workTypes.map((wt, i) => (
                  <tr key={wt.srNo} style={{ background: i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
                    <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{wt.srNo}</td>
                    <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)", fontWeight: 500, maxWidth: 200 }}>{wt.description}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>{wt.dayMason || "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>{wt.dayHelper || "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>{wt.daySup || "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>{wt.dayCook || "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", fontWeight: 600, color: "#6ea8ff" }}>{wt.daySubTotal || "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#a78bfa" }}>{wt.nightMason || "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "#a78bfa" }}>{wt.nightHelper || "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid var(--border)", fontWeight: 600, color: "#a78bfa" }}>{wt.nightSubTotal || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--sidebar-bg)", fontWeight: 700 }}>
                  <td colSpan={2} style={{ padding: "7px 10px", borderTop: "2px solid var(--border)" }}>TOTAL</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)" }}>{row.dayMason}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)" }}>{row.dayHelper}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)" }}>{row.daySup}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)" }}>{row.dayCook}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#6ea8ff" }}>{row.dayWorkers}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#a78bfa" }}>{row.nightMason}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#a78bfa" }}>{row.nightHelper}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", borderTop: "2px solid var(--border)", color: "#a78bfa" }}>{row.nightWorkers}</td>
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

function DPRAll({ dpr, activityAggregate, dprSummary, theme }: {
  dpr: DailyDPR[]; activityAggregate: ActAggrRow[]; dprSummary: DprSummary; theme: "dark" | "light";
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
          <h3>📋 Work Progress — Cumulative Quantities (May 2026)</h3>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -4, marginBottom: 12 }}>Total quantities executed across all dates</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--sidebar-bg)" }}>
                  {["#","Activity","Unit","Total Quantity"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: h === "Activity" || h === "#" ? "left" : "right", borderBottom: "2px solid var(--border)", color: "var(--muted)", fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activityAggregate.map((r, i) => (
                  <tr key={r.name} style={{ background: i % 2 === 0 ? "transparent" : "var(--sidebar-bg)" }}>
                    <td style={{ padding: "7px 12px", borderBottom: "1px solid var(--border)", width: 32 }}>
                      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: ACTIVITY_COLORS[i % ACTIVITY_COLORS.length], verticalAlign: "middle" }} />
                    </td>
                    <td style={{ padding: "7px 12px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{r.unit}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: "1px solid var(--border)", fontWeight: 700, color: "#4ade80", fontSize: 14 }}>{fmtQty(r.total)}</td>
                  </tr>
                ))}
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
  const [data,         setData]         = useState<BillingData | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [subTab,       setSubTab]       = useState<SubTab>("dlr");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [refreshTick,  setRefreshTick]  = useState(0);
  const [refreshing,   setRefreshing]   = useState(false);

  useEffect(() => {
    setRefreshing(true);
    fetch("/api/billing")
      .then((r) => r.json())
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setRefreshing(false));
  }, [refreshTick]);

  const activeDates = useMemo(() => data?.daily.map((d) => d.date) ?? [], [data]);

  const datesWithData = useMemo(() => {
    const s = new Set<string>();
    data?.daily.forEach((d) => { if (d.dayWorkers > 0 || d.totalAmount > 0) s.add(d.date); });
    data?.dpr.forEach((d)   => { if (d.activities.length > 0) s.add(d.date); });
    return s;
  }, [data]);

  const dlrRow = useMemo(
    () => (selectedDate ? data?.daily.find((d) => d.date === selectedDate) ?? null : null),
    [data, selectedDate]
  );
  const dprRow = useMemo(
    () => (selectedDate ? data?.dpr.find((d) => d.date === selectedDate) ?? null : null),
    [data, selectedDate]
  );

  if (error) return <div className="error">⚠️ {error}</div>;
  if (!data)  return <div className="loading">Loading billing data…</div>;

  return (
    <div>
      {/* ── Sub-tab selector + refresh ────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
        <SubTabBtn active={subTab === "dpr"} icon="📋" label="DPR — Daily Progress Report" onClick={() => { setSubTab("dpr"); setSelectedDate(null); }} />
        <SubTabBtn active={subTab === "dlr"} icon="💰" label="DLR — Daily Labour Report"   onClick={() => { setSubTab("dlr"); setSelectedDate(null); }} />
        <div style={{ flex: 1 }} />
        <button
          onClick={() => { setSelectedDate(null); setRefreshTick((n) => n + 1); }}
          disabled={refreshing}
          style={{
            padding: "8px 16px", borderRadius: 8, cursor: refreshing ? "default" : "pointer",
            fontWeight: 600, fontSize: 13, border: "2px solid var(--border)",
            background: "var(--sidebar-bg)", color: "var(--text)",
            opacity: refreshing ? 0.6 : 1, transition: "all 0.15s",
          }}
        >{refreshing ? "⟳ Loading…" : "🔄 Refresh"}</button>
      </div>

      {/* ── Date filter chips ─────────────────────────────────────────── */}
      <DateChips dates={activeDates} selected={selectedDate} onSelect={setSelectedDate} datesWithData={datesWithData} />

      {/* ── DLR content ───────────────────────────────────────────────── */}
      {subTab === "dlr" && (() => {
        if (selectedDate) {
          if (dlrRow && (dlrRow.dayWorkers > 0 || dlrRow.totalAmount > 0)) return <DLRDay row={dlrRow} />;
          return (
            <div className="panel" style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No DLR data for {selectedDate}</div>
              <div style={{ fontSize: 12 }}>Data for this date hasn&apos;t been entered in the sheet yet.</div>
            </div>
          );
        }
        return <DLRAll daily={data.daily} summary={data.summary} theme={theme} />;
      })()}

      {/* ── DPR content ───────────────────────────────────────────────── */}
      {subTab === "dpr" && (() => {
        if (selectedDate) {
          if (dprRow) return <DPRDay row={dprRow} />;
          return (
            <div className="panel" style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏗️</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No DPR data for {selectedDate}</div>
              <div style={{ fontSize: 12 }}>Data for this date hasn&apos;t been entered in the sheet yet.</div>
            </div>
          );
        }
        return <DPRAll dpr={data.dpr} activityAggregate={data.activityAggregate} dprSummary={data.dprSummary} theme={theme} />;
      })()}
    </div>
  );
}
