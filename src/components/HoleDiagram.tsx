"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import type { Hole } from "@/data/course";
import type { ShotResult } from "@/types";
import { HOLE_LAYOUTS, CANVAS_W, CANVAS_H } from "@/data/holeLayouts";
import { HOLE_SVG_LAYOUTS } from "@/data/holeSvgLayouts";

interface Props {
  hole: Hole;
  shots: ShotResult[];
  currentPos: { x: number; y: number };
  onAimConfirmed: (angleDeg: number) => void;
}

export default function HoleDiagram({ hole, shots, currentPos, onAimConfirmed }: Props) {
  const layout    = HOLE_LAYOUTS[hole.number];      // legacy vector layout (unused for now)
  const svgLayout = HOLE_SVG_LAYOUTS[hole.number];  // pre-authored SVG artwork

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging,  setDragging]  = useState(false);
  const [aimEnd,    setAimEnd]    = useState<{ x: number; y: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setConfirmed(false);
    setAimEnd(null);
  }, [currentPos.x, currentPos.y]);

  const origin = { sx: currentPos.x * CANVAS_W, sy: (1 - currentPos.y) * CANVAS_H };

  const getPos = useCallback((e: MouseEvent | TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function onDown(e: MouseEvent | TouchEvent) {
      e.preventDefault();
      setConfirmed(false);
      setDragging(true);
      const p = getPos(e);
      if (p) setAimEnd(p);
    }
    function onMove(e: MouseEvent | TouchEvent) {
      if (!dragging) return;
      const p = getPos(e);
      if (p) setAimEnd(p);
    }
    function onUp() {
      if (!dragging) return;
      setDragging(false);
      if (aimEnd) {
        const dx = aimEnd.x - origin.sx;
        const dy = origin.sy - aimEnd.y;
        const angleDeg = Math.atan2(dx, dy) * (180 / Math.PI);
        onAimConfirmed(angleDeg);
        setConfirmed(true);
      }
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
  }, [dragging, aimEnd, origin, getPos, onAimConfirmed]);

  // Tee / green anchor points in canvas coords. If a per-hole SVG layout is
  // registered, use its coords; otherwise fall back to the straight-down
  // schematic geometry.
  const teeX    = svgLayout ? svgLayout.tee.x   * CANVAS_W : 120;
  const teeY    = svgLayout ? (1 - svgLayout.tee.y)   * CANVAS_H : 455;
  const greenCx = svgLayout ? svgLayout.green.x * CANVAS_W : 120;
  const greenCy = svgLayout ? (1 - svgLayout.green.y) * CANVAS_H : 55;
  const greenRx = 26, greenRy = 20;

  return (
    <div className="relative select-none touch-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        width={CANVAS_W}
        height={CANVAS_H}
        className="aim-canvas rounded-xl shadow"
        style={{ background: "#e5e7eb" }}
      >
        {/* Real hole artwork, when available */}
        {svgLayout && (
          <image
            href={svgLayout.url}
            x={0}
            y={0}
            width={CANVAS_W}
            height={CANVAS_H}
            preserveAspectRatio="xMidYMid meet"
          />
        )}

        {/* Placeholder banner — only when no SVG artwork and no vector layout */}
        {!layout && !svgLayout && (
          <>
            <rect width={CANVAS_W} height={CANVAS_H} fill="#f1f5f9" />
            {/* grid */}
            <g stroke="#cbd5e1" strokeWidth="0.3" opacity={0.6}>
              {Array.from({ length: 12 }).map((_, i) => (
                <line key={`gx${i}`} x1={(i + 1) * 20} y1={0} x2={(i + 1) * 20} y2={CANVAS_H} />
              ))}
              {Array.from({ length: 24 }).map((_, i) => (
                <line key={`gy${i}`} x1={0} y1={(i + 1) * 20} x2={CANVAS_W} y2={(i + 1) * 20} />
              ))}
            </g>
            <text
              x={CANVAS_W / 2}
              y={CANVAS_H / 2}
              textAnchor="middle"
              fontSize={11}
              fill="#64748b"
              fontStyle="italic"
            >
              Hole layout coming soon
            </text>

            {/* Schematic tee → green line */}
            <line
              x1={teeX} y1={teeY} x2={greenCx} y2={greenCy}
              stroke="#cbd5e1" strokeWidth={0.8} strokeDasharray="3 4"
            />

            {/* Simple tee box */}
            <rect
              x={teeX - 12} y={teeY - 5} width={24} height={10} rx={3}
              fill="#94a3b8" stroke="#334155" strokeWidth={0.5}
            />
            <text x={teeX} y={teeY + 18} fontSize={7} fill="#475569" textAnchor="middle">
              Tee
            </text>

            {/* Simple green + flag */}
            <ellipse
              cx={greenCx} cy={greenCy} rx={greenRx} ry={greenRy}
              fill="#86efac" stroke="#16a34a" strokeWidth={0.6}
            />
            <line x1={greenCx} y1={greenCy - greenRy} x2={greenCx} y2={greenCy - greenRy - 22} stroke="#1f2937" strokeWidth="1.2" />
            <polygon
              points={`${greenCx},${greenCy - greenRy - 22} ${greenCx + 10},${greenCy - greenRy - 17} ${greenCx},${greenCy - greenRy - 13}`}
              fill="#dc2626"
            />
            <circle cx={greenCx} cy={greenCy - greenRy} r={1.2} fill="#1f2937" />
          </>
        )}

        {/* Labels */}
        <g>
          <rect x={6} y={6} width={44} height={22} rx={4} fill="#0f172a" opacity={0.8} />
          <text x={12} y={22} fill="#f8fafc" fontSize={14} fontWeight="bold">
            {hole.number}
          </text>
          <text x={30} y={22} fill="#86efac" fontSize={9} fontWeight="bold">
            Par {hole.par}
          </text>
          <text
            x={CANVAS_W - 8} y={22} fill="#1f2937" fontSize={9} fontWeight="bold" textAnchor="end"
          >
            SI {hole.handicapIndex}
          </text>
        </g>

        {/* Shot trail */}
        {shots.length > 0 && (() => {
          const pts: Array<[number, number]> = [
            [teeX, teeY],
            ...shots.map<[number, number]>((s) => [s.posX * CANVAS_W, (1 - s.posY) * CANVAS_H]),
          ];
          let d = `M ${pts[0][0]},${pts[0][1]}`;
          for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]},${pts[i][1]}`;
          return <path d={d} stroke="#eab308" strokeWidth={1.2} fill="none" strokeDasharray="2 3" opacity={0.85} />;
        })()}

        {/* Previous shot markers */}
        {shots.map((s, i) => {
          const sx = s.posX * CANVAS_W;
          const sy = (1 - s.posY) * CANVAS_H;
          return (
            <g key={i}>
              <circle cx={sx} cy={sy} r={5} fill="#facc15" stroke="#1f2937" strokeWidth={1} />
              <text x={sx} y={sy + 2.5} fill="#1f2937" fontSize={7} fontWeight="bold" textAnchor="middle">
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* Current ball position */}
        <circle cx={origin.sx} cy={origin.sy} r={8} fill="#f97316" stroke="#ffffff" strokeWidth={1.5} opacity={0.4} />
        <circle cx={origin.sx} cy={origin.sy} r={4} fill="#ffffff" stroke="#f97316" strokeWidth={1.5} />

        {/* Aim line */}
        {aimEnd && (
          <line
            x1={origin.sx} y1={origin.sy}
            x2={aimEnd.x}  y2={aimEnd.y}
            stroke="#1d4ed8" strokeWidth={2} strokeDasharray="6 4" opacity={0.9}
          />
        )}
        {aimEnd && confirmed && (
          <circle cx={aimEnd.x} cy={aimEnd.y} r={4} fill="#1d4ed8" />
        )}
      </svg>
      {!confirmed && !dragging && (
        <p className="text-center text-subtle text-xs mt-1">
          Drag on the diagram to aim · enter distance below to hit
        </p>
      )}
    </div>
  );
}
