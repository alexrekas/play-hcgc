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
import type { LieType, ShotShape } from "@/types";
import ThemeToggle from "@/components/ThemeToggle";
import { scoreName, scoreNameClass } from "@/lib/scoring";
import ShotShapeIcon from "@/components/ShotShapeIcon";
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

// Lie options shown in the result-picker after each shot.
const RESULT_LIES: LieType[] = ["fairway", "rough", "bunker", "fringe", "green", "water", "ob"];

// Hints describe the flight from the player's POV. For RH, a "pull" starts
// right of target and a "hook" curves right; LH flips in the icon via mirror.
const SHOT_SHAPES: Array<{ id: ShotShape; label: string; hint: string }> = [
  { id: "pull-hook",  label: "Pull Hook",  hint: "Starts R · curves R" },
  { id: "pull",       label: "Pull",       hint: "Starts R · holds" },
  { id: "pull-slice", label: "Pull Slice", hint: "Starts R · curves L" },
  { id: "draw",       label: "Draw",       hint: "Starts on · curves R" },
  { id: "straight",   label: "Straight",   hint: "Starts on · holds" },
  { id: "fade",       label: "Fade",       hint: "Starts on · curves L" },
  { id: "push-draw",  label: "Push Draw",  hint: "Starts L · curves R" },
  { id: "push",       label: "Push",       hint: "Starts L · holds" },
  { id: "push-slice", label: "Push Slice", hint: "Starts L · curves L" },
];

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
  const { gender, dexterity, bag, clubAverages } = useProfile();

  const hole      = COURSE.holes.find((h) => h.number === holeNum);
  const holeScore = round?.holes.find((h) => h.holeNumber === holeNum);

  // Sync the store's currentHole to match URL
  useEffect(() => {
    if (hole) setCurrentHole(holeNum);
  }, [holeNum, hole, setCurrentHole]);

  // Derive "current position" from stored shots so reopening works.
  // Before the first shot, start on the tee — use the per-hole SVG layout's
  // tee position if one is registered, otherwise a generic bottom-center.
  const shots = useMemo(() => holeScore?.shots ?? [], [holeScore?.shots]);
  const lastShot = shots[shots.length - 1];
  const teeStart = HOLE_SVG_LAYOUTS[holeNum]?.tee ?? { x: 0.5, y: 0.03 };
  const currentPos = lastShot
    ? { x: lastShot.posX, y: lastShot.posY }
    : teeStart;
  const currentLie: LieType = lastShot ? lastShot.resultLie : "tee";
  const shotCount = shots.length + 1;

  // Form state for the next shot
  const [aimAngle,    setAimAngle]    = useState(0);
  const [distance,    setDistance]    = useState("");
  const [offline,     setOffline]     = useState("");
  const [offlineSide, setOfflineSide] = useState<"L" | "R">("R");
  const [holeOut,     setHoleOut]     = useState(false);
  const [clubId,      setClubId]      = useState<string>("");
  const [shotShape,   setShotShape]   = useState<ShotShape>("straight");

  // Two-step UI: fill form → click Hit → pick result lie → finalize.
  // `pending` holds the form snapshot between step 1 and step 2.
  const [pending, setPending] = useState<null | {
    clubId: string;
    distance: number;
    offline: number;
    aim: number;
    shape: ShotShape;
    holeOut: boolean;
  }>(null);

  const [showEndConfirm,    setShowEndConfirm]    = useState(false);
  const [showShotDetails,   setShowShotDetails]   = useState(false);
  const [clubPickerOpen,    setClubPickerOpen]    = useState(false);

  const onAimConfirmed = useCallback((deg: number) => setAimAngle(deg), []);

  if (!hole || !round) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <p className="text-subtle">Loading…</p>
      </div>
    );
  }

  const yardage        = hole.tees[round.tee];
  // Trust the stored remaining on the last shot (computed from the unclamped
  // projection in shotEngine). Fall back to full yardage on the tee.
  const remainingYards = lastShot
    ? lastShot.remainingYards
    : yardage;
  const onGreen        = currentLie === "green";
  // Used only for UI copy ("Holed out!" vs "You're on the green")
  const onHole         = remainingYards === 0;

  // Default club suggestion restricted to the user's bag
  const suggestedClub = suggestClub(remainingYards, gender, onGreen, bag, clubAverages);
  const selectedClubId = clubId || suggestedClub.id;
  const selectedClub   = getClubById(selectedClubId) ?? suggestedClub;

  const holeDone = holeScore?.completed === true;
  // Only prompt for putts when the player explicitly picked "green" as the
  // result lie. If they flew the green, currentLie is whatever lie they chose
  // (rough / rough / ob / etc.), so they'll hit another approach shot instead.
  const readyForPutts = onGreen && !holeDone;

  const completedHoles = round.holes.filter((h) => h.completed);
  const runningTotal   = completedHoles.reduce((s, h) => s + h.strokes, 0);
  const runningPar     = completedHoles.reduce((s, h) => s + h.par, 0);
  const scoreToPar     = runningTotal - runningPar;

  // Filter club dropdown to the user's bag (but always let them pick any if bag is empty)
  const bagClubs = bag.length > 0
    ? CLUBS.filter((c) => bag.includes(c.id))
    : CLUBS;

  // Step 1: capture the form values and move into "pick result lie" mode.
  function stageShot() {
    const dist = parseFloat(distance);
    const off  = parseFloat(offline || "0") * (offlineSide === "L" ? -1 : 1);
    if (isNaN(dist) || dist <= 0) return;
    setPending({
      clubId: selectedClubId,
      distance: dist,
      offline: off,
      aim: aimAngle,
      shape: shotShape,
      holeOut,
    });
    // If the user said the shot holed out we don't need a lie — finalize now.
    if (holeOut) {
      finalizeShot("green", {
        clubId: selectedClubId,
        distance: dist,
        offline: off,
        aim: aimAngle,
        shape: shotShape,
        holeOut: true,
      });
    }
  }

  function finalizeShot(resultLie: LieType, override?: {
    clubId: string; distance: number; offline: number; aim: number; shape: ShotShape; holeOut: boolean;
  }) {
    const p = override ?? pending;
    if (!p) return;
    const shot = buildShotResult({
      holeNumber: holeNum,
      shotNumber: shotCount,
      clubId: p.clubId,
      prevX: currentPos.x,
      prevY: currentPos.y,
      prevLie: currentLie,
      prevRemaining: remainingYards,
      aimAngleDeg: p.aim,
      distanceYards: p.distance,
      offlineYards: p.offline,
      holeLengthYards: yardage,
      holePar: hole!.par as 3 | 4 | 5,
      resultLie,
      shotShape: p.shape,
      holeOut: p.holeOut,
    });

    addShot(shot);
    // Reset form
    setDistance("");
    setOffline("");
    setOfflineSide("R");
    setAimAngle(0);
    setClubId("");
    setShotShape("straight");
    setHoleOut(false);
    setPending(null);
  }

  function cancelPending() {
    setPending(null);
  }

  function handleDeleteShot(idx: number) {
    const next = shots.filter((_, i) => i !== idx);
    replaceShots(holeNum, next);
  }

  // Record putts but DO NOT auto-advance — user sees summary and clicks Next Hole.
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

  return (
    <main className="min-h-screen bg-app text-app flex flex-col">
      {/* Top bar */}
      <div className="bg-card border-b border-app px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/scorecard")}
            className="text-primary hover:opacity-80 text-sm font-semibold border border-app rounded-lg px-2 py-1"
          >
            📋 Scorecard
          </button>
          <div className="truncate">
            <span className="font-bold">Hole {holeNum}</span>
            <span className="text-subtle text-sm"> · Par {hole.par} · {yardage} yds</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right leading-tight">
            <p className="text-subtle text-[10px] uppercase tracking-wider">Thru {completedHoles.length}</p>
            <p className={`text-sm font-bold ${scoreToPar > 0 ? "text-danger" : scoreToPar < 0 ? "text-warning" : "text-primary"}`}>
              {runningTotal || 0} ({scoreToPar === 0 ? "E" : scoreToPar > 0 ? `+${scoreToPar}` : scoreToPar})
            </p>
          </div>
          <ThemeToggle />
          <button
            onClick={() => setShowEndConfirm(true)}
            className="text-danger hover:opacity-80 text-xs border border-app rounded px-2 py-1"
          >
            End
          </button>
        </div>
      </div>

      {/* Navigation strip */}
      <div className="bg-accent border-b border-app px-4 py-1 flex items-center justify-between text-xs">
        <button
          disabled={holeNum <= 1}
          onClick={() => router.push(`/hole/${holeNum - 1}`)}
          className="text-primary disabled:opacity-30 font-semibold py-1 px-2"
        >
          ← Prev
        </button>
        <span className="text-subtle">Shot {shotCount}{holeDone ? " · Completed" : ""}</span>
        <button
          disabled={holeNum >= 18}
          onClick={() => router.push(`/hole/${holeNum + 1}`)}
          className="text-primary disabled:opacity-30 font-semibold py-1 px-2"
        >
          Next →
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-4xl mx-auto w-full">
        {/* Hole graphic */}
        <div className="flex flex-col items-center gap-2">
          <HoleDiagram
            hole={hole}
            shots={shots}
            currentPos={currentPos}
            onAimConfirmed={onAimConfirmed}
          />
          <div className="text-center">
            <p className="text-muted text-sm">{hole.description}</p>
            <p className="text-subtle text-xs mt-1">
              Remaining: ~{remainingYards} yds · Lie: <span className={LIE_COLORS[currentLie]}>{LIE_LABELS[currentLie]}</span>
            </p>
          </div>
        </div>

        {/* Shot input / completion */}
        <div className="flex-1 space-y-4">
          {holeDone ? (
            /* ── Hole completed view ───────────────────────────── */
            <div className="bg-card border border-app rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-subtle text-xs uppercase tracking-wider">Hole Complete</p>
                  <p className={`font-bold text-2xl ${scoreNameClass(holeScore!.strokes, hole.par)}`}>
                    {scoreName(holeScore!.strokes, hole.par)}
                  </p>
                  <p className="font-semibold text-app">
                    {holeScore!.strokes} strokes
                    <span className="text-subtle text-sm ml-1">
                      ({holeScore!.strokes - hole.par === 0 ? "E" : holeScore!.strokes - hole.par > 0 ? `+${holeScore!.strokes - hole.par}` : holeScore!.strokes - hole.par})
                    </span>
                  </p>
                  <p className="text-subtle text-xs">
                    {shots.length} shot{shots.length === 1 ? "" : "s"} + {holeScore!.putts} putt{holeScore!.putts === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  onClick={handleReopenHole}
                  className="text-primary text-xs underline"
                >
                  Edit hole
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {holeNum < 18 && (
                  <button
                    onClick={() => { advanceHole(); router.push(`/hole/${holeNum + 1}`); }}
                    className="py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
                  >
                    Next Hole →
                  </button>
                )}
                {holeNum === 18 && (
                  <button
                    onClick={handleEndRound}
                    className="py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors col-span-2"
                  >
                    Finish Round
                  </button>
                )}
                {holeNum < 18 && (
                  <button
                    onClick={() => router.push("/scorecard")}
                    className="py-3 rounded-xl bg-accent text-app font-semibold border border-app"
                  >
                    Scorecard
                  </button>
                )}
              </div>
            </div>
          ) : pending ? (
            /* ── Step 2: Where did the ball land? ───────────────── */
            <div className="bg-card border-2 border-green-500 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-subtle text-xs uppercase tracking-wider">Shot hit — where did it land?</p>
                <p className="text-app text-sm mt-1">
                  {getClubById(pending.clubId)?.shortName} · {pending.distance}y
                  {pending.offline !== 0 && <> · {Math.abs(pending.offline)}y {pending.offline < 0 ? "L" : "R"}</>}
                  {" · "}{SHOT_SHAPES.find((s) => s.id === pending.shape)?.label}
                </p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {RESULT_LIES.map((lie) => (
                  <button
                    key={lie}
                    onClick={() => finalizeShot(lie)}
                    className={`py-3 rounded-lg font-semibold text-sm border border-app bg-accent hover:bg-green-600 hover:text-white transition-colors ${LIE_COLORS[lie]}`}
                  >
                    {LIE_LABELS[lie]}
                  </button>
                ))}
              </div>
              <button
                onClick={cancelPending}
                className="text-subtle hover:text-app text-xs underline"
              >
                Cancel — edit inputs
              </button>
            </div>
          ) : readyForPutts ? (
            /* ── On green / holed out: select putts ────────────── */
            <div className="bg-card border border-app rounded-xl p-4 space-y-4">
              <p className="text-app font-semibold">
                {onHole ? "Holed out!" : "You're on the green!"} How many putts?
              </p>
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((p) => {
                  const selected = holeScore?.putts === p && !holeDone;
                  return (
                    <button
                      key={p}
                      onClick={() => handleRecordPutts(p)}
                      className={`py-3 rounded-xl font-bold text-lg border border-app transition-colors ${
                        selected
                          ? "bg-green-600 text-white"
                          : "bg-accent text-app hover:bg-green-600 hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <p className="text-subtle text-xs text-center">
                Select 0 if you holed out from off the green. Scorecard won&apos;t advance until you confirm.
              </p>
              {!onHole && (
                <p className="text-subtle text-xs text-center">
                  Or enter another shot below (chip / putt off fringe).
                </p>
              )}
            </div>
          ) : null}

          {/* Shot input form (step 1) — hidden while pending or completed */}
          {!holeDone && !pending && (
            <div className="bg-card border border-app rounded-xl p-4 space-y-4">
              <p className="text-subtle text-xs uppercase tracking-wider">Shot #{shotCount}</p>

              {/* 1 — Club */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-subtle text-xs uppercase tracking-wider">Club</label>
                  <span className="text-subtle text-xs">
                    Suggested: <span className="text-app font-semibold">{suggestedClub.shortName}</span>
                  </span>
                </div>
                <button
                  onClick={() => setClubPickerOpen((v) => !v)}
                  className="w-full bg-accent text-app border border-app rounded-lg px-3 py-2 font-semibold text-left flex justify-between items-center"
                >
                  <span>
                    {selectedClub.name}
                    {selectedClub.category !== "putter" && (
                      <span className="text-subtle font-normal"> · avg {effectiveAvgYards(selectedClub, gender, clubAverages)} yds</span>
                    )}
                  </span>
                  <span className="text-subtle text-xs">{clubPickerOpen ? "▴" : "▾"}</span>
                </button>
                {clubPickerOpen && (
                  <div className="mt-2 bg-app border border-app rounded-lg p-2 max-h-64 overflow-y-auto space-y-2">
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
                          <div className="grid grid-cols-3 gap-1">
                            {list.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => { setClubId(c.id); setClubPickerOpen(false); }}
                                className={`px-2 py-2 rounded text-left text-xs border ${
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
                      <p className="text-subtle text-xs p-2">
                        No clubs in your bag. Add some in your profile.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 2 — Distance */}
              <div>
                <label className="text-subtle text-xs uppercase tracking-wider block mb-1">
                  Distance (yards)
                </label>
                <input
                  type="number"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder={`e.g. ${effectiveAvgYards(selectedClub, gender, clubAverages) || 150}`}
                  className="w-full bg-accent text-app border border-app rounded-lg px-3 py-2 text-lg font-mono focus:outline-none focus:border-green-500"
                />
              </div>

              {/* 3 — Shot shape */}
              <div>
                <label className="text-subtle text-xs uppercase tracking-wider block mb-1">
                  Shot Shape
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {SHOT_SHAPES.map((s) => {
                    const on = shotShape === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setShotShape(s.id)}
                        className={`px-2 py-2 rounded text-xs border transition-colors flex flex-col items-center gap-1 ${
                          on
                            ? "border-green-500 bg-accent text-app"
                            : "border-app bg-card text-app hover:border-green-400"
                        }`}
                        title={s.hint}
                      >
                        <ShotShapeIcon shape={s.id} size={36} className="text-app" mirror={dexterity === "left"} />
                        <div className="font-semibold text-[11px] leading-tight">{s.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4 — Yards offline */}
              <div>
                <label className="text-subtle text-xs uppercase tracking-wider block mb-1">
                  Yards Offline
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={offline}
                    onChange={(e) => setOffline(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-accent text-app border border-app rounded-lg px-3 py-2 text-lg font-mono focus:outline-none focus:border-green-500"
                  />
                  <button
                    onClick={() => setOfflineSide("L")}
                    className={`px-4 py-2 rounded-lg font-bold transition-colors ${offlineSide === "L" ? "bg-green-600 text-white" : "bg-accent text-muted border border-app"}`}
                  >
                    L
                  </button>
                  <button
                    onClick={() => setOfflineSide("R")}
                    className={`px-4 py-2 rounded-lg font-bold transition-colors ${offlineSide === "R" ? "bg-green-600 text-white" : "bg-accent text-muted border border-app"}`}
                  >
                    R
                  </button>
                </div>
              </div>

              {/* 5 — Holes out */}
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={holeOut}
                  onChange={(e) => setHoleOut(e.target.checked)}
                  className="w-4 h-4 accent-green-600"
                />
                This shot holes out
              </label>

              <button
                onClick={stageShot}
                disabled={!distance}
                className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold text-lg transition-colors"
              >
                Hit Shot
              </button>
            </div>
          )}

          {/* Shot list */}
          {shots.length > 0 && (
            <div className="bg-card border border-app rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-subtle text-xs uppercase tracking-wider">Shot Log</p>
                <button
                  onClick={() => setShowShotDetails((v) => !v)}
                  className="text-primary text-xs underline"
                >
                  {showShotDetails ? "Hide details" : "Show details"}
                </button>
              </div>
              <div className="space-y-1">
                {shots.map((s, i) => {
                  const club = getClubById(s.clubId);
                  return (
                    <div key={i} className="border-t border-app first:border-t-0 pt-1 first:pt-0">
                      <div className="flex justify-between items-center text-sm gap-2">
                        <span className="text-subtle font-mono w-6">#{i + 1}</span>
                        <span className="text-app font-semibold flex-1">{club?.shortName ?? "?"}</span>
                        <span className="text-app">{s.distanceYards}y</span>
                        <span className="text-subtle text-xs w-12 text-right">
                          {s.offlineYards !== 0 ? `${Math.abs(s.offlineYards)}y ${s.offlineYards > 0 ? "R" : "L"}` : "—"}
                        </span>
                        <span className={`text-xs w-14 text-right ${LIE_COLORS[s.resultLie]}`}>
                          {s.holedOut ? "Holed" : LIE_LABELS[s.resultLie]}
                        </span>
                        <span className={`text-xs w-12 text-right font-mono ${sgColor(s.strokesGained)}`}>
                          {s.strokesGained > 0 ? "+" : ""}{s.strokesGained.toFixed(2)}
                        </span>
                      </div>
                      {showShotDetails && (
                        <div className="flex justify-between items-center text-xs text-subtle mt-0.5 pl-8 gap-2 flex-wrap">
                          <span>To: {s.remainingYards}y left</span>
                          <span>From {LIE_LABELS[s.lie]}</span>
                          {s.shotShape && <span>{SHOT_SHAPES.find((x) => x.id === s.shotShape)?.label}</span>}
                          {!holeDone && (
                            <button
                              onClick={() => handleDeleteShot(i)}
                              className="text-danger underline"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-app text-xs">
                <span className="text-subtle">Total shots: {shots.length}</span>
                <span className={`font-mono ${sgColor(shots.reduce((s, x) => s + x.strokesGained, 0))}`}>
                  SG: {shots.reduce((s, x) => s + x.strokesGained, 0) > 0 ? "+" : ""}
                  {shots.reduce((s, x) => s + x.strokesGained, 0).toFixed(2)}
                </span>
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
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
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
