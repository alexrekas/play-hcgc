// Strokes Gained calculator based on PGA Tour baseline expected strokes
// Reference: Mark Broadie's "Every Shot Counts" tables (simplified / interpolated)

import type { LieType } from "@/types";

// Expected strokes from tee to hole-out (tee shot baseline by par)
const ES_TEE: Record<3 | 4 | 5, number> = {
  3: 3.00,  // par 3 tee
  4: 4.00,  // par 4 tee
  5: 5.00,  // par 5 tee
};

// Expected strokes from fairway as a function of distance to pin (yards)
// Piecewise-linear PGA baseline
const FAIRWAY_TABLE: Array<[number, number]> = [
  [5,   2.00],
  [10,  2.18],
  [20,  2.40],
  [40,  2.60],
  [60,  2.70],
  [80,  2.75],
  [100, 2.80],
  [120, 2.85],
  [140, 2.91],
  [160, 2.98],
  [180, 3.05],
  [200, 3.19],
  [220, 3.31],
  [250, 3.54],
  [300, 3.80],
  [400, 4.20],
  [550, 4.90],
];

// On-green expected strokes (distance to hole in FEET)
const GREEN_TABLE: Array<[number, number]> = [
  [1,  1.00],
  [3,  1.05],
  [5,  1.22],
  [10, 1.54],
  [15, 1.70],
  [20, 1.81],
  [30, 1.95],
  [45, 2.08],
  [60, 2.20],
  [90, 2.40],
];

function interp(table: Array<[number, number]>, x: number): number {
  if (x <= table[0][0]) return table[0][1];
  if (x >= table[table.length - 1][0]) return table[table.length - 1][1];
  for (let i = 0; i < table.length - 1; i++) {
    const [x1, y1] = table[i];
    const [x2, y2] = table[i + 1];
    if (x >= x1 && x <= x2) {
      const t = (x - x1) / (x2 - x1);
      return y1 + (y2 - y1) * t;
    }
  }
  return table[table.length - 1][1];
}

export function expectedStrokes(lie: LieType, distanceYards: number, par?: 3 | 4 | 5): number {
  if (lie === "tee") {
    return par ? ES_TEE[par] : 4.0;
  }
  if (lie === "green") {
    // distance is in yards — convert to feet
    const feet = distanceYards * 3;
    return interp(GREEN_TABLE, feet);
  }
  if (lie === "fringe") {
    // Fringe ≈ just off the green: slightly harder than a putt.
    const feet = distanceYards * 3;
    return interp(GREEN_TABLE, feet) + 0.15;
  }
  const base = interp(FAIRWAY_TABLE, distanceYards);
  switch (lie) {
    case "fairway": return base;
    case "rough":   return base + 0.14;
    case "bunker":  return base + 0.22;
    case "water":   return base + 1.0;  // includes the penalty stroke impact
    case "ob":      return base + 1.0;
    default:        return base;
  }
}

// Strokes Gained = ES_before − ES_after − 1 (for the stroke taken)
// If hole-out, ES_after = 0
export function strokesGained(
  lieBefore: LieType,
  distanceBefore: number,
  lieAfter: LieType,
  distanceAfter: number,
  holeOut: boolean,
  par?: 3 | 4 | 5
): number {
  const esBefore = expectedStrokes(lieBefore, distanceBefore, par);
  const esAfter  = holeOut ? 0 : expectedStrokes(lieAfter, distanceAfter, par);
  return Math.round((esBefore - esAfter - 1) * 100) / 100;
}
