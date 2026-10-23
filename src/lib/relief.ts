import type { LieType, ReliefOption } from "@/types";
import type { TeeName } from "@/data/course";
import { detectLie, isTeeBox } from "@/lib/lieDetect";
import { pinPosition, yardsPerUnit, canvasDistance } from "@/lib/holeGeometry";
import { CANVAS_W, CANVAS_H } from "@/data/holeLayouts";

// Penalty relief for water and out of bounds, simplified from the Rules of
// Golf (Rules 17 and 18, plus Local Rule E-5) to fit a map you tap on.
//
//   Water (penalty area), 1 stroke:
//     • rehit         — replay from where the last shot was played
//     • back-on-line  — drop on the line from the flag through where the ball
//                       crossed into the water, any distance back
//     • lateral       — (red stakes) drop within two club-lengths of where it
//                       crossed, no nearer the hole
//   Out of bounds:
//     • rehit         — stroke and distance, 1 stroke
//     • ob-drop       — Local Rule E-5, 2 strokes: drop between where it went
//                       out and the nearest fairway, no nearer the hole

type Pt = { x: number; y: number };

export const RELIEF_PENALTY: Record<ReliefOption, number> = {
  "rehit": 1,
  "back-on-line": 1,
  "lateral": 1,
  "ob-drop": 2,
};

/** Two club-lengths, in yards (a driver is ~45"). */
const TWO_CLUB_LENGTHS_YDS = 2.5;

export function isInPlay(lie: LieType | null): boolean {
  return lie !== null && lie !== "water" && lie !== "ob";
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function onMap(p: Pt): boolean {
  return p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
}

/** Unit vector from a to b in canvas units, returned as a normalized-coord step of 1 canvas unit. */
function unitStep(a: Pt, b: Pt): Pt {
  const dx = (b.x - a.x) * CANVAS_W, dy = (b.y - a.y) * CANVAS_H;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len / CANVAS_W, y: dy / len / CANVAS_H };
}

/**
 * Where the shot crossed into the hazard: walk the flight line from `from`
 * to `landing`. `entry` is the first point inside the hazard, `edge` the last
 * point in play before it (the reference point for drops).
 */
export function findCrossing(hole: number, from: Pt, landing: Pt, hazard: "water" | "ob") {
  const N = 240;
  let prevInPlay: Pt | null = null;
  for (let i = 0; i <= N; i++) {
    const p = lerp(from, landing, i / N);
    const lie = detectLie(hole, p);
    if (lie === hazard || (hazard === "ob" && !onMap(p))) {
      return { entry: p, edge: prevInPlay ?? from };
    }
    if (isInPlay(lie)) prevInPlay = p;
  }
  // The player called it water/OB but the map disagrees: use the landing
  // spot, with the nearest in-play point back along the line as the edge.
  return { entry: landing, edge: prevInPlay ?? from };
}

export type DropZone =
  | { kind: "line"; a: Pt; b: Pt }          // allowed anywhere on this segment
  | { kind: "circle"; c: Pt; r: number };   // r in canvas units

export interface ReliefPlan {
  option: ReliefOption;
  zone: DropZone | null;   // null for rehit
  defaultSpot: Pt;
  /** Move a tapped point to the nearest allowed drop spot. */
  snap: (p: Pt) => Pt;
}

interface PlanInput {
  hole: number;
  tee: TeeName;
  option: ReliefOption;
  from: Pt;          // where the penalised shot was played from
  landing: Pt;       // where it ended up (in the water / OB)
  hazard: "water" | "ob";
}

export function planRelief({ hole, tee, option, from, landing, hazard }: PlanInput): ReliefPlan {
  const pin = pinPosition(hole) ?? { x: 0.5, y: 1 };
  const { entry, edge } = findCrossing(hole, from, landing, hazard);
  const inPlay = (p: Pt) => onMap(p) && isInPlay(detectLie(hole, p));
  const notNearer = (p: Pt) => canvasDistance(p, pin) >= canvasDistance(edge, pin) - 0.5;

  if (option === "rehit") {
    return { option, zone: null, defaultSpot: from, snap: () => from };
  }

  if (option === "back-on-line") {
    // Line from the flag through the entry point, continuing away from the hole.
    const step = unitStep(pin, entry);
    const at = (t: number): Pt => ({ x: entry.x + step.x * t, y: entry.y + step.y * t });
    let tMax = 0;
    while (onMap(at(tMax + 1)) && tMax < 2000) tMax++;
    let tStart = 0;
    while (tStart < tMax && !inPlay(at(tStart))) tStart++;
    const a = at(tStart), b = at(tMax);
    const snap = (p: Pt): Pt => {
      const dx = (p.x - entry.x) * CANVAS_W, dy = (p.y - entry.y) * CANVAS_H;
      const sx = step.x * CANVAS_W, sy = step.y * CANVAS_H;
      let t = Math.max(tStart, Math.min(tMax, Math.round(dx * sx + dy * sy)));
      // Never drop in the hazard: slide further back until in play.
      while (t < tMax && !inPlay(at(t))) t++;
      return inPlay(at(t)) ? at(t) : a;
    };
    return { option, zone: { kind: "line", a, b }, defaultSpot: a, snap };
  }

  if (option === "lateral") {
    const ypu = yardsPerUnit(hole, tee) ?? 0.5;
    const r = TWO_CLUB_LENGTHS_YDS / ypu;
    const ok = (p: Pt) => inPlay(p) && notNearer(p) && canvasDistance(p, edge) <= r + 0.01;
    const snap = (p: Pt): Pt => {
      // Clamp into the circle, then search nearby for the closest allowed spot.
      const d = canvasDistance(p, edge);
      const q = d > r ? lerp(edge, p, r / d) : p;
      if (ok(q)) return q;
      let best = edge, bestD = Infinity;
      for (let ang = 0; ang < 360; ang += 15) {
        for (const f of [1, 0.66, 0.33]) {
          const c = {
            x: edge.x + (Math.sin((ang * Math.PI) / 180) * r * f) / CANVAS_W,
            y: edge.y + (Math.cos((ang * Math.PI) / 180) * r * f) / CANVAS_H,
          };
          if (ok(c)) {
            const dd = canvasDistance(c, q);
            if (dd < bestD) { bestD = dd; best = c; }
          }
        }
      }
      return best;
    };
    return { option, zone: { kind: "circle", c: edge, r }, defaultSpot: snap(edge), snap };
  }

  // ob-drop (Local Rule E-5): between where it went out and the nearest
  // fairway point that is no nearer the hole.
  let fairway: Pt | null = null, bestD = Infinity;
  for (let y = 0; y < CANVAS_H; y += 2) {
    for (let x = 0; x < CANVAS_W; x += 2) {
      const p = { x: x / CANVAS_W, y: 1 - y / CANVAS_H };
      if (detectLie(hole, p) !== "fairway" || isTeeBox(hole, p) || !notNearer(p)) continue;
      const d = canvasDistance(p, edge);
      if (d < bestD) { bestD = d; fairway = p; }
    }
  }
  if (!fairway) {
    // No fairway behind where it went out: drop within two club-lengths of
    // that spot, no nearer the hole (same area as a sideways water drop).
    return { ...planRelief({ hole, tee, option: "lateral", from, landing, hazard }), option };
  }
  const a = edge, b = fairway;
  const snap = (p: Pt): Pt => {
    const vx = (b.x - a.x) * CANVAS_W, vy = (b.y - a.y) * CANVAS_H;
    const len2 = vx * vx + vy * vy;
    if (len2 === 0) return a;
    const t = Math.max(0, Math.min(1, (((p.x - a.x) * CANVAS_W) * vx + ((p.y - a.y) * CANVAS_H) * vy) / len2));
    const q = lerp(a, b, t);
    if (inPlay(q)) return q;
    for (let k = 1; k <= 20; k++) {
      for (const tt of [t + k / 20, t - k / 20]) {
        if (tt >= 0 && tt <= 1 && inPlay(lerp(a, b, tt))) return lerp(a, b, tt);
      }
    }
    return a;
  };
  return { option, zone: { kind: "line", a, b }, defaultSpot: snap(b), snap };
}

/** Lie after dropping at `p` (rough if the map can't tell). */
export function lieAtDrop(hole: number, p: Pt): LieType {
  const lie = detectLie(hole, p);
  return isInPlay(lie) ? (lie as LieType) : "rough";
}

export const RELIEF_LABELS: Record<ReliefOption, { title: string; detail: string }> = {
  "rehit":        { title: "Re-hit",               detail: "Play again from where you last hit" },
  "back-on-line": { title: "Drop back on the line", detail: "Anywhere back on the line from the flag through where it went in" },
  "lateral":      { title: "Drop beside it",        detail: "Within two club-lengths of where it went in (red stakes)" },
  "ob-drop":      { title: "Drop near where it went out", detail: "Local rule: drop toward the fairway, no nearer the hole" },
};

export function reliefOptionsFor(hazard: "water" | "ob"): ReliefOption[] {
  return hazard === "water" ? ["rehit", "back-on-line", "lateral"] : ["rehit", "ob-drop"];
}
