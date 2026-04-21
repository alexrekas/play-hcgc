"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { useProfile } from "@/lib/profileContext";
import {
  CLUBS_BY_CATEGORY,
  DEFAULT_BAG,
  type Club,
  type ClubCategory,
  type Gender,
} from "@/data/clubs";
import ThemeToggle from "@/components/ThemeToggle";

const MAX_CLUBS = 14;

const CATEGORY_LABELS: Record<ClubCategory, string> = {
  wood:   "Woods",
  iron:   "Irons",
  wedge:  "Wedges",
  putter: "Putter",
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { profile, setProfile } = useProfile();

  const [displayName, setDisplayName] = useState("");
  const [gender,      setGender]      = useState<Gender>("male");
  const [bag,         setBag]         = useState<string[]>(DEFAULT_BAG);
  const [saving,      setSaving]      = useState(false);
  const [savedAt,     setSavedAt]     = useState<number | null>(null);

  // Hydrate form from profile
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setGender(profile.gender);
    setBag(profile.bag ?? DEFAULT_BAG);
  }, [profile]);

  const bagSet = useMemo(() => new Set(bag), [bag]);

  function toggleClub(id: string) {
    setSavedAt(null);
    setBag((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_CLUBS) return prev; // USGA rule — soft cap
      return [...prev, id];
    });
  }

  function resetDefault() {
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

  async function save() {
    if (!profile) return;
    setSaving(true);
    try {
      await setProfile({
        ...profile,
        displayName: displayName.trim() || profile.displayName,
        gender,
        bag: bag.length > 0 ? bag : DEFAULT_BAG,
      });
      setSavedAt(Date.now());
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
                    gender === g
                      ? "bg-green-600 text-white"
                      : "bg-accent text-muted border border-app"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
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
            Pick the clubs you actually carry. The hole page uses this list when suggesting the club for each shot.
          </p>

          {categoryOrder.map((cat) => (
            <div key={cat} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-app font-semibold text-sm">{CATEGORY_LABELS[cat]}</h3>
                {cat !== "putter" && (
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => selectAll(cat)}
                      className="text-primary hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-subtle">·</span>
                    <button
                      onClick={() => clearCategory(cat)}
                      className="text-muted hover:underline"
                    >
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
                      {c.category !== "putter" && (
                        <p className="text-muted text-[10px] mt-0.5">
                          ~{c.avgYards[gender]} yd
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={resetDefault}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-muted border border-app hover:bg-app"
            >
              Reset to default bag
            </button>
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
            {savedAt && !saving && (
              <span className="text-primary text-xs font-semibold">Saved ✓</span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
