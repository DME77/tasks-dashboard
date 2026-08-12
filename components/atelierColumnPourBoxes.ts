/**
 * Pour-box coordinates for Homeland Atelier COLUMN drawings (B2 / B1 / GF).
 * All three levels share the same structural plan (same column layout).
 *
 * Coordinates are in normalised landscape image space (0–1 × 0–1).
 * The column PDFs are portrait A4 with rotation=270; we apply the correct
 * transform:  landscape_x = portrait_y / 842
 *             landscape_y = (595 − portrait_x) / 595
 *
 * The plan is divided into 3 vertical columns × 3 horizontal rows = 8 pours:
 *
 *   LEFT col  (cx 0.07–0.37)  →  Pour-4 (top)  +  Pour-3  (bottom)
 *   CENTER col (cx 0.38–0.62) →  Pour-2B (top) +  Pour-2A (mid) + Pour-1 (bottom)
 *   RIGHT col  (cx 0.63–0.92) →  Pour-6B (top) +  Pour-6A (mid) + Pour-5 (bottom)
 *
 * Label positions verified from fitz extraction + rotation transform:
 *   Pour-3: cx=0.246, cy=0.602   Pour-4:  cx=0.297, cy=0.368
 *   Pour-2B: cx=0.502, cy=0.316  Pour-2A: cx=0.510, cy=0.437  Pour-1: cx=0.543, cy=0.632
 *   Pour-6B: cx=0.839, cy=0.220  Pour-6A: cx=0.751, cy=0.466  Pour-5: cx=0.714, cy=0.664
 */

export interface PourBox {
  key: string;   // matches SubArea.subAreaName from ASAP DB
  x0: number; y0: number; x1: number; y1: number;
}

// Column boundaries (landscape x)
const LEFT_X0  = 0.07, LEFT_X1  = 0.37;
const MID_X0   = 0.38, MID_X1   = 0.62;
const RIGHT_X0 = 0.63, RIGHT_X1 = 0.92;

// Row boundaries (landscape y)
const TOP_Y0    = 0.14;
const TOP_Y1    = 0.50;   // boundary between Pour-4 and Pour-3 (left col)
const MID2B_Y1  = 0.37;   // boundary between Pour-2B and Pour-2A
const MID2A_Y1  = 0.53;   // boundary between Pour-2A and Pour-1
const MID6B_Y1  = 0.34;   // boundary between Pour-6B and Pour-6A
const MID6A_Y1  = 0.57;   // boundary between Pour-6A and Pour-5
const BOT_Y1    = 0.90;

export const ATELIER_COLUMN_POUR_BOXES: PourBox[] = [
  // LEFT column
  { key: "Pour - 4",  x0: LEFT_X0,  y0: TOP_Y0,   x1: LEFT_X1,  y1: TOP_Y1   },
  { key: "Pour - 3",  x0: LEFT_X0,  y0: TOP_Y1,   x1: LEFT_X1,  y1: BOT_Y1   },

  // CENTER column
  { key: "Pour - 2B", x0: MID_X0,   y0: TOP_Y0,   x1: MID_X1,   y1: MID2B_Y1 },
  { key: "Pour - 2A", x0: MID_X0,   y0: MID2B_Y1, x1: MID_X1,   y1: MID2A_Y1 },
  { key: "Pour - 1",  x0: MID_X0,   y0: MID2A_Y1, x1: MID_X1,   y1: BOT_Y1   },

  // RIGHT column
  { key: "Pour - 6B", x0: RIGHT_X0, y0: TOP_Y0,   x1: RIGHT_X1, y1: MID6B_Y1 },
  { key: "Pour - 6A", x0: RIGHT_X0, y0: MID6B_Y1, x1: RIGHT_X1, y1: MID6A_Y1 },
  { key: "Pour - 5",  x0: RIGHT_X0, y0: MID6A_Y1, x1: RIGHT_X1, y1: BOT_Y1   },
];
