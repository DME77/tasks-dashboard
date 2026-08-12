/**
 * Pour-box coordinates for Homeland Atelier slab drawings (B1 / B2 / GF).
 * All three levels share the same structural layout (same plan, different reinforcement).
 * Boxes are normalised 0-1 relative to the PNG image size (2526 × 3573 px).
 *
 * The drawing is divided into 3 zones:
 *   ZONE-1 (right):  x 0.62–0.99
 *   ZONE-2 (middle): x 0.28–0.62
 *   ZONE-3 (left):   x 0.01–0.27
 * The plan area spans roughly y 0.30–0.78.
 *
 * 8 pours distributed across zones:
 *   ZONE-1: Pour-1, Pour-2A, Pour-2B
 *   ZONE-2: Pour-3, Pour-4
 *   ZONE-3: Pour-5, Pour-6A, Pour-6B
 */

export interface PourBox {
  key: string;  // matches SubArea.subAreaName from ASAP DB
  x0: number; y0: number; x1: number; y1: number;
}

// ZONE-1 (right third, x 0.63–0.99)
// Split vertically into 3 rows for Pour-1, 2A, 2B
const Z1X0 = 0.63, Z1X1 = 0.99;
const Z1Y_ROWS: [number, number][] = [
  [0.55, 0.78],  // Pour - 1   (lower row)
  [0.42, 0.55],  // Pour - 2A  (middle row)
  [0.30, 0.42],  // Pour - 2B  (upper row)
];

// ZONE-2 (middle, x 0.28–0.62)
const Z2X0 = 0.28, Z2X1 = 0.62;
const Z2Y_ROWS: [number, number][] = [
  [0.50, 0.78],  // Pour - 3
  [0.30, 0.50],  // Pour - 4
];

// ZONE-3 (left, x 0.01–0.27)
const Z3X0 = 0.01, Z3X1 = 0.27;
const Z3Y_ROWS: [number, number][] = [
  [0.62, 0.78],  // Pour - 5
  [0.46, 0.62],  // Pour - 6A
  [0.30, 0.46],  // Pour - 6B
];

export const ATELIER_SLAB_POUR_BOXES: PourBox[] = [
  { key: "Pour - 1",  x0: Z1X0, y0: Z1Y_ROWS[0][0], x1: Z1X1, y1: Z1Y_ROWS[0][1] },
  { key: "Pour - 2A", x0: Z1X0, y0: Z1Y_ROWS[1][0], x1: Z1X1, y1: Z1Y_ROWS[1][1] },
  { key: "Pour - 2B", x0: Z1X0, y0: Z1Y_ROWS[2][0], x1: Z1X1, y1: Z1Y_ROWS[2][1] },
  { key: "Pour - 3",  x0: Z2X0, y0: Z2Y_ROWS[0][0], x1: Z2X1, y1: Z2Y_ROWS[0][1] },
  { key: "Pour - 4",  x0: Z2X0, y0: Z2Y_ROWS[1][0], x1: Z2X1, y1: Z2Y_ROWS[1][1] },
  { key: "Pour - 5",  x0: Z3X0, y0: Z3Y_ROWS[0][0], x1: Z3X1, y1: Z3Y_ROWS[0][1] },
  { key: "Pour - 6A", x0: Z3X0, y0: Z3Y_ROWS[1][0], x1: Z3X1, y1: Z3Y_ROWS[1][1] },
  { key: "Pour - 6B", x0: Z3X0, y0: Z3Y_ROWS[2][0], x1: Z3X1, y1: Z3Y_ROWS[2][1] },
];
