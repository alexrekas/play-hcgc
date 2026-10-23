"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { useProfile } from "@/lib/profileContext";
import AuthForm, { type AuthMode } from "@/components/AuthForm";
import SiteFooter from "@/components/SiteFooter";
import type { HandicapRecord } from "@/types";
import { getHandicapRecord } from "@/lib/firestore";
import { COURSE, TEE_LABELS, DEFAULT_TEE } from "@/data/course";
import { courseHandicap } from "@/lib/handicap";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { profile } = useProfile();

  // null = account options collapsed; otherwise which form is showing.
  const [authMode,  setAuthMode]  = useState<AuthMode | null>(null);
  const [hcpRecord, setHcpRecord] = useState<HandicapRecord | null>(null);

  useEffect(() => {
    if (!user) { setHcpRecord(null); return; }
    getHandicapRecord(user.uid).then(setHcpRecord).catch(() => {});
  }, [user]);

  function startGuestRound() {
    // Same path the old "Play without signing in" button took: Course Setup
    // creates the round when the player tees off.
    router.push("/setup");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-app flex flex-col">

      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-3">
            <span className="text-5xl">⛳</span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-app">Play HCGC</h1>
              <p className="text-subtle text-sm">Herndon Centennial Golf Course</p>
            </div>
          </div>
          <p className="text-muted mt-4 max-w-sm mx-auto leading-relaxed">
            Turn a range session into a round at Herndon Centennial — aim on the hole map, hit the shot, mark where it landed.
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
                  const tee = COURSE.teeInfo[DEFAULT_TEE];
                  const ch  = courseHandicap(hcpRecord.handicapIndex!, tee.slope, tee.rating, COURSE.par);
                  return (
                    <div className="mt-3 pt-3 border-t border-app flex justify-around text-center">
                      <div>
                        <p className="text-subtle text-[10px] uppercase tracking-wider">Index</p>
                        <p className="font-bold text-xl text-app">{hcpRecord.handicapIndex!.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-subtle text-[10px] uppercase tracking-wider">
                          Course Hcp ({TEE_LABELS[DEFAULT_TEE]})
                        </p>
                        <p className="font-bold text-xl text-app">{ch}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <button
                onClick={() => router.push("/setup")}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold text-lg transition-colors"
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
              <button
                onClick={startGuestRound}
                className="w-full py-4 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold text-xl shadow-lg transition-colors"
              >
                Start a round
              </button>
              <p className="text-subtle text-xs text-center -mt-1">
                No account needed. You can save the round at the end.
              </p>

              <div className="pt-4 border-t border-app">
                {authMode === null ? (
                  <div className="space-y-2">
                    <p className="text-subtle text-xs text-center">
                      Have an account? Sign in to save rounds and track your handicap.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAuthMode("signin")}
                        className="flex-1 py-2.5 rounded-xl border border-app bg-card text-app font-semibold text-sm hover:border-primary transition-colors"
                      >
                        Sign in
                      </button>
                      <button
                        onClick={() => setAuthMode("signup")}
                        className="flex-1 py-2.5 rounded-xl border border-app bg-card text-app font-semibold text-sm hover:border-primary transition-colors"
                      >
                        Create account
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AuthForm mode={authMode} onModeChange={setAuthMode} />
                    <button
                      onClick={() => setAuthMode(null)}
                      className="w-full py-1 text-subtle hover:text-app text-xs"
                    >
                      Not now
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>

      <SiteFooter />
    </main>
  );
}
