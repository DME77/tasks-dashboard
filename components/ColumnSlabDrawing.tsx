"use client";
import { useEffect, useRef, useState } from "react";
import { B2_SLAB_PAGES } from "./b2SlabImage";
import { SLAB_ZONEMAP, SLAB_ZONE_KEYS } from "./slabZoneMap";

const zoomBtn: React.CSSProperties = {
  padding: "5px 11px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--sidebar-bg)", color: "var(--text)", cursor: "pointer",
  fontSize: 12, fontWeight: 600, minWidth: 34,
};

type PourState = "completed" | "overdue" | "upcoming" | "hold";
const COLORS: Record<PourState, [number, number, number]> = {
  completed: [22, 150, 60],   // green — all tasks complete
  overdue: [214, 40, 40],     // red — a deadline has passed
  upcoming: [37, 99, 235],    // blue — deadline upcoming
  hold: [106, 90, 205],       // purple — sub-area on hold (inactive)
};

export default function ColumnSlabDrawing() {
  const page = B2_SLAB_PAGES[0];
  const [zoom, setZoom] = useState(1);
  const [state, setState] = useState<Record<string, PourState> | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aspect = `${page.w} / ${page.h}`;

  useEffect(() => {
    let alive = true;
    fetch(`/api/slab-cpatelier?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive && !d.error) setState(d.state || {}); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const drawing = new Image();
    const zmap = new Image();
    let loaded = 0, cancelled = false;
    const render = () => {
      if (cancelled) return;
      const W = drawing.width, H = drawing.height;
      canvas.width = W; canvas.height = H;
      ctx.drawImage(drawing, 0, 0);
      if (!state) return;
      const off = document.createElement("canvas");
      off.width = W; off.height = H;
      const octx = off.getContext("2d");
      if (!octx) return;
      octx.drawImage(zmap, 0, 0, W, H);
      const zone = octx.getImageData(0, 0, W, H).data;
      const main = ctx.getImageData(0, 0, W, H);
      const data = main.data;
      const a = 0.4;
      for (let i = 0; i < data.length; i += 4) {
        const idx = zone[i];
        if (!idx) continue;
        const key = SLAB_ZONE_KEYS[idx];
        const s = key && state[key];
        if (!s) continue;
        const c = COLORS[s];
        data[i] = data[i] * (1 - a) + c[0] * a;
        data[i + 1] = data[i + 1] * (1 - a) + c[1] * a;
        data[i + 2] = data[i + 2] * (1 - a) + c[2] * a;
      }
      ctx.putImageData(main, 0, 0);
    };
    const onLoad = () => { if (++loaded === 2) render(); };
    drawing.onload = onLoad;
    zmap.onload = onLoad;
    drawing.src = page.src;
    zmap.src = SLAB_ZONEMAP;
    return () => { cancelled = true; };
  }, [state, page.src]);

  const doneCount = state ? Object.values(state).filter((s) => s === "completed").length : 0;
  const total = Object.keys(SLAB_ZONE_KEYS).length;

  return (
    <div style={{
      background: "var(--panel-bg)", border: "1px solid var(--border)",
      borderRadius: 14, overflow: "hidden", marginBottom: 16,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
        borderBottom: "1px solid var(--border)", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 18 }}>🏛️</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>B2 Slab Pour Plan — CP-Atelier (Column &amp; Slab Work)</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {loading ? "Loading live pour status…" : `${doneCount} of ${total} pours fully complete`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 11, color: "var(--muted)", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: "rgb(22,150,60)", display: "inline-block" }} /> Completed
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: "rgb(214,40,40)", display: "inline-block" }} /> Overdue
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: "rgb(37,99,235)", display: "inline-block" }} /> Upcoming
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: "rgb(106,90,205)", display: "inline-block" }} /> Hold
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} style={zoomBtn}>－</button>
          <button onClick={() => setZoom(1)} style={zoomBtn} title="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} style={zoomBtn}>＋</button>
        </div>
      </div>

      <div style={{ overflow: "auto", padding: 14, background: "var(--sidebar-bg)", maxHeight: "80vh" }}>
        <div style={{
          width: `${zoom * 100}%`, margin: "0 auto",
          aspectRatio: aspect, minWidth: zoom > 1 ? "100%" : undefined,
        }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", borderRadius: 8, background: "#fff" }} />
        </div>
      </div>
    </div>
  );
}
