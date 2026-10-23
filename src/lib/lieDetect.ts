import type { LieType } from "@/types";
import { LIE_MAPS, LIE_GRID_W, LIE_GRID_H } from "@/data/lieMaps";

// Guesses the lie at a point on a hole map, using the grids generated from the
// hole artwork by scripts/build-lie-maps.py. Used only to PRE-SELECT the lie
// button after a shot — the player always confirms or changes it.

const CODE_TO_LIE: Record<string, LieType> = {
  r: "rough",
  f: "fairway",
  t: "fairway",   // tee box — plays like fairway
  g: "green",
  e: "fringe",
  s: "bunker",
  w: "water",
  o: "ob",
};

const decoded = new Map<number, string>();

function grid(hole: number): string | null {
  const cached = decoded.get(hole);
  if (cached) return cached;
  const rle = LIE_MAPS[hole];
  if (!rle) return null;
  let out = "";
  for (const m of rle.matchAll(/(\d*)([a-z])/g)) {
    out += m[2].repeat(m[1] ? parseInt(m[1], 10) : 1);
  }
  if (out.length !== LIE_GRID_W * LIE_GRID_H) return null;
  decoded.set(hole, out);
  return out;
}

/**
 * @param hole  hole number 1–18
 * @param pos   engine-normalized coords (x 0..1, y 0 = tee end, 1 = green end)
 * @returns the lie under that point, or null if the hole has no map.
 */
export function detectLie(hole: number, pos: { x: number; y: number } | null): LieType | null {
  if (!pos) return null;
  const g = grid(hole);
  if (!g) return null;
  const gx = Math.min(LIE_GRID_W - 1, Math.max(0, Math.floor(pos.x * LIE_GRID_W)));
  const gy = Math.min(LIE_GRID_H - 1, Math.max(0, Math.floor((1 - pos.y) * LIE_GRID_H)));
  return CODE_TO_LIE[g[gy * LIE_GRID_W + gx]] ?? null;
}

/** True if the point is on a tee box (which otherwise reads as fairway). */
export function isTeeBox(hole: number, pos: { x: number; y: number }): boolean {
  const g = grid(hole);
  if (!g) return false;
  const gx = Math.min(LIE_GRID_W - 1, Math.max(0, Math.floor(pos.x * LIE_GRID_W)));
  const gy = Math.min(LIE_GRID_H - 1, Math.max(0, Math.floor((1 - pos.y) * LIE_GRID_H)));
  return g[gy * LIE_GRID_W + gx] === "t";
}
