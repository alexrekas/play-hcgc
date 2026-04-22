// Per-hole SVG layout overrides.
//
// When a hole has an entry here, HoleDiagram embeds the SVG as a background
// image and positions the ball / tee trail at the `tee` coordinate (normalized
// 0..1 within the canvas, where y=0 is the tee end / bottom of the canvas and
// y=1 is the green / top — consistent with the shot engine convention).
//
// Coordinates are computed from the artwork's own viewBox, then mapped into
// the canvas using preserveAspectRatio="xMidYMid meet" (letterboxed) so the
// real proportions of the hole are preserved.

export interface HoleSvgLayout {
  /** URL under /public — e.g. "/hole-layouts/HCGC-1.svg" */
  url: string;
  /** Tee-box center in normalized canvas coords (0..1). */
  tee: { x: number; y: number };
  /** Green-center in normalized canvas coords (0..1). Used for the schematic
   *  shot trail's end-point and for green-relative UI if needed later. */
  green: { x: number; y: number };
}

export const HOLE_SVG_LAYOUTS: Record<number, HoleSvgLayout> = {
  // HCGC-1.svg viewBox: 0 0 142.29 358.24
  // Tee markers cluster near (29, 328); green polygon centers near (86, 43).
  // Letterboxed into a 240×480 canvas (scale 1.3399, x-offset 24.7), which
  // normalizes to the values below.
  1: {
    url:   "/hole-layouts/HCGC-1.svg",
    tee:   { x: 0.265, y: 0.084 },
    green: { x: 0.583, y: 0.880 },
  },
};
