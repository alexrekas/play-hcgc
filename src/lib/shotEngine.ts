import type { ShotResult, LieType, ShotShape } from "@/types";
import { strokesGained } from "./strokesGained";

// Since per-hole layouts/zones are gone (the user will author real layouts later),
// the shot engine no longer auto-classifies the result lie from a geometric model.
// Instead the UI asks the player what lie they ended up in, and we pass that in.
// We still compute an approximate canvas position so the diagram can draw the shot.

/**
 * Project a shot's new position on the canvas. Returns both:
 *   • canvas coords (clamped to the visible area, for drawing)
 *   • raw y-coord (unclamped, for computing actual distance to pin)
 */
export function computeNewPosition(
  prevX: number,
  prevY: number,
  aimAngleDeg: number,
  distanceYards: number,
  holeLengthYards: number,
  canvasAspect: number
): { x: number; y: number; rawY: number } {
  const yFraction = distanceYards / holeLengthYards;
  const angleRad  = (aimAngleDeg * Math.PI) / 180;
  const dx = yFraction * Math.sin(angleRad);
  const dy = yFraction * Math.cos(angleRad);
  const rawY = prevY + dy;
  return {
    x: Math.max(0, Math.min(1, prevX + dx / canvasAspect)),
    y: Math.max(0, Math.min(1.05, rawY)),
    rawY,
  };
}

/** Distance from position y to the pin (at y=1), absolute — handles past-the-green shots. */
export function remainingYards(
  posY: number,
  holeLengthYards: number
): number {
  return Math.round(Math.abs(holeLengthYards * (1 - posY)));
}

export interface BuildShotInput {
  holeNumber: number;
  shotNumber: number;
  clubId: string;
  prevX: number;
  prevY: number;
  prevLie: LieType;
  prevRemaining: number;
  aimAngleDeg: number;
  distanceYards: number;
  offlineYards: number;
  holeLengthYards: number;
  holePar: 3 | 4 | 5;
  resultLie: LieType;            // selected by the player after the shot
  shotShape?: ShotShape;         // flight the player chose
  holeOut?: boolean;
  canvasAspect?: number;
  /** Optional override for remaining distance (useful for water drops / OB relief) */
  remainingOverride?: number;
}

export function buildShotResult(input: BuildShotInput): ShotResult {
  const {
    holeNumber, shotNumber, clubId, prevX, prevY, prevLie, prevRemaining,
    aimAngleDeg, distanceYards, offlineYards,
    holeLengthYards, holePar,
    resultLie: inputLie, shotShape, holeOut = false,
    canvasAspect = 2.5,
    remainingOverride,
  } = input;

  const { x, y, rawY } = computeNewPosition(
    prevX, prevY, aimAngleDeg, distanceYards, holeLengthYards, canvasAspect
  );

  // If the shot holed out we force the lie to "green" regardless of input.
  const resultLie: LieType = holeOut ? "green" : inputLie;
  // Use rawY (unclamped) so past-the-green shots still produce a positive
  // remaining distance rather than collapsing to zero.
  const remaining = holeOut
    ? 0
    : (remainingOverride !== undefined ? Math.max(0, Math.round(remainingOverride)) : remainingYards(rawY, holeLengthYards));

  const sg = strokesGained(prevLie, prevRemaining, resultLie, remaining, holeOut, holePar);

  return {
    holeNumber,
    shotNumber,
    clubId,
    distanceYards,
    offlineYards,
    aimAngleDeg,
    shotShape,
    holedOut: holeOut || undefined,
    lie: prevLie,
    resultLie,
    posX: x,
    posY: y,
    remainingYards: remaining,
    strokesGained: sg,
  };
}
