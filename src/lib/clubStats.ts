import type { Round } from "@/types";

export interface ClubStat {
  clubId: string;
  count: number;
  avgYards: number;   // simple mean
  trimmedAvg: number; // mean excluding bottom/top 10% (reduces chunks / topped shots)
  maxYards: number;
}

/**
 * Compute per-club distance statistics from a user's rounds.
 *
 * We only count full-swing shots, so we exclude:
 *   • putter shots
 *   • shots on or around the green (prevLie "green" / "fringe")
 *   • shots under 30 yards (typically chips & pitches, not full swings)
 *   • shots that holed out from close range
 */
export function clubStatsFromRounds(rounds: Round[]): Record<string, ClubStat> {
  const buckets: Record<string, number[]> = {};
  for (const r of rounds) {
    for (const h of r.holes) {
      for (const s of h.shots) {
        if (!s.clubId || s.clubId === "putter") continue;
        if (s.lie === "green" || s.lie === "fringe") continue;
        if (s.distanceYards < 30) continue;
        (buckets[s.clubId] ||= []).push(s.distanceYards);
      }
    }
  }
  const out: Record<string, ClubStat> = {};
  for (const [clubId, list] of Object.entries(buckets)) {
    if (list.length === 0) continue;
    list.sort((a, b) => a - b);
    const avg = list.reduce((s, v) => s + v, 0) / list.length;
    // Trimmed mean: drop 10% from each end (need at least 5 samples to bother)
    let trimmed = avg;
    if (list.length >= 5) {
      const drop = Math.floor(list.length * 0.1);
      const core = list.slice(drop, list.length - drop);
      trimmed = core.reduce((s, v) => s + v, 0) / core.length;
    }
    out[clubId] = {
      clubId,
      count: list.length,
      avgYards: Math.round(avg),
      trimmedAvg: Math.round(trimmed),
      maxYards: list[list.length - 1],
    };
  }
  return out;
}

/**
 * Merge computed averages into a `clubAverages` overrides object.
 * Only clubs with at least `minSamples` recorded shots are written.
 */
export function buildClubAverages(
  stats: Record<string, ClubStat>,
  minSamples = 3,
): Record<string, number> {
  const overrides: Record<string, number> = {};
  for (const s of Object.values(stats)) {
    if (s.count >= minSamples && s.trimmedAvg > 0) {
      overrides[s.clubId] = s.trimmedAvg;
    }
  }
  return overrides;
}
