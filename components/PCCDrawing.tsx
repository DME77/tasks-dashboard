"use client";
import { useEffect, useRef, useState } from "react";
import { PCC_IMAGE, PCC_IMAGE_W, PCC_IMAGE_H } from "./pccImage";
import { PCC_ZONEMAP, PCC_ZONE_KEYS } from "./pccZoneMap";

const zoomBtn: React.CSSProperties = {
  padding: "5px 11px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--sidebar-bg)", color: "var(--text)", cursor: "pointer",
  fontSize: 12, fontWeight: 600, minWidth: 34,
};

type PourState = "completed" | "overdue" | "upcoming";
const COLORS: Record<PourState, [number, number, number]> = {
  completed: [190, 235, 205],   // light green — zone fill (completed)
  overdue: [248, 200, 200],     // light red — zone fill (deadline passed)
  upcoming: [200, 218, 245],    // light blue — zone fill (upcoming)
};
const LABEL_COLORS: Record<PourState, [number, number, number]> = {
  completed: [22, 150, 60],     // dark green — label box
  overdue: [214, 40, 40],       // dark red — label box
  upcoming: [37, 99, 235],      // dark blue — label box
};
const pourLabel = (k: string) =>
  k.replace("Non Tower Pour -", "NT Pour").replace("Tower Pour -", "Tower Pour").trim();
const PCC_AREAS: Record<string, string> = {
  "Non Tower Pour - 1": "1539 Sqm", "Non Tower Pour - 2": "1474 Sqm", "Non Tower Pour - 3": "960 Sqm",
  "Non Tower Pour - 4": "516 Sqm", "Non Tower Pour - 5": "432 Sqm", "Non Tower Pour - 6": "356 Sqm",
  "Tower Pour - 1": "1023 Sqm", "Tower Pour - 2": "884 Sqm", "Tower Pour - 3": "929 Sqm",
};

export default function PCCDrawing() {
  const [zoom, setZoom] = useState(1);
  const [state, setState] = useState<Record<string, PourState> | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aspect = `${PCC_IMAGE_W} / ${PCC_IMAGE_H}`;

  useEffect(() => {
    let alive = true;
    fetch(`/api/pcc?t=${Date.now()}`, { cache: "no-store" })
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
      type ZI = { sx: number; sy: number; n: number; minx: number; maxx: number; miny: number; maxy: number };
      const cent: Record<number, ZI> = {};
      for (let i = 0; i < data.length; i += 4) {
        const idx = zone[i];
        if (!idx) continue;
        const key = PCC_ZONE_KEYS[idx];
        const s = key && state[key];
        if (!s) continue;
        const c = COLORS[s];
        // translucent light fill -> drawing details faintly show through
        const a = 0.72;
        data[i] = data[i] * (1 - a) + c[0] * a;
        data[i + 1] = data[i + 1] * (1 - a) + c[1] * a;
        data[i + 2] = data[i + 2] * (1 - a) + c[2] * a;
        const px = i / 4, x = px % W, y = (px / W) | 0;
        const e = (cent[idx] ??= { sx: 0, sy: 0, n: 0, minx: W, maxx: 0, miny: H, maxy: 0 });
        e.sx += x; e.sy += y; e.n++;
        if (x < e.minx) e.minx = x; if (x > e.maxx) e.maxx = x;
        if (y < e.miny) e.miny = y; if (y > e.maxy) e.maxy = y;
      }
      ctx.putImageData(main, 0, 0);
      // Pour name + area — dark status-colour label box with white text, kept inside each boundary
      ctx.save();
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (const k in cent) {
        const key = PCC_ZONE_KEYS[k];
        const s = key && state[key];
        if (!s) continue;
        const dc = LABEL_COLORS[s];
        const e = cent[k], cx = e.sx / e.n, cy = e.sy / e.n;
        const zw = e.maxx - e.minx, zh = e.maxy - e.miny;
        const lines = [pourLabel(key), "Area = " + (PCC_AREAS[key] ?? "")];
        // shrink font until the label box fits inside the zone
        let fs = Math.max(9, Math.round(W / 72));
        while (fs > 8) {
          ctx.font = `bold ${fs}px sans-serif`;
          const wide = Math.max(...lines.map((t) => ctx.measureText(t).width));
          if (wide <= 0.8 * zw && fs * 2 + 10 <= 0.55 * zh) break;
          fs--;
        }
        ctx.font = `bold ${fs}px sans-serif`;
        const lh = fs + 3;
        const bw = Math.max(...lines.map((t) => ctx.measureText(t).width)) + 12;
        const bh = lines.length * lh + 8;
        let bx = cx - bw / 2, by = cy - bh / 2;
        bx = Math.max(e.minx + 3, Math.min(bx, e.maxx - bw - 3));
        by = Math.max(e.miny + 3, Math.min(by, e.maxy - bh - 3));
        ctx.fillStyle = `rgb(${dc[0]},${dc[1]},${dc[2]})`;
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = "#fff";
        lines.forEach((t, j) => ctx.fillText(t, bx + bw / 2, by + 4 + j * lh));
      }
      ctx.restore();
    };
    const onLoad = () => { if (++loaded === 2) render(); };
    drawing.onload = onLoad;
    zmap.onload = onLoad;
    drawing.src = PCC_IMAGE;
    zmap.src = PCC_ZONEMAP;
    return () => { cancelled = true; };
  }, [state]);

  const doneCount = state ? Object.values(state).filter((s) => s === "completed").length : 0;
  const total = Object.keys(PCC_ZONE_KEYS).length;

  return (
    <div style={{
      background: "var(--panel-bg)", border: "1px solid var(--border)",
      borderRadius: 14, overflow: "hidden", marginBottom: 16,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
        borderBottom: "1px solid var(--border)", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 18 }}>🧱</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>PCC Pour Plan — Homeland Global Park</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {loading ? "Loading live pour status…" : `${doneCount} of ${total} PCC pours cast`}
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
