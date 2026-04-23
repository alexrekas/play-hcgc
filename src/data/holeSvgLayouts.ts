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
//
// Values below were produced by scripts/extract-hole-layouts.mjs, which parses
// the source SVGs for blue tee markers (#06c) and the red flag (#ec1c24) and
// converts their centers into canvas-normalized coords. Re-run the script if
// the artwork is refreshed.

export interface HoleSvgLayout {
  /** URL under /public — e.g. "/hole-layouts/hole1.svg" */
  url: string;
  /** Tee-box center in normalized canvas coords (0..1). */
  tee: { x: number; y: number };
  /** Green-center in normalized canvas coords (0..1). Used for the schematic
   *  shot trail's end-point and for green-relative UI if needed later. */
  green: { x: number; y: number };
}

export const HOLE_SVG_LAYOUTS: Record<number, HoleSvgLayout> = {
  1:  { url: "/hole-layouts/hole1.svg",  tee: { x: 0.298, y: 0.116 }, green: { x: 0.595, y: 0.868 } },
  2:  { url: "/hole-layouts/hole2.svg",  tee: { x: 0.495, y: 0.116 }, green: { x: 0.455, y: 0.881 } },
  3:  { url: "/hole-layouts/hole3.svg",  tee: { x: 0.389, y: 0.163 }, green: { x: 0.540, y: 0.938 } },
  4:  { url: "/hole-layouts/hole4.svg",  tee: { x: 0.535, y: 0.174 }, green: { x: 0.506, y: 0.898 } },
  5:  { url: "/hole-layouts/hole5.svg",  tee: { x: 0.524, y: 0.185 }, green: { x: 0.584, y: 0.850 } },
  6:  { url: "/hole-layouts/hole6.svg",  tee: { x: 0.321, y: 0.138 }, green: { x: 0.403, y: 0.942 } },
  7:  { url: "/hole-layouts/hole7.svg",  tee: { x: 0.396, y: 0.187 }, green: { x: 0.390, y: 0.829 } },
  8:  { url: "/hole-layouts/hole8.svg",  tee: { x: 0.432, y: 0.143 }, green: { x: 0.534, y: 0.857 } },
  9:  { url: "/hole-layouts/hole9.svg",  tee: { x: 0.454, y: 0.124 }, green: { x: 0.674, y: 0.916 } },
  10: { url: "/hole-layouts/hole10.svg", tee: { x: 0.565, y: 0.111 }, green: { x: 0.409, y: 0.898 } },
  11: { url: "/hole-layouts/hole11.svg", tee: { x: 0.345, y: 0.239 }, green: { x: 0.338, y: 0.741 } },
  12: { url: "/hole-layouts/hole12.svg", tee: { x: 0.800, y: 0.228 }, green: { x: 0.822, y: 0.713 } },
  13: { url: "/hole-layouts/hole13.svg", tee: { x: 0.439, y: 0.104 }, green: { x: 0.539, y: 0.924 } },
  14: { url: "/hole-layouts/hole14.svg", tee: { x: 0.460, y: 0.206 }, green: { x: 0.603, y: 0.764 } },
  15: { url: "/hole-layouts/hole15.svg", tee: { x: 0.507, y: 0.103 }, green: { x: 0.559, y: 0.943 } },
  16: { url: "/hole-layouts/hole16.svg", tee: { x: 0.735, y: 0.164 }, green: { x: 0.413, y: 0.711 } },
  17: { url: "/hole-layouts/hole17.svg", tee: { x: 0.583, y: 0.108 }, green: { x: 0.445, y: 0.919 } },
  18: { url: "/hole-layouts/hole18.svg", tee: { x: 0.582, y: 0.130 }, green: { x: 0.665, y: 0.945 } },
};
