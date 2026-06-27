"use client";
import { useEffect, useRef, useState } from "react";
import { EXCAVATION_IMAGE, EXCAVATION_IMAGE_W, EXCAVATION_IMAGE_H } from "./excavationImage";
import { EXCAVATION_POUR_BOXES } from "./excavationPourBoxes";
import { EXCAVATION_ZONEMAP, EXCAVATION_ZONE_KEYS } from "./excavationZoneMap";

const zoomBtn: React.CSSProperties = {
  padding: "5px 11px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--sidebar-bg)", color: "var(--text)", cursor: "pointer",
  fontSize: 12, fontWeight: 600, minWidth: 34,
};

type PourState = "completed" | "overdue" | "upcoming" | "hold";
const COLORS: Record<PourState, [number, number, number]> = {
  completed: [22, 150, 60],   // green — work completed
  overdue: [214, 40, 40],     // red — deadline passed
  upcoming: [37, 99, 235],    // blue — deadline still ahead
  hold: [106, 90, 205],       // purple — sub-area on hold (inactive)
};

export default function ExcavationDrawing() {
  const [zoom, setZoom] = useState(1);
  const [state, setState] = useState<Record<string, PourState> | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aspect = `${EXCAVATION_IMAGE_W} / ${EXCAVATION_IMAGE_H}`;

  // Fetch live pour state
  useEffect(() => {
    let alive = true;
    fetch(`/api/excavation?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive && !d.error) setState(d.state || {}); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Draw drawing, fill each pour ZONE and recolour its label box by live status
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawing = new Image();
    const zmap = new Image();
    let loaded = 0;
    let cancelled = false;

    const render = () => {
      if (cancelled) return;
      const W = drawing.width, H = drawing.height;
      canvas.width = W;
      canvas.height = H;
      ctx.drawImage(drawing, 0, 0);
      if (!state) return; // leave plain until state arrives

      // 1) Recolour each label box fill solidly to its status colour (on original colours)
      for (const box of EXCAVATION_POUR_BOXES) {
        if (!(box.key in state)) continue;
        const tgt = COLORS[state[box.key]];
        const x0 = Math.floor(box.x0 * W), y0 = Math.floor(box.y0 * H);
        const w = Math.max(1, Math.ceil((box.x1 - box.x0) * W));
        const h = Math.max(1, Math.ceil((box.y1 - box.y0) * H));
        const id = ctx.getImageData(x0, y0, w, h);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          const isBlue = b >= mx && b - r > 20 && b - g > 12;
          const isRed = r >= mx && r - g > 30 && r - b > 30;
          if ((isBlue || isRed) && mx - mn > 30) {
            d[i] = tgt[0]; d[i + 1] = tgt[1]; d[i + 2] = tgt[2];
          }
        }
        ctx.putImageData(id, x0, y0);
      }

      // 2) Fill each pour zone with a translucent status colour (read zone-index map)
      const off = document.createElement("canvas");
      off.width = W; off.height = H;
      const octx = off.getContext("2d");
      if (octx) {
        octx.drawImage(zmap, 0, 0, W, H);
        const zone = octx.getImageData(0, 0, W, H).data;
        const main = ctx.getImageData(0, 0, W, H);
        const data = main.data;
        const a = 0.4;
        for (let i = 0; i < data.length; i += 4) {
          const idx = zone[i]; // pour index 1..9 (0 = no zone)
          if (!idx) continue;
          const key = EXCAVATION_ZONE_KEYS[idx];
          const s = key && state[key];
          if (!s) continue;
          const c = COLORS[s];
          data[i] = data[i] * (1 - a) + c[0] * a;
          data[i + 1] = data[i + 1] * (1 - a) + c[1] * a;
          data[i + 2] = data[i + 2] * (1 - a) + c[2] * a;
        }
        ctx.putImageData(main, 0, 0);
      }
    };

    const onLoad = () => { if (++loaded === 2) render(); };
    drawing.onload = onLoad;
    zmap.onload = onLoad;
    drawing.src = EXCAVATION_IMAGE;
    zmap.src = EXCAVATION_ZONEMAP;
    return () => { cancelled = true; };
  }, [state]);

  const doneCount = state ? EXCAVATION_POUR_BOXES.filter((p) => state[p.key] === "completed").length : 0;
  const total = EXCAVATION_POUR_BOXES.length;

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
        <span style={{ fontSize: 18 }}>⛏️</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Excavation Plan — Homeland Global Park</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {loading ? "Loading live pour status…" : `${doneCount} of ${total} pours completed`}
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

      {/* Drawing (canvas, recoloured live) */}
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
