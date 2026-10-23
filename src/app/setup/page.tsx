"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { useAuth } from "@/lib/authContext";
import { useProfile } from "@/lib/profileContext";
import { COURSE, TEE_COLORS, TEE_LABELS, type TeeName } from "@/data/course";
import SiteFooter from "@/components/SiteFooter";

const TEE_NAMES: TeeName[] = ["diamond", "black", "blue", "white"];

export default function SetupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { startRound } = useGameStore();
  const [selectedTee, setSelectedTee] = useState<TeeName>("white");
  const [showCard,    setShowCard]    = useState(false);

  function begin() {
    startRound(selectedTee, user?.uid ?? null);
    router.push("/hole/1");
  }

  const teeInfo = COURSE.teeInfo[selectedTee];
  const front9  = COURSE.holes.slice(0, 9);
  const back9   = COURSE.holes.slice(9, 18);
  const frontYards = front9.reduce((s, h) => s + h.tees[selectedTee], 0);
  const backYards  = back9.reduce((s, h)  => s + h.tees[selectedTee], 0);

  return (
    <main className="min-h-screen bg-app text-app pb-12">
      {/* Header */}
      <div className="bg-card border-b border-app px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="text-link hover:opacity-80 text-sm">
          ← Back
        </button>
        <h1 className="text-lg font-bold flex-1">Course Setup</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        {profile && (
          <div className="bg-card border border-app rounded-xl p-3 text-sm text-subtle text-center">
            Playing as <span className="text-app font-semibold">{profile.displayName}</span>
          </div>
        )}

        {/* Tee selection */}
        <section>
          <h2 className="text-subtle font-semibold text-sm uppercase tracking-wider mb-3">
            Choose Your Tee Box
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {TEE_NAMES.map((tee) => {
              const info = COURSE.teeInfo[tee];
              const active = tee === selectedTee;
              return (
                <button
                  key={tee}
                  onClick={() => setSelectedTee(tee)}
                  aria-pressed={active}
                  className={`rounded-xl p-4 border-2 text-left transition-all ${
                    active
                      ? "border-primary bg-primary-soft"
                      : "border-app bg-card hover:border-primary"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-4 h-4 rounded-full border border-line-strong"
                      style={{ backgroundColor: TEE_COLORS[tee] }}
                    />
                    <span className="font-bold text-app">{TEE_LABELS[tee]}</span>
                  </div>
                  <p className="text-muted text-sm">{info.yards.toLocaleString()} yds</p>
                  <p className="text-subtle text-xs">
                    Rating {info.rating} / Slope {info.slope}
                  </p>
                </button>
              );
            })}
          </div>
          <button
            onClick={begin}
            className="mt-4 w-full py-4 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold text-xl transition-colors"
          >
            Tee Off →
          </button>
        </section>

        {/* Yardage card */}
        <section>
          <button
            onClick={() => setShowCard((v) => !v)}
            aria-expanded={showCard}
            aria-controls="yardage-card"
            className="w-full flex items-center justify-between bg-card border border-app rounded-xl px-4 py-3 text-sm font-semibold text-app"
          >
            <span>{showCard ? "Hide yardage card" : "Show yardage card"}</span>
            <span className="text-subtle text-xs font-normal">
              {TEE_LABELS[selectedTee]} · {teeInfo.yards.toLocaleString()} yds · Par {COURSE.par}
              <span aria-hidden className="ml-2">{showCard ? "▾" : "▸"}</span>
            </span>
          </button>
          {showCard && (<>
          <div id="yardage-card" className="mt-3 bg-card border border-app rounded-xl overflow-hidden text-sm">
            <table className="w-full text-center">
              <thead className="bg-accent">
                <tr>
                  <th className="py-2 px-3 text-left text-subtle">Hole</th>
                  <th className="py-2 px-3 text-subtle">Yds</th>
                  <th className="py-2 px-3 text-subtle">Par</th>
                  <th className="py-2 px-3 text-subtle">HCP</th>
                </tr>
              </thead>
              <tbody>
                {front9.map((h) => (
                  <tr key={h.number} className="border-t border-app">
                    <td className="py-1.5 px-3 text-left font-semibold text-app">{h.number}</td>
                    <td className="py-1.5 px-3 text-app">{h.tees[selectedTee]}</td>
                    <td className="py-1.5 px-3 text-app">{h.par}</td>
                    <td className="py-1.5 px-3 text-subtle">{h.handicapIndex}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-primary bg-accent font-bold">
                  <td className="py-1.5 px-3 text-left text-app">OUT</td>
                  <td className="py-1.5 px-3 text-app">{frontYards}</td>
                  <td className="py-1.5 px-3 text-app">{front9.reduce((s, h) => s + h.par, 0)}</td>
                  <td />
                </tr>
                {back9.map((h) => (
                  <tr key={h.number} className="border-t border-app">
                    <td className="py-1.5 px-3 text-left font-semibold text-app">{h.number}</td>
                    <td className="py-1.5 px-3 text-app">{h.tees[selectedTee]}</td>
                    <td className="py-1.5 px-3 text-app">{h.par}</td>
                    <td className="py-1.5 px-3 text-subtle">{h.handicapIndex}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-primary bg-accent font-bold">
                  <td className="py-1.5 px-3 text-left text-app">IN</td>
                  <td className="py-1.5 px-3 text-app">{backYards}</td>
                  <td className="py-1.5 px-3 text-app">{back9.reduce((s, h) => s + h.par, 0)}</td>
                  <td />
                </tr>
                <tr className="border-t-2 border-primary bg-primary-soft font-bold text-app">
                  <td className="py-2 px-3 text-left">TOTAL</td>
                  <td className="py-2 px-3">{teeInfo.yards.toLocaleString()}</td>
                  <td className="py-2 px-3">{COURSE.par}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-subtle text-xs mt-2 text-center">
            Course Rating {teeInfo.rating} · Slope {teeInfo.slope}
          </p>
          </>)}
        </section>

      </div>
      <SiteFooter />
    </main>
  );
}
