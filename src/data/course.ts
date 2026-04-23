export type TeeName = "diamond" | "black" | "blue" | "white";

export interface TeeData {
  yards: number;
  rating: number;
  slope: number;
}

export interface Hole {
  number: number;
  par: number;
  handicapIndex: number;
  tees: Record<TeeName, number>;
  // Hole shape data for SVG diagram generation (legacy)
  heading: number;
  dogleg: number;
  doglegAt: number;
  description: string;
}

export interface CourseInfo {
  name: string;
  address: string;
  phone: string;
  website: string;
  par: number;
  teeInfo: Record<TeeName, TeeData>;
  holes: Hole[];
}

// Herndon Centennial Golf Course
// Real tees (black/blue/white) sourced from BlueGolf + herndongolf.com scorecard.
// Diamond is a fictional tournament-style tee set (~7,700 yds) requested by the user —
// imagined forward-set tips that stretch every hole ~20–25% longer than Black.
export const COURSE: CourseInfo = {
  name: "Herndon Centennial Golf Course",
  address: "909 Ferndale Ave, Herndon, VA 20170",
  phone: "(703) 471-5769",
  website: "https://www.herndongolf.com",
  par: 71,
  teeInfo: {
    diamond: { yards: 7710, rating: 74.6, slope: 142 },
    black:   { yards: 6197, rating: 69.7, slope: 126 },
    blue:    { yards: 5774, rating: 68.1, slope: 122 },
    white:   { yards: 5295, rating: 67.2, slope: 115 },
  },
  holes: [
    // Front Nine
    {
      number: 1, par: 4, handicapIndex: 1,
      tees: { diamond: 510, black: 410, blue: 395, white: 375 },
      heading: 180, dogleg: 0, doglegAt: 0,
      description: "Straight par 4. Challenging opener with out of bounds right.",
    },
    {
      number: 2, par: 4, handicapIndex: 9,
      tees: { diamond: 460, black: 381, blue: 327, white: 305 },
      heading: 90, dogleg: -15, doglegAt: 0.55,
      description: "Slight dogleg left. Bunkers protect the green.",
    },
    {
      number: 3, par: 5, handicapIndex: 7,
      tees: { diamond: 625, black: 500, blue: 469, white: 440 },
      heading: 270, dogleg: 20, doglegAt: 0.5,
      description: "Reachable par 5 with dogleg right. Water left of green.",
    },
    {
      number: 4, par: 4, handicapIndex: 13,
      tees: { diamond: 440, black: 360, blue: 335, white: 312 },
      heading: 0, dogleg: 0, doglegAt: 0,
      description: "Short par 4. Accuracy off the tee is key.",
    },
    {
      number: 5, par: 3, handicapIndex: 15,
      tees: { diamond: 205, black: 166, blue: 157, white: 145 },
      heading: 135, dogleg: 0, doglegAt: 0,
      description: "Downhill par 3. Club selection is everything.",
    },
    {
      number: 6, par: 4, handicapIndex: 5,
      tees: { diamond: 450, black: 368, blue: 349, white: 325 },
      heading: 45, dogleg: -20, doglegAt: 0.45,
      description: "Dogleg left. Bunkers on the inside of the turn.",
    },
    {
      number: 7, par: 3, handicapIndex: 11,
      tees: { diamond: 215, black: 172, blue: 156, white: 140 },
      heading: 315, dogleg: 0, doglegAt: 0,
      description: "Uphill par 3. Green is well-bunkered.",
    },
    {
      number: 8, par: 4, handicapIndex: 3,
      tees: { diamond: 445, black: 363, blue: 343, white: 318 },
      heading: 225, dogleg: 15, doglegAt: 0.5,
      description: "Slight dogleg right. Tight driving hole.",
    },
    {
      number: 9, par: 4, handicapIndex: 17,
      tees: { diamond: 405, black: 330, blue: 300, white: 278 },
      heading: 90, dogleg: 0, doglegAt: 0,
      description: "Short par 4. Risk/reward approach to elevated green.",
    },
    // Back Nine
    {
      number: 10, par: 4, handicapIndex: 12,
      tees: { diamond: 425, black: 343, blue: 320, white: 295 },
      heading: 180, dogleg: 10, doglegAt: 0.5,
      description: "Gentle dogleg. Good start to the back nine.",
    },
    {
      number: 11, par: 4, handicapIndex: 2,
      tees: { diamond: 495, black: 402, blue: 379, white: 355 },
      heading: 270, dogleg: -15, doglegAt: 0.5,
      description: "Long par 4, dogleg left. Second hardest hole on course.",
    },
    {
      number: 12, par: 4, handicapIndex: 8,
      tees: { diamond: 505, black: 410, blue: 385, white: 360 },
      heading: 0, dogleg: 20, doglegAt: 0.45,
      description: "Dogleg right. Bunkers guard the right side.",
    },
    {
      number: 13, par: 4, handicapIndex: 6,
      tees: { diamond: 475, black: 386, blue: 361, white: 335 },
      heading: 135, dogleg: 0, doglegAt: 0,
      description: "Straight par 4. Tree-lined fairway.",
    },
    {
      number: 14, par: 3, handicapIndex: 18,
      tees: { diamond: 180, black: 136, blue: 117, white: 100 },
      heading: 45, dogleg: 0, doglegAt: 0,
      description: "Shortest hole on the course. Easiest handicap.",
    },
    {
      number: 15, par: 5, handicapIndex: 14,
      tees: { diamond: 600, black: 482, blue: 450, white: 420 },
      heading: 315, dogleg: -25, doglegAt: 0.4,
      description: "Long par 5 with sweeping dogleg left.",
    },
    {
      number: 16, par: 3, handicapIndex: 16,
      tees: { diamond: 175, black: 133, blue: 117, white: 105 },
      heading: 90, dogleg: 0, doglegAt: 0,
      description: "Short par 3 over water. Carry is everything.",
    },
    {
      number: 17, par: 5, handicapIndex: 10,
      tees: { diamond: 605, black: 485, blue: 455, white: 425 },
      heading: 180, dogleg: 15, doglegAt: 0.5,
      description: "Birdie opportunity. Slight dogleg right.",
    },
    {
      number: 18, par: 4, handicapIndex: 4,
      tees: { diamond: 495, black: 405, blue: 376, white: 350 },
      heading: 270, dogleg: -10, doglegAt: 0.55,
      description: "Finishing hole. Approach plays to an elevated green.",
    },
  ],
};

export const TEE_COLORS: Record<TeeName, string> = {
  diamond: "#a78bfa",   // purple-violet for the fictional tips
  black:   "#1a1a1a",
  blue:    "#1d4ed8",
  white:   "#e5e7eb",
};

export const TEE_LABELS: Record<TeeName, string> = {
  diamond: "Diamond (Tips)",
  black:   "Black",
  blue:    "Blue",
  white:   "White",
};
