import type { TeeName } from "@/data/course";
import type { Gender } from "@/data/clubs";

export type LieType =
  | "tee"
  | "fairway"
  | "rough"
  | "bunker"
  | "fringe"
  | "green"
  | "water"
  | "ob";

// Nine standard ball flights: (start direction) × (curvature).
// Start direction: left / straight / right.
// Curvature: hook (right→left for RH), straight, slice (left→right for RH).
export type ShotShape =
  | "pull-hook"   // starts left, curves further left
  | "pull"        // starts left, holds line
  | "pull-slice"  // starts left, curves back right
  | "draw"        // starts straight, curves left
  | "straight"    // starts straight, holds line
  | "fade"        // starts straight, curves right
  | "push-draw"   // starts right, curves back left
  | "push"        // starts right, holds line
  | "push-slice"; // starts right, curves further right

export interface ShotResult {
  holeNumber: number;
  shotNumber: number;
  clubId: string;                 // e.g. "7iron"
  distanceYards: number;
  offlineYards: number;           // positive = right, negative = left
  aimAngleDeg: number;
  shotShape?: ShotShape;          // user-selected flight
  holedOut?: boolean;             // shot went in the hole
  lie: LieType;                   // lie this shot came from (before shot)
  resultLie: LieType;             // lie after the shot
  posX: number;                   // canvas x (0-1)
  posY: number;                   // canvas y (0-1)
  remainingYards: number;         // distance to pin after this shot
  strokesGained: number;
}

export interface HoleScore {
  holeNumber: number;
  par: number;
  strokes: number;
  shots: ShotResult[];
  putts: number;
  completed: boolean;
}

export interface Round {
  id: string;
  userId: string | null;
  courseId: string;
  tee: TeeName;
  date: string;
  holes: HoleScore[];
  completed: boolean;
  totalStrokes: number;
  totalPar: number;
  differential?: number;
  totalStrokesGained?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  gender: Gender;
  bag: string[];              // club IDs the user carries
  /** Per-club average-distance overrides (yards). Falls back to clubs.ts defaults. */
  clubAverages?: Record<string, number>;
  createdAt: string;
}

export interface HandicapRecord {
  userId: string;
  rounds: Round[];
  handicapIndex: number | null;
  lastUpdated: string;
}
