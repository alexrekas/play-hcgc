// Hole layouts removed. The user will author real per-hole layouts separately.
// This file keeps the canvas constants and type exports so the rest of the app
// continues to compile. HoleDiagram renders a minimal placeholder until
// per-hole layouts are provided.

export const CANVAS_W = 240;
export const CANVAS_H = 480;

export type Heading = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface HoleLayout {
  waypoints: Array<[number, number, number]>;
  green: {
    cx: number; cy: number; rx: number; ry: number;
    rotation?: number;
    twoTier?: boolean;
    backToFront?: boolean;
    contour?: boolean;
  };
  tee: [number, number];
  teeBox?: { cx: number; cy: number; w: number; h: number };
  flagOffset?: [number, number];
  bunkers: Array<{ cx: number; cy: number; rx: number; ry: number; rotation?: number }>;
  water: Array<{ d: string; kind?: "pond" | "creek" }>;
  creeks?: Array<{ d: string }>;
  trees: Array<{
    side: "left" | "right";
    y1: number; y2: number;
    density?: number;
    distance?: number;
    species?: "mixed" | "pine" | "oak";
  }>;
  heading?: Heading;
  obLine?: { side: "left" | "right"; y1: number; y2: number; label?: string };
  elevation?: "uphill" | "downhill" | "rolling";
  mound?: { cx: number; cy: number; r: number };
  cartPath?: { side: "left" | "right"; y1: number; y2: number; offset?: number };
  markers?: Array<{ cy: number; yards: number }>;
}

// Intentionally empty — awaiting user-authored layouts.
export const HOLE_LAYOUTS: Record<number, HoleLayout> = {};
