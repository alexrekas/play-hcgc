"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { useAuth } from "@/lib/authContext";
import { COURSE, TEE_LABELS } from "@/data/course";
import { saveRound, getHandicapRecord } from "@/lib/firestore";
import { calcDifferential, calculateHandicapIndex, courseHandicap } from "@/lib/handicap";
import { getClubById } from "@/data/clubs";
import type { HandicapRecord, HoleScore } from "@/types";
import ThemeToggle from "@/components/ThemeToggle";

export default function ResultsPage() {
  const router  = useRouter();
  const { user } = useAuth();
  const { round, resetGame } = useGameStore();
  const [saved,     setSaved]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [hcpRecord, setHcpRecord] = useState<HandicapRecord | null>(null);
  const [expandedHole, setExpandedHole] = useState<number | null>(null);

  useEffect(() => {
    if (user && round?.completed) {
      getHandicapRecord(user.uid).then(setHcpRecord);
    }
  }, [user, round]);

  if (!round?.completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <p className="text-subtle">
          No completed round found.{" "}
          <button onClick={() => router.push("/")} className="underline text-primary">
            Go home
          </button>
        </p>
      </div>
    );
  }

  const teeInfo    = COURSE.teeInfo[round.tee];
  const diff       = calcDifferential(round.totalStrokes, teeInfo.rating, teeInfo.slope);
  const scoreToPar = round.totalStrokes - round.totalPar;
  const completedHoles = round.holes.filter((h) => h.completed);

  const allRounds  = hcpRecord ? [...hcpRecord.rounds, { ...round, differential: diff }] : [{ ...round, differential: diff }];
  const newIndex   = calculateHandicapIndex(allRounds as Parameters<typeof calculateHandicapIndex>[0]);
  const chp        = newIndex !== null ? courseHandicap(newIndex, teeInfo.slope, teeInfo.rating, COURSE.par) : null;

  async function handleSave() {
    if (!user || saved || !round) return;
    setSaving(true);
    try {
      await saveRound({ ...round, differential: diff } as import("@/types").Round);
      setSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function playAgain() {
    resetGame();
    router.push("/setup");
  }

  function sgColor(sg: number) {
    if (sg > 0.15) return "text-primary";
    if (sg < -0.15) return "text-danger";
    return "text-subtle";
  }

  return (
    <main className="min-h-screen bg-app text-app pb-12">
      <div className="bg-card border-b border-app px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Round Complete</h1>
          <p className="text-subtle text-sm">{COURSE.name}</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="max-w-md mx-auto px-4 mt-8 space-y-6">
        {/* Score summary */}
        <div className="bg-card border border-app rounded-2xl p-6 text-center">
          <p className="text-subtle text-sm mb-1">
            {completedHoles.length < 18 ? `${completedHoles.length} holes completed` : "18 holes"}
            {" · "}{TEE_LABELS[round.tee]} tees
          </p>
          <div className="text-7xl font-bold mb-2">{round.totalStrokes}</div>
          <p className={`text-2xl font-semibold ${scoreToPar > 0 ? "text-danger" : scoreToPar < 0 ? "text-warning" : "text-primary"}`}>
            {scoreToPar === 0 ? "Even par" : scoreToPar > 0 ? `+${scoreToPar}` : scoreToPar}
          </p>
          <p className="text-subtle text-sm mt-1">Par {round.totalPar}</p>
          {typeof round.totalStrokesGained === "number" && (
            <p className={`text-sm font-mono mt-2 ${sgColor(round.totalStrokesGained)}`}>
              Total Strokes Gained: {round.totalStrokesGained > 0 ? "+" : ""}{round.totalStrokesGained.toFixed(2)}
            </p>
          )}
        </div>

        {/* Handicap differential */}
        <div className="bg-card border border-app rounded-xl p-5 space-y-3">
          <h2 className="font-bold text-app">Score Analysis</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-accent rounded-lg p-3">
              <p className="text-subtle text-xs">Handicap Differential</p>
              <p className="font-bold text-xl">{diff.toFixed(1)}</p>
            </div>
            <div className="bg-accent rounded-lg p-3">
              <p className="text-subtle text-xs">Course Rating / Slope</p>
              <p className="font-bold text-xl">{teeInfo.rating} / {teeInfo.slope}</p>
            </div>
            {newIndex !== null && (
              <>
                <div className="bg-accent rounded-lg p-3">
                  <p className="text-subtle text-xs">New Handicap Index</p>
                  <p className="font-bold text-xl">{newIndex.toFixed(1)}</p>
                </div>
                <div className="bg-accent rounded-lg p-3">
                  <p className="text-subtle text-xs">Course Handicap</p>
                  <p className="font-bold text-xl">{chp}</p>
                </div>
              </>
            )}
          </div>
          {!user && (
            <p className="text-subtle text-xs text-center">
              Sign in to save rounds and track your handicap over time.
            </p>
          )}
          {newIndex === null && user && (
            <p className="text-subtle text-xs text-center">
              Play {3 - allRounds.length > 0 ? 3 - allRounds.length : 0} more round{allRounds.length < 3 ? "s" : ""} to establish your handicap index.
            </p>
          )}
        </div>

        {/* Hole-by-hole (expandable to show shots) */}
        <div className="bg-card border border-app rounded-xl overflow-hidden">
          <div className="bg-accent px-4 py-2 font-semibold text-sm">Hole by Hole (tap to view shots)</div>
          <div>
            {completedHoles.map((h: HoleScore) => {
              const expanded = expandedHole === h.holeNumber;
              const diff = h.strokes - h.par;
              const holeSG = h.shots.reduce((s, x) => s + x.strokesGained, 0);
              return (
                <div key={h.holeNumber} className="border-t border-app">
                  <button
                    onClick={() => setExpandedHole(expanded ? null : h.holeNumber)}
                    className="w-full px-4 py-2 flex justify-between items-center text-sm hover:bg-accent transition-colors"
                  >
                    <span className="font-semibold w-8 text-left">{h.holeNumber}</span>
                    <span className="text-subtle w-10">Par {h.par}</span>
                    <span className="font-bold w-8 text-center">{h.strokes}</span>
                    <span className={`w-10 text-center ${diff > 0 ? "text-danger" : diff < 0 ? "text-warning" : "text-primary"}`}>
                      {diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff}
                    </span>
                    <span className={`w-14 text-right text-xs font-mono ${sgColor(holeSG)}`}>
                      {holeSG > 0 ? "+" : ""}{holeSG.toFixed(2)}
                    </span>
                    <span className="text-primary text-xs w-6 text-right">{expanded ? "▾" : "▸"}</span>
                  </button>
                  {expanded && (
                    <div className="bg-accent/50 px-4 py-3 space-y-1 text-xs">
                      {h.shots.length === 0 ? (
                        <p className="text-subtle">No shots recorded.</p>
                      ) : (
                        <>
                          <div className="grid grid-cols-6 gap-1 text-subtle font-semibold border-b border-app pb-1">
                            <span>#</span>
                            <span>Club</span>
                            <span>Dist</span>
                            <span>Offline</span>
                            <span>Left</span>
                            <span className="text-right">SG</span>
                          </div>
                          {h.shots.map((s, i) => {
                            const club = getClubById(s.clubId);
                            return (
                              <div key={i} className="grid grid-cols-6 gap-1 text-app">
                                <span className="text-subtle">{i + 1}</span>
                                <span className="font-semibold">{club?.shortName ?? "?"}</span>
                                <span>{s.distanceYards}y</span>
                                <span className="text-subtle">
                                  {s.offlineYards === 0 ? "—" : `${Math.abs(s.offlineYards)}y ${s.offlineYards > 0 ? "R" : "L"}`}
                                </span>
                                <span>{s.remainingYards}y</span>
                                <span className={`text-right font-mono ${sgColor(s.strokesGained)}`}>
                                  {s.strokesGained > 0 ? "+" : ""}{s.strokesGained.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                          <div className="pt-1 mt-1 border-t border-app flex justify-between text-subtle">
                            <span>Putts: {h.putts}</span>
                            <button
                              onClick={() => router.push(`/hole/${h.holeNumber}`)}
                              className="text-primary underline"
                            >
                              Edit hole
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {user && !saved && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold transition-colors"
            >
              {saving ? "Saving…" : "Save Round to My Profile"}
            </button>
          )}
          {saved && (
            <p className="text-center text-primary font-semibold">Round saved!</p>
          )}
          <button
            onClick={playAgain}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
          >
            Play Again
          </button>
          {user && (
            <button
              onClick={() => router.push("/history")}
              className="w-full py-3 rounded-xl bg-accent text-app font-semibold border border-app transition-colors"
            >
              View All Rounds
            </button>
          )}
          <button
            onClick={() => router.push("/")}
            className="w-full py-2 text-subtle hover:text-app text-sm transition-colors"
          >
            Home
          </button>
        </div>
      </div>
    </main>
  );
}
