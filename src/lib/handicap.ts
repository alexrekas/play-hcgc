import type { Round } from "@/types";
import { COURSE } from "@/data/course";

// World Handicap System (WHS) implementation

export function calcDifferential(
  adjustedGross: number,
  courseRating: number,
  slope: number
): number {
  return ((adjustedGross - courseRating) * 113) / slope;
}

export function calculateHandicapIndex(rounds: Round[]): number | null {
  const completed = rounds.filter((r) => r.completed);
  if (completed.length < 3) return null;

  const differentials = completed.map((r) => {
    const teeInfo = COURSE.teeInfo[r.tee];
    return calcDifferential(r.totalStrokes, teeInfo.rating, teeInfo.slope);
  });

  differentials.sort((a, b) => a - b);

  const count = differentials.length;
  let best: number[];

  // WHS uses best N differentials based on total rounds available
  if      (count < 6)  best = differentials.slice(0, 1);
  else if (count < 9)  best = differentials.slice(0, 2);
  else if (count < 12) best = differentials.slice(0, 3);
  else if (count < 15) best = differentials.slice(0, 4);
  else if (count < 17) best = differentials.slice(0, 5);
  else if (count < 19) best = differentials.slice(0, 6);
  else if (count === 19) best = differentials.slice(0, 7);
  else best = differentials.slice(0, 8);

  const avg   = best.reduce((s, d) => s + d, 0) / best.length;
  const index = avg * 0.96;

  return Math.round(index * 10) / 10; // one decimal place
}

export function courseHandicap(
  handicapIndex: number,
  slope: number,
  rating: number,
  par: number
): number {
  return Math.round((handicapIndex * slope) / 113 + (rating - par));
}

// Equitable stroke control: max strokes per hole based on course handicap
export function maxStrokesPerHole(courseHcp: number): number {
  if (courseHcp <= 9)   return 7;
  if (courseHcp <= 19)  return 8;
  if (courseHcp <= 29)  return 9;
  if (courseHcp <= 39)  return 10;
  return 11;
}
