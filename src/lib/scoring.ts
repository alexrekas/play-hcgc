// Human-readable names for a hole score relative to par.

export function scoreName(strokes: number, par: number): string {
  if (strokes <= 0) return "Other";
  if (strokes === 1) return "Hole in One";
  const diff = strokes - par;
  if (diff === -3) return "Albatross";
  if (diff === -2) return "Eagle";
  if (diff === -1) return "Birdie";
  if (diff ===  0) return "Par";
  if (diff ===  1) return "Bogey";
  if (diff ===  2) return "Double Bogey";
  if (diff ===  3) return "Triple Bogey";
  if (diff ===  4) return "Quadruple Bogey";
  return "Other";
}

// Score colours follow scorecard convention: under par in golf-red, over par
// in scoreboard navy, even par in plain ink. All from the palette tokens.
export function toParClass(diff: number): string {
  if (diff < 0) return "text-score-under";
  if (diff > 0) return "text-score-over";
  return "text-ink";
}

// Tailwind classes for a score name, used wherever we render them.
export function scoreNameClass(strokes: number, par: number): string {
  if (strokes <= 0) return "text-subtle";
  if (strokes === 1) return "text-score-under";
  return toParClass(strokes - par);
}

// Strokes gained: positive is good (green), negative costs you (amber).
export function sgClass(sg: number): string {
  if (sg > 0.15) return "text-success";
  if (sg < -0.15) return "text-warning";
  return "text-subtle";
}
