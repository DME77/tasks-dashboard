/* Pour box rectangles (normalized 0–1) on the excavation drawing image.
 * `key` matches the ASAP sub-area name. The boxes are recoloured live on a
 * canvas (green = completed, red = pending) from /api/excavation. */
export interface PourBox { key: string; x0: number; y0: number; x1: number; y1: number; }

export const EXCAVATION_POUR_BOXES: PourBox[] = [
  { key: "Tower Pour - 1", x0: 0.3069, y0: 0.2168, x1: 0.3858, y1: 0.3099 },
  { key: "Tower Pour - 2", x0: 0.2865, y0: 0.4148, x1: 0.3610, y1: 0.4929 },
  { key: "Tower Pour - 3", x0: 0.2962, y0: 0.6778, x1: 0.3774, y1: 0.7334 },
  { key: "NT Pour - 1", x0: 0.1362, y0: 0.1889, x1: 0.2025, y1: 0.2381 },
  { key: "NT Pour - 2", x0: 0.1321, y0: 0.5829, x1: 0.2014, y1: 0.6428 },
  { key: "NT Pour - 3", x0: 0.3413, y0: 0.0921, x1: 0.4083, y1: 0.1463 },
  { key: "NT Pour - 4", x0: 0.4466, y0: 0.3666, x1: 0.5115, y1: 0.4241 },
  { key: "NT Pour - 5", x0: 0.4214, y0: 0.5382, x1: 0.4898, y1: 0.5788 },
  { key: "NT Pour - 6", x0: 0.4396, y0: 0.6855, x1: 0.5094, y1: 0.7307 },
];
