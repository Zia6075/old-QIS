// ============================================
// Firebase Auth — LOGIN BASED (anonymous NAHI)
// ============================================
// ⭐ Kyun badla:
//   • Anonymous se har bar naya session banta tha → Google ko spam lag sakta tha
//   • Aur jo bhi web link jan jaye, woh data khol sakta tha (security khatra)
// Ab:
//   • Har app user ka ek Firebase Auth account hota hai
//     (email = username + '@qis.local', password wahi jo app mein hai)
//   • Login ke baghair cloud data tak rasai NAHI
//   • RTDB rules email se match karti hain (database.rules.json)
//   • Naya user "Users" page se bane to us ka Firebase account bhi khud ban jata hai
// ============================================

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged,
  type Auth, type User as FbUser,
} from 'firebase/auth';
import { firebaseConfig, usernameToEmail, ensureDatabaseUrl } from './config';

const SESSION_EMAIL_KEY = 'qis_firebase_email';
const REFRESH_BEFORE_MS = 5 * 60 * 1000; // expiry se 5 min pehle refresh

let app: FirebaseApp | null = null;
let authRef: Auth | null = null;
let tokenCache: { token: string; expiresAt: number } | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return app;
};

export const getFirebaseAuth = (): Auth => {
  if (!authRef) authRef = getAuth(getFirebaseApp());
  return authRef;
};

const cacheToken = async (user: FbUser): Promise<void> => {
  const token = await user.getIdToken();
  tokenCache = { token, expiresAt: Date.now() + 55 * 60 * 1000 }; // ~1 ghanta
};

const startTokenRefresh = (): void => {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    const auth = getFirebaseAuth();
    if (auth.currentUser && (!tokenCache || Date.now() > tokenCache.expiresAt - REFRESH_BEFORE_MS)) {
      await cacheToken(auth.currentUser);
    }
  }, 10 * 60 * 1000);
};

export const getIdToken = async (): Promise<string | null> => tokenCache?.token ?? null;
export const isSignedIn = (): boolean => !!getFirebaseAuth().currentUser;

/** Human-readable error (Firebase ke codes ko Urdu/English mix mein) */
const explain = (e: unknown): string => {
  const code = (e as { code?: string })?.code || '';
  const raw = e instanceof Error ? e.message : String(e || '');
  // ⭐ Google ne project/API key suspend kar di ho (heavy anonymous traffic ka nateeja)
  if (/suspended/i.test(raw) || /api-key-suspended/i.test(code)) {
    return 'Firebase project ka API key SUSPENDED hai (Google ne rok diya hai). ' +
           'Console (console.cloud.google.com → APIs & Services) se "Identity Toolkit API" dobara ENABLE karein ' +
           'aur Authentication mein Anonymous band karein. Detail: RECOVERY-API-SUSPENDED.md';
  }
  if (/network|fetch/i.test(code)) return 'Internet nahi hai ya Firebase se connect nahi ho saka.';
  if (/auth\/invalid-credential|auth\/wrong-password|auth\/user-not-found/.test(code))
    return 'Email ya password ghalat hai.';
  if (/auth\/email-already-in-use/.test(code))
    return 'Yeh email pehle se maujood hai (Firebase Auth).';
  if (/auth\/weak-password/.test(code)) return 'Password kam az kam 6 characters ka hona chahiye.';
  if (/auth\/network-request-failed/.test(code)) return 'Internet nahi hai — Firebase se connect nahi ho saka.';
  if (/auth\/operation-not-allowed/.test(code))
    return 'Firebase Console → Authentication → Sign-in method → Email/Password ENABLE karein.';
  return e instanceof Error ? e.message : String(e);
};

/**
 * Login: username → username@qis.local + password.
 * Anonymous fallback JAAN BOOJH kar nahi hai (security + Google spam se bachne ke liye).
 */
export const firebaseSignIn = async (usernameOrEmail: string, password: string): Promise<{ email: string }> => {
  // ⭐ initializeApp se PEHLE sahi RTDB URL tay karo (warna SDK ghalat region
  //    par likhne ki koshish karta hai aur request timeout ho jati hai)
  await ensureDatabaseUrl();
  const auth = getFirebaseAuth();
  const email = usernameOrEmail.includes('@') ? usernameOrEmail.trim().toLowerCase() : usernameToEmail(usernameOrEmail);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    localStorage.setItem(SESSION_EMAIL_KEY, email);
    await cacheToken(cred.user);
    startTokenRefresh();
    return { email };
  } catch (e) {
    throw new Error(explain(e));
  }
};

/**
 * ⭐ Naya user banate waqt: Firebase Auth account bhi banao
 * (Users page se add kiya gaya user phir web/PC dono par login kar sake ga)
 */
export const firebaseCreateAccount = async (usernameOrEmail: string, password: string): Promise<{ created: boolean; email: string; note?: string }> => {
  await ensureDatabaseUrl();
  const auth = getFirebaseAuth();
  const email = usernameOrEmail.includes('@') ? usernameOrEmail.trim().toLowerCase() : usernameToEmail(usernameOrEmail);
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    return { created: true, email };
  } catch (e) {
    const msg = explain(e);
    if (/pehle se maujood/.test(msg)) return { created: false, email, note: 'Firebase account pehle se tha — login chal jaye ga.' };
    throw new Error(msg);
  }
};

/**
 * App start par: purani session (SDK khud persist karta hai) ya saved email.
 * Password yaad nahi hota — is liye user ko dobara login karna parta hai (security).
 */
export const restoreSession = async (): Promise<{ email: string | null; signedIn: boolean }> => {
  const auth = getFirebaseAuth();
  const current: FbUser | null = await new Promise((resolve) => {
    const off = onAuthStateChanged(auth, (u) => { off(); resolve(u); });
  });
  if (current) {
    await cacheToken(current);
    startTokenRefresh();
    return { email: current.email, signedIn: true };
  }
  return { email: localStorage.getItem(SESSION_EMAIL_KEY), signedIn: false };
};

export const firebaseSignOut = async (): Promise<void> => {
  localStorage.removeItem(SESSION_EMAIL_KEY);
  tokenCache = null;
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
};
