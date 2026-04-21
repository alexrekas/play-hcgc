import type { ShotShape } from "@/types";

// Each icon shows a ball launching from the bottom (tee marker) and
// drawing a flight path to a target up the canvas.
// • Start direction comes from the control-point x of the quadratic curve.
// • Curvature is the offset of that control point sideways from the straight line.
// Canvas is 48×72 — taller than wide, like looking down the fairway.

interface Props {
  shape: ShotShape;
  size?: number;
  className?: string;
  /** Mirror the flight path horizontally — set true for left-handed players so
   * "pull" visually goes right, "push" goes left, etc. */
  mirror?: boolean;
}

// tee x, target x, and curvature — all normalized 0..1 within the SVG.
// Values describe what a RIGHT-handed golfer sees from behind the ball:
//   • "pull" shots end on the RIGHT side of the canvas
//   • "push" shots end on the LEFT side
//   • positive curve = bulge right; negative = bulge left
// Left-handed players pass mirror=true, which reflects target and curve
// around the centerline.
const GEOM: Record<ShotShape, { tx: number; target: number; curve: number }> = {
  "pull-hook":  { tx: 0.5, target: 0.85, curve:  0.35 },
  "pull":       { tx: 0.5, target: 0.75, curve:  0    },
  "pull-slice": { tx: 0.5, target: 0.65, curve: -0.30 },
  "draw":       { tx: 0.5, target: 0.70, curve:  0.20 },
  "straight":   { tx: 0.5, target: 0.50, curve:  0    },
  "fade":       { tx: 0.5, target: 0.30, curve: -0.20 },
  "push-draw":  { tx: 0.5, target: 0.35, curve:  0.30 },
  "push":       { tx: 0.5, target: 0.25, curve:  0    },
  "push-slice": { tx: 0.5, target: 0.15, curve: -0.35 },
};

export default function ShotShapeIcon({ shape, size = 36, className = "", mirror = false }: Props) {
  const g = GEOM[shape];
  const W = 48, H = 64;

  // Mirror horizontally around the centerline when rendering for a LH player.
  const targetNorm = mirror ? 1 - g.target : g.target;
  const curveSign  = mirror ? -g.curve : g.curve;

  const teeX = g.tx * W;
  const teeY = H - 6;
  const targetX = targetNorm * W;
  const targetY = 10;

  // Control point sits at the midpoint of the straight line, pushed sideways
  // by `curve`. Positive curve = bulge right; negative = bulge left.
  const midX = (teeX + targetX) / 2;
  const midY = (teeY + targetY) / 2;
  const cpX = midX + curveSign * W;
  const cpY = midY;

  const path = `M ${teeX} ${teeY} Q ${cpX} ${cpY} ${targetX} ${targetY}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size * 0.6}
      height={size}
      className={className}
      aria-hidden
    >
      {/* fairway backdrop */}
      <rect x={0} y={0} width={W} height={H} rx={6} fill="currentColor" opacity={0.06} />
      {/* center-line reference */}
      <line x1={W / 2} y1={4} x2={W / 2} y2={H - 4}
            stroke="currentColor" strokeWidth={0.6} strokeDasharray="2 3" opacity={0.35} />
      {/* flight path */}
      <path d={path} stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* target marker (X where the ball lands) */}
      <g transform={`translate(${targetX}, ${targetY})`}>
        <circle r={3} fill="currentColor" />
      </g>
      {/* tee marker */}
      <circle cx={teeX} cy={teeY} r={2.2} fill="currentColor" opacity={0.9} />
    </svg>
  );
}
