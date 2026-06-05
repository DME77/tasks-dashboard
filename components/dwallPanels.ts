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
 * ──────────────────────────────────────────────────────────────────────── */

/** Background drawing image (rendered from the R2 layout PDF). */
export const DWALL_IMAGE = "/drawings/dwall-layout.png";

/** Native pixel size of the drawing image — used to keep the overlay aligned. */
export const DWALL_IMAGE_W = 3309;
export const DWALL_IMAGE_H = 2339;

export type PanelType = "A" | "B" | "C" | "D" | "L";
export interface PanelCoord { x: number; y: number }

/** Normalized (0–1) centre position of every panel label on the drawing. */
export const PANEL_COORDS: Record<string, PanelCoord> = {
  A1: { x: 0.4754, y: 0.8632 },
  A2: { x: 0.4558, y: 0.8632 },
  A3: { x: 0.436, y: 0.8634 },
  A4: { x: 0.4149, y: 0.8639 },
  A5: { x: 0.3959, y: 0.8638 },
  A6: { x: 0.378, y: 0.8641 },
  A7: { x: 0.3567, y: 0.8631 },
  A8: { x: 0.3373, y: 0.8634 },
  A9: { x: 0.3191, y: 0.8629 },
  A10: { x: 0.2991, y: 0.863 },
  A11: { x: 0.28, y: 0.8633 },
  A12: { x: 0.2594, y: 0.8633 },
  A13: { x: 0.2319, y: 0.8594 },
  A14: { x: 0.2319, y: 0.8667 },
  A15: { x: 0.2076, y: 0.8815 },
  A16: { x: 0.2164, y: 0.8492 },
  A17: { x: 0.2062, y: 0.835 },
  A18: { x: 0.1885, y: 0.8121 },
  A19: { x: 0.1747, y: 0.7925 },
  A20: { x: 0.1606, y: 0.7709 },
  A21: { x: 0.1473, y: 0.7522 },
  A22: { x: 0.1333, y: 0.7334 },
  A23: { x: 0.1197, y: 0.7151 },
  A24: { x: 0.1097, y: 0.6992 },
  A25: { x: 0.0973, y: 0.6836 },
  A26: { x: 0.0898, y: 0.6717 },
  A27: { x: 0.0898, y: 0.6528 },
  A28: { x: 0.0897, y: 0.6266 },
  A29: { x: 0.0897, y: 0.5983 },
  A30: { x: 0.0897, y: 0.5708 },
  A31: { x: 0.0904, y: 0.542 },
  A32: { x: 0.0899, y: 0.5146 },
  A33: { x: 0.0897, y: 0.4873 },
  A34: { x: 0.0898, y: 0.4602 },
  A35: { x: 0.0895, y: 0.4322 },
  A36: { x: 0.0896, y: 0.4026 },
  A37: { x: 0.0895, y: 0.3764 },
  A38: { x: 0.0897, y: 0.3498 },
  A39: { x: 0.0896, y: 0.3216 },
  A40: { x: 0.0895, y: 0.2938 },
  A41: { x: 0.0903, y: 0.2666 },
  A42: { x: 0.09, y: 0.2366 },
  A43: { x: 0.0899, y: 0.2106 },
  A44: { x: 0.0896, y: 0.1824 },
  B1: { x: 0.9291, y: 0.8631 },
  B2: { x: 0.9089, y: 0.8628 },
  B3: { x: 0.8894, y: 0.8632 },
  B4: { x: 0.8696, y: 0.8634 },
  B5: { x: 0.8506, y: 0.8632 },
  B6: { x: 0.8307, y: 0.8631 },
  B7: { x: 0.8107, y: 0.8634 },
  B8: { x: 0.7908, y: 0.8632 },
  B9: { x: 0.7725, y: 0.8631 },
  B10: { x: 0.7503, y: 0.863 },
  B11: { x: 0.7325, y: 0.8633 },
  B12: { x: 0.7124, y: 0.8631 },
  B13: { x: 0.698, y: 0.8855 },
  B14: { x: 0.6873, y: 0.8632 },
  B15: { x: 0.6688, y: 0.8631 },
  B16: { x: 0.65, y: 0.8633 },
  B17: { x: 0.6309, y: 0.8636 },
  B18: { x: 0.6118, y: 0.8635 },
  B19: { x: 0.591, y: 0.8631 },
  B20: { x: 0.5723, y: 0.8631 },
  B21: { x: 0.5534, y: 0.8632 },
  B22: { x: 0.5332, y: 0.8632 },
  B23: { x: 0.5137, y: 0.8631 },
  B24: { x: 0.4941, y: 0.8634 },
  C1: { x: 0.3233, y: 0.1649 },
  C2: { x: 0.3423, y: 0.165 },
  C3: { x: 0.3614, y: 0.1652 },
  C4: { x: 0.3815, y: 0.1652 },
  C5: { x: 0.4009, y: 0.1649 },
  C6: { x: 0.4199, y: 0.1643 },
  C7: { x: 0.4397, y: 0.1652 },
  C8: { x: 0.4592, y: 0.1649 },
  C9: { x: 0.4794, y: 0.1649 },
  C10: { x: 0.4994, y: 0.1643 },
  C11: { x: 0.5194, y: 0.1647 },
  C12: { x: 0.5384, y: 0.1643 },
  C13: { x: 0.5659, y: 0.168 },
  C14: { x: 0.5659, y: 0.161 },
  C15: { x: 0.5944, y: 0.1644 },
  C16: { x: 0.6163, y: 0.1647 },
  C17: { x: 0.6365, y: 0.165 },
  C18: { x: 0.6556, y: 0.1649 },
  C19: { x: 0.6757, y: 0.1646 },
  C20: { x: 0.6949, y: 0.1647 },
  C21: { x: 0.7139, y: 0.165 },
  C22: { x: 0.7427, y: 0.1686 },
  C23: { x: 0.7427, y: 0.1614 },
  C24: { x: 0.7705, y: 0.1647 },
  C25: { x: 0.7902, y: 0.1648 },
  C26: { x: 0.8088, y: 0.1648 },
  C27: { x: 0.8297, y: 0.1647 },
  C28: { x: 0.8512, y: 0.1649 },
  C29: { x: 0.8702, y: 0.165 },
  C30: { x: 0.89, y: 0.1652 },
  C31: { x: 0.9091, y: 0.1647 },
  C32: { x: 0.9278, y: 0.165 },
  C33: { x: 0.9335, y: 0.1831 },
  C34: { x: 0.9333, y: 0.2101 },
  C35: { x: 0.9333, y: 0.2363 },
  C36: { x: 0.9333, y: 0.2635 },
  C37: { x: 0.9335, y: 0.291 },
  C38: { x: 0.9333, y: 0.3186 },
  C39: { x: 0.9337, y: 0.3426 },
  D1: { x: 0.937, y: 0.8517 },
  D2: { x: 0.9362, y: 0.8234 },
  D3: { x: 0.9366, y: 0.7962 },
  D4: { x: 0.9364, y: 0.7672 },
  D5: { x: 0.9362, y: 0.7405 },
  D6: { x: 0.9363, y: 0.713 },
  D7: { x: 0.9367, y: 0.6859 },
  D8: { x: 0.9335, y: 0.6561 },
  D9: { x: 0.933, y: 0.631 },
  D10: { x: 0.9337, y: 0.6021 },
  D11: { x: 0.9338, y: 0.5753 },
  D12: { x: 0.9332, y: 0.5474 },
  D13: { x: 0.9332, y: 0.5202 },
  D14: { x: 0.9333, y: 0.4927 },
  D15: { x: 0.9334, y: 0.4648 },
  D16: { x: 0.9332, y: 0.4372 },
  D17: { x: 0.9339, y: 0.4089 },
  D18: { x: 0.9334, y: 0.3831 },
  D19: { x: 0.9337, y: 0.3618 },
  L1: { x: 0.9409, y: 0.8665 },
  L2: { x: 0.9548, y: 0.1615 },
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
