"use client";
export const dynamic = "force-dynamic";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { COURSE, TEE_LABELS } from "@/data/course";
import ThemeToggle from "@/components/ThemeToggle";

function scoreClass(score: number, par: number) {
  const diff = score - par;
  if (score === 0)  return "text-subtle";
  if (diff <= -2)   return "bg-yellow-400 text-black rounded-full px-1 inline-block min-w-[1.5em]"; // Eagle+
  if (diff === -1)  return "bg-red-500 text-white rounded-full px-1 inline-block min-w-[1.5em]";    // Birdie
  if (diff === 0)   return "text-app";                                                               // Par
  if (diff === 1)   return "border border-app text-app rounded px-1 inline-block min-w-[1.5em]";    // Bogey
  return "border-2 border-app text-app rounded px-1 inline-block min-w-[1.5em]";                    // Double+
}

export default function ScorecardPage() {
  const router = useRouter();
  const { round, currentHole } = useGameStore();

  if (!round) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <p className="text-subtle">
          No active round.{" "}
          <button onClick={() => router.push("/")} className="underline text-primary">
            Go home
          </button>
        </p>
      </div>
    );
  }

  const front9 = round.holes.slice(0, 9);
  const back9  = round.holes.slice(9, 18);

  const frontStrokes = front9.filter((h) => h.completed).reduce((s, h) => s + h.strokes, 0);
  const frontPar     = front9.reduce((s, h) => s + h.par, 0);
  const backStrokes  = back9.filter((h) => h.completed).reduce((s, h) => s + h.strokes, 0);
  const backPar      = back9.reduce((s, h) => s + h.par, 0);
  const totalStrokes = frontStrokes + backStrokes;
  const totalPar     = frontPar + backPar;

  function HoleRow({ h }: { h: NonNullable<typeof round>["holes"][0] }) {
    const diff = h.strokes - h.par;
    return (
      <tr className={`border-t border-app ${h.holeNumber === currentHole ? "bg-accent" : ""}`}>
        <td className="py-1.5 px-2 text-left font-semibold text-sm">
          <button
            onClick={() => router.push(`/hole/${h.holeNumber}`)}
            className="text-primary hover:underline"
          >
            {h.holeNumber}
          </button>
        </td>
        <td className="py-1.5 px-2 text-center text-subtle text-sm">{h.par}</td>
        <td className="py-1.5 px-2 text-center text-sm">
          {h.completed ? (
            <span className={scoreClass(h.strokes, h.par)}>{h.strokes}</span>
          ) : h.holeNumber === currentHole ? (
            <span className="text-primary animate-pulse">–</span>
          ) : (
            <span className="text-subtle">–</span>
          )}
        </td>
        <td className="py-1.5 px-2 text-center text-sm">
          {h.completed ? (
            <span className={diff > 0 ? "text-danger" : diff < 0 ? "text-warning" : "text-primary"}>
              {diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff}
            </span>
          ) : null}
        </td>
        <td className="py-1.5 px-2 text-center text-xs text-subtle">
          {h.completed && h.shots.length > 0 ? (
            <span className={
              h.shots.reduce((s, x) => s + x.strokesGained, 0) > 0.15 ? "text-primary" :
              h.shots.reduce((s, x) => s + x.strokesGained, 0) < -0.15 ? "text-danger" : ""
            }>
              {(() => {
                const sg = h.shots.reduce((s, x) => s + x.strokesGained, 0);
                return (sg > 0 ? "+" : "") + sg.toFixed(1);
              })()}
            </span>
          ) : null}
        </td>
      </tr>
    );
  }

  return (
    <main className="min-h-screen bg-app text-app pb-8">
      <div className="bg-card border-b border-app px-4 py-3 flex items-center justify-between gap-2">
        <button onClick={() => router.push(`/hole/${currentHole}`)} className="text-primary hover:opacity-80 text-sm font-semibold">
          ← Hole {currentHole}
        </button>
        <h1 className="font-bold">Scorecard</h1>
        <div className="flex items-center gap-2">
          <span className="text-subtle text-sm">{TEE_LABELS[round.tee]}</span>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6 space-y-6">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-subtle justify-center">
          <span><span className="bg-yellow-400 text-black rounded-full px-1">2</span> Eagle+</span>
          <span><span className="bg-red-500 text-white rounded-full px-1">3</span> Birdie</span>
          <span><span className="text-app">4</span> Par</span>
          <span><span className="border border-app text-app rounded px-1">5</span> Bogey</span>
          <span><span className="border-2 border-app text-app rounded px-1">6</span> Double+</span>
        </div>

        {/* Front 9 */}
        <div className="bg-card border border-app rounded-xl overflow-hidden">
          <div className="bg-accent px-3 py-2">
            <span className="font-bold text-sm">Front Nine</span>
          </div>
          <table className="w-full text-center">
            <thead>
              <tr className="text-subtle text-xs">
                <th className="py-1 px-2 text-left">Hole</th>
                <th className="py-1 px-2">Par</th>
                <th className="py-1 px-2">Score</th>
                <th className="py-1 px-2">+/-</th>
                <th className="py-1 px-2">SG</th>
              </tr>
            </thead>
            <tbody>
              {front9.map((h) => <HoleRow key={h.holeNumber} h={h} />)}
              <tr className="border-t-2 border-green-500 bg-accent font-bold">
                <td className="py-2 px-2 text-left text-sm">OUT</td>
                <td className="py-2 px-2 text-sm">{frontPar}</td>
                <td className="py-2 px-2 text-sm">{frontStrokes || "–"}</td>
                <td className="py-2 px-2 text-sm">
                  {frontStrokes ? (
                    <span className={frontStrokes - frontPar > 0 ? "text-danger" : frontStrokes - frontPar < 0 ? "text-warning" : "text-primary"}>
                      {frontStrokes - frontPar === 0 ? "E" : frontStrokes - frontPar > 0 ? `+${frontStrokes - frontPar}` : frontStrokes - frontPar}
                    </span>
                  ) : null}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Back 9 */}
        <div className="bg-card border border-app rounded-xl overflow-hidden">
          <div className="bg-accent px-3 py-2">
            <span className="font-bold text-sm">Back Nine</span>
          </div>
          <table className="w-full text-center">
            <thead>
              <tr className="text-subtle text-xs">
                <th className="py-1 px-2 text-left">Hole</th>
                <th className="py-1 px-2">Par</th>
                <th className="py-1 px-2">Score</th>
                <th className="py-1 px-2">+/-</th>
                <th className="py-1 px-2">SG</th>
              </tr>
            </thead>
            <tbody>
              {back9.map((h) => <HoleRow key={h.holeNumber} h={h} />)}
              <tr className="border-t-2 border-green-500 bg-accent font-bold">
                <td className="py-2 px-2 text-left text-sm">IN</td>
                <td className="py-2 px-2 text-sm">{backPar}</td>
                <td className="py-2 px-2 text-sm">{backStrokes || "–"}</td>
                <td className="py-2 px-2 text-sm">
                  {backStrokes ? (
                    <span className={backStrokes - backPar > 0 ? "text-danger" : backStrokes - backPar < 0 ? "text-warning" : "text-primary"}>
                      {backStrokes - backPar === 0 ? "E" : backStrokes - backPar > 0 ? `+${backStrokes - backPar}` : backStrokes - backPar}
                    </span>
                  ) : null}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="bg-accent border border-app rounded-xl p-4 flex justify-between items-center">
          <span className="font-bold text-lg text-app">Total</span>
          <div className="text-right">
            <p className="font-bold text-2xl text-app">{totalStrokes || "–"}</p>
            {totalStrokes > 0 && (
              <p className={`text-sm ${totalStrokes - totalPar > 0 ? "text-danger" : totalStrokes - totalPar < 0 ? "text-warning" : "text-primary"}`}>
                {totalStrokes - totalPar === 0 ? "Even par" : totalStrokes - totalPar > 0 ? `+${totalStrokes - totalPar}` : `${totalStrokes - totalPar}`}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => router.push(`/hole/${currentHole}`)}
          className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
        >
          ← Back to Hole {currentHole}
        </button>

        <div className="text-center text-subtle text-xs">
          {COURSE.name} · {TEE_LABELS[round.tee]} Tees ·{" "}
          {new Date(round.date).toLocaleDateString()}
        </div>
      </div>
    </main>
  );
}
