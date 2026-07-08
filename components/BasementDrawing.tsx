"use client";
import { useEffect, useRef, useState } from "react";
import { BASEMENT_IMAGE, BASEMENT_IMAGE_W, BASEMENT_IMAGE_H } from "./basementImage";
import { HGP_RAFT_ZONEMAP, HGP_RAFT_ZONE_KEYS } from "./hgpRaftZoneMap";

const zoomBtn: React.CSSProperties = {
  padding: "5px 11px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--sidebar-bg)", color: "var(--text)", cursor: "pointer",
  fontSize: 12, fontWeight: 600, minWidth: 34,
};

type PourState = "completed" | "overdue" | "upcoming";
const COLORS: Record<PourState, [number, number, number]> = {
  completed: [22,  150,  60],   // green
  overdue:   [214,  40,  40],   // red
  upcoming:  [37,   99, 235],   // blue
};

export default function BasementDrawing() {
  const [zoom,    setZoom]    = useState(1);
  const [state,   setState]   = useState<Record<string, PourState> | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aspect = `${BASEMENT_IMAGE_W} / ${BASEMENT_IMAGE_H}`;

  // Fetch live pour status
  useEffect(() => {
    let alive = true;
    fetch(`/api/raft-hgp?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive && !d.error) setState(d.state || {}); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Render drawing + zone overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawing = new Image();
    const zmap    = new Image();
    let loaded = 0, cancelled = false;

    const render = () => {
      if (cancelled) return;
      const W = drawing.width, H = drawing.height;
      canvas.width = W; canvas.height = H;
      ctx.drawImage(drawing, 0, 0);
      if (!state) return;

      const off  = document.createElement("canvas");
      off.width  = W; off.height = H;
      const octx = off.getContext("2d");
      if (!octx) return;
      octx.drawImage(zmap, 0, 0, W, H);

      const zone = octx.getImageData(0, 0, W, H).data;
      const main = ctx.getImageData(0, 0, W, H);
      const data = main.data;
      const alpha = 0.38;

      for (let i = 0; i < data.length; i += 4) {
        const idx = zone[i]; // R channel = zone index
        if (!idx) continue;
        const key = HGP_RAFT_ZONE_KEYS[idx];
        const s   = key && state[key];
        if (!s) continue;
        const [cr, cg, cb] = COLORS[s];
        data[i]     = data[i]     * (1 - alpha) + cr * alpha;
        data[i + 1] = data[i + 1] * (1 - alpha) + cg * alpha;
        data[i + 2] = data[i + 2] * (1 - alpha) + cb * alpha;
      }
      ctx.putImageData(main, 0, 0);
    };

    const onLoad = () => { if (++loaded === 2) render(); };
    drawing.onload = onLoad;
    zmap.onload    = onLoad;
    drawing.src    = BASEMENT_IMAGE;
    zmap.src       = HGP_RAFT_ZONEMAP;
    return () => { cancelled = true; };
  }, [state]);

  const doneCount = state ? Object.values(state).filter((s) => s === "completed").length : 0;
  const total     = Object.keys(HGP_RAFT_ZONE_KEYS).length;

  return (
    <div style={{
      background: "var(--panel-bg)", border: "1px solid var(--border)",
      borderRadius: 14, overflow: "hidden", marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
        borderBottom: "1px solid var(--border)", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 18 }}>🏗️</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Raft RCC Pour Plans — Homeland Global Park</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {loading
              ? "Loading live pour status…"
              : `${doneCount} of ${total} pours completed`}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 11, color: "var(--muted)", flexWrap: "wrap" }}>
          {([["completed","rgb(22,150,60)"],["overdue","rgb(214,40,40)"],["upcoming","rgb(37,99,235)"]] as const).map(([label, color]) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: color, display: "inline-block" }} />
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </span>
          ))}
        </div>

        {/* Zoom controls */}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} style={zoomBtn}>－</button>
          <button onClick={() => setZoom(1)} style={zoomBtn} title="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} style={zoomBtn}>＋</button>
        </div>
      </div>

      {/* Drawing canvas */}
      <div style={{ overflow: "auto", padding: 14, background: "var(--sidebar-bg)", maxHeight: "80vh" }}>
        <div style={{
          width: `${zoom * 100}%`, margin: "0 auto",
          aspectRatio: aspect, minWidth: zoom > 1 ? "100%" : undefined,
        }}>
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", display: "block", borderRadius: 8, background: "#fff" }}
          />
        </div>
      </div>
    </div>
  );
}
