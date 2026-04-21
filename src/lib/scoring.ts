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

// Tailwind classes for a score name, used wherever we render them.
export function scoreNameClass(strokes: number, par: number): string {
  const diff = strokes - par;
  if (strokes === 1) return "text-emerald-500 dark:text-emerald-300";
  if (diff < 0) return "text-warning";
  if (diff === 0) return "text-primary";
  if (diff > 0) return "text-danger";
  return "text-subtle";
}
