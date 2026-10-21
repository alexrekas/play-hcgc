"use client";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { DEFAULT_BAG, type Gender } from "@/data/clubs";
import type { UserProfile } from "@/types";

export type AuthMode = "signin" | "signup";

// Email/password sign-in + create-account form. Same behaviour the landing
// page always had; pulled out so the Results screen can offer it to guests.
export default function AuthForm({
  mode,
  onModeChange,
  onSuccess,
}: {
  mode: AuthMode;
  onModeChange: (m: AuthMode) => void;
  onSuccess?: () => void;
}) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [gender,   setGender]   = useState<Gender>("male");
  const [err,      setErr]      = useState<string | null>(null);
  const [busy,     setBusy]     = useState(false);

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
      onSuccess?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Authentication failed";
      setErr(msg.replace(/^Firebase:\s*/, "").replace(/\s*\(auth\/[^)]+\)\.?$/, ""));
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full bg-card border border-app rounded-xl px-4 py-3 text-app placeholder:text-subtle focus:outline-none focus:border-green-500";

  return (
    <div className="space-y-3">
      <div className="flex bg-accent rounded-xl p-1">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { onModeChange(m); setErr(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mode === m ? "bg-green-600 text-white" : "text-subtle"
            }`}
          >
            {m === "signin" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <>
            <input
              type="text"
              placeholder="Display Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={input}
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
                    onClick={() => setGender(g)}
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
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={input}
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
    </div>
  );
}
