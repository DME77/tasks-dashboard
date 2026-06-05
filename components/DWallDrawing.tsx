"use client";
import { useMemo, useState } from "react";
import {
  DWALL_IMAGE, DWALL_IMAGE_W, DWALL_IMAGE_H,
  PANEL_COORDS, PANELS_BY_TYPE,
  type PanelType,
} from "./dwallPanels";

const TYPE_LABELS: Record<PanelType, string> = {
  A: "Type-A", B: "Type-B", C: "Type-C", D: "Type-D", L: "Link",
};

export interface DWallData {
  done: string[];
  byType: Record<string, { total: number; done: number }>;
  total: number;
  doneCount: number;
  updatedAt?: string;
}

/* ── D-Wall layout with completed panels highlighted in yellow ────────────────
 *  inline = true  → renders directly in the page (no modal, no close button)
 *  inline = false → renders as a centered modal overlay (needs onClose)
 * ──────────────────────────────────────────────────────────────────────────── */
export default function DWallDrawing({
  data, loading, inline = false, onClose,
}: {
  data: DWallData | null;
  loading: boolean;
  inline?: boolean;
  onClose?: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  // Completed panels that actually exist on the drawing
  const doneSet = useMemo(() => {
    const s = new Set<string>();
    for (const raw of data?.done ?? []) {
      const id = String(raw).trim().toUpperCase();
      if (PANEL_COORDS[id]) s.add(id);
    }
    return s;
  }, [data]);

  const total     = data?.total ?? 0;
  const doneCount = data?.doneCount ?? doneSet.size;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  const byType = (["A", "B", "C", "D"] as PanelType[]).map((t) => {
    const live = data?.byType?.[t];
    return { type: t, done: live?.done ?? 0, total: live?.total ?? 0 };
  });

  const aspect = `${DWALL_IMAGE_W} / ${DWALL_IMAGE_H}`;

  /* ── Shared inner content (header, chips, drawing, footer) ──────────────── */
  const content = (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "var(--panel-bg)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        width: inline ? "100%" : "min(1180px, 96vw)",
        maxHeight: inline ? undefined : "94vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: inline ? undefined : "0 24px 60px rgba(0,0,0,0.45)",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
        borderBottom: "1px solid var(--border)", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 18 }}>📐</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>D-Wall Work — GFC Layout (Diaphragm Wall)</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Completed panels highlighted in yellow · live from ASAP
          </div>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
          background: "rgba(250,204,21,0.16)", color: "#b8860b",
          border: "1px solid rgba(250,204,21,0.5)",
        }}>
          {loading ? "loading…" : `${doneCount} / ${total} done · ${pct}%`}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} style={zoomBtn}>－</button>
          <button onClick={() => setZoom(1)} style={zoomBtn} title="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} style={zoomBtn}>＋</button>
        </div>
        {!inline && onClose && (
          <button onClick={onClose} style={{ ...zoomBtn, fontWeight: 700 }}>✕ Close</button>
        )}
      </div>

      {/* Per-type chips */}
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap", padding: "10px 18px",
        borderBottom: "1px solid var(--border)", fontSize: 12,
      }}>
        {byType.map(({ type, done, total }) => (
          <span key={type} style={{
            padding: "3px 10px", borderRadius: 16, border: "1px solid var(--border)",
            background: "var(--sidebar-bg)", color: "var(--text)", fontWeight: 600,
          }}>
            {TYPE_LABELS[type]}: <strong style={{ color: done > 0 ? "#b8860b" : "var(--muted)" }}>{done}</strong>/{total}
          </span>
        ))}
      </div>

      {/* Drawing area */}
      <div style={{
        overflow: "auto", padding: 14, background: "var(--sidebar-bg)",
        maxHeight: inline ? "78vh" : undefined,
      }}>
        <div style={{
          position: "relative", width: `${zoom * 100}%`, margin: "0 auto",
          aspectRatio: aspect, minWidth: zoom > 1 ? "100%" : undefined,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DWALL_IMAGE}
            alt="D-Wall GFC layout drawing"
            style={{ width: "100%", height: "100%", display: "block", borderRadius: 8, background: "#fff" }}
          />
          {[...doneSet].map((id) => {
            const c = PANEL_COORDS[id];
            return (
              <span
                key={id}
                title={`${id} — completed`}
                style={{
                  position: "absolute",
                  left: `${c.x * 100}%`, top: `${c.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: "2.2%", aspectRatio: "1 / 1",
                  background: "rgba(250,204,21,0.55)",
                  border: "1.5px solid rgba(202,138,4,0.95)",
                  borderRadius: 3,
                  boxShadow: "0 0 4px rgba(250,204,21,0.8)",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Footer: completed panel list */}
      <div style={{
        padding: "10px 18px", borderTop: "1px solid var(--border)",
        fontSize: 12, color: "var(--muted)", maxHeight: 110, overflow: "auto",
      }}>
        <strong style={{ color: "var(--text)" }}>Completed panels:</strong>{" "}
        {loading
          ? "loading…"
          : doneCount === 0
          ? "none completed yet"
          : (Object.keys(PANELS_BY_TYPE) as PanelType[])
              .flatMap((t) => PANELS_BY_TYPE[t].filter((id) => doneSet.has(id)))
              .join(", ")}
      </div>
    </div>
  );

  // Inline: render directly in page flow
  if (inline) {
    return <div style={{ marginBottom: 16 }}>{content}</div>;
  }

  // Modal: centered overlay with backdrop
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(8,12,28,0.72)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      {content}
    </div>
  );
}

const zoomBtn: React.CSSProperties = {
  padding: "5px 11px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--sidebar-bg)", color: "var(--text)", cursor: "pointer",
  fontSize: 12, fontWeight: 600, minWidth: 34,
};
