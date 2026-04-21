import type { Round } from "@/types";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;           // short emoji glyph for display
  category: "milestone" | "scoring" | "skill" | "round";
}

// The full catalog of achievements users can earn.
export const ACHIEVEMENTS: Achievement[] = [
  // ── Round milestones ─────────────────────────────────────────────────────
  { id: "first_round",   title: "First Round",          description: "Complete your first round",           icon: "⛳", category: "milestone" },
  { id: "rounds_10",     title: "Regular",              description: "Complete 10 rounds",                  icon: "🔟", category: "milestone" },
  { id: "rounds_25",     title: "Weekend Warrior",      description: "Complete 25 rounds",                  icon: "🏌️", category: "milestone" },
  { id: "rounds_50",     title: "Half Century",         description: "Complete 50 rounds",                  icon: "🥉", category: "milestone" },
  { id: "rounds_100",    title: "Century Club",         description: "Complete 100 rounds",                 icon: "💯", category: "milestone" },
  { id: "rounds_250",    title: "Dedicated",            description: "Complete 250 rounds",                 icon: "🥈", category: "milestone" },
  { id: "rounds_500",    title: "Elite",                description: "Complete 500 rounds",                 icon: "🥇", category: "milestone" },
  { id: "rounds_1000",   title: "Legend",               description: "Complete 1,000 rounds",               icon: "👑", category: "milestone" },

  // ── Score milestones ─────────────────────────────────────────────────────
  { id: "break_100",     title: "Break 100",            description: "Shoot under 100 for 18 holes",        icon: "💯", category: "scoring" },
  { id: "break_90",      title: "Break 90",             description: "Shoot under 90 for 18 holes",         icon: "🎯", category: "scoring" },
  { id: "break_80",      title: "Break 80",             description: "Shoot under 80 for 18 holes",         icon: "🔥", category: "scoring" },
  { id: "shoot_par",     title: "Level Par",            description: "Shoot even par or better for 18",     icon: "🏆", category: "scoring" },
  { id: "break_70",      title: "Break 70",             description: "Shoot under 70 for 18 holes",         icon: "🏅", category: "scoring" },
  { id: "break_60",      title: "Break 60",             description: "Shoot under 60 for 18 holes",         icon: "🐐", category: "scoring" },

  // ── Per-hole scoring ─────────────────────────────────────────────────────
  { id: "first_birdie",  title: "First Birdie",         description: "Make a birdie",                       icon: "🐦", category: "scoring" },
  { id: "first_eagle",   title: "First Eagle",          description: "Make an eagle",                       icon: "🦅", category: "scoring" },
  { id: "first_albatross", title: "Albatross",          description: "Make a double-eagle (albatross)",     icon: "🕊️", category: "scoring" },
  { id: "hole_in_one",   title: "Hole in One",          description: "Ace any hole",                        icon: "🎯", category: "scoring" },

  // ── Skill ────────────────────────────────────────────────────────────────
  { id: "bomber",        title: "Bomber",               description: "Hit a drive 300+ yards",              icon: "💣", category: "skill" },
  { id: "fir_round",     title: "Fairway Finder",       description: "Hit every fairway in a round",        icon: "🎯", category: "skill" },
  { id: "gir_round",     title: "Greens in Regulation", description: "Hit all 18 greens in regulation",     icon: "🟢", category: "skill" },
  { id: "putts_sub36",   title: "Deft on the Dance Floor", description: "Fewer than 36 putts in a round",   icon: "🥍", category: "skill" },
  { id: "putts_sub30",   title: "Sharpshooter",         description: "Fewer than 30 putts in a round",      icon: "🎱", category: "skill" },
  { id: "no_penalty",    title: "Safe & Sound",         description: "Complete a round with no water or OB",icon: "🛟", category: "skill" },
];

export interface EarnedAchievement {
  id: string;
  earnedAt: string;      // ISO date of the round that first earned it
  roundId?: string;      // round where it was earned
}

// ── Derivation: compute the set of achievements earned given a history ──────

// A round is "full 18" if all 18 holes are marked complete.
function isFull18(r: Round): boolean {
  return r.holes.filter((h) => h.completed).length === 18;
}

/**
 * Count shots whose `prevLie === "tee"` on par 4/5 holes and whose result
 * landed in "fairway". A GIR on a par-3 is tee→green in 1 shot; par-4 in 2;
 * par-5 in 3. We approximate FIR (fairways in regulation) from tee shots on
 * par-4/5 hitting fairway.
 */
function firInRound(r: Round): { fairwaysHit: number; fairwayAttempts: number } {
  let hit = 0, attempts = 0;
  for (const h of r.holes) {
    if (!h.completed) continue;
    if (h.par < 4) continue;
    const tee = h.shots.find((s) => s.lie === "tee");
    if (!tee) continue;
    attempts++;
    if (tee.resultLie === "fairway") hit++;
  }
  return { fairwaysHit: hit, fairwayAttempts: attempts };
}

function girInRound(r: Round): { greensHit: number } {
  // Greens in regulation = reached green in (par - 2) shots or fewer.
  let hit = 0;
  for (const h of r.holes) {
    if (!h.completed) continue;
    const limit = h.par - 2;
    for (let i = 0; i < h.shots.length && i < limit; i++) {
      if (h.shots[i].resultLie === "green" || h.shots[i].holedOut) {
        hit++;
        break;
      }
    }
  }
  return { greensHit: hit };
}

function hadPenaltyInRound(r: Round): boolean {
  for (const h of r.holes) {
    for (const s of h.shots) {
      if (s.resultLie === "water" || s.resultLie === "ob") return true;
    }
  }
  return false;
}

function maxDriveYards(r: Round): number {
  let max = 0;
  for (const h of r.holes) {
    for (const s of h.shots) {
      if (s.clubId === "driver" && s.distanceYards > max) max = s.distanceYards;
    }
  }
  return max;
}

/**
 * Given all completed rounds, return the list of earned achievements with
 * the date/round where they were first earned.
 *
 * This is recomputed each time we need to render — no storage required.
 */
export function computeEarnedAchievements(rounds: Round[]): EarnedAchievement[] {
  const completed = rounds.filter((r) => r.completed).slice().sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const earned = new Map<string, EarnedAchievement>();
  const mark = (id: string, r: Round) => {
    if (!earned.has(id)) {
      earned.set(id, { id, earnedAt: r.date, roundId: r.id });
    }
  };

  const total = completed.length;
  const roundCounts: Array<[number, string]> = [
    [1, "first_round"], [10, "rounds_10"], [25, "rounds_25"], [50, "rounds_50"],
    [100, "rounds_100"], [250, "rounds_250"], [500, "rounds_500"], [1000, "rounds_1000"],
  ];
  for (const [n, id] of roundCounts) {
    if (total >= n) {
      const r = completed[n - 1];
      earned.set(id, { id, earnedAt: r.date, roundId: r.id });
    }
  }

  for (const r of completed) {
    const full = isFull18(r);
    // Score milestones — only count full 18-hole rounds
    if (full) {
      if (r.totalStrokes < 100) mark("break_100", r);
      if (r.totalStrokes < 90)  mark("break_90",  r);
      if (r.totalStrokes < 80)  mark("break_80",  r);
      if (r.totalStrokes <= r.totalPar) mark("shoot_par", r);
      if (r.totalStrokes < 70)  mark("break_70",  r);
      if (r.totalStrokes < 60)  mark("break_60",  r);
    }

    // Per-hole scoring
    for (const h of r.holes) {
      if (!h.completed) continue;
      const diff = h.strokes - h.par;
      if (h.strokes === 1) mark("hole_in_one", r);
      if (diff === -1) mark("first_birdie", r);
      if (diff === -2) mark("first_eagle",  r);
      if (diff <= -3)  mark("first_albatross", r);
    }

    // Skill
    if (maxDriveYards(r) >= 300) mark("bomber", r);
    if (full) {
      const fir = firInRound(r);
      if (fir.fairwayAttempts > 0 && fir.fairwayAttempts === fir.fairwaysHit) {
        mark("fir_round", r);
      }
      const gir = girInRound(r);
      if (gir.greensHit === 18) mark("gir_round", r);
      const totalPutts = r.holes.reduce((s, h) => s + (h.putts || 0), 0);
      if (totalPutts < 36) mark("putts_sub36", r);
      if (totalPutts < 30) mark("putts_sub30", r);
      if (!hadPenaltyInRound(r)) mark("no_penalty", r);
    }
  }

  return Array.from(earned.values());
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
