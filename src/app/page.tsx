"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { useProfile } from "@/lib/profileContext";
import ThemeToggle from "@/components/ThemeToggle";
import { DEFAULT_BAG, type Gender } from "@/data/clubs";
import type { UserProfile, HandicapRecord } from "@/types";
import { getHandicapRecord } from "@/lib/firestore";
import { COURSE, TEE_LABELS } from "@/data/course";
import { courseHandicap } from "@/lib/handicap";

type Mode = "signin" | "signup";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { profile, setGender } = useProfile();

  const [mode,      setMode]     = useState<Mode>("signin");
  const [email,     setEmail]    = useState("");
  const [password,  setPassword] = useState("");
  const [name,      setName]     = useState("");
  const [gender,    setGenderField] = useState<Gender>("male");
  const [err,       setErr]      = useState<string | null>(null);
  const [busy,      setBusy]     = useState(false);
  const [hcpRecord, setHcpRecord] = useState<HandicapRecord | null>(null);

  useEffect(() => {
    if (!user) { setHcpRecord(null); return; }
    getHandicapRecord(user.uid).then(setHcpRecord).catch(() => {});
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const displayName = name.trim() || email.split("@")[0];
        await updateProfile(cred.user, { displayName });
        const userProfile: UserProfile = {
          uid: cred.user.uid,
          email,
          displayName,
          gender,
          dexterity: "right",
          bag: DEFAULT_BAG,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(getFirebaseDb(), "users", cred.user.uid), userProfile);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Authentication failed";
      setErr(msg.replace(/^Firebase:\s*/, "").replace(/\s*\(auth\/[^)]+\)\.?$/, ""));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-app flex flex-col">
      <header className="px-4 py-3 flex justify-end">
        <ThemeToggle />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <span className="text-5xl">⛳</span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-app">Play HCGC</h1>
              <p className="text-subtle text-sm">Herndon Centennial Golf Course</p>
            </div>
          </div>
          <p className="text-muted mt-4 max-w-sm mx-auto leading-relaxed">
            Simulate a full 18-hole round at Herndon Centennial from anywhere.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          {user ? (
            <>
              <div className="bg-card border border-app rounded-xl p-4 text-center">
                <p className="text-subtle text-sm">Signed in as</p>
                <p className="font-semibold text-app">{profile?.displayName ?? user.displayName ?? user.email}</p>
                {profile && (
                  <p className="text-subtle text-xs mt-0.5 capitalize">{profile.gender}</p>
                )}
                {hcpRecord?.handicapIndex !== null && hcpRecord?.handicapIndex !== undefined && (() => {
                  const tee = COURSE.teeInfo.white;
                  const ch  = courseHandicap(hcpRecord.handicapIndex!, tee.slope, tee.rating, COURSE.par);
                  return (
                    <div className="mt-3 pt-3 border-t border-app flex justify-around text-center">
                      <div>
                        <p className="text-subtle text-[10px] uppercase tracking-wider">Index</p>
                        <p className="font-bold text-xl text-app">{hcpRecord.handicapIndex!.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-subtle text-[10px] uppercase tracking-wider">
                          Course Hcp ({TEE_LABELS.white})
                        </p>
                        <p className="font-bold text-xl text-app">{ch}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <button
                onClick={() => router.push("/setup")}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg transition-colors"
              >
                Start a Round
              </button>
              {hcpRecord && hcpRecord.rounds && hcpRecord.rounds.length > 0 && (
                <button
                  onClick={() => router.push("/history")}
                  className="w-full py-3 rounded-xl bg-accent hover:opacity-90 text-app font-semibold transition-all"
                >
                  My Rounds &amp; Handicap
                </button>
              )}
              <button
                onClick={() => router.push("/profile")}
                className="w-full py-3 rounded-xl bg-accent hover:opacity-90 text-app font-semibold transition-all"
              >
                Profile &amp; My Bag
              </button>
              <button
                onClick={() => signOut(getFirebaseAuth())}
                className="w-full py-2 text-subtle hover:text-app text-sm transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="flex bg-accent rounded-xl p-1">
                <button
                  onClick={() => { setMode("signin"); setErr(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    mode === "signin" ? "bg-green-600 text-white" : "text-subtle"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMode("signup"); setErr(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    mode === "signup" ? "bg-green-600 text-white" : "text-subtle"
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === "signup" && (
                  <>
                    <input
                      type="text"
                      placeholder="Display Name (optional)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-card border border-app rounded-xl px-4 py-3 text-app placeholder:text-subtle focus:outline-none focus:border-green-500"
                    />
                    <div>
                      <label className="text-subtle text-xs uppercase tracking-wider block mb-2">
                        Gender (for club yardage defaults)
                      </label>
                      <div className="flex gap-2">
                        {(["male", "female", "other"] as Gender[]).map((g) => (
                          <button
                            type="button"
                            key={g}
                            onClick={() => setGenderField(g)}
                            className={`flex-1 py-2 rounded-lg font-semibold text-sm capitalize transition-colors ${
                              gender === g ? "bg-green-600 text-white" : "bg-accent text-muted"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-card border border-app rounded-xl px-4 py-3 text-app placeholder:text-subtle focus:outline-none focus:border-green-500"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-card border border-app rounded-xl px-4 py-3 text-app placeholder:text-subtle focus:outline-none focus:border-green-500"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold transition-colors"
                >
                  {busy ? "Loading…" : mode === "signup" ? "Create Account" : "Sign In"}
                </button>
                {err && <p className="text-danger text-sm text-center">{err}</p>}
              </form>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-app border-t border-app" />
                <span className="text-subtle text-sm">or play as guest</span>
                <div className="flex-1 h-px border-t border-app" />
              </div>

              <div>
                <label className="text-subtle text-xs uppercase tracking-wider block mb-2">
                  Gender (for club defaults)
                </label>
                <div className="flex gap-2 mb-3">
                  {(["male", "female", "other"] as Gender[]).map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => { setGender(g); setGenderField(g); }}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm capitalize transition-colors ${
                        gender === g ? "bg-green-600 text-white" : "bg-accent text-muted"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { setGender(gender); router.push("/setup"); }}
                className="w-full py-3 rounded-xl border border-green-600 text-green-700 dark:text-green-400 font-semibold hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
              >
                Play without signing in
              </button>
              <p className="text-subtle text-xs text-center">
                Guest rounds won&apos;t be saved.
              </p>
            </>
          )}
        </div>

        <p className="mt-12 text-subtle text-xs text-center">
          909 Ferndale Ave, Herndon VA 20170 · (703) 471-5769
        </p>
      </div>
    </main>
  );
}
