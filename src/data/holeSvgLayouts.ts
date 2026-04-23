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
  1:  { url: "/hole-layouts/hole1.svg",  tee: { x: 0.340, y: 0.084 }, green: { x: 0.440, y: 0.937 } },
  2:  { url: "/hole-layouts/hole2.svg",  tee: { x: 0.459, y: 0.114 }, green: { x: 0.416, y: 0.917 } },
  3:  { url: "/hole-layouts/hole3.svg",  tee: { x: 0.410, y: 0.099 }, green: { x: 0.576, y: 0.948 } },
  4:  { url: "/hole-layouts/hole4.svg",  tee: { x: 0.537, y: 0.157 }, green: { x: 0.506, y: 0.916 } },
  5:  { url: "/hole-layouts/hole5.svg",  tee: { x: 0.444, y: 0.177 }, green: { x: 0.508, y: 0.886 } },
  6:  { url: "/hole-layouts/hole6.svg",  tee: { x: 0.321, y: 0.138 }, green: { x: 0.403, y: 0.942 } },
  7:  { url: "/hole-layouts/hole7.svg",  tee: { x: 0.396, y: 0.187 }, green: { x: 0.390, y: 0.829 } },
  8:  { url: "/hole-layouts/hole8.svg",  tee: { x: 0.439, y: 0.117 }, green: { x: 0.552, y: 0.906 } },
  9:  { url: "/hole-layouts/hole9.svg",  tee: { x: 0.565, y: 0.111 }, green: { x: 0.409, y: 0.898 } },
  10: { url: "/hole-layouts/hole10.svg", tee: { x: 0.477, y: 0.124 }, green: { x: 0.698, y: 0.916 } },
  11: { url: "/hole-layouts/hole11.svg", tee: { x: 0.495, y: 0.081 }, green: { x: 0.483, y: 0.928 } },
  12: { url: "/hole-layouts/hole12.svg", tee: { x: 0.488, y: 0.081 }, green: { x: 0.526, y: 0.927 } },
  13: { url: "/hole-layouts/hole13.svg", tee: { x: 0.438, y: 0.105 }, green: { x: 0.539, y: 0.933 } },
  14: { url: "/hole-layouts/hole14.svg", tee: { x: 0.488, y: 0.217 }, green: { x: 0.639, y: 0.809 } },
  15: { url: "/hole-layouts/hole15.svg", tee: { x: 0.507, y: 0.103 }, green: { x: 0.559, y: 0.943 } },
  16: { url: "/hole-layouts/hole16.svg", tee: { x: 0.737, y: 0.166 }, green: { x: 0.412, y: 0.719 } },
  17: { url: "/hole-layouts/hole17.svg", tee: { x: 0.585, y: 0.110 }, green: { x: 0.444, y: 0.937 } },
  18: { url: "/hole-layouts/hole18.svg", tee: { x: 0.577, y: 0.132 }, green: { x: 0.660, y: 0.945 } },
};
