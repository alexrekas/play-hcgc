import type { ShotShape } from "@/types";

// Each icon shows a ball launching from the bottom (tee) and drawing a flight
// path up to the target — like looking down the fairway from behind the ball.
//   • Start direction comes from where the path begins heading.
//   • Curvature is the offset of the Bezier control point sideways.
// Canvas is 48×64. Values describe what a RIGHT-handed golfer sees:
//   • pull-hook : starts left · curves further left  → target left,  bulge left
//   • pull      : starts left · holds                → target left,  no bulge
//   • pull-slice: starts left · curves right         → target left,  bulge right
//   • draw      : starts straight · curves left      → target left,  bulge left
//   • straight  : starts straight · holds            → center, no bulge
//   • fade      : starts straight · curves right     → target right, bulge right
//   • push-draw : starts right · curves left         → target right, bulge left
//   • push      : starts right · holds               → target right, no bulge
//   • push-slice: starts right · curves further right → target right, bulge right
// Left-handed players pass mirror=true to flip horizontally.

interface Props {
  shape: ShotShape;
  size?: number;
  className?: string;
  /** Mirror the flight path horizontally for left-handed players. */
  mirror?: boolean;
}

// Signs: positive curve = bulge RIGHT, negative = bulge LEFT.
const GEOM: Record<ShotShape, { tx: number; target: number; curve: number }> = {
  "pull-hook":  { tx: 0.5, target: 0.15, curve: 0.35 },
  "pull":       { tx: 0.5, target: 0.25, curve:  0    },
  "pull-slice": { tx: 0.5, target: 0.35, curve:  -0.30 },
  "draw":       { tx: 0.5, target: 0.30, curve: 0.20 },
  "straight":   { tx: 0.5, target: 0.50, curve:  0    },
  "fade":       { tx: 0.5, target: 0.70, curve:  -0.20 },
  "push-draw":  { tx: 0.5, target: 0.65, curve: 0.30 },
  "push":       { tx: 0.5, target: 0.75, curve:  0    },
  "push-slice": { tx: 0.5, target: 0.85, curve:  -0.35 },
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

  const midX = (teeX + targetX) / 2;
  const midY = (teeY + targetY) / 2;
  const cpX = midX + curveSign * W;
  const cpY = midY;

  const path = `M ${teeX} ${teeY} Q ${cpX} ${cpY} ${targetX} ${targetY}`;

  // Unique marker id per instance so multiple icons on the page don't clash.
  const markerId = `arrow-${shape}${mirror ? "-m" : ""}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size * 0.6}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX={8}
          refY={5}
          markerWidth={5}
          markerHeight={5}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {/* flight path — the arrow */}
      <path
        d={path}
        stroke="currentColor"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
      />
      {/* tee marker at start */}
      <circle cx={teeX} cy={teeY} r={2.2} fill="currentColor" opacity={0.9} />
    </svg>
  );
}
