"use client";
import { useState } from "react";
import { B2_SLAB_PAGES } from "./b2SlabImage";

const zoomBtn: React.CSSProperties = {
  padding: "5px 11px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--sidebar-bg)", color: "var(--text)", cursor: "pointer",
  fontSize: 12, fontWeight: 600, minWidth: 34,
};

export default function ColumnSlabDrawing() {
  const [zoom, setZoom] = useState(1);

  return (
    <div style={{
      background: "var(--panel-bg)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
        borderBottom: "1px solid var(--border)", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 18 }}>🏛️</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>B2 Slab Pour Plan — CP-Atelier (Column &amp; Slab Work)</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Slab pour plan drawing
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} style={zoomBtn}>－</button>
          <button onClick={() => setZoom(1)} style={zoomBtn} title="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} style={zoomBtn}>＋</button>
        </div>
      </div>

      {/* Drawing sheets */}
      <div style={{
        overflow: "auto", padding: 14,
        background: "var(--sidebar-bg)", maxHeight: "80vh",
      }}>
        {B2_SLAB_PAGES.length === 0 && (
          <div style={{ padding: "28px 14px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            Drawing is being prepared and will appear here shortly.
          </div>
        )}
        {B2_SLAB_PAGES.map((pg, i) => (
          <div key={i} style={{ marginBottom: i < B2_SLAB_PAGES.length - 1 ? 18 : 0 }}>
            {B2_SLAB_PAGES.length > 1 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
                Sheet {i + 1} of {B2_SLAB_PAGES.length}
              </div>
            )}
            <div style={{
              position: "relative", width: `${zoom * 100}%`,
              margin: "0 auto", aspectRatio: `${pg.w} / ${pg.h}`,
              minWidth: zoom > 1 ? "100%" : undefined,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pg.src}
                alt={`B2 slab pour plan — sheet ${i + 1}`}
                style={{ width: "100%", height: "100%", display: "block", borderRadius: 8, background: "#fff" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
