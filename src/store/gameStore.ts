"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Round, HoleScore, ShotResult } from "@/types";
import type { TeeName } from "@/data/course";
import { COURSE } from "@/data/course";
import { nanoid } from "@/lib/nanoid";

interface GameState {
  round: Round | null;
  currentHole: number;

  startRound: (tee: TeeName, userId: string | null) => void;
  addShot: (shot: ShotResult) => void;
  replaceShots: (holeNumber: number, shots: ShotResult[]) => void;
  completeHole: (holeNumber: number, putts: number) => void;
  reopenHole: (holeNumber: number) => void;
  setCurrentHole: (n: number) => void;
  advanceHole: () => void;
  endRound: () => Round | null;
  resetGame: () => void;
}

function recalcHoleStrokes(h: HoleScore): HoleScore {
  const strokes = h.shots.length + h.putts;
  return { ...h, strokes };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      round: null,
      currentHole: 1,

      startRound: (tee, userId) => {
        const holes: HoleScore[] = COURSE.holes.map((h) => ({
          holeNumber: h.number,
          par: h.par,
          strokes: 0,
          shots: [],
          putts: 0,
          completed: false,
        }));
        const round: Round = {
          id: nanoid(),
          userId,
          courseId: "herndon-centennial",
          tee,
          date: new Date().toISOString(),
          holes,
          completed: false,
          totalStrokes: 0,
          totalPar: 0,
        };
        set({ round, currentHole: 1 });
      },

      addShot: (shot) =>
        set((state) => {
          if (!state.round) return state;
          const holes = state.round.holes.map((h) =>
            h.holeNumber === shot.holeNumber
              ? recalcHoleStrokes({ ...h, shots: [...h.shots, shot] })
              : h
          );
          return { round: { ...state.round, holes } };
        }),

      replaceShots: (holeNumber, shots) =>
        set((state) => {
          if (!state.round) return state;
          const holes = state.round.holes.map((h) =>
            h.holeNumber === holeNumber
              ? recalcHoleStrokes({ ...h, shots })
              : h
          );
          return { round: { ...state.round, holes } };
        }),

      completeHole: (holeNumber, putts) =>
        set((state) => {
          if (!state.round) return state;
          const holes = state.round.holes.map((h) =>
            h.holeNumber === holeNumber
              ? recalcHoleStrokes({ ...h, putts, completed: true })
              : h
          );
          return { round: { ...state.round, holes } };
        }),

      reopenHole: (holeNumber) =>
        set((state) => {
          if (!state.round) return state;
          const holes = state.round.holes.map((h) =>
            h.holeNumber === holeNumber ? { ...h, completed: false } : h
          );
          return { round: { ...state.round, holes } };
        }),

      setCurrentHole: (n) => set({ currentHole: Math.max(1, Math.min(18, n)) }),

      advanceHole: () =>
        set((state) => ({ currentHole: Math.min(state.currentHole + 1, 18) })),

      endRound: () => {
        const { round } = get();
        if (!round) return null;
        const completedHoles = round.holes.filter((h) => h.completed);
        const totalStrokes = completedHoles.reduce((s, h) => s + h.strokes, 0);
        const totalPar     = completedHoles.reduce((s, h) => s + h.par, 0);
        const totalStrokesGained = completedHoles.reduce(
          (s, h) => s + h.shots.reduce((ss, sh) => ss + sh.strokesGained, 0),
          0
        );
        const finished: Round = {
          ...round,
          completed: true,
          totalStrokes,
          totalPar,
          totalStrokesGained: Math.round(totalStrokesGained * 100) / 100,
        };
        set({ round: finished });
        return finished;
      },

      resetGame: () => set({ round: null, currentHole: 1 }),
    }),
    {
      name: "hcgc-game",
      partialize: (s) => ({ round: s.round, currentHole: s.currentHole }),
    }
  )
);
