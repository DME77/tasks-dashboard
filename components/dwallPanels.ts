/* ════════════════════════════════════════════════════════════════════════════
 * D-WALL (Diaphragm Wall) — Panel layout data for Homeland Global Park
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  Completion status is NOT stored here — it is fetched live from the ASAP
 *  database via /api/dwall. A panel is "done" when its task (named
 *  "Panel No -N" under sub-area "Type - A/B/C/D" in area "D -Wall Work") is
 *  marked completed. Panel ID = type letter + task order, e.g. "A1", "D17".
 *
 *  The coordinates below are the normalized (0–1) positions of each panel
 *  label on the drawing image (public/drawings/dwall-layout.png). Only edit
 *  them if the underlying drawing changes.
 *
 *  Last updated from D-wall.pdf (PyMuPDF text extraction, page 1684×1191 pt,
 *  rendered at 3× → 5052×3573 px). Panels with y > 1.0 in the PDF (in the
 *  schedule table below the page boundary) are clamped to y = 0.997.
 * ──────────────────────────────────────────────────────────────────────── */

/** Background drawing image (rendered from the R2 layout PDF). */
export const DWALL_IMAGE = "/drawings/dwall-layout.png";

/** Native pixel size of the drawing image — used to keep the overlay aligned. */
export const DWALL_IMAGE_W = 5052;
export const DWALL_IMAGE_H = 3573;

export type PanelType = "A" | "B" | "C" | "D" | "L";
export interface PanelCoord { x: number; y: number }

/** Normalized (0–1) centre position of every panel label on the drawing. */
export const PANEL_COORDS: Record<string, PanelCoord> = {
  // ── Type-A: 44 panels ────────────────────────────────────────────────────
  // A1–A15: left vertical wall (bottom → top)
  A1:  { x: 0.0916, y: 0.6082 },
  A2:  { x: 0.0916, y: 0.5910 },
  A3:  { x: 0.0915, y: 0.5731 },
  A4:  { x: 0.0914, y: 0.5539 },
  A5:  { x: 0.0913, y: 0.5370 },
  A6:  { x: 0.0913, y: 0.5208 },
  A7:  { x: 0.0917, y: 0.5014 },
  A8:  { x: 0.0915, y: 0.4840 },
  A9:  { x: 0.0918, y: 0.4675 },
  A10: { x: 0.0917, y: 0.4496 },
  A11: { x: 0.0916, y: 0.4318 },
  A12: { x: 0.0916, y: 0.4135 },
  A13: { x: 0.0915, y: 0.3963 },
  A14: { x: 0.0916, y: 0.3813 },
  A15: { x: 0.0943, y: 0.3736 },
  // A16–A25: diagonal section
  A16: { x: 0.0993, y: 0.3662 },
  A17: { x: 0.1078, y: 0.3541 },
  A18: { x: 0.1160, y: 0.3426 },
  A19: { x: 0.1249, y: 0.3301 },
  A20: { x: 0.1347, y: 0.3173 },
  A21: { x: 0.1431, y: 0.3048 },
  A22: { x: 0.1517, y: 0.2927 },
  A23: { x: 0.1598, y: 0.2804 },
  A24: { x: 0.1688, y: 0.2676 },
  A25: { x: 0.1774, y: 0.2560 },
  // A26–A44: horizontal top section (left → right)
  A26: { x: 0.1820, y: 0.2533 },
  A27: { x: 0.1905, y: 0.2532 },
  A28: { x: 0.2022, y: 0.2532 },
  A29: { x: 0.2150, y: 0.2532 },
  A30: { x: 0.2275, y: 0.2531 },
  A31: { x: 0.2407, y: 0.2532 },
  A32: { x: 0.2529, y: 0.2533 },
  A33: { x: 0.2652, y: 0.2532 },
  A34: { x: 0.2774, y: 0.2532 },
  A35: { x: 0.2900, y: 0.2530 },
  A36: { x: 0.3034, y: 0.2531 },
  A37: { x: 0.3152, y: 0.2530 },
  A38: { x: 0.3272, y: 0.2532 },
  A39: { x: 0.3400, y: 0.2531 },
  A40: { x: 0.3525, y: 0.2530 },
  A41: { x: 0.3649, y: 0.2532 },
  A42: { x: 0.3784, y: 0.2534 },
  A43: { x: 0.3902, y: 0.2533 },
  A44: { x: 0.4029, y: 0.2531 },

  // ── Type-B: 24 panels ────────────────────────────────────────────────────
  // B24–B3: left wall below A1, top → bottom (schedule at y > 1.0 clamped)
  B24: { x: 0.0915, y: 0.6257 },
  B23: { x: 0.0917, y: 0.6435 },
  B22: { x: 0.0917, y: 0.6611 },
  B21: { x: 0.0917, y: 0.6788 },
  B20: { x: 0.0917, y: 0.6964 },
  B19: { x: 0.0916, y: 0.7133 },
  B18: { x: 0.0915, y: 0.7320 },
  B17: { x: 0.0915, y: 0.7493 },
  B16: { x: 0.0915, y: 0.7665 },
  B15: { x: 0.0916, y: 0.7836 },
  B14: { x: 0.0917, y: 0.8001 },
  B13: { x: 0.0916, y: 0.8090 },
  B12: { x: 0.0916, y: 0.8229 },
  B11: { x: 0.0916, y: 0.8406 },
  B10: { x: 0.0917, y: 0.8571 },
  B9:  { x: 0.0917, y: 0.8771 },
  B8:  { x: 0.0916, y: 0.8937 },
  B7:  { x: 0.0916, y: 0.9116 },
  B6:  { x: 0.0917, y: 0.9298 },
  B5:  { x: 0.0916, y: 0.9478 },
  B4:  { x: 0.0916, y: 0.9647 },
  B3:  { x: 0.0916, y: 0.9828 },
  B2:  { x: 0.0919, y: 0.997  }, // y=1.000 in PDF — clamped
  B1:  { x: 0.0917, y: 0.997  }, // y=1.018 in PDF — clamped

  // ── Type-C: 39 panels ────────────────────────────────────────────────────
  // C1–C31: right vertical section (top → bottom); C32–C39 clamped
  C1:  { x: 0.4125, y: 0.4711 },
  C2:  { x: 0.4124, y: 0.4886 },
  C3:  { x: 0.4123, y: 0.5059 },
  C4:  { x: 0.4123, y: 0.5241 },
  C5:  { x: 0.4125, y: 0.5416 },
  C6:  { x: 0.4127, y: 0.5587 },
  C7:  { x: 0.4123, y: 0.5766 },
  C8:  { x: 0.4125, y: 0.5942 },
  C9:  { x: 0.4124, y: 0.6124 },
  C10: { x: 0.4127, y: 0.6305 },
  C11: { x: 0.4126, y: 0.6481 },
  C12: { x: 0.4128, y: 0.6656 },
  C13: { x: 0.4126, y: 0.6826 },
  C14: { x: 0.4127, y: 0.6985 },
  C15: { x: 0.4126, y: 0.7163 },
  C16: { x: 0.4126, y: 0.7360 },
  C17: { x: 0.4124, y: 0.7543 },
  C18: { x: 0.4125, y: 0.7715 },
  C19: { x: 0.4126, y: 0.7897 },
  C20: { x: 0.4126, y: 0.8070 },
  C21: { x: 0.4124, y: 0.8237 },
  C22: { x: 0.4126, y: 0.8423 },
  C23: { x: 0.4123, y: 0.8580 },
  C24: { x: 0.4126, y: 0.8753 },
  C25: { x: 0.4125, y: 0.8930 },
  C26: { x: 0.4125, y: 0.9099 },
  C27: { x: 0.4126, y: 0.9287 },
  C28: { x: 0.4125, y: 0.9480 },
  C29: { x: 0.4124, y: 0.9652 },
  C30: { x: 0.4123, y: 0.9832 },
  C31: { x: 0.4126, y: 0.9976 },
  C32: { x: 0.4124, y: 0.997  }, // y=1.018 clamped
  C33: { x: 0.4025, y: 0.997  }, // y=1.031 clamped; x varies (bottom wall)
  C34: { x: 0.3903, y: 0.997  },
  C35: { x: 0.3785, y: 0.997  },
  C36: { x: 0.3662, y: 0.997  },
  C37: { x: 0.3538, y: 0.997  },
  C38: { x: 0.3413, y: 0.997  },
  C39: { x: 0.3305, y: 0.997  },

  // ── Type-D: 19 panels ────────────────────────────────────────────────────
  // All D panels are in the schedule table below page boundary — clamped to y=0.997
  // x values from PDF extraction (D1–D16, D18–D19; no D17 in drawing)
  D1:  { x: 0.1008, y: 0.997 },
  D2:  { x: 0.1134, y: 0.997 },
  D3:  { x: 0.1257, y: 0.997 },
  D4:  { x: 0.1387, y: 0.997 },
  D5:  { x: 0.1508, y: 0.997 },
  D6:  { x: 0.1632, y: 0.997 },
  D7:  { x: 0.1755, y: 0.997 },
  D8:  { x: 0.1888, y: 0.997 },
  D9:  { x: 0.2002, y: 0.997 },
  D10: { x: 0.2133, y: 0.997 },
  D11: { x: 0.2255, y: 0.997 },
  D12: { x: 0.2381, y: 0.997 },
  D13: { x: 0.2503, y: 0.997 },
  D14: { x: 0.2626, y: 0.997 },
  D15: { x: 0.2753, y: 0.997 },
  D16: { x: 0.2877, y: 0.997 },
  D17: { x: 0.3000, y: 0.997 }, // not in PDF text; interpolated between D16/D18
  D18: { x: 0.3122, y: 0.997 },
  D19: { x: 0.3218, y: 0.997 },

  // ── Type-L: 2 link panels ────────────────────────────────────────────────
  // Both outside page boundary — clamped
  L1: { x: 0.0939, y: 0.997 },
  L2: { x: 0.4115, y: 0.997 },
};

/** All panel IDs grouped by type, in order. */
export const PANELS_BY_TYPE: Record<PanelType, string[]> = {
  A: Array.from({ length: 44 }, (_, i) => `A${i + 1}`),
  B: Array.from({ length: 24 }, (_, i) => `B${i + 1}`),
  C: Array.from({ length: 39 }, (_, i) => `C${i + 1}`),
  D: Array.from({ length: 19 }, (_, i) => `D${i + 1}`),
  L: ["L1", "L2"],
};

/** Total number of panels in the wall. */
export const TOTAL_PANELS = Object.values(PANELS_BY_TYPE).reduce(
  (s, arr) => s + arr.length,
  0
);
