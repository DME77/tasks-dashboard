"use client";
import { useEffect, useState, useCallback } from "react";

type CellValue = string | number | null;

interface SheetData {
  source: string;
  tab: string | null;
  tabs: string[];
  rows: CellValue[][] | null;
}

type Contractor = "acc" | "ethimo";

const LABELS: Record<Contractor, string> = { acc: "ACC", ethimo: "Ethimo" };
const ICONS:  Record<Contractor, string> = { acc: "🏗️", ethimo: "🏢" };

/* ── Styles ──────────────────────────────────────────────────────────────── */
const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "7px 18px", borderRadius: 8, border: "1px solid var(--border)",
  background: active ? "var(--accent)" : "var(--sidebar-bg)",
  color: active ? "#fff" : "var(--text)",
  cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500,
  transition: "background 0.15s",
});
const pillBtn = (active: boolean): React.CSSProperties => ({
  padding: "4px 12px", borderRadius: 20, border: "1px solid var(--border)",
  background: active ? "var(--accent)" : "transparent",
  color: active ? "#fff" : "var(--muted)",
  cursor: "pointer", fontSize: 11, fontWeight: active ? 600 : 400,
});

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function cellStr(v: CellValue): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function isBlankRow(row: CellValue[]): boolean {
  return row.every((c) => c === null || c === undefined || String(c).trim() === "");
}

function looksNumeric(val: string): boolean {
  return val !== "" && !isNaN(Number(val.replace(/,/g, "")));
}

export default function MaterialConsumption() {
  const [contractor, setContractor] = useState<Contractor>("acc");
  const [data, setData]   = useState<SheetData | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (src: Contractor, tab?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/material?source=${src}${tab ? `&tab=${encodeURIComponent(tab)}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const d: SheetData = await res.json();
      if ((d as any).error) throw new Error((d as any).error);
      setData(d);
      // Set first tab if none selected
      if (!tab && d.tabs.length > 0) setActiveTab(d.tabs[0]);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    load(contractor);
  }, [contractor, load]);

  // Re-load when tab changes
  useEffect(() => {
    if (activeTab !== null) load(contractor, activeTab);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = data?.rows ?? null;
  // First row is headers
  const headers = rows && rows.length > 0 ? rows[0].map(cellStr) : [];
  const bodyRows = rows && rows.length > 1 ? rows.slice(1).filter((r) => !isBlankRow(r)) : [];

  return (
    <div style={{ padding: "0 0 24px" }}>

      {/* ── Contractor switcher ─────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {(["acc", "ethimo"] as Contractor[]).map((c) => (
          <button key={c} style={tabBtn(contractor === c)} onClick={() => {
            setContractor(c); setData(null); setActiveTab(null);
          }}>
            {ICONS[c]} {LABELS[c]}
          </button>
        ))}
      </div>

      {/* ── Panel ──────────────────────────────────────────────────────── */}
      <div style={{
        background: "var(--panel-bg)", border: "1px solid var(--border)",
        borderRadius: 14, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
          borderBottom: "1px solid var(--border)", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 18 }}>📦</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Material Consumption — {LABELS[contractor]}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {loading ? "Loading…" : error ? error : `${bodyRows.length} row${bodyRows.length !== 1 ? "s" : ""} · live from Google Sheets`}
            </div>
          </div>
          <button
            onClick={() => load(contractor, activeTab)}
            disabled={loading}
            style={{ ...pillBtn(false), opacity: loading ? 0.5 : 1 }}
          >
            {loading ? "⟳ Loading" : "🔄 Refresh"}
          </button>
        </div>

        {/* Sheet tab pills */}
        {data && data.tabs.length > 1 && (
          <div style={{
            display: "flex", gap: 6, padding: "10px 18px", flexWrap: "wrap",
            borderBottom: "1px solid var(--border)", background: "var(--sidebar-bg)",
          }}>
            {data.tabs.map((t) => (
              <button key={t} style={pillBtn(activeTab === t)} onClick={() => setActiveTab(t)}>
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        <div style={{ overflow: "auto", maxHeight: "72vh", padding: "0 0 8px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 48, color: "var(--muted)", fontSize: 14 }}>
              Loading data…
            </div>
          )}

          {!loading && error && (
            <div style={{ textAlign: "center", padding: 48, color: "#e55", fontSize: 14 }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && !error && bodyRows.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, color: "var(--muted)", fontSize: 14 }}>
              No data found{activeTab ? ` in sheet "${activeTab}"` : ""}.
            </div>
          )}

          {!loading && !error && bodyRows.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--sidebar-bg)", position: "sticky", top: 0, zIndex: 1 }}>
                  {headers.map((h, i) => (
                    <th key={i} style={{
                      padding: "10px 14px", textAlign: "left",
                      fontWeight: 700, color: "var(--muted)", fontSize: 11,
                      borderBottom: "2px solid var(--border)",
                      whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.04em",
                    }}>
                      {h || `Col ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => {
                  // Highlight rows that look like section headers (first cell non-empty, rest blank or single value)
                  const firstCell = cellStr(row[0]);
                  const nonEmpty  = row.filter((c) => c !== null && String(c).trim() !== "");
                  const isHeader  = nonEmpty.length <= 2 && firstCell && !looksNumeric(firstCell);
                  return (
                    <tr key={ri} style={{
                      background: isHeader
                        ? "var(--sidebar-bg)"
                        : ri % 2 === 0 ? "transparent" : "rgba(128,128,128,0.04)",
                      borderBottom: "1px solid var(--border)",
                    }}>
                      {row.map((cell, ci) => {
                        const v = cellStr(cell);
                        const numeric = looksNumeric(v);
                        return (
                          <td key={ci} style={{
                            padding: "8px 14px",
                            fontWeight: ci === 0 && isHeader ? 700 : 400,
                            color: numeric ? "var(--text)" : "var(--text)",
                            textAlign: numeric ? "right" : "left",
                            whiteSpace: ci === 0 ? "nowrap" : "normal",
                            fontSize: isHeader ? 11 : 12,
                            letterSpacing: isHeader && ci === 0 ? "0.03em" : undefined,
                          }}>
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
