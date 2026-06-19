/* ════════════════════════════════════════════════════════════════════════════
 * EXCAVATION — Pour overlay positions for Homeland Global Park (HGP tower)
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  Completion status is NOT stored here — it is fetched live from the ASAP
 *  database via /api/excavation. A pour is "done" when its task (under the
 *  matching sub-area in area "Excavation") is marked completed.
 *
 *  x / y are the normalized (0–1) centre positions of each pour label on the
 *  excavation drawing image. `key` matches the ASAP sub-area name exactly.
 * ──────────────────────────────────────────────────────────────────────── */

export interface PourMarker {
  key: string;   // exact ASAP sub-area name
  short: string; // badge label
  label: string; // human label
  x: number;
  y: number;
}

export const EXCAVATION_POURS: PourMarker[] = [
  { key: "Tower Pour - 1", short: "T1", label: "Tower Pour 1", x: 0.519, y: 0.491 },
  { key: "Tower Pour - 2", short: "T2", label: "Tower Pour 2", x: 0.385, y: 0.461 },
  { key: "Tower Pour - 3", short: "T3", label: "Tower Pour 3", x: 0.204, y: 0.481 },
  { key: "NT Pour - 1", short: "N1", label: "NT Pour 1", x: 0.551, y: 0.244 },
  { key: "NT Pour - 2", short: "N2", label: "NT Pour 2", x: 0.270, y: 0.240 },
  { key: "NT Pour - 3", short: "N3", label: "NT Pour 3", x: 0.621, y: 0.537 },
  { key: "NT Pour - 4", short: "N4", label: "NT Pour 4", x: 0.425, y: 0.682 },
  { key: "NT Pour - 5", short: "N5", label: "NT Pour 5", x: 0.305, y: 0.650 },
  { key: "NT Pour - 6", short: "N6", label: "NT Pour 6", x: 0.202, y: 0.678 },
];
