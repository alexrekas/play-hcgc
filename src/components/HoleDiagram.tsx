"use client";
import { useRef, useEffect, useCallback } from "react";
import type { Hole } from "@/data/course";
import type { ShotResult } from "@/types";
import { HOLE_LAYOUTS, CANVAS_W, CANVAS_H } from "@/data/holeLayouts";
import { HOLE_SVG_LAYOUTS } from "@/data/holeSvgLayouts";

interface Props {
  hole: Hole;
  shots: ShotResult[];
  currentPos: { x: number; y: number };
  /** Aim target in normalized canvas coords (0..1, y=0 bottom, y=1 top). */
  target: { x: number; y: number } | null;
  /** Live updates while the player drags. */
  onTargetChange: (t: { x: number; y: number } | null) => void;
  /** When true, the SVG stretches to fill its parent (full-bleed mobile). */
  fill?: boolean;
  /** Optional yards-to-target label drawn next to the marker. */
  targetDistanceYards?: number | null;
}

export default function HoleDiagram({
  hole, shots, currentPos, target, onTargetChange,
  fill = false, targetDistanceYards = null,
}: Props) {
  const layout    = HOLE_LAYOUTS[hole.number];
  const svgLayout = HOLE_SVG_LAYOUTS[hole.number];

  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  const origin = { sx: currentPos.x * CANVAS_W, sy: (1 - currentPos.y) * CANVAS_H };

  const getNormPos = useCallback((e: MouseEvent | TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    const xCanvas = ((clientX - rect.left) / rect.width)  * CANVAS_W;
    const yCanvas = ((clientY - rect.top)  / rect.height) * CANVAS_H;
    return {
      x: Math.max(0, Math.min(1, xCanvas / CANVAS_W)),
      y: Math.max(0, Math.min(1, 1 - yCanvas / CANVAS_H)),
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function onDown(e: MouseEvent | TouchEvent) {
      e.preventDefault();
      draggingRef.current = true;
      const p = getNormPos(e);
      if (p) onTargetChange(p);
    }
    function onMove(e: MouseEvent | TouchEvent) {
      if (!draggingRef.current) return;
      const p = getNormPos(e);
      if (p) onTargetChange(p);
    }
    function onUp() {
      draggingRef.current = false;
    }

    svg.addEventListener("mousedown", onDown);
    svg.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);

    return () => {
      svg.removeEventListener("mousedown", onDown);
      svg.removeEventListener("touchstart", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [getNormPos, onTargetChange]);

  const teeX    = svgLayout ? svgLayout.tee.x   * CANVAS_W : 120;
  const teeY    = svgLayout ? (1 - svgLayout.tee.y)   * CANVAS_H : 455;
  const greenCx = svgLayout ? svgLayout.green.x * CANVAS_W : 120;
  const greenCy = svgLayout ? (1 - svgLayout.green.y) * CANVAS_H : 55;
  const greenRx = 26, greenRy = 20;

  const targetSx = target ? target.x * CANVAS_W : null;
  const targetSy = target ? (1 - target.y) * CANVAS_H : null;

  const svgSizeProps = fill
    ? { width: "100%", height: "100%" }
    : { width: CANVAS_W, height: CANVAS_H };

  return (
    <div className={fill ? "w-full h-full select-none touch-none" : "relative select-none touch-none"}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        {...svgSizeProps}
        preserveAspectRatio="xMidYMid meet"
        className={fill ? "block w-full h-full aim-canvas" : "aim-canvas rounded-xl shadow"}
        style={{ background: "#e5e7eb" }}
      >
        {svgLayout && (
          <image
            href={svgLayout.url}
            x={0} y={0}
            width={CANVAS_W} height={CANVAS_H}
            preserveAspectRatio="xMidYMid meet"
          />
        )}

        {!layout && !svgLayout && (
          <>
            <rect width={CANVAS_W} height={CANVAS_H} fill="#f1f5f9" />
            <text x={CANVAS_W / 2} y={CANVAS_H / 2} textAnchor="middle" fontSize={11}
                  fill="#64748b" fontStyle="italic">
              Hole layout coming soon
            </text>
            <line x1={teeX} y1={teeY} x2={greenCx} y2={greenCy}
                  stroke="#cbd5e1" strokeWidth={0.8} strokeDasharray="3 4" />
            <rect x={teeX - 12} y={teeY - 5} width={24} height={10} rx={3}
                  fill="#94a3b8" stroke="#334155" strokeWidth={0.5} />
            <ellipse cx={greenCx} cy={greenCy} rx={greenRx} ry={greenRy}
                     fill="#86efac" stroke="#16a34a" strokeWidth={0.6} />
            <line x1={greenCx} y1={greenCy - greenRy} x2={greenCx} y2={greenCy - greenRy - 22}
                  stroke="#1f2937" strokeWidth="1.2" />
            <polygon
              points={`${greenCx},${greenCy - greenRy - 22} ${greenCx + 10},${greenCy - greenRy - 17} ${greenCx},${greenCy - greenRy - 13}`}
              fill="#dc2626"
            />
          </>
        )}

        {shots.length > 0 && (() => {
          const pts: Array<[number, number]> = [
            [teeX, teeY],
            ...shots.map<[number, number]>((s) => [s.posX * CANVAS_W, (1 - s.posY) * CANVAS_H]),
          ];
          let d = `M ${pts[0][0]},${pts[0][1]}`;
          for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]},${pts[i][1]}`;
          return <path d={d} stroke="#eab308" strokeWidth={1.2} fill="none"
                       strokeDasharray="2 3" opacity={0.85} />;
        })()}

        {shots.map((s, i) => {
          const sx = s.posX * CANVAS_W;
          const sy = (1 - s.posY) * CANVAS_H;
          return (
            <g key={i}>
              <circle cx={sx} cy={sy} r={5} fill="#facc15" stroke="#1f2937" strokeWidth={1} />
              <text x={sx} y={sy + 2.5} fill="#1f2937" fontSize={7}
                    fontWeight="bold" textAnchor="middle">{i + 1}</text>
            </g>
          );
        })}

        <circle cx={origin.sx} cy={origin.sy} r={8}
                fill="#f97316" stroke="#ffffff" strokeWidth={1.5} opacity={0.4} />
        <circle cx={origin.sx} cy={origin.sy} r={4}
                fill="#ffffff" stroke="#f97316" strokeWidth={1.5} />

        {targetSx !== null && targetSy !== null && (
          <>
            <line
              x1={origin.sx} y1={origin.sy}
              x2={targetSx}  y2={targetSy}
              stroke="#1d4ed8" strokeWidth={2.2} strokeDasharray="6 4" opacity={0.95}
            />
            <circle cx={targetSx} cy={targetSy} r={7} fill="#1d4ed8" opacity={0.35} />
            <circle cx={targetSx} cy={targetSy} r={3.5}
                    fill="#1d4ed8" stroke="#ffffff" strokeWidth={1.2} />
            {typeof targetDistanceYards === "number" && (
              <g>
                <rect
                  x={targetSx + 8}
                  y={Math.max(2, targetSy - 12)}
                  width={36} height={14} rx={3}
                  fill="#1d4ed8"
                />
                <text
                  x={targetSx + 26}
                  y={Math.max(13, targetSy - 1.5)}
                  fill="#ffffff" fontSize={9} fontWeight="bold" textAnchor="middle"
                >
                  {Math.round(targetDistanceYards)}y
                </text>
              </g>
            )}
          </>
        )}
      </svg>
    </div>
  );
}
