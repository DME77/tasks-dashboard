export interface PourBox { key: string; x0: number; y0: number; x1: number; y1: number; }

// Zone keys from new drawing labels (match these to ASAP sub-area names if different)
// Zones found: ['NT, Pour - 5', 'NT, Pour - 6', 'NTP - 1', 'NTP - 1A', 'NTP - 1B', 'NTP - 2', 'NTP - 3', 'NTP - 4', 'NTP - 4A', 'NTP - 5', 'NTP - 6', 'NTP - 7', 'TP - 1', 'TP - 2', 'TP - 3']
export const RAFT_HGP_POUR_BOXES: PourBox[] = [
  { key: "NTP - 2", x0: 0.7018, y0: 0.64, x1: 0.8018, y1: 0.69 },
  { key: "NTP - 4", x0: 0.9135, y0: 0.5587, x1: 1, y1: 0.6087 },
  { key: "TP - 2", x0: 0.8134, y0: 0.5799, x1: 0.9134, y1: 0.6299 },
  { key: "NTP - 1", x0: 0.704, y0: 0.4982, x1: 0.804, y1: 0.5482 },
  { key: "NTP - 1A", x0: 0.7072, y0: 0.4531, x1: 0.8072, y1: 0.5031 },
  { key: "NTP - 4A", x0: 0.8476, y0: 0.4562, x1: 0.9476, y1: 0.5062 },
  { key: "TP - 1", x0: 0.8082, y0: 0.5028, x1: 0.9082, y1: 0.5528 },
  { key: "TP - 3", x0: 0.8207, y0: 0.6578, x1: 0.9207, y1: 0.7078 },
  { key: "NTP - 1", x0: 0.579, y0: 0.4959, x1: 0.679, y1: 0.5459 },
  { key: "NTP - 1A", x0: 0.5785, y0: 0.4527, x1: 0.6785, y1: 0.5027 },
  { key: "NTP - 3", x0: 0.4548, y0: 0.5945, x1: 0.5548, y1: 0.6445 },
  { key: "NTP - 5", x0: 0.3152, y0: 0.5968, x1: 0.4152, y1: 0.6468 },
  { key: "NTP - 7", x0: 0.312, y0: 0.4918, x1: 0.412, y1: 0.5418 },
  { key: "NTP - 6", x0: 0.4484, y0: 0.4962, x1: 0.5484, y1: 0.5462 },
  { key: "NTP - 1", x0: 0.1402, y0: 0.546, x1: 0.2402, y1: 0.596 },
  { key: "NTP - 3", x0: 0.0001, y0: 0.5668, x1: 0.1001, y1: 0.6168 },
  { key: "NT, Pour - 5", x0: 0.9114, y0: 0.6192, x1: 1, y1: 0.6692 },
  { key: "NT, Pour - 6", x0: 0.9091, y0: 0.6739, x1: 1, y1: 0.7239 },
  { key: "NTP - 1B", x0: 0.5787, y0: 0.5992, x1: 0.6787, y1: 0.6492 },
];
