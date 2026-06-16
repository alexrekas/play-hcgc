"use client";
export const dynamic = "force-dynamic";
import { useState, useCallback, useEffect, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { useProfile } from "@/lib/profileContext";
import { COURSE } from "@/data/course";
import HoleDiagram from "@/components/HoleDiagram";
import { buildShotResult } from "@/lib/shotEngine";
import { CLUBS, suggestClub, getClubById, CLUBS_BY_CATEGORY, effectiveAvgYards } from "@/data/clubs";
import type { LieType } from "@/types";
import ThemeToggle from "@/components/ThemeToggle";
import { scoreName, scoreNameClass } from "@/lib/scoring";
import { HOLE_SVG_LAYOUTS } from "@/data/holeSvgLayouts";

const LIE_LABELS: Record<LieType, string> = {
  tee: "Tee Box",
  fairway: "Fairway",
  rough: "Rough",
  bunker: "Sand",
  fringe: "Fringe",
  green: "Green",
  water: "Water",
  ob: "Out of Bounds",
};

const LIE_COLORS: Record<LieType, string> = {
  tee: "text-yellow-500",
  fairway: "text-green-600 dark:text-green-400",
  rough: "text-green-700 dark:text-green-500",
  bunker: "text-yellow-600 dark:text-yellow-400",
  fringe: "text-emerald-500 dark:text-emerald-200",
  green: "text-emerald-600 dark:text-emerald-300",
  water: "text-blue-600 dark:text-blue-400",
  ob: "text-red-600 dark:text-red-400",
};

const RESULT_LIES: LieType[] = ["fairway", "rough", "bunker", "fringe", "green", "water", "ob"];

// Inverse of shotEngine's computeNewPosition. Given a tap target in normalized
// canvas coords, returns the (aim, distance) pair that would project the ball
// from the current position to the target.
//
//   computeNewPosition does:
//     newY = prevY + yFraction * cos(angle)
//     newX = prevX + (yFraction * sin(angle)) / canvasAspect
//   so inversely:
//     dy = target.y - prevY
//     dx = (target.x - prevX) * canvasAspect
//     yFraction = sqrt(dy² + dx²); aim = atan2(dx, dy)
//     distance = yFraction * holeLengthYards
const CANVAS_ASPECT_DEFAULT = 2.5;

function targetToShot(
  prevX: number, prevY: number,
  target: { x: number; y: number },
  holeLengthYards: number,
) {
  const dy = target.y - prevY;
  const dx = (target.x - prevX) * CANVAS_ASPECT_DEFAULT;
  const yFraction = Math.sqrt(dy * dy + dx * dx);
  const aimAngleDeg = Math.atan2(dx, dy) * (180 / Math.PI);
  const distanceYards = yFraction * holeLengthYards;
  return { aimAngleDeg, distanceYards: Math.max(0, distanceYards) };
}

function sgColor(sg: number) {
  if (sg > 0.15) return "text-green-600 dark:text-green-400";
  if (sg < -0.15) return "text-red-600 dark:text-red-400";
  return "text-subtle";
}

export default function HolePage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = use(params);
  const holeNum = parseInt(n, 10);
  const router  = useRouter();

  const { round, addShot, replaceShots, completeHole, reopenHole, advanceHole, endRound, setCurrentHole } = useGameStore();
  const { gender, bag, clubAverages } = useProfile();

  const hole      = COURSE.holes.find((h) => h.number === holeNum);
  const holeScore = round?.holes.find((h) => h.holeNumber === holeNum);

  useEffect(() => {
    if (hole) setCurrentHole(holeNum);
  }, [holeNum, hole, setCurrentHole]);

  const shots = useMemo(() => holeScore?.shots ?? [], [holeScore?.shots]);
  const lastShot = shots[shots.length - 1];
  const teeStart = HOLE_SVG_LAYOUTS[holeNum]?.tee ?? { x: 0.5, y: 0.03 };
  const currentPos = lastShot
    ? { x: lastShot.posX, y: lastShot.posY }
    : teeStart;
  const currentLie: LieType = lastShot ? lastShot.resultLie : "tee";
  const shotCount = shots.length + 1;

  // Tap target (controlled by the diagram via onTargetChange).
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const [clubId, setClubId] = useState<string>("");

  // Reset target when the player advances (currentPos changes).
  useEffect(() => { setTarget(null); }, [currentPos.x, currentPos.y]);

  // Two-step UI: tap target → Hit Shot stages → lie picker → finalize.
  const [pending, setPending] = useState<null | {
    clubId: string; distance: number; aim: number;
  }>(null);

  const [showEndConfirm,  setShowEndConfirm]  = useState(false);
  const [clubPickerOpen,  setClubPickerOpen]  = useState(false);

  const onTargetChange = useCallback((t: { x: number; y: number } | null) => {
    setTarget(t);
  }, []);

  if (!hole || !round) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <p className="text-subtle">Loading…</p>
      </div>
    );
  }

  const yardage        = hole.tees[round.tee];
  const remainingYards = lastShot ? lastShot.remainingYards : yardage;
  const onGreen        = currentLie === "green";

  // Distance / aim derived from the current tap target.
  const computed = target
    ? targetToShot(currentPos.x, currentPos.y, target, yardage)
    : null;
  const targetDist = computed ? Math.round(computed.distanceYards) : null;

  const suggestedClub = suggestClub(remainingYards, gender, onGreen, bag, clubAverages);
  const selectedClubId = clubId || suggestedClub.id;
  const selectedClub   = getClubById(selectedClubId) ?? suggestedClub;

  const holeDone = holeScore?.completed === true;
  const readyForPutts = onGreen && !holeDone;

  const completedHoles = round.holes.filter((h) => h.completed);
  const runningTotal   = completedHoles.reduce((s, h) => s + h.strokes, 0);
  const runningPar     = completedHoles.reduce((s, h) => s + h.par, 0);
  const scoreToPar     = runningTotal - runningPar;
  const scoreLabel     = scoreToPar === 0 ? "E" : scoreToPar > 0 ? `+${scoreToPar}` : `${scoreToPar}`;
  const scoreColor     = scoreToPar > 0 ? "text-danger" : scoreToPar < 0 ? "text-warning" : "text-primary";

  const bagClubs = bag.length > 0 ? CLUBS.filter((c) => bag.includes(c.id)) : CLUBS;

  function stageShot() {
    if (!computed || computed.distanceYards <= 0) return;
    setPending({
      clubId: selectedClubId,
      distance: computed.distanceYards,
      aim: computed.aimAngleDeg,
    });
  }

  function finalizeShot(resultLie: LieType) {
    if (!pending) return;
    const shot = buildShotResult({
      holeNumber: holeNum,
      shotNumber: shotCount,
      clubId: pending.clubId,
      prevX: currentPos.x,
      prevY: currentPos.y,
      prevLie: currentLie,
      prevRemaining: remainingYards,
      aimAngleDeg: pending.aim,
      distanceYards: pending.distance,
      offlineYards: 0,
      holeLengthYards: yardage,
      holePar: hole!.par as 3 | 4 | 5,
      resultLie,
      shotShape: "straight",
      holeOut: false,
    });
    addShot(shot);
    setTarget(null);
    setClubId("");
    setPending(null);
  }

  function cancelPending() {
    setPending(null);
  }

  function handleDeleteLastShot() {
    if (shots.length === 0) return;
    replaceShots(holeNum, shots.slice(0, -1));
    setTarget(null);
  }

  function handleRecordPutts(numPutts: number) {
    completeHole(holeNum, numPutts);
  }

  function handleReopenHole() {
    reopenHole(holeNum);
  }

  function handleEndRound() {
    const finished = endRound();
    if (finished) router.push("/results");
  }

  // -------- Bottom-card mode selector --------
  // Mode: completed | pending | putts | input
  const mode: "completed" | "pending" | "putts" | "input" =
    holeDone ? "completed"
    : pending ? "pending"
    : readyForPutts ? "putts"
    : "input";

  return (
    <main className="h-[100dvh] bg-app text-app flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="bg-card border-b border-app px-3 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push("/scorecard")}
            className="text-primary hover:opacity-80 text-xs font-semibold border border-app rounded-lg px-2 py-1"
          >
            Scorecard
          </button>
          <span className="font-bold text-sm">Hole {holeNum}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setShowEndConfirm(true)}
            className="text-danger hover:opacity-80 text-xs border border-app rounded px-2 py-1"
          >
            End
          </button>
        </div>
      </div>

      {/* Nav strip */}
      <div className="bg-accent border-b border-app px-3 py-1 flex items-center justify-between text-xs shrink-0">
        <button
          disabled={holeNum <= 1}
          onClick={() => router.push(`/hole/${holeNum - 1}`)}
          className="text-primary disabled:opacity-30 font-semibold py-1 px-1"
        >
          ← Prev
        </button>
        <span className="text-subtle">Shot {shotCount}{holeDone ? " · Completed" : ""}</span>
        <button
          disabled={holeNum >= 18}
          onClick={() => router.push(`/hole/${holeNum + 1}`)}
          className="text-primary disabled:opacity-30 font-semibold py-1 px-1"
        >
          Next →
        </button>
      </div>

      {/* Full-bleed diagram with overlays */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
          <HoleDiagram
            hole={hole}
            shots={shots}
            currentPos={currentPos}
            target={target}
            onTargetChange={onTargetChange}
            targetDistanceYards={targetDist}
            fill
          />
        </div>

        {/* Top-left: hole stats */}
        <div className="absolute top-2 left-2 z-10 bg-card/90 backdrop-blur border border-app rounded-xl px-3 py-2 shadow">
          <div className="flex items-baseline gap-2">
            <span className="text-app text-2xl font-extrabold leading-none">{holeNum}</span>
            <span className="text-subtle text-[10px] uppercase tracking-wider">Hole</span>
          </div>
          <div className="text-app text-xs mt-1 font-semibold">Par {hole.par}</div>
          <div className="text-app text-xs font-mono">{yardage} yds</div>
          <div className="text-subtle text-[10px] uppercase tracking-wider">SI {hole.handicapIndex}</div>
        </div>

        {/* Top-right: score to par */}
        <div className="absolute top-2 right-2 z-10 bg-card/90 backdrop-blur border border-app rounded-xl px-3 py-2 shadow text-right">
          <div className="text-subtle text-[10px] uppercase tracking-wider">Thru {completedHoles.length}</div>
          <div className={`text-2xl font-extrabold leading-none mt-1 ${scoreColor}`}>{scoreLabel}</div>
          <div className="text-subtle text-[10px] mt-1 font-mono">{runningTotal || 0} strokes</div>
        </div>

        {/* Lie indicator (small, bottom-left above the bottom card) */}
        <div className="absolute left-2 bottom-[calc(env(safe-area-inset-bottom)+9rem)] z-10 bg-card/80 backdrop-blur border border-app rounded-lg px-2 py-1 text-[10px] shadow">
          <span className="text-subtle uppercase tracking-wider">Lie </span>
          <span className={`font-semibold ${LIE_COLORS[currentLie]}`}>{LIE_LABELS[currentLie]}</span>
          <span className="text-subtle"> · {remainingYards}y left</span>
        </div>

        {/* Bottom card — mode-dependent */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-card/95 backdrop-blur border-t border-app shadow-lg">
          <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
            {mode === "completed" && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-subtle text-[10px] uppercase tracking-wider">Hole Complete</p>
                    <p className={`font-bold text-xl ${scoreNameClass(holeScore!.strokes, hole.par)}`}>
                      {scoreName(holeScore!.strokes, hole.par)}
                    </p>
                    <p className="text-subtle text-xs">
                      {holeScore!.strokes} strokes · {shots.length} shot{shots.length === 1 ? "" : "s"} + {holeScore!.putts} putt{holeScore!.putts === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button onClick={handleReopenHole} className="text-primary text-xs underline">
                    Edit hole
                  </button>
                </div>
                {holeNum < 18 ? (
                  <button
                    onClick={() => { advanceHole(); router.push(`/hole/${holeNum + 1}`); }}
                    className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    Next Hole →
                  </button>
                ) : (
                  <button
                    onClick={handleEndRound}
                    className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    Finish Round
                  </button>
                )}
              </div>
            )}

            {mode === "pending" && (
              <div className="space-y-2">
                <p className="text-subtle text-[10px] uppercase tracking-wider">Where did it land?</p>
                <p className="text-app text-xs">
                  {getClubById(pending!.clubId)?.shortName} · {Math.round(pending!.distance)}y
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {RESULT_LIES.map((lie) => (
                    <button
                      key={lie}
                      onClick={() => finalizeShot(lie)}
                      className={`py-2 rounded-lg font-semibold text-xs border border-app bg-accent hover:bg-green-600 hover:text-white transition-colors ${LIE_COLORS[lie]}`}
                    >
                      {LIE_LABELS[lie]}
                    </button>
                  ))}
                </div>
                <button onClick={cancelPending} className="text-subtle hover:text-app text-[10px] underline">
                  Cancel — re-aim
                </button>
              </div>
            )}

            {mode === "putts" && (
              <div className="space-y-2">
                <p className="text-app font-semibold text-sm">On the green — how many putts?</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0, 1, 2, 3, 4].map((p) => (
                    <button
                      key={p}
                      onClick={() => handleRecordPutts(p)}
                      className="py-3 rounded-xl font-bold text-lg border border-app bg-accent text-app hover:bg-green-600 hover:text-white"
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <p className="text-subtle text-[10px] text-center">0 if you holed out from off the green.</p>
              </div>
            )}

            {mode === "input" && (
              <div className="space-y-2">
                {/* Club chip + distance row */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setClubPickerOpen((v) => !v)}
                    className="flex-1 bg-accent text-app border border-app rounded-lg px-3 py-2 text-left flex justify-between items-center min-w-0"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-bold">{selectedClub.shortName}</span>
                      {selectedClub.category !== "putter" && (
                        <span className="text-subtle text-xs"> · {effectiveAvgYards(selectedClub, gender, clubAverages)}y avg</span>
                      )}
                      {!clubId && (
                        <span className="text-subtle text-[10px] ml-1">(suggested)</span>
                      )}
                    </span>
                    <span className="text-subtle text-xs ml-2">{clubPickerOpen ? "▾" : "▸"}</span>
                  </button>
                  <div className="text-right shrink-0">
                    <div className="text-subtle text-[10px] uppercase tracking-wider leading-none">Target</div>
                    <div className="text-app text-2xl font-extrabold font-mono leading-tight">
                      {targetDist !== null ? `${targetDist}y` : "—"}
                    </div>
                  </div>
                </div>

                {clubPickerOpen && (
                  <div className="bg-app border border-app rounded-lg p-2 max-h-48 overflow-y-auto space-y-2">
                    {(["wood", "iron", "wedge", "putter"] as const).map((cat) => {
                      const list = CLUBS_BY_CATEGORY[cat].filter((c) =>
                        bag.length === 0 || bag.includes(c.id)
                      );
                      if (list.length === 0) return null;
                      return (
                        <div key={cat}>
                          <p className="text-subtle text-[10px] uppercase tracking-wider mb-1">
                            {cat === "wood" ? "Woods" : cat === "iron" ? "Irons" : cat === "wedge" ? "Wedges" : "Putter"}
                          </p>
                          <div className="grid grid-cols-4 gap-1">
                            {list.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => { setClubId(c.id); setClubPickerOpen(false); }}
                                className={`px-2 py-1.5 rounded text-left text-[11px] border ${
                                  c.id === selectedClubId
                                    ? "border-green-500 bg-accent text-app"
                                    : "border-app bg-card text-app hover:border-green-400"
                                }`}
                              >
                                <div className="font-bold">{c.shortName}</div>
                                {c.category !== "putter" && (
                                  <div className="text-subtle text-[10px]">{effectiveAvgYards(c, gender, clubAverages)}y</div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {bagClubs.length === 0 && (
                      <p className="text-subtle text-xs p-2">No clubs in your bag.</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={stageShot}
                    disabled={!target || (targetDist ?? 0) <= 0}
                    className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold text-base"
                  >
                    Hit Shot
                  </button>
                  {shots.length > 0 && (
                    <button
                      onClick={handleDeleteLastShot}
                      title="Undo last shot"
                      className="px-3 py-3 rounded-xl bg-accent text-subtle border border-app text-xs"
                    >
                      Undo
                    </button>
                  )}
                </div>

                {!target && (
                  <p className="text-subtle text-[10px] text-center">
                    Tap the map to set your target — distance updates live.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* End round confirm modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-app rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-xl font-bold text-app">End Round Early?</h2>
            <p className="text-muted text-sm">
              Your score for completed holes will be recorded.
              You&apos;ve completed {completedHoles.length} of 18 holes.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-accent text-app font-semibold border border-app"
              >
                Keep Playing
              </button>
              <button
                onClick={handleEndRound}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                End Round
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suppress unused-import noise; sgColor stays available for future shot list UI */}
      <span className="hidden">{sgColor(0)}</span>
    </main>
  );
}
