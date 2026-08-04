"use client";
import { useMemo, useState } from "react";

/* ════════════════════════════════════════════════════════════════════════════
 * Retaining Wall — GFC Layout drawing + schedule tracker
 * RW-1 to RW-17 status is calculated from scheduled completion dates:
 *   green  = date has passed (auto-complete)
 *   orange = date within 30 days
 *   blue   = upcoming
 * ════════════════════════════════════════════════════════════════════════════ */

const IMAGE    = "/drawings/retaining-wall.png";
const IMAGE_W  = 5052;
const IMAGE_H  = 3573;

/* Schedule from PDF drawing ------------------------------------------------ */
interface RWSection {
  id: string;
  zone: 1 | 2 | 3;
  lengthM: number;
  dateStr: string; // ISO yyyy-mm-dd
}

const SCHEDULE: RWSection[] = [
  // Zone-1: RW-1 to RW-5
  { id: "RW-1",  zone: 1, lengthM: 30, dateStr: "2026-10-15" },
  { id: "RW-2",  zone: 1, lengthM: 26, dateStr: "2026-10-30" },
  { id: "RW-3",  zone: 1, lengthM: 22, dateStr: "2026-11-10" },
  { id: "RW-4",  zone: 1, lengthM: 18, dateStr: "2026-11-20" },
  { id: "RW-5",  zone: 1, lengthM: 10, dateStr: "2026-11-30" },
  // Zone-2: RW-6 to RW-10
  { id: "RW-6",  zone: 2, lengthM: 37, dateStr: "2026-12-15" },
  { id: "RW-7",  zone: 2, lengthM: 46, dateStr: "2026-12-20" },
  { id: "RW-8",  zone: 2, lengthM: 57, dateStr: "2027-01-20" },
  { id: "RW-9",  zone: 2, lengthM: 51, dateStr: "2027-02-10" },
  { id: "RW-10", zone: 2, lengthM: 31, dateStr: "2027-02-20" },
  // Zone-3: RW-11 to RW-17
  { id: "RW-11", zone: 3, lengthM: 33, dateStr: "2027-03-02" },
  { id: "RW-12", zone: 3, lengthM: 10, dateStr: "2027-03-12" },
  { id: "RW-13", zone: 3, lengthM: 38, dateStr: "2027-03-22" },
  { id: "RW-14", zone: 3, lengthM: 38, dateStr: "2027-03-31" },
  { id: "RW-15", zone: 3, lengthM: 38, dateStr: "2027-04-10" },
  { id: "RW-16", zone: 3, lengthM: 38, dateStr: "2027-04-20" },
  { id: "RW-17", zone: 3, lengthM: 38, dateStr: "2027-04-30" },
];

/* Normalized coords (0-1) of RW label text extracted directly from PDF.
   Only sections whose labels appear on the main drawing are listed here.
   (RW-1..7, 11..14 are in the schedule table outside the page boundary.) */
const RW_COORDS: Record<string, { x: number; y: number }> = {
  "RW-8":  { x: 0.125, y: 0.804 },
  "RW-9":  { x: 0.130, y: 0.553 },
  "RW-10": { x: 0.131, y: 0.380 },
  "RW-15": { x: 0.604, y: 0.892 },
  "RW-16": { x: 0.605, y: 0.724 },
  "RW-17": { x: 0.605, y: 0.518 },
};

type Status = "completed" | "soon" | "upcoming";

function getStatus(dateStr: string, today: Date): Status {
  const due = new Date(dateStr);
  if (due <= today) return "completed";
  const days = (due.getTime() - today.getTime()) / 86_400_000;
  if (days <= 30) return "soon";
  return "upcoming";
}

const STATUS_COLOR: Record<Status, string> = {
  completed: "rgba(22,163,74,0.55)",   // green
  soon:      "rgba(234,88,12,0.55)",   // orange
  upcoming:  "rgba(37,99,235,0.35)",   // blue
};
const STATUS_BORDER: Record<Status, string> = {
  completed: "rgba(22,163,74,0.95)",
  soon:      "rgba(234,88,12,0.95)",
  upcoming:  "rgba(37,99,235,0.8)",
};
const STATUS_LABEL: Record<Status, string> = {
  completed: "Done",
  soon:      "Soon",
  upcoming:  "Upcoming",
};
const STATUS_DOT: Record<Status, string> = {
  completed: "#16a34a",
  soon:      "#ea580c",
  upcoming:  "#2563eb",
};
const ZONE_COLOR: Record<1 | 2 | 3, string> = {
  1: "#7c3aed",
  2: "#0891b2",
  3: "#b45309",
};

const zoomBtn: React.CSSProperties = {
  padding: "5px 11px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--sidebar-bg)", color: "var(--text)", cursor: "pointer",
  fontSize: 12, fontWeight: 600, minWidth: 34,
};

export default function RetainingWallDrawing() {
  const [zoom, setZoom] = useState(1);

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const sections = useMemo(
    () => SCHEDULE.map((s) => ({ ...s, status: getStatus(s.dateStr, today) })),
    [today]
  );

  const doneCount = sections.filter((s) => s.status === "completed").length;
  const totalLength = SCHEDULE.reduce((a, s) => a + s.lengthM, 0);
  const doneLength  = sections
    .filter((s) => s.status === "completed")
    .reduce((a, s) => a + s.lengthM, 0);

  const aspect = `${IMAGE_W} / ${IMAGE_H}`;

  return (
    <div style={{
      background: "var(--panel-bg)", border: "1px solid var(--border)",
      borderRadius: 14, overflow: "hidden", marginBottom: 16,
    }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
        borderBottom: "1px solid var(--border)", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 18 }}>🧱</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Retaining Wall — GFC Layout</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {doneCount} of {SCHEDULE.length} sections done · {doneLength}m of {totalLength}m cast
          </div>
        </div>
        {/* Zone chips */}
        {([1, 2, 3] as const).map((z) => {
          const zoneSecs = sections.filter((s) => s.zone === z);
          const zDone = zoneSecs.filter((s) => s.status === "completed").length;
          return (
            <span key={z} style={{
              fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
              background: `${ZONE_COLOR[z]}22`, color: ZONE_COLOR[z],
              border: `1px solid ${ZONE_COLOR[z]}66`,
            }}>
              Zone-{z}: {zDone}/{zoneSecs.length}
            </span>
          );
        })}
        {/* Zoom */}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} style={zoomBtn}>－</button>
          <button onClick={() => setZoom(1)} style={zoomBtn} title="Reset">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} style={zoomBtn}>＋</button>
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 16, padding: "8px 18px",
        borderBottom: "1px solid var(--border)", fontSize: 11,
      }}>
        {(["completed", "soon", "upcoming"] as Status[]).map((s) => (
          <span key={s} style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--muted)" }}>
            <span style={{
              width: 10, height: 10, borderRadius: 2, display: "inline-block",
              background: STATUS_DOT[s],
            }} />
            {s === "completed" ? "Completed" : s === "soon" ? "Due within 30 days" : "Upcoming"}
          </span>
        ))}
      </div>

      {/* ── Drawing ─────────────────────────────────────────────────────────── */}
      <div style={{
        overflow: "auto", padding: 14, background: "var(--sidebar-bg)", maxHeight: "78vh",
      }}>
        <div style={{
          position: "relative", width: `${zoom * 100}%`, margin: "0 auto",
          aspectRatio: aspect, minWidth: zoom > 1 ? "100%" : undefined,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={IMAGE}
            alt="Retaining Wall GFC layout"
            style={{ width: "100%", height: "100%", display: "block", borderRadius: 8, background: "#fff" }}
          />
          {/* Overlay boxes for visible RW sections */}
          {sections
            .filter((s) => RW_COORDS[s.id])
            .map((s) => {
              const c = RW_COORDS[s.id];
              return (
                <span
                  key={s.id}
                  title={`${s.id} — ${s.lengthM}m — due ${s.dateStr} — ${STATUS_LABEL[s.status]}`}
                  style={{
                    position: "absolute",
                    left: `${c.x * 100}%`,
                    top: `${c.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                    width: "3.5%",
                    aspectRatio: "2 / 1",
                    background: STATUS_COLOR[s.status],
                    border: `1.5px solid ${STATUS_BORDER[s.status]}`,
                    borderRadius: 3,
                    boxShadow: `0 0 4px ${STATUS_BORDER[s.status]}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.6%",
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: 0.3,
                  }}
                >
                  {s.id}
                </span>
              );
            })}
        </div>
      </div>

      {/* ── Schedule table ──────────────────────────────────────────────────── */}
      <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)", overflowX: "auto" }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "var(--text)" }}>
          Retaining Wall Schedule
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)", color: "var(--muted)" }}>
              {["Section", "Zone", "Length", "Target Date", "Status"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "5px 10px", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((s, i) => (
              <tr
                key={s.id}
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.03)",
                }}
              >
                <td style={{ padding: "6px 10px", fontWeight: 700, color: "var(--text)" }}>{s.id}</td>
                <td style={{ padding: "6px 10px" }}>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 12, fontWeight: 600,
                    background: `${ZONE_COLOR[s.zone]}22`, color: ZONE_COLOR[s.zone],
                    border: `1px solid ${ZONE_COLOR[s.zone]}66`,
                  }}>
                    Zone-{s.zone}
                  </span>
                </td>
                <td style={{ padding: "6px 10px", color: "var(--muted)" }}>{s.lengthM} m</td>
                <td style={{ padding: "6px 10px", color: "var(--muted)" }}>
                  {new Date(s.dateStr).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </td>
                <td style={{ padding: "6px 10px" }}>
                  <span style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 12, fontWeight: 700,
                    background: `${STATUS_DOT[s.status]}22`,
                    color: STATUS_DOT[s.status],
                    border: `1px solid ${STATUS_DOT[s.status]}55`,
                  }}>
                    {s.status === "completed" ? "✓ Done" : s.status === "soon" ? "⚡ Soon" : "Upcoming"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
