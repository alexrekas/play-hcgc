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
import type { LieType, ReliefOption, ShotResult } from "@/types";
import { scoreName, scoreNameClass, toParClass } from "@/lib/scoring";
import { HOLE_SVG_LAYOUTS } from "@/data/holeSvgLayouts";
import { detectLie } from "@/lib/lieDetect";
import { teePosition, yardsBetween, yardsToPin, aimAngleDeg as aimBetween, hasGeometry } from "@/lib/holeGeometry";
import { planRelief, lieAtDrop, reliefOptionsFor, RELIEF_LABELS, RELIEF_PENALTY } from "@/lib/relief";
import { strokesGained } from "@/lib/strokesGained";

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

// Small swatch in the hole artwork's own colour for each lie, so the button
// and the map agree. Text stays plain ink for legibility.
const LIE_SWATCH: Record<LieType, string> = {
  tee: "bg-lie-green",
  fairway: "bg-lie-fairway",
  rough: "bg-lie-rough",
  bunker: "bg-lie-sand",
  fringe: "bg-lie-fringe",
  green: "bg-lie-green",
  water: "bg-lie-water",
  ob: "bg-lie-ob",
};

function LieSwatch({ lie }: { lie: LieType }) {
  return (
    <span
      aria-hidden
      className={`inline-block w-2.5 h-2.5 rounded-full border border-black/20 shrink-0 ${LIE_SWATCH[lie]}`}
    />
  );
}

// Lie picker: the three most common results get the big buttons; the rest sit
// in a smaller second row.
const PRIMARY_LIES:   LieType[] = ["fairway", "rough", "green"];
const SECONDARY_LIES: LieType[] = ["bunker", "fringe", "water", "ob"];

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
  // Tee shot starts on the selected tee set's markers (Diamond uses Black's).
  const teeStart =
    (round && teePosition(holeNum, round.tee)) ??
    HOLE_SVG_LAYOUTS[holeNum]?.tee ?? { x: 0.5, y: 0.03 };
  // After a penalty the next shot starts from the drop / re-hit spot.
  const currentPos = lastShot
    ? (lastShot.relief
        ? { x: lastShot.relief.posX, y: lastShot.relief.posY }
        : { x: lastShot.posX, y: lastShot.posY })
    : teeStart;
  const currentLie: LieType = lastShot ? (lastShot.relief?.lie ?? lastShot.resultLie) : "tee";
  const shotCount = shots.length + 1;

  // Aim target — set during "input" mode.
  const [target,  setTarget]  = useState<{ x: number; y: number } | null>(null);
  // Landing position — set during "pending" (lie-picker) mode. Defaults to the
  // aim target when the player stages the shot; re-tapping the map updates it.
  const [landing, setLanding] = useState<{ x: number; y: number } | null>(null);
  const [clubId,  setClubId]  = useState<string>("");

  // Reset target+landing when the player advances (currentPos changes).
  useEffect(() => { setTarget(null); setLanding(null); }, [currentPos.x, currentPos.y]);

  // Two-step UI: tap target → Hit Shot stages → tap landing + pick lie → finalize.
  const [pending, setPending] = useState<null | {
    clubId: string; distance: number; aim: number;
  }>(null);

  const [showEndConfirm,  setShowEndConfirm]  = useState(false);
  const [clubPickerOpen,  setClubPickerOpen]  = useState(false);
  // Lie the player picked by hand in the lie picker. null = use the lie
  // detected from the map under the landing marker.
  const [lieOverride, setLieOverride] = useState<LieType | null>(null);

  // Penalty relief (ball in water / out of bounds). Holds the shot that went
  // in until the player picks how to continue and, for a drop, where.
  const [relief, setRelief] = useState<null | {
    draft: ShotResult;
    hazard: "water" | "ob";
    from: { x: number; y: number };
    fromLie: LieType;
    fromRemaining: number;
    landing: { x: number; y: number };
    pendingBefore: { clubId: string; distance: number; aim: number };
    option: ReliefOption | null;
    spot: { x: number; y: number } | null;
  }>(null);

  const reliefPlan = useMemo(() => {
    if (!relief?.option || !round) return null;
    return planRelief({
      hole: holeNum, tee: round.tee, option: relief.option,
      from: relief.from, landing: relief.landing, hazard: relief.hazard,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relief?.option, relief?.landing, relief?.from, relief?.hazard, holeNum, round?.tee]);

  // Route map taps based on mode: in pending mode they set the landing
  // position (and drop any hand-picked lie so detection follows the new
  // spot); otherwise they set the aim target.
  const onTargetChange = useCallback((t: { x: number; y: number } | null) => {
    if (relief) {
      // While choosing a drop, taps place the ball inside the allowed area.
      if (t && reliefPlan && relief.option !== "rehit") {
        const spot = reliefPlan.snap(t);
        setRelief((r) => (r ? { ...r, spot } : r));
      }
      return;
    }
    if (pending) { setLanding(t); setLieOverride(null); }
    else         setTarget(t);
  }, [pending, relief, reliefPlan]);

  if (!hole || !round) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <p className="text-subtle">Loading…</p>
      </div>
    );
  }

  const yardage        = hole.tees[round.tee];
  const remainingYards = lastShot ? (lastShot.relief?.remainingYards ?? lastShot.remainingYards) : yardage;
  const onGreen        = currentLie === "green";

  // Straight-line yards between two map points, scaled so the selected tee →
  // pin is the scorecard yardage. Falls back to the old projection for any
  // hole without geometry data.
  function shotBetween(from: { x: number; y: number }, to: { x: number; y: number }) {
    const yards = yardsBetween(holeNum, round!.tee, from, to);
    if (yards === null) return targetToShot(from.x, from.y, to, yardage);
    return { aimAngleDeg: aimBetween(from, to), distanceYards: yards };
  }

  // Distance / aim derived from the current tap target.
  const computed = target ? shotBetween(currentPos, target) : null;
  const targetDist = computed ? Math.round(computed.distanceYards) : null;
  // Distance to the landing marker (live in the lie-picker phase).
  const landingDist = landing ? Math.round(shotBetween(currentPos, landing).distanceYards) : null;

  const suggestedClub = suggestClub(remainingYards, gender, onGreen, bag, clubAverages);
  const selectedClubId = clubId || suggestedClub.id;
  const selectedClub   = getClubById(selectedClubId) ?? suggestedClub;

  // Lie under the landing marker, read from the hole artwork. Pre-selects the
  // lie button; the player confirms or changes it.
  const detectedLie = pending ? detectLie(holeNum, landing ?? target) : null;
  const chosenLie: LieType | null = lieOverride ?? detectedLie;

  const holeDone = holeScore?.completed === true;
  const penaltyCount = shots.reduce((n, sh) => n + (sh.penaltyStrokes ?? 0), 0);
  const readyForPutts = onGreen && !holeDone;

  const completedHoles = round.holes.filter((h) => h.completed);
  const runningTotal   = completedHoles.reduce((s, h) => s + h.strokes, 0);
  const runningPar     = completedHoles.reduce((s, h) => s + h.par, 0);
  const scoreToPar     = runningTotal - runningPar;
  const scoreLabel     = scoreToPar === 0 ? "E" : scoreToPar > 0 ? `+${scoreToPar}` : `${scoreToPar}`;
  const scoreColor     = toParClass(scoreToPar);

  const bagClubs = bag.length > 0 ? CLUBS.filter((c) => bag.includes(c.id)) : CLUBS;

  function stageShot() {
    if (!computed || computed.distanceYards <= 0 || !target) return;
    setPending({
      clubId: selectedClubId,
      distance: computed.distanceYards,
      aim: computed.aimAngleDeg,
    });
    // Default the landing marker to the aim target; the player can drag it
    // to refine where the ball actually came down.
    setLanding(target);
    setLieOverride(null);
  }

  function finalizeShot(resultLie: LieType) {
    if (!pending) return;
    // Recompute aim + distance from the (possibly re-tapped) landing point so
    // the projected ball position lands exactly where the player indicated.
    const finalSpot = landing ?? target;
    const projected = finalSpot
      ? shotBetween(currentPos, finalSpot)
      : { aimAngleDeg: pending.aim, distanceYards: pending.distance };
    const toPin = finalSpot ? yardsToPin(holeNum, round!.tee, finalSpot) : null;
    const shot = buildShotResult({
      holeNumber: holeNum,
      shotNumber: shotCount,
      clubId: pending.clubId,
      prevX: currentPos.x,
      prevY: currentPos.y,
      prevLie: currentLie,
      prevRemaining: remainingYards,
      aimAngleDeg: projected.aimAngleDeg,
      distanceYards: projected.distanceYards,
      offlineYards: 0,
      holeLengthYards: yardage,
      holePar: hole!.par as 3 | 4 | 5,
      resultLie,
      shotShape: "straight",
      holeOut: false,
      landing: finalSpot && toPin !== null ? finalSpot : undefined,
      remainingOverride: toPin ?? undefined,
    });
    // In the water or out of bounds: don't record yet — the player picks how
    // to continue (re-hit or drop) and the penalty is added then.
    if ((resultLie === "water" || resultLie === "ob") && finalSpot && hasGeometry(holeNum)) {
      setRelief({
        draft: shot,
        hazard: resultLie,
        from: currentPos,
        fromLie: currentLie,
        fromRemaining: remainingYards,
        landing: finalSpot,
        pendingBefore: pending,
        option: null,
        spot: null,
      });
      setPending(null);
      setLieOverride(null);
      return;
    }
    addShot(shot);
    setTarget(null);
    setLanding(null);
    setClubId("");
    setPending(null);
    setLieOverride(null);
  }

  function chooseRelief(option: ReliefOption) {
    if (!relief || !round) return;
    if (option === "rehit") { commitRelief(option, relief.from); return; }
    const plan = planRelief({
      hole: holeNum, tee: round.tee, option,
      from: relief.from, landing: relief.landing, hazard: relief.hazard,
    });
    setRelief({ ...relief, option, spot: plan.defaultSpot });
  }

  function commitRelief(option: ReliefOption, spot: { x: number; y: number }) {
    if (!relief || !round) return;
    const penalty = RELIEF_PENALTY[option];
    const rehit = option === "rehit";
    const lie: LieType = rehit ? relief.fromLie : lieAtDrop(holeNum, spot);
    const left = rehit
      ? relief.fromRemaining
      : Math.round(yardsToPin(holeNum, round.tee, spot) ?? relief.draft.remainingYards);
    // Strokes gained against where play actually continues, minus the penalty.
    const sg = strokesGained(relief.fromLie, relief.fromRemaining, lie, left, false, hole!.par as 3 | 4 | 5) - penalty;
    addShot({
      ...relief.draft,
      penaltyStrokes: penalty,
      strokesGained: Math.round(sg * 100) / 100,
      relief: { option, posX: spot.x, posY: spot.y, lie, remainingYards: left },
    });
    setRelief(null);
    setTarget(null);
    setLanding(null);
    setClubId("");
  }

  function backFromRelief() {
    if (!relief) return;
    if (relief.option) { setRelief({ ...relief, option: null, spot: null }); return; }
    // Not actually in the hazard: go back to the lie picker.
    setPending(relief.pendingBefore);
    setLanding(relief.landing);
    setLieOverride(null);
    setRelief(null);
  }

  function cancelPending() {
    setPending(null);
    setLanding(null);
    setLieOverride(null);
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
  const mode: "completed" | "relief" | "pending" | "putts" | "input" =
    holeDone ? "completed"
    : relief ? "relief"
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
            className="text-link hover:opacity-80 text-xs font-semibold border border-app rounded-lg px-2 py-1"
          >
            Scorecard
          </button>
          <span className="font-bold text-sm">Hole {holeNum}</span>
        </div>
        <div className="flex items-center gap-2">
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
          className="text-link disabled:opacity-30 font-semibold min-h-10 px-3 -mx-2"
        >
          ← Prev
        </button>
        <span className="text-muted font-semibold">
          Stroke {shotCount + penaltyCount}
          {penaltyCount > 0 && <span className="text-danger"> · {penaltyCount} penalty</span>}
          {holeDone ? " · Completed" : ""}
        </span>
        <button
          disabled={holeNum >= 18}
          onClick={() => router.push(`/hole/${holeNum + 1}`)}
          className="text-link disabled:opacity-30 font-semibold min-h-10 px-3 -mx-2"
        >
          Next →
        </button>
      </div>

      {/* Diagram area — fills remaining vertical space above the bottom card */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
          <HoleDiagram
            hole={hole}
            shots={shots}
            currentPos={currentPos}
            teePos={teeStart}
            target={target}
            landing={pending ? landing : relief ? relief.landing : null}
            dropZone={reliefPlan?.zone ?? null}
            dropSpot={relief?.option && relief.option !== "rehit" ? relief.spot : null}
            onTargetChange={onTargetChange}
            targetDistanceYards={targetDist}
            landingDistanceYards={landingDist}
            fill
          />
        </div>

        {/* Top-left: hole stats */}
        <div className="absolute top-2 left-2 z-10 bg-card border-2 border-app rounded-xl px-3 py-2 shadow-lg">
          <div className="flex items-baseline gap-2">
            <span className="text-app text-2xl font-extrabold leading-none">{holeNum}</span>
            <span className="text-muted text-[11px] uppercase tracking-wider font-semibold">Hole</span>
          </div>
          <div className="text-app text-xs mt-1 font-semibold">Par {hole.par}</div>
          <div className="text-app text-xs font-mono font-semibold">{yardage} yds</div>
          <div className="text-muted text-[11px] uppercase tracking-wider font-semibold">SI {hole.handicapIndex}</div>
        </div>

        {/* Top-right: score to par */}
        <div className="absolute top-2 right-2 z-10 bg-card border-2 border-app rounded-xl px-3 py-2 shadow-lg text-right">
          <div className="text-muted text-[11px] uppercase tracking-wider font-semibold">Thru {completedHoles.length}</div>
          <div className={`text-2xl font-extrabold leading-none mt-1 ${scoreColor}`}>{scoreLabel}</div>
          <div className="text-muted text-[11px] mt-1 font-mono font-semibold">{runningTotal || 0} strokes</div>
        </div>

        {/* Lie indicator — top-center under the nav strip (bottom corners are
            taken by zoom controls and the zoom-level readout). */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-card border-2 border-app rounded-lg px-2 py-1 text-[11px] shadow-lg whitespace-nowrap">
          <span className="text-muted uppercase tracking-wider font-semibold">Lie </span>
          <span className="inline-flex items-center gap-1 font-bold text-app align-middle"><LieSwatch lie={currentLie} />{LIE_LABELS[currentLie]}</span>
          <span className="text-app font-semibold"> · {remainingYards}y left</span>
        </div>
      </div>

      {/* Bottom card — in normal flow so the diagram above shrinks to fit */}
      <div className="bg-card border-t-2 border-app shadow-lg shrink-0">
        <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
            {mode === "completed" && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-muted text-[11px] uppercase tracking-wider font-semibold">Hole Complete</p>
                    <p className={`font-bold text-xl ${scoreNameClass(holeScore!.strokes, hole.par)}`}>
                      {scoreName(holeScore!.strokes, hole.par)}
                    </p>
                    <p className="text-muted text-xs">
                      {holeScore!.strokes} strokes · {shots.length} shot{shots.length === 1 ? "" : "s"} + {holeScore!.putts} putt{holeScore!.putts === 1 ? "" : "s"}
                      {penaltyCount > 0 && <> + {penaltyCount} penalty</>}
                    </p>
                  </div>
                  <button onClick={handleReopenHole} className="text-link text-xs underline font-semibold">
                    Edit hole
                  </button>
                </div>
                {holeNum < 18 ? (
                  <button
                    onClick={() => { advanceHole(); router.push(`/hole/${holeNum + 1}`); }}
                    className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold"
                  >
                    Next Hole →
                  </button>
                ) : (
                  <button
                    onClick={handleEndRound}
                    className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold"
                  >
                    Finish Round
                  </button>
                )}
              </div>
            )}

            {mode === "relief" && relief && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-app font-bold text-sm">
                    {relief.hazard === "water" ? "In the water" : "Out of bounds"}
                  </p>
                  <span className="text-danger text-xs font-bold">Penalty</span>
                </div>
                {relief.option === null ? (
                  <>
                    <div className="space-y-1.5">
                      {reliefOptionsFor(relief.hazard).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => chooseRelief(opt)}
                          className="w-full min-h-12 flex items-center gap-3 rounded-xl border-2 border-line-strong bg-card px-3 py-2 text-left hover:border-primary"
                        >
                          <span className="flex-1 min-w-0">
                            <span className="block font-bold text-sm text-app">{RELIEF_LABELS[opt].title}</span>
                            <span className="block text-[11px] text-muted leading-snug">{RELIEF_LABELS[opt].detail}</span>
                          </span>
                          <span className="shrink-0 rounded-md bg-accent px-2 py-1 text-xs font-bold text-danger">
                            +{RELIEF_PENALTY[opt]}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button onClick={backFromRelief} className="text-muted hover:text-app text-xs underline font-semibold">
                      Not {relief.hazard === "water" ? "in the water" : "out of bounds"}? Change the lie
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-muted text-xs">
                      {relief.option === "back-on-line"
                        ? "Tap anywhere on the dashed line to choose your drop."
                        : relief.option === "lateral"
                          ? "Tap inside the circle to choose your drop."
                          : "Tap along the dashed line to choose your drop."}
                      {" "}You can&apos;t drop nearer the hole or in the hazard.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={backFromRelief}
                        className="px-3 min-h-12 rounded-xl bg-accent text-subtle border border-app text-xs font-semibold"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => relief.spot && commitRelief(relief.option!, relief.spot)}
                        disabled={!relief.spot}
                        className="flex-1 min-h-12 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-on-primary font-bold text-base"
                      >
                        Drop here · +{RELIEF_PENALTY[relief.option]}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {mode === "pending" && (
              <div className="space-y-2">
                <p className="text-app text-xs text-center font-bold">
                  Tap where the ball landed, then confirm the lie.
                </p>
                <p className="text-muted text-[11px] text-center font-semibold">
                  {getClubById(pending!.clubId)?.shortName} · aimed {Math.round(pending!.distance)}y
                  {landingDist !== null && landingDist !== Math.round(pending!.distance) && (
                    <> · landed {landingDist}y</>
                  )}
                </p>
                <div role="radiogroup" aria-label="Lie" className="space-y-1.5">
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRIMARY_LIES.map((lie) => {
                      const on = chosenLie === lie;
                      return (
                        <button
                          key={lie}
                          role="radio"
                          aria-checked={on}
                          onClick={() => setLieOverride(lie)}
                          className={`min-h-12 flex items-center justify-center gap-1.5 rounded-xl font-bold text-sm border-2 transition-colors ${
                            on
                              ? "bg-primary border-primary text-on-primary"
                              : "bg-card border-line-strong text-app"
                          }`}
                        >
                          <LieSwatch lie={lie} />
                          {LIE_LABELS[lie]}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SECONDARY_LIES.map((lie) => {
                      const on = chosenLie === lie;
                      return (
                        <button
                          key={lie}
                          role="radio"
                          aria-checked={on}
                          onClick={() => setLieOverride(lie)}
                          aria-label={LIE_LABELS[lie]}
                          className={`min-h-10 flex items-center justify-center gap-1 rounded-lg font-semibold text-xs border-2 leading-tight transition-colors ${
                            on
                              ? "bg-primary border-primary text-on-primary"
                              : "bg-card border-line-strong text-app"
                          }`}
                        >
                          <LieSwatch lie={lie} />
                          {lie === "ob" ? "OB" : LIE_LABELS[lie]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={cancelPending}
                    className="px-3 py-3 rounded-xl bg-accent text-subtle border border-app text-xs font-semibold"
                  >
                    Re-aim
                  </button>
                  <button
                    onClick={() => chosenLie && finalizeShot(chosenLie)}
                    disabled={!chosenLie}
                    className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-on-primary font-bold text-base"
                  >
                    {chosenLie ? `Confirm · ${LIE_LABELS[chosenLie]}` : "Pick a lie"}
                  </button>
                </div>
                {detectedLie && lieOverride === null && (
                  <p className="text-muted text-[11px] text-center font-semibold -mt-0.5">
                    Picked from the map — tap another lie if it&apos;s wrong.
                  </p>
                )}
              </div>
            )}

            {mode === "putts" && (
              <div className="space-y-2">
                <p className="text-app font-bold text-sm">On the green — how many putts?</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((p) => (
                    <button
                      key={p}
                      onClick={() => handleRecordPutts(p)}
                      className="min-h-12 rounded-xl font-bold text-lg border border-app bg-accent text-app hover:bg-primary-soft"
                    >
                      {p === 5 ? "5" : p}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleRecordPutts(0)}
                  className="w-full min-h-10 rounded-xl text-sm font-semibold border border-app bg-card text-app"
                >
                  Holed out — no putts
                </button>
              </div>
            )}

            {mode === "input" && (
              <div className="space-y-2">
                {!target && (
                  <p className="text-app text-xs text-center font-bold">
                    Tap the map to set your target — distance updates live.
                  </p>
                )}
                {/* Club chip + distance row */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setClubPickerOpen((v) => !v)}
                    className="flex-1 bg-accent text-app border border-app rounded-lg px-3 py-2 text-left flex justify-between items-center min-w-0"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-bold">{selectedClub.shortName}</span>
                      {selectedClub.category !== "putter" && (
                        <span className="text-muted text-xs font-semibold"> · {effectiveAvgYards(selectedClub, gender, clubAverages)}y avg</span>
                      )}
                      {!clubId && (
                        <span className="text-muted text-[11px] ml-1 font-semibold">(suggested)</span>
                      )}
                    </span>
                    <span className="text-muted text-xs ml-2 font-bold">{clubPickerOpen ? "▾" : "▸"}</span>
                  </button>
                  <div className="text-right shrink-0">
                    <div className="text-muted text-[11px] uppercase tracking-wider leading-none font-semibold">Target</div>
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
                          <p className="text-muted text-[11px] uppercase tracking-wider mb-1 font-bold">
                            {cat === "wood" ? "Woods" : cat === "iron" ? "Irons" : cat === "wedge" ? "Wedges" : "Putter"}
                          </p>
                          <div className="grid grid-cols-4 gap-1">
                            {list.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => { setClubId(c.id); setClubPickerOpen(false); }}
                                className={`px-2 py-1.5 rounded text-left text-[11px] border ${
                                  c.id === selectedClubId
                                    ? "border-primary bg-accent text-app"
                                    : "border-app bg-card text-app hover:border-primary"
                                }`}
                              >
                                <div className="font-bold">{c.shortName}</div>
                                {c.category !== "putter" && (
                                  <div className="text-muted text-[11px] font-semibold">{effectiveAvgYards(c, gender, clubAverages)}y</div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {bagClubs.length === 0 && (
                      <p className="text-muted text-xs p-2 font-semibold">No clubs in your bag.</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={stageShot}
                    disabled={!target || (targetDist ?? 0) <= 0}
                    className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-on-primary font-bold text-base"
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

              </div>
            )}
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
                className="flex-1 py-3 rounded-xl bg-danger hover:opacity-90 text-on-primary font-bold"
              >
                End Round
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
