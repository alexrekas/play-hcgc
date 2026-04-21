// Statistical average carry distances by club
// Sources: PGA Tour ShotLink averages / LPGA equivalents / Arccos handicap averages
// Numbers are a best-effort blend — individual bag customization happens
// via the user profile (users pick the subset of clubs they actually carry).

export type Gender = "male" | "female" | "other";

export type ClubCategory = "wood" | "iron" | "wedge" | "putter";

export interface Club {
  id: string;
  name: string;
  shortName: string;
  category: ClubCategory;
  // Average full-swing carry distance in yards by gender.
  avgYards: Record<Gender, number>;
}

// Ordered longest → shortest within each category so default-bag UI stays tidy.
export const CLUBS: Club[] = [
  // ── Woods ─────────────────────────────────────────────────────────────────
  { id: "driver",   name: "Driver",      shortName: "Dr",  category: "wood",
    avgYards: { male: 240, female: 195, other: 220 } },
  { id: "minidriver", name: "Mini Driver", shortName: "MD", category: "wood",
    avgYards: { male: 230, female: 188, other: 210 } },
  { id: "2wood",    name: "2 Wood",      shortName: "2W",  category: "wood",
    avgYards: { male: 225, female: 185, other: 205 } },
  { id: "3wood",    name: "3 Wood",      shortName: "3W",  category: "wood",
    avgYards: { male: 220, female: 180, other: 200 } },
  { id: "4wood",    name: "4 Wood",      shortName: "4W",  category: "wood",
    avgYards: { male: 212, female: 175, other: 195 } },
  { id: "5wood",    name: "5 Wood",      shortName: "5W",  category: "wood",
    avgYards: { male: 205, female: 170, other: 190 } },
  { id: "6wood",    name: "6 Wood",      shortName: "6W",  category: "wood",
    avgYards: { male: 198, female: 165, other: 184 } },
  { id: "7wood",    name: "7 Wood",      shortName: "7W",  category: "wood",
    avgYards: { male: 190, female: 160, other: 178 } },
  { id: "8wood",    name: "8 Wood",      shortName: "8W",  category: "wood",
    avgYards: { male: 183, female: 155, other: 172 } },
  { id: "9wood",    name: "9 Wood",      shortName: "9W",  category: "wood",
    avgYards: { male: 176, female: 150, other: 165 } },
  { id: "10wood",   name: "10 Wood",     shortName: "10W", category: "wood",
    avgYards: { male: 170, female: 145, other: 158 } },
  { id: "11wood",   name: "11 Wood",     shortName: "11W", category: "wood",
    avgYards: { male: 163, female: 140, other: 152 } },

  // ── Irons ─────────────────────────────────────────────────────────────────
  { id: "1iron",    name: "1 Iron",      shortName: "1i",  category: "iron",
    avgYards: { male: 200, female: 165, other: 185 } },
  { id: "2iron",    name: "2 Iron",      shortName: "2i",  category: "iron",
    avgYards: { male: 190, female: 158, other: 175 } },
  { id: "3iron",    name: "3 Iron",      shortName: "3i",  category: "iron",
    avgYards: { male: 185, female: 152, other: 170 } },
  { id: "4iron",    name: "4 Iron",      shortName: "4i",  category: "iron",
    avgYards: { male: 180, female: 150, other: 165 } },
  { id: "5iron",    name: "5 Iron",      shortName: "5i",  category: "iron",
    avgYards: { male: 170, female: 140, other: 155 } },
  { id: "6iron",    name: "6 Iron",      shortName: "6i",  category: "iron",
    avgYards: { male: 160, female: 130, other: 145 } },
  { id: "7iron",    name: "7 Iron",      shortName: "7i",  category: "iron",
    avgYards: { male: 150, female: 120, other: 135 } },
  { id: "8iron",    name: "8 Iron",      shortName: "8i",  category: "iron",
    avgYards: { male: 140, female: 110, other: 125 } },
  { id: "9iron",    name: "9 Iron",      shortName: "9i",  category: "iron",
    avgYards: { male: 130, female: 100, other: 115 } },
  { id: "10iron",   name: "10 Iron",     shortName: "10i", category: "iron",
    avgYards: { male: 122, female: 95,  other: 108 } },

  // ── Wedges ────────────────────────────────────────────────────────────────
  { id: "pw",       name: "Pitching Wedge", shortName: "PW", category: "wedge",
    avgYards: { male: 115, female: 90,  other: 105 } },
  { id: "gw",       name: "Gap Wedge (AW)", shortName: "GW", category: "wedge",
    avgYards: { male: 100, female: 80,  other: 90  } },
  { id: "wedge48",  name: "48° Wedge",   shortName: "48°", category: "wedge",
    avgYards: { male: 110, female: 88,  other: 100 } },
  { id: "wedge50",  name: "50° Wedge",   shortName: "50°", category: "wedge",
    avgYards: { male: 102, female: 82,  other: 92  } },
  { id: "wedge52",  name: "52° Wedge",   shortName: "52°", category: "wedge",
    avgYards: { male: 95,  female: 77,  other: 86  } },
  { id: "wedge54",  name: "54° Wedge",   shortName: "54°", category: "wedge",
    avgYards: { male: 90,  female: 73,  other: 82  } },
  { id: "wedge56",  name: "56° Wedge",   shortName: "56°", category: "wedge",
    avgYards: { male: 85,  female: 70,  other: 78  } },
  { id: "wedge58",  name: "58° Wedge",   shortName: "58°", category: "wedge",
    avgYards: { male: 78,  female: 62,  other: 71  } },
  { id: "wedge60",  name: "60° Wedge",   shortName: "60°", category: "wedge",
    avgYards: { male: 70,  female: 55,  other: 65  } },
  { id: "wedge62",  name: "62° Wedge",   shortName: "62°", category: "wedge",
    avgYards: { male: 62,  female: 48,  other: 58  } },
  { id: "sw",       name: "Sand Wedge",  shortName: "SW",  category: "wedge",
    avgYards: { male: 85,  female: 70,  other: 78  } },

  // ── Putter ────────────────────────────────────────────────────────────────
  { id: "putter",   name: "Putter",      shortName: "Pt",  category: "putter",
    avgYards: { male: 0,   female: 0,   other: 0   } },
];

// A sensible default bag for new users — a conventional 14-club setup.
export const DEFAULT_BAG: string[] = [
  "driver", "3wood", "5wood",
  "4iron", "5iron", "6iron", "7iron", "8iron", "9iron",
  "pw", "gw", "sw", "wedge60",
  "putter",
];

// Effective average yardage for a club: user override → gender default.
export function effectiveAvgYards(
  club: Club,
  gender: Gender,
  overrides?: Record<string, number>,
): number {
  const o = overrides?.[club.id];
  if (typeof o === "number" && o > 0) return Math.round(o);
  return club.avgYards[gender];
}

// Suggest a default club for a given remaining distance, restricted to a bag.
export function suggestClub(
  remainingYards: number,
  gender: Gender,
  onGreen = false,
  bag: string[] = DEFAULT_BAG,
  overrides?: Record<string, number>,
): Club {
  const inBag = (id: string) => bag.includes(id);
  const putter = CLUBS.find((c) => c.id === "putter")!;
  if (onGreen && inBag("putter")) return putter;
  if (remainingYards <= 5 && inBag("putter")) return putter;

  let best: Club | null = null;
  let bestDelta = Infinity;
  for (const c of CLUBS) {
    if (c.category === "putter") continue;
    if (!inBag(c.id)) continue;
    const avg = effectiveAvgYards(c, gender, overrides);
    if (avg <= 0) continue;
    const delta = Math.abs(avg - remainingYards);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = c;
    }
  }
  // Fall back to the closest club in the full catalog if the bag is empty.
  if (!best) {
    for (const c of CLUBS) {
      if (c.category === "putter") continue;
      const avg = effectiveAvgYards(c, gender, overrides);
      if (avg <= 0) continue;
      const delta = Math.abs(avg - remainingYards);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = c;
      }
    }
  }
  return best ?? CLUBS[0];
}

export function getClubById(id: string): Club | undefined {
  return CLUBS.find((c) => c.id === id);
}

// Group the catalog for pickers.
export const CLUBS_BY_CATEGORY: Record<ClubCategory, Club[]> = {
  wood:   CLUBS.filter((c) => c.category === "wood"),
  iron:   CLUBS.filter((c) => c.category === "iron"),
  wedge:  CLUBS.filter((c) => c.category === "wedge"),
  putter: CLUBS.filter((c) => c.category === "putter"),
};
