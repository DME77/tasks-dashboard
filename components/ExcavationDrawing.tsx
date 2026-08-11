"use client";
import { useEffect, useRef, useState } from "react";
import { EXCAVATION_IMAGE, EXCAVATION_IMAGE_W, EXCAVATION_IMAGE_H } from "./excavationImage";
import { EXCAVATION_POUR_BOXES } from "./excavationPourBoxes";
// Zone map kept for import compatibility but not used (new drawings use pour-box overlays)
import { EXCAVATION_ZONEMAP as _EZM, EXCAVATION_ZONE_KEYS as _EZK } from "./excavationZoneMap";

const zoomBtn: React.CSSProperties = {
  padding: "5px 11px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--sidebar-bg)", color: "var(--text)", cursor: "pointer",
  fontSize: 12, fontWeight: 600, minWidth: 34,
};

type PourState = "completed" | "overdue" | "upcoming";
const COLORS: Record<PourState, [number, number, number]> = {
  completed: [0, 120, 40],   // green — work completed
  overdue: [214, 40, 40],     // red — deadline passed
  upcoming: [37, 99, 235],    // blue — deadline still ahead
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

  // Normalise a zone key for fuzzy matching: "NTP -2" == "NTP - 2" == "ntp-2"
  const normKey = (k: string) => k.toLowerCase().replace(/\s*[-–]\s*/g, "-").replace(/\s+/g, " ").trim();

  // Draw drawing + pour-box overlays coloured by live DB status
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawing = new Image();
    let cancelled = false;

    drawing.onload = () => {
      if (cancelled) return;
      const W = drawing.width, H = drawing.height;
      canvas.width = W; canvas.height = H;
      ctx.drawImage(drawing, 0, 0);
      if (!state) return;

      // Build normalised state lookup so DB names like "NTP -2" match box key "NTP - 2"
      const normState: Record<string, PourState> = {};
      for (const [k, v] of Object.entries(state)) normState[normKey(k)] = v;

      ctx.save();
      for (const box of EXCAVATION_POUR_BOXES) {
        const s = normState[normKey(box.key)];
        if (!s) continue;
        const [cr, cg, cb] = COLORS[s];
        const x = box.x0 * W, y = box.y0 * H;
        const w = (box.x1 - box.x0) * W, h = (box.y1 - box.y0) * H;
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = `rgb(${Math.max(0,cr-60)},${Math.max(0,cg-60)},${Math.max(0,cb-60)})`;
        ctx.lineWidth = Math.max(1, W / 1200);
        ctx.strokeRect(x, y, w, h);
        // Zone label
        const fs = Math.max(10, Math.round(W / 160));
        ctx.font = `bold ${fs}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.fillText(box.key, x + w / 2, y + h / 2);
      }
      ctx.restore();
    };

    drawing.src = EXCAVATION_IMAGE;
    return () => { cancelled = true; };
  }, [state]);

  const uniqueKeys = [...new Set(EXCAVATION_POUR_BOXES.map((p) => p.key))];
  const normState2 = state ? Object.fromEntries(Object.entries(state).map(([k,v]) => [normKey(k), v])) : {};
  const doneCount = state ? uniqueKeys.filter((k) => normState2[normKey(k)] === "completed").length : 0;
  const total = uniqueKeys.length;

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
            <span style={{ width: 11, height: 11, borderRadius: 3, background: "rgb(0,120,40)", display: "inline-block" }} /> Completed
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: "rgb(214,40,40)", display: "inline-block" }} /> Overdue
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: "rgb(37,99,235)", display: "inline-block" }} /> Upcoming
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
