import type { TeeName } from "@/data/course";
import { COURSE } from "@/data/course";
import { HOLE_GEOMETRY, type MarkedTee } from "@/data/holeGeometry";
import { CANVAS_W, CANVAS_H } from "@/data/holeLayouts";

// Real-world geometry for each hole, read from the hole artwork
// (scripts/build-hole-geometry.py): where each tee set starts and where the pin is.
//
// Distances are straight-line on the map, scaled per hole AND per tee so that
// the selected tee → pin is exactly that tee's scorecard yardage. (The artwork
// isn't drawn perfectly to scale, so each tee gets its own scale.)

type Pt = { x: number; y: number };

// Diamond tees aren't drawn on the maps; they start from the Black markers and
// play the longer Diamond yardage.
const MARKER_FOR_TEE: Record<TeeName, MarkedTee> = {
  diamond: "black",
  black: "black",
  blue: "blue",
  white: "white",
};

/** Distance between two normalized points, in canvas units (equal scale on both axes). */
function canvasDist(a: Pt, b: Pt): number {
  return Math.hypot((b.x - a.x) * CANVAS_W, (b.y - a.y) * CANVAS_H);
}

export function hasGeometry(hole: number): boolean {
  return !!HOLE_GEOMETRY[hole];
}

export function teePosition(hole: number, tee: TeeName): Pt | null {
  return HOLE_GEOMETRY[hole]?.tees[MARKER_FOR_TEE[tee]] ?? null;
}

export function pinPosition(hole: number): Pt | null {
  return HOLE_GEOMETRY[hole]?.pin ?? null;
}

/** Yards per canvas unit for this hole when played from `tee`. */
export function yardsPerUnit(hole: number, tee: TeeName): number | null {
  const g = HOLE_GEOMETRY[hole];
  const yards = COURSE.holes.find((h) => h.number === hole)?.tees[tee];
  if (!g || !yards) return null;
  const d = canvasDist(g.tees[MARKER_FOR_TEE[tee]], g.pin);
  return d > 0 ? yards / d : null;
}

/** Yards between two points on the hole map. */
export function yardsBetween(hole: number, tee: TeeName, a: Pt, b: Pt): number | null {
  const k = yardsPerUnit(hole, tee);
  return k === null ? null : canvasDist(a, b) * k;
}

/** Yards from a point to the pin. */
export function yardsToPin(hole: number, tee: TeeName, p: Pt): number | null {
  const pin = pinPosition(hole);
  return pin ? yardsBetween(hole, tee, p, pin) : null;
}

/** Aim direction from `from` to `to`, in degrees relative to straight up the map (+ = right). */
export function aimAngleDeg(from: Pt, to: Pt): number {
  return Math.atan2((to.x - from.x) * CANVAS_W, (to.y - from.y) * CANVAS_H) * (180 / Math.PI);
}

/** Distance between two normalized points in canvas units. */
export function canvasDistance(a: Pt, b: Pt): number {
  return canvasDist(a, b);
}
