import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | undefined;
let _db:  Firestore  | undefined;

function app(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return _app;
}

// Lazily resolved — safe to import on server; init happens only in browser
export const getFirebaseAuth = () => getAuth(app());

/**
 * Firestore with `ignoreUndefinedProperties: true` so that optional fields on
 * Round / Shot / UserProfile (e.g. shotShape, holedOut, differential,
 * totalStrokesGained) don't blow up setDoc when undefined.
 * initializeFirestore must be called once before any getFirestore() call.
 */
export function getFirebaseDb(): Firestore {
  if (_db) return _db;
  const a = app();
  try {
    _db = initializeFirestore(a, { ignoreUndefinedProperties: true });
  } catch {
    // Already initialized elsewhere (e.g. HMR) — fall back to the existing instance.
    _db = getFirestore(a);
  }
  return _db;
}
