"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { useProfile } from "@/lib/profileContext";
import { getUserRounds, getHandicapRecord } from "@/lib/firestore";
import { COURSE, TEE_LABELS, type TeeName } from "@/data/course";
import { courseHandicap } from "@/lib/handicap";
import type { Round, HandicapRecord } from "@/types";
import ThemeToggle from "@/components/ThemeToggle";

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const [rounds,     setRounds]     = useState<Round[]>([]);
  const [hcpRecord,  setHcpRecord]  = useState<HandicapRecord | null>(null);
  const [fetching,   setFetching]   = useState(true);
  const [teeForCH,   setTeeForCH]   = useState<TeeName>("white");

  useEffect(() => {
    if (!user) return;
    Promise.all([getUserRounds(user.uid), getHandicapRecord(user.uid)]).then(([r, h]) => {
      setRounds(r);
      setHcpRecord(h);
      setFetching(false);
    });
  }, [user]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app px-4">
        <div className="text-center space-y-4">
          <p className="text-muted">Sign in to view your round history and handicap.</p>
          <button onClick={() => router.push("/")} className="text-primary underline">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  // No rounds yet — show a friendly empty state instead of an empty handicap card.
  if (rounds.length === 0) {
    return (
      <main className="min-h-screen bg-app text-app">
        <div className="bg-card border-b border-app px-4 py-4 flex items-center justify-between gap-3">
          <button onClick={() => router.push("/")} className="text-primary text-sm font-semibold">← Home</button>
          <h1 className="font-bold text-lg">My Rounds &amp; Handicap</h1>
          <ThemeToggle />
        </div>
        <div className="max-w-lg mx-auto px-4 mt-16 text-center space-y-6">
          <div className="text-6xl">⛳</div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">No rounds yet</h2>
            <p className="text-muted">
              Play your first round to start tracking your scores, differentials, and handicap index.
            </p>
          </div>
          <button
            onClick={() => router.push("/setup")}
            className="w-full max-w-xs py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
          >
            Start a Round
          </button>
        </div>
      </main>
    );
  }

  const index = hcpRecord?.handicapIndex;
  const teeInfo = COURSE.teeInfo[teeForCH];
  const chp = index !== null && index !== undefined
    ? courseHandicap(index, teeInfo.slope, teeInfo.rating, COURSE.par)
    : null;

  const TEE_NAMES: TeeName[] = ["diamond", "black", "blue", "white", "red"];

  return (
    <main className="min-h-screen bg-app text-app pb-12">
      <div className="bg-card border-b border-app px-4 py-4 flex items-center justify-between gap-3">
        <button onClick={() => router.push("/")} className="text-primary text-sm font-semibold">← Home</button>
        <h1 className="font-bold text-lg">My Rounds &amp; Handicap</h1>
        <ThemeToggle />
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6 space-y-6">
        {profile && (
          <p className="text-subtle text-sm text-center">
            {profile.displayName} · <span className="capitalize">{profile.gender}</span>
          </p>
        )}

        {/* Handicap card */}
        <div className="bg-card border border-app rounded-2xl p-6 text-center">
          {index !== null && index !== undefined ? (
            <>
              <p className="text-subtle text-sm mb-1">Handicap Index (WHS)</p>
              <p className="text-6xl font-bold">{index.toFixed(1)}</p>

              {/* Tee selector for course handicap */}
              <div className="mt-4">
                <p className="text-subtle text-xs uppercase tracking-wider mb-2">Course Handicap at HCGC</p>
                <div className="flex gap-1 justify-center mb-2">
                  {TEE_NAMES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTeeForCH(t)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        t === teeForCH ? "bg-green-600 text-white" : "bg-accent text-muted border border-app"
                      }`}
                    >
                      {TEE_LABELS[t]}
                    </button>
                  ))}
                </div>
                <p className="text-app font-bold text-3xl">{chp}</p>
                <p className="text-subtle text-xs mt-1">
                  Rating {teeInfo.rating} · Slope {teeInfo.slope}
                </p>
              </div>

              <p className="text-subtle text-xs mt-3">
                Based on best {Math.min(8, rounds.length)} of {rounds.length} rounds
              </p>
            </>
          ) : (
            <>
              <p className="text-subtle text-sm mb-2">Handicap Index</p>
              <p className="text-muted font-semibold">Not yet established</p>
              <p className="text-subtle text-xs mt-1">
                {rounds.length < 3
                  ? `Play ${3 - rounds.length} more round${3 - rounds.length !== 1 ? "s" : ""} to establish your index`
                  : "More rounds needed"}
              </p>
            </>
          )}
        </div>

        {/* Rounds list */}
        <div className="space-y-3">
          <h2 className="text-subtle font-semibold text-sm uppercase tracking-wider">
            Round History ({rounds.length})
          </h2>
          {rounds.length === 0 ? (
            <div className="bg-card border border-app rounded-xl p-6 text-center text-subtle">
              No rounds saved yet. Play a round to get started!
            </div>
          ) : (
            rounds.map((r) => {
              const tee = COURSE.teeInfo[r.tee];
              const diff = ((r.totalStrokes - tee.rating) * 113) / tee.slope;
              const scoreToPar = r.totalStrokes - r.totalPar;
              const holesPlayed = r.holes.filter((h) => h.completed).length;
              return (
                <div key={r.id} className="bg-card border border-app rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">
                        {new Date(r.date).toLocaleDateString("en-US", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </p>
                      <p className="text-subtle text-sm">
                        {TEE_LABELS[r.tee]} · {holesPlayed < 18 ? `${holesPlayed} holes` : "18 holes"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-2xl">{r.totalStrokes}</p>
                      <p className={`text-sm ${scoreToPar > 0 ? "text-danger" : scoreToPar < 0 ? "text-warning" : "text-primary"}`}>
                        {scoreToPar === 0 ? "E" : scoreToPar > 0 ? `+${scoreToPar}` : scoreToPar}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-app flex justify-between text-xs text-subtle">
                    <span>Differential: {diff.toFixed(1)}</span>
                    {typeof r.totalStrokesGained === "number" && (
                      <span className={r.totalStrokesGained > 0 ? "text-primary" : r.totalStrokesGained < 0 ? "text-danger" : ""}>
                        SG: {r.totalStrokesGained > 0 ? "+" : ""}{r.totalStrokesGained.toFixed(1)}
                      </span>
                    )}
                    <span>{tee.rating} / {tee.slope}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={() => router.push("/setup")}
          className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
        >
          Start New Round
        </button>
      </div>
    </main>
  );
}
