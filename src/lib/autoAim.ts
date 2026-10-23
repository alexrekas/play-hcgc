import type { TeeName } from "@/data/course";
import { detectLie, isTeeBox, greenCenter } from "@/lib/lieDetect";
import { pinPosition, yardsPerUnit } from "@/lib/holeGeometry";
import { CANVAS_W, CANVAS_H } from "@/data/holeLayouts";

// Where the aim marker starts before the player taps the map.
//
//   • 200 yards or less to the pin → the center of the green.
//   • Further out → the middle of the fairway at the club's average distance
//     (Driver off the tee on a long hole). If the fairway doesn't reach that
//     far, the aim shortens to the last bit of fairway it does reach.
//
// The player can always tap the map to aim somewhere else.

type Pt = { x: number; y: number };

export const GREEN_AIM_YARDS = 200;

export type AutoAim = { point: Pt; kind: "green" | "fairway" | "line" };

export function autoAim(
  hole: number,
  tee: TeeName,
  from: Pt,
  yardsToPin: number,
  clubYards: number,
): AutoAim | null {
  const pin = pinPosition(hole);
  const ypu = yardsPerUnit(hole, tee);
  if (!pin || !ypu) return null;

  if (yardsToPin <= GREEN_AIM_YARDS) {
    return { point: greenCenter(hole) ?? pin, kind: "green" };
  }

  // Direction to the pin, in canvas units.
  const fx = from.x * CANVAS_W, fy = from.y * CANVAS_H;
  const toPin = Math.atan2(pin.x * CANVAS_W - fx, pin.y * CANVAS_H - fy);
  const at = (yards: number, ang: number): Pt => {
    const r = yards / ypu;
    return { x: (fx + Math.sin(ang) * r) / CANVAS_W, y: (fy + Math.cos(ang) * r) / CANVAS_H };
  };
  const onFairway = (p: Pt) =>
    p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 &&
    detectLie(hole, p) === "fairway" && !isTeeBox(hole, p);

  // Sweep an arc at the club's distance; take the middle of the widest run
  // of fairway. Shorten the distance in steps if the arc misses the fairway.
  const target = Math.min(clubYards, yardsToPin - 10);
  for (let d = target; d >= target * 0.6; d -= 5) {
    let best: [number, number] | null = null;
    let runStart: number | null = null;
    const step = Math.PI / 360; // 0.5°
    for (let a = -Math.PI / 2; a <= Math.PI / 2 + step; a += step) {
      const hit = a <= Math.PI / 2 && onFairway(at(d, toPin + a));
      if (hit && runStart === null) runStart = a;
      if (!hit && runStart !== null) {
        if (!best || a - runStart > best[1] - best[0]) best = [runStart, a];
        runStart = null;
      }
    }
    if (best) return { point: at(d, toPin + (best[0] + best[1]) / 2), kind: "fairway" };
  }
  // No fairway in reach: straight at the pin, club distance.
  return { point: at(target, toPin), kind: "line" };
}
