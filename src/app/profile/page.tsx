"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { useProfile } from "@/lib/profileContext";
import {
  CLUBS_BY_CATEGORY,
  DEFAULT_BAG,
  effectiveAvgYards,
  getClubById,
  type Club,
  type ClubCategory,
  type Gender,
} from "@/data/clubs";
import { getUserRounds, getHandicapRecord } from "@/lib/firestore";
import { COURSE, TEE_LABELS, type TeeName } from "@/data/course";
import { courseHandicap } from "@/lib/handicap";
import type { HandicapRecord, Round } from "@/types";
import { clubStatsFromRounds, buildClubAverages } from "@/lib/clubStats";
import { ACHIEVEMENTS, computeEarnedAchievements, type Achievement } from "@/lib/achievements";
import ThemeToggle from "@/components/ThemeToggle";

const MAX_CLUBS = 14;

const CATEGORY_LABELS: Record<ClubCategory, string> = {
  wood:   "Woods",
  iron:   "Irons",
  wedge:  "Wedges",
  putter: "Putter",
};

const TEE_NAMES: TeeName[] = ["diamond", "black", "blue", "white", "red"];

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { profile, setProfile } = useProfile();

  const [displayName, setDisplayName] = useState("");
  const [gender,      setGender]      = useState<Gender>("male");
  const [bag,         setBag]         = useState<string[]>(DEFAULT_BAG);
  const [averages,    setAverages]    = useState<Record<string, number>>({});
  const [saving,      setSaving]      = useState(false);
  const [savedAt,     setSavedAt]     = useState<number | null>(null);
  const [saveError,   setSaveError]   = useState<string | null>(null);

  const [rounds,      setRounds]      = useState<Round[]>([]);
  const [hcpRecord,   setHcpRecord]   = useState<HandicapRecord | null>(null);
  const [fetchingHistory, setFetchingHistory] = useState(true);

  const [teeForCH,    setTeeForCH]    = useState<TeeName>("white");
  const [editingClub, setEditingClub] = useState<string | null>(null);
  const [editDraft,   setEditDraft]   = useState("");

  // Hydrate form from profile
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setGender(profile.gender);
    setBag(profile.bag ?? DEFAULT_BAG);
    setAverages(profile.clubAverages ?? {});
  }, [profile]);

  // Fetch history for auto-calc, handicap, and achievements
  useEffect(() => {
    if (!user) { setFetchingHistory(false); return; }
    setFetchingHistory(true);
    Promise.all([getUserRounds(user.uid), getHandicapRecord(user.uid)])
      .then(([rs, h]) => { setRounds(rs); setHcpRecord(h); })
      .finally(() => setFetchingHistory(false));
  }, [user]);

  const bagSet = useMemo(() => new Set(bag), [bag]);

  const earned = useMemo(() => computeEarnedAchievements(rounds), [rounds]);
  const earnedIds = useMemo(() => new Set(earned.map((e) => e.id)), [earned]);

  const hcpIndex = hcpRecord?.handicapIndex ?? null;
  const teeInfo  = COURSE.teeInfo[teeForCH];
  const courseHcp = hcpIndex !== null
    ? courseHandicap(hcpIndex, teeInfo.slope, teeInfo.rating, COURSE.par)
    : null;

  function toggleClub(id: string) {
    setSavedAt(null);
    setBag((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_CLUBS) return prev;
      return [...prev, id];
    });
  }

  function resetDefaultBag() {
    setSavedAt(null);
    setBag(DEFAULT_BAG);
  }

  function selectAll(category: ClubCategory) {
    setSavedAt(null);
    setBag((prev) => {
      const ids = CLUBS_BY_CATEGORY[category].map((c) => c.id);
      const merged = Array.from(new Set([...prev, ...ids]));
      return merged.slice(0, MAX_CLUBS);
    });
  }

  function clearCategory(category: ClubCategory) {
    setSavedAt(null);
    const ids = new Set(CLUBS_BY_CATEGORY[category].map((c) => c.id));
    setBag((prev) => prev.filter((id) => !ids.has(id)));
  }

  function startEditAverage(clubId: string) {
    const club = getClubById(clubId);
    if (!club) return;
    setEditingClub(clubId);
    setEditDraft(String(effectiveAvgYards(club, gender, averages)));
  }

  function commitEditAverage() {
    if (!editingClub) return;
    const n = parseInt(editDraft, 10);
    setAverages((prev) => {
      const next = { ...prev };
      if (!isFinite(n) || n <= 0) {
        delete next[editingClub];
      } else {
        next[editingClub] = n;
      }
      return next;
    });
    setEditingClub(null);
    setEditDraft("");
    setSavedAt(null);
  }

  function cancelEditAverage() {
    setEditingClub(null);
    setEditDraft("");
  }

  function clearAverage(clubId: string) {
    setAverages((prev) => {
      const next = { ...prev };
      delete next[clubId];
      return next;
    });
    setSavedAt(null);
  }

  function resetAllAverages() {
    setAverages({});
    setSavedAt(null);
  }

  function autoCalcAverages() {
    if (rounds.length === 0) return;
    const stats = clubStatsFromRounds(rounds);
    const merged = { ...averages, ...buildClubAverages(stats, 3) };
    setAverages(merged);
    setSavedAt(null);
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    setSaveError(null);
    try {
      await setProfile({
        ...profile,
        displayName: displayName.trim() || profile.displayName,
        gender,
        bag: bag.length > 0 ? bag : DEFAULT_BAG,
        clubAverages: averages,
      });
      setSavedAt(Date.now());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      console.error("Profile save failed:", e);
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
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
          <p className="text-muted">Sign in to manage your profile and bag.</p>
          <button onClick={() => router.push("/")} className="text-primary underline">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const categoryOrder: ClubCategory[] = ["wood", "iron", "wedge", "putter"];

  // Stats from shot history (live preview when user clicks auto-calc)
  const liveStats = clubStatsFromRounds(rounds);

  return (
    <main className="min-h-screen bg-app text-app pb-16">
      <div className="bg-card border-b border-app px-4 py-4 flex items-center justify-between gap-3">
        <button onClick={() => router.push("/")} className="text-primary text-sm font-semibold">
          ← Home
        </button>
        <h1 className="font-bold text-lg">Profile &amp; Bag</h1>
        <ThemeToggle />
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        {/* Identity */}
        <section className="bg-card border border-app rounded-2xl p-5 space-y-4">
          <h2 className="text-subtle font-semibold text-sm uppercase tracking-wider">
            Identity
          </h2>
          <div>
            <label className="block text-subtle text-xs mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setSavedAt(null); }}
              className="w-full bg-app border border-app rounded-lg px-3 py-2 text-app"
            />
          </div>
          <div>
            <label className="block text-subtle text-xs mb-2">Gender (for club avg distances)</label>
            <div className="flex gap-2">
              {(["male", "female", "other"] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => { setGender(g); setSavedAt(null); }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                    gender === g ? "bg-green-600 text-white" : "bg-accent text-muted border border-app"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Handicap card */}
        <section className="bg-card border border-app rounded-2xl p-5 space-y-3">
          <h2 className="text-subtle font-semibold text-sm uppercase tracking-wider">
            Handicap
          </h2>
          {fetchingHistory ? (
            <p className="text-subtle text-sm">Loading…</p>
          ) : hcpIndex !== null ? (
            <div className="flex items-end gap-6">
              <div>
                <p className="text-subtle text-xs uppercase tracking-wider">Index (WHS)</p>
                <p className="text-4xl font-bold">{hcpIndex.toFixed(1)}</p>
              </div>
              <div className="flex-1">
                <p className="text-subtle text-xs uppercase tracking-wider">Course Handicap at HCGC</p>
                <div className="flex flex-wrap gap-1 my-1">
                  {TEE_NAMES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTeeForCH(t)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        t === teeForCH ? "bg-green-600 text-white" : "bg-accent text-muted border border-app"
                      }`}
                    >
                      {TEE_LABELS[t]}
                    </button>
                  ))}
                </div>
                <p className="text-3xl font-bold">{courseHcp}</p>
                <p className="text-subtle text-xs">Rating {teeInfo.rating} · Slope {teeInfo.slope}</p>
              </div>
            </div>
          ) : (
            <p className="text-subtle text-sm">
              {rounds.length < 3
                ? `Play ${3 - rounds.length} more round${3 - rounds.length !== 1 ? "s" : ""} to establish your handicap index.`
                : "More rounds needed to establish your index."}
            </p>
          )}
        </section>

        {/* Bag */}
        <section className="bg-card border border-app rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-subtle font-semibold text-sm uppercase tracking-wider">
              My Bag
            </h2>
            <span className={`text-xs font-semibold ${bag.length > MAX_CLUBS ? "text-danger" : "text-muted"}`}>
              {bag.length} / {MAX_CLUBS} clubs
            </span>
          </div>
          <p className="text-subtle text-xs">
            Pick the clubs you actually carry. Tap a club to add/remove it from your bag.
          </p>

          {categoryOrder.map((cat) => (
            <div key={cat} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-app font-semibold text-sm">{CATEGORY_LABELS[cat]}</h3>
                {cat !== "putter" && (
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => selectAll(cat)} className="text-primary hover:underline">
                      Select all
                    </button>
                    <span className="text-subtle">·</span>
                    <button onClick={() => clearCategory(cat)} className="text-muted hover:underline">
                      Clear
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {CLUBS_BY_CATEGORY[cat].map((c: Club) => {
                  const on = bagSet.has(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleClub(c.id)}
                      className={`rounded-lg px-2 py-2 text-left border-2 transition-all ${
                        on
                          ? "border-green-500 bg-accent"
                          : "border-app bg-card hover:border-green-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-app text-sm">{c.shortName}</span>
                        {on && <span className="text-green-500 text-xs">✓</span>}
                      </div>
                      <p className="text-subtle text-[11px] leading-tight">{c.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={resetDefaultBag}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-muted border border-app hover:bg-app"
            >
              Reset to default bag
            </button>
          </div>
        </section>

        {/* Club distances */}
        <section className="bg-card border border-app rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-subtle font-semibold text-sm uppercase tracking-wider">
              Club Distances
            </h2>
            <div className="flex gap-2">
              <button
                onClick={autoCalcAverages}
                disabled={rounds.length === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white"
                title="Calculate averages from your recorded shot history"
              >
                Auto-calc from my shots
              </button>
              <button
                onClick={resetAllAverages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-app border border-app"
              >
                Reset all
              </button>
            </div>
          </div>
          <p className="text-subtle text-xs">
            Tap a club to edit your personal average. Defaults are based on gender-adjusted tour stats.
            Auto-calc uses the trimmed mean of your last {rounds.length} round{rounds.length === 1 ? "" : "s"} (full swings only, 30+ yds).
          </p>

          <div className="space-y-1">
            {bag.length === 0 ? (
              <p className="text-subtle text-sm text-center py-4">Add clubs to your bag above to set distances.</p>
            ) : (
              bag.map((id) => {
                const c = getClubById(id);
                if (!c) return null;
                if (c.category === "putter") return null;
                const override = averages[id];
                const effective = effectiveAvgYards(c, gender, averages);
                const defaultYds = c.avgYards[gender];
                const stat = liveStats[id];
                const isEditing = editingClub === id;
                return (
                  <div key={id} className="flex items-center gap-2 py-2 border-t border-app first:border-t-0">
                    <div className="w-10 font-semibold text-app">{c.shortName}</div>
                    <div className="flex-1">
                      <p className="text-app text-sm">{c.name}</p>
                      {stat && (
                        <p className="text-subtle text-[11px]">
                          {stat.count} shot{stat.count === 1 ? "" : "s"} · avg {stat.avgYards}y · trimmed {stat.trimmedAvg}y · max {stat.maxYards}y
                        </p>
                      )}
                    </div>
                    {isEditing ? (
                      <>
                        <input
                          type="number"
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          autoFocus
                          className="w-20 bg-app border border-app rounded-lg px-2 py-1 text-right font-mono"
                        />
                        <button onClick={commitEditAverage} className="text-primary text-sm font-semibold">Save</button>
                        <button onClick={cancelEditAverage} className="text-subtle text-sm">Cancel</button>
                      </>
                    ) : (
                      <>
                        <div className="text-right">
                          <button
                            onClick={() => startEditAverage(id)}
                            className="font-mono font-semibold text-app"
                          >
                            {effective}y
                          </button>
                          {override !== undefined && override !== defaultYds && (
                            <p className="text-subtle text-[10px] leading-tight">default {defaultYds}y</p>
                          )}
                        </div>
                        {override !== undefined && (
                          <button
                            onClick={() => clearAverage(id)}
                            className="text-subtle hover:text-danger text-xs"
                            title="Reset to default"
                          >
                            ✕
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Achievements */}
        <section className="bg-card border border-app rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-subtle font-semibold text-sm uppercase tracking-wider">
              Achievements
            </h2>
            <span className="text-subtle text-xs">
              {earnedIds.size} / {ACHIEVEMENTS.length} unlocked
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ACHIEVEMENTS.map((a: Achievement) => {
              const got = earnedIds.has(a.id);
              return (
                <div
                  key={a.id}
                  className={`rounded-lg p-3 border text-left transition-opacity ${
                    got
                      ? "border-green-500 bg-accent"
                      : "border-app bg-card opacity-50"
                  }`}
                  title={a.description}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xl ${got ? "" : "grayscale"}`}>{a.icon}</span>
                    <span className={`font-semibold text-sm ${got ? "text-app" : "text-subtle"}`}>
                      {a.title}
                    </span>
                  </div>
                  <p className="text-subtle text-[11px] mt-0.5 leading-tight">{a.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Save bar */}
        <div className="sticky bottom-0 left-0 right-0 -mx-4 px-4 py-3 bg-app border-t border-app">
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold transition-colors"
            >
              {saving ? "Saving…" : "Save Profile"}
            </button>
            {savedAt && !saving && !saveError && (
              <span className="text-primary text-xs font-semibold">Saved ✓</span>
            )}
          </div>
          {saveError && (
            <p className="text-danger text-xs mt-2 text-center">
              Couldn&apos;t save: {saveError}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
