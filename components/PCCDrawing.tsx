"use client";
import { useState } from "react";
import { PCC_IMAGE, PCC_IMAGE_W, PCC_IMAGE_H } from "./pccImage";

const zoomBtn: React.CSSProperties = {
  padding: "5px 11px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--sidebar-bg)", color: "var(--text)", cursor: "pointer",
  fontSize: 12, fontWeight: 600, minWidth: 34,
};

export default function PCCDrawing() {
  const [zoom, setZoom] = useState(1);
  const aspect = `${PCC_IMAGE_W} / ${PCC_IMAGE_H}`;

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
        <span style={{ fontSize: 18 }}>🧱</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>PCC Pour Plans — Homeland Global Park</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Pour plan drawing · 08 Jun 2026
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} style={zoomBtn}>－</button>
          <button onClick={() => setZoom(1)} style={zoomBtn} title="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} style={zoomBtn}>＋</button>
        </div>
      </div>

      {/* Drawing */}
      <div style={{
        overflow: "auto", padding: 14,
        background: "var(--sidebar-bg)", maxHeight: "80vh",
      }}>
        <div style={{
          position: "relative", width: `${zoom * 100}%`,
          margin: "0 auto", aspectRatio: aspect,
          minWidth: zoom > 1 ? "100%" : undefined,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PCC_IMAGE}
            alt="PCC Pour Plans — Homeland Global Park"
            style={{ width: "100%", height: "100%", display: "block", borderRadius: 8, background: "#fff" }}
          />
        </div>
      </div>
    </div>
  );
}
