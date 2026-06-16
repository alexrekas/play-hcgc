"use client";
import { useRef, useEffect, useCallback, useState } from "react";
import type { Hole } from "@/data/course";
import type { ShotResult } from "@/types";
import { HOLE_LAYOUTS, CANVAS_W, CANVAS_H } from "@/data/holeLayouts";
import { HOLE_SVG_LAYOUTS } from "@/data/holeSvgLayouts";

interface Props {
  hole: Hole;
  shots: ShotResult[];
  currentPos: { x: number; y: number };
  /** Aim target — where the player is pointing. */
  target: { x: number; y: number } | null;
  /** Landing target — where the ball actually came down (set in lie-picker phase). */
  landing?: { x: number; y: number } | null;
  /** Live updates while the player drags. Receives the current (single) tap location. */
  onTargetChange: (t: { x: number; y: number } | null) => void;
  /** When true, the SVG stretches to fill its parent (full-bleed mobile). */
  fill?: boolean;
  /** Optional yards-to-aim-target label drawn next to the marker. */
  targetDistanceYards?: number | null;
  /** Optional yards-to-landing label drawn next to the landing marker. */
  landingDistanceYards?: number | null;
}

const MAX_ZOOM = 3;
const MIN_ZOOM = 1;
const ZOOM_STEP = 0.5;

export default function HoleDiagram({
  hole, shots, currentPos, target, landing = null, onTargetChange,
  fill = false, targetDistanceYards = null, landingDistanceYards = null,
}: Props) {
  const layout    = HOLE_LAYOUTS[hole.number];
  const svgLayout = HOLE_SVG_LAYOUTS[hole.number];

  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  // Zoom state — scale 1..3 with a focal center in normalized (x: 0..1, y: 0..1 from bottom).
  const [scale,  setScale]  = useState(1);
  const [center, setCenter] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // Pinch state — captured at touch-start, applied during touch-move.
  const pinchRef = useRef<null | {
    startDist: number;
    startScale: number;
    centerNorm: { x: number; y: number };
  }>(null);

  // Translate a screen-space coordinate into SVG user-space coords. Uses the
  // SVG element's current CTM so zoom/pan are accounted for automatically.
  const screenToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  }, []);

  const eventToNorm = useCallback((clientX: number, clientY: number) => {
    const svgPt = screenToSvg(clientX, clientY);
    if (!svgPt) return null;
    return {
      x: Math.max(0, Math.min(1, svgPt.x / CANVAS_W)),
      y: Math.max(0, Math.min(1, 1 - svgPt.y / CANVAS_H)),
    };
  }, [screenToSvg]);

  // ---- Touch + mouse handlers (single-touch = aim; 2 touches = pinch) ----
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function getMidpointNorm(t1: Touch, t2: Touch) {
      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      return eventToNorm(cx, cy);
    }
    function touchDist(t1: Touch, t2: Touch) {
      return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    }

    function onMouseDown(e: MouseEvent) {
      e.preventDefault();
      draggingRef.current = true;
      const p = eventToNorm(e.clientX, e.clientY);
      if (p) onTargetChange(p);
    }
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const p = eventToNorm(e.clientX, e.clientY);
      if (p) onTargetChange(p);
    }
    function onMouseUp() {
      draggingRef.current = false;
    }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 2) {
        // Start a pinch — capture initial distance + midpoint in normalized
        // coords. We'll snap the zoom to keep this midpoint stationary.
        const midNorm = getMidpointNorm(e.touches[0], e.touches[1]);
        if (!midNorm) return;
        pinchRef.current = {
          startDist: touchDist(e.touches[0], e.touches[1]),
          startScale: scale,
          centerNorm: midNorm,
        };
        // Cancel any in-progress aim drag so we don't move the target while pinching.
        draggingRef.current = false;
      } else if (e.touches.length === 1) {
        draggingRef.current = true;
        const p = eventToNorm(e.touches[0].clientX, e.touches[0].clientY);
        if (p) onTargetChange(p);
      }
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 2 && pinchRef.current) {
        const newDist = touchDist(e.touches[0], e.touches[1]);
        const ratio = newDist / pinchRef.current.startDist;
        const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchRef.current.startScale * ratio));
        setScale(newScale);
        setCenter(pinchRef.current.centerNorm);
      } else if (e.touches.length === 1 && draggingRef.current && !pinchRef.current) {
        const p = eventToNorm(e.touches[0].clientX, e.touches[0].clientY);
        if (p) onTargetChange(p);
      }
    }
    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) pinchRef.current = null;
      if (e.touches.length === 0) draggingRef.current = false;
    }

    svg.addEventListener("mousedown", onMouseDown);
    svg.addEventListener("touchstart", onTouchStart, { passive: false });
    svg.addEventListener("touchmove",  onTouchMove,  { passive: false });
    svg.addEventListener("touchend",   onTouchEnd);
    svg.addEventListener("touchcancel", onTouchEnd);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      svg.removeEventListener("mousedown", onMouseDown);
      svg.removeEventListener("touchstart", onTouchStart);
      svg.removeEventListener("touchmove",  onTouchMove);
      svg.removeEventListener("touchend",   onTouchEnd);
      svg.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [eventToNorm, onTargetChange, scale]);

  // Tee / green anchor points in canvas coords.
  const teeX    = svgLayout ? svgLayout.tee.x   * CANVAS_W : 120;
  const teeY    = svgLayout ? (1 - svgLayout.tee.y)   * CANVAS_H : 455;
  const greenCx = svgLayout ? svgLayout.green.x * CANVAS_W : 120;
  const greenCy = svgLayout ? (1 - svgLayout.green.y) * CANVAS_H : 55;
  const greenRx = 26, greenRy = 20;

  const origin = { sx: currentPos.x * CANVAS_W, sy: (1 - currentPos.y) * CANVAS_H };

  const targetSx  = target  ? target.x  * CANVAS_W : null;
  const targetSy  = target  ? (1 - target.y)  * CANVAS_H : null;
  const landingSx = landing ? landing.x * CANVAS_W : null;
  const landingSy = landing ? (1 - landing.y) * CANVAS_H : null;

  // ---- Zoom controls (visual-only; no router/state side-effects) ----
  const zoomIn  = () => setScale((s) => {
    const next = Math.min(MAX_ZOOM, Math.round((s + ZOOM_STEP) * 10) / 10);
    // First zoom-in centers on the ball if we were fully zoomed out.
    if (s === 1) setCenter({ x: currentPos.x, y: currentPos.y });
    return next;
  });
  const zoomOut = () => setScale((s) => Math.max(MIN_ZOOM, Math.round((s - ZOOM_STEP) * 10) / 10));
  const reset   = () => { setScale(1); setCenter({ x: 0.5, y: 0.5 }); };

  // Compute viewBox from scale + center, clamped to keep the viewport inside the canvas.
  const vbW = CANVAS_W / scale;
  const vbH = CANVAS_H / scale;
  const cxPx = center.x * CANVAS_W;
  const cyPx = (1 - center.y) * CANVAS_H;
  const vbX = Math.max(0, Math.min(CANVAS_W - vbW, cxPx - vbW / 2));
  const vbY = Math.max(0, Math.min(CANVAS_H - vbH, cyPx - vbH / 2));
  const viewBox = `${vbX} ${vbY} ${vbW} ${vbH}`;

  const svgSizeProps = fill
    ? { width: "100%", height: "100%" }
    : { width: CANVAS_W, height: CANVAS_H };

  return (
    <div className={fill ? "w-full h-full select-none touch-none relative" : "relative select-none touch-none"}>
      <svg
        ref={svgRef}
        viewBox={viewBox}
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

        {/* Trail through all completed shots */}
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

        {/* Current ball */}
        <circle cx={origin.sx} cy={origin.sy} r={8}
                fill="#f97316" stroke="#ffffff" strokeWidth={1.5} opacity={0.4} />
        <circle cx={origin.sx} cy={origin.sy} r={4}
                fill="#ffffff" stroke="#f97316" strokeWidth={1.5} />

        {/* Aim target — bright when no landing yet, faded once the landing
            marker takes over. */}
        {targetSx !== null && targetSy !== null && (
          <g opacity={landingSx !== null ? 0.45 : 1}>
            <line
              x1={origin.sx} y1={origin.sy}
              x2={targetSx}  y2={targetSy}
              stroke="#1d4ed8" strokeWidth={2.2} strokeDasharray="6 4" opacity={0.95}
            />
            <circle cx={targetSx} cy={targetSy} r={7} fill="#1d4ed8" opacity={0.35} />
            <circle cx={targetSx} cy={targetSy} r={3.5}
                    fill="#1d4ed8" stroke="#ffffff" strokeWidth={1.2} />
            {typeof targetDistanceYards === "number" && landingSx === null && (
              <g>
                <rect
                  x={targetSx + 8} y={Math.max(2, targetSy - 12)}
                  width={36} height={14} rx={3} fill="#1d4ed8"
                />
                <text
                  x={targetSx + 26} y={Math.max(13, targetSy - 1.5)}
                  fill="#ffffff" fontSize={9} fontWeight="bold" textAnchor="middle"
                >
                  {Math.round(targetDistanceYards)}y
                </text>
              </g>
            )}
          </g>
        )}

        {/* Landing marker — solid orange to distinguish from aim. */}
        {landingSx !== null && landingSy !== null && (
          <g>
            <circle cx={landingSx} cy={landingSy} r={9} fill="#f97316" opacity={0.4} />
            <circle cx={landingSx} cy={landingSy} r={5}
                    fill="#f97316" stroke="#ffffff" strokeWidth={1.5} />
            {typeof landingDistanceYards === "number" && (
              <g>
                <rect
                  x={landingSx + 8} y={Math.max(2, landingSy - 12)}
                  width={38} height={14} rx={3} fill="#f97316"
                />
                <text
                  x={landingSx + 27} y={Math.max(13, landingSy - 1.5)}
                  fill="#ffffff" fontSize={9} fontWeight="bold" textAnchor="middle"
                >
                  {Math.round(landingDistanceYards)}y
                </text>
              </g>
            )}
          </g>
        )}
      </svg>

      {/* Zoom controls — bottom-left over the SVG. */}
      <div className="absolute bottom-2 left-2 z-20 flex flex-col gap-1.5">
        <button
          onClick={zoomIn}
          disabled={scale >= MAX_ZOOM}
          aria-label="Zoom in"
          title="Zoom in"
          className="w-10 h-10 rounded-lg bg-card border-2 border-app text-app font-bold shadow-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed text-base"
        >
          <span aria-hidden>🔍</span>
          <span aria-hidden className="ml-0.5 text-sm">+</span>
        </button>
        <button
          onClick={zoomOut}
          disabled={scale <= MIN_ZOOM}
          aria-label="Zoom out"
          title="Zoom out"
          className="w-10 h-10 rounded-lg bg-card border-2 border-app text-app font-bold shadow-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed text-base"
        >
          <span aria-hidden>🔍</span>
          <span aria-hidden className="ml-0.5 text-sm">−</span>
        </button>
        <button
          onClick={reset}
          disabled={scale === 1}
          aria-label="Reset zoom"
          title="Reset zoom"
          className="w-10 h-10 rounded-lg bg-card border-2 border-app text-app font-bold shadow-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed text-base"
        >
          <span aria-hidden>⟲</span>
        </button>
      </div>

      {/* Tiny zoom-level readout when zoomed in. */}
      {scale > 1 && (
        <div className="absolute bottom-2 right-2 z-20 bg-card border-2 border-app rounded-lg px-2 py-1 text-[11px] text-app font-bold shadow-lg">
          {scale.toFixed(1)}×
        </div>
      )}
    </div>
  );
}
