"use client";
import { useEffect, useRef, useState } from "react";
import { ATELIER_COLUMN_POUR_BOXES } from "./atelierColumnPourBoxes";

const zoomBtn: React.CSSProperties = {
  padding: "5px 11px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--sidebar-bg)", color: "var(--text)", cursor: "pointer",
  fontSize: 12, fontWeight: 600, minWidth: 34,
};

type PourState = "completed" | "overdue" | "upcoming";
const COLORS: Record<PourState, [number, number, number]> = {
  completed: [0,   120,  40],   // dark green
  overdue:   [214,  40,  40],   // red
  upcoming:  [37,   99, 235],   // blue
};

/** normalise "Pour - 2A" == "pour-2a" == "pour - 2a" etc. */
const normKey = (k: string) =>
  k.toLowerCase().replace(/\s*[-–]\s*/g, "-").replace(/\s+/g, " ").trim();

interface Props {
  /** "b1" | "b2" | "gf" */
  level: "b1" | "b2" | "gf";
  title: string;
  image: string;
  imageW: number;
  imageH: number;
}

export default function AtelierColumnDrawing({ level, title, image, imageW, imageH }: Props) {
  const [zoom, setZoom]       = useState(1);
  const [state, setState]     = useState<Record<string, PourState> | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aspect = `${imageW} / ${imageH}`;

  // Fetch live pour state
  useEffect(() => {
    let alive = true;
    fetch(`/api/atelier-column?level=${level}&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive && !d.error) setState(d.state || {}); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [level]);

  // Draw image + pour-box overlays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    let cancelled = false;

    img.onload = () => {
      if (cancelled) return;
      const W = img.width, H = img.height;
      canvas.width = W; canvas.height = H;
      ctx.drawImage(img, 0, 0);
      if (!state) return;

      const normState: Record<string, PourState> = {};
      for (const [k, v] of Object.entries(state)) normState[normKey(k)] = v;

      ctx.save();
      for (const box of ATELIER_COLUMN_POUR_BOXES) {
        const s = normState[normKey(box.key)];
        if (!s) continue;
        const [cr, cg, cb] = COLORS[s];
        const x = box.x0 * W, y = box.y0 * H;
        const w = (box.x1 - box.x0) * W, h = (box.y1 - box.y0) * H;
        ctx.globalAlpha = 0.40;
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = `rgb(${Math.max(0, cr - 40)},${Math.max(0, cg - 40)},${Math.max(0, cb - 40)})`;
        ctx.lineWidth = Math.max(2, W / 600);
        ctx.strokeRect(x, y, w, h);
        // Label
        const fs = Math.max(16, Math.round(W / 120));
        ctx.font = `bold ${fs}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = s === "completed" ? "#fff" : `rgb(${cr},${cg},${cb})`;
        ctx.fillText(box.key, x + w / 2, y + h / 2);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };

    img.src = image;
    return () => { cancelled = true; };
  }, [state, image]);

  const normState2 = state
    ? Object.fromEntries(Object.entries(state).map(([k, v]) => [normKey(k), v]))
    : {};
  const total     = ATELIER_COLUMN_POUR_BOXES.length;
  const doneCount = ATELIER_COLUMN_POUR_BOXES.filter(
    (b) => normState2[normKey(b.key)] === "completed"
  ).length;

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
        <span style={{ fontSize: 18 }}>🏛️</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {loading ? "Loading live pour status…" : `${doneCount} of ${total} pours completed`}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 11, color: "var(--muted)", flexWrap: "wrap" }}>
          {([ ["completed","rgb(0,120,40)"], ["overdue","rgb(214,40,40)"], ["upcoming","rgb(37,99,235)"] ] as const).map(([label, color]) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: color, display: "inline-block" }} />
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </span>
          ))}
        </div>

        {/* Zoom */}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} style={zoomBtn}>－</button>
          <button onClick={() => setZoom(1)} style={zoomBtn} title="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} style={zoomBtn}>＋</button>
        </div>
      </div>

      {/* Pour status chips */}
      {state && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 18px", borderBottom: "1px solid var(--border)", background: "var(--sidebar-bg)" }}>
          {ATELIER_COLUMN_POUR_BOXES.map((box) => {
            const s = normState2[normKey(box.key)];
            const color = s === "completed" ? "rgb(0,120,40)" : s === "overdue" ? "rgb(214,40,40)" : s ? "rgb(37,99,235)" : "var(--muted)";
            return (
              <span key={box.key} style={{
                fontSize: 11, fontWeight: 600, padding: "3px 10px",
                borderRadius: 99, border: `1.5px solid ${color}`, color,
              }}>
                {box.key}{s === "completed" ? " ✓" : ""}
              </span>
            );
          })}
        </div>
      )}

      {/* Drawing canvas */}
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
