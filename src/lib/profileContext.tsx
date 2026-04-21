"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { useAuth } from "./authContext";
import type { UserProfile } from "@/types";
import { DEFAULT_BAG, type Gender } from "@/data/clubs";

interface Ctx {
  profile: UserProfile | null;
  gender: Gender;              // defaults to "male" for guests
  bag: string[];               // club IDs — falls back to DEFAULT_BAG for guests
  setProfile: (p: UserProfile) => Promise<void>;
  setGender: (g: Gender) => void; // for guests (local state only)
}

const ProfileContext = createContext<Ctx>({
  profile: null,
  gender: "male",
  bag: DEFAULT_BAG,
  setProfile: async () => {},
  setGender: () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile,  setProfileState] = useState<UserProfile | null>(null);
  const [guestGender, setGuestGender] = useState<Gender>("male");

  // Load profile when the user changes
  useEffect(() => {
    if (!user) {
      setProfileState(null);
      return;
    }
    getDoc(doc(getFirebaseDb(), "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<UserProfile>;
        // Backfill bag for profiles created before the bag field existed.
        const loaded: UserProfile = {
          uid:         data.uid         ?? user.uid,
          email:       data.email       ?? user.email ?? "",
          displayName: data.displayName ?? "Player",
          gender:      data.gender      ?? "male",
          bag:         Array.isArray(data.bag) && data.bag.length > 0 ? data.bag : DEFAULT_BAG,
          createdAt:   data.createdAt   ?? new Date().toISOString(),
        };
        setProfileState(loaded);
        // Persist the backfill silently if bag was missing.
        if (!Array.isArray(data.bag) || data.bag.length === 0) {
          setDoc(doc(getFirebaseDb(), "users", user.uid), loaded).catch(() => {});
        }
      } else {
        // Scaffold a default profile
        const fresh: UserProfile = {
          uid:         user.uid,
          email:       user.email ?? "",
          displayName: user.displayName ?? (user.email?.split("@")[0] ?? "Player"),
          gender:      "male",
          bag:         DEFAULT_BAG,
          createdAt:   new Date().toISOString(),
        };
        setDoc(doc(getFirebaseDb(), "users", user.uid), fresh).catch(() => {});
        setProfileState(fresh);
      }
    }).catch(() => {});
  }, [user]);

  async function setProfile(p: UserProfile) {
    setProfileState(p);
    await setDoc(doc(getFirebaseDb(), "users", p.uid), p);
  }

  const gender = profile?.gender ?? guestGender;
  const bag = profile?.bag ?? DEFAULT_BAG;

  return (
    <ProfileContext.Provider value={{ profile, gender, bag, setProfile, setGender: setGuestGender }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
