import {
  collection, doc, setDoc, getDoc, getDocs,
  query, where, orderBy,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import type { Round, HandicapRecord } from "@/types";
import { calculateHandicapIndex } from "./handicap";

export async function saveRound(round: Round): Promise<void> {
  const ref = doc(getFirebaseDb(), "rounds", round.id);
  await setDoc(ref, round);
  if (round.userId) await refreshHandicap(round.userId);
}

export async function getRound(roundId: string): Promise<Round | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "rounds", roundId));
  return snap.exists() ? (snap.data() as Round) : null;
}

export async function getUserRounds(userId: string): Promise<Round[]> {
  const q = query(
    collection(getFirebaseDb(), "rounds"),
    where("userId", "==", userId),
    where("completed", "==", true),
    orderBy("date", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Round);
}

export async function refreshHandicap(userId: string): Promise<void> {
  const rounds = await getUserRounds(userId);
  const index  = calculateHandicapIndex(rounds);
  const record: HandicapRecord = {
    userId, rounds, handicapIndex: index, lastUpdated: new Date().toISOString(),
  };
  await setDoc(doc(getFirebaseDb(), "handicaps", userId), record);
}

export async function getHandicapRecord(userId: string): Promise<HandicapRecord | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "handicaps", userId));
  return snap.exists() ? (snap.data() as HandicapRecord) : null;
}
