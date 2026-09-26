// Browser-side sign-in helpers. The server session (cookie) is the source of truth;
// Firebase client auth is only used to obtain a fresh ID token.
import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  signInWithCustomToken,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";

async function readError(res: Response): Promise<string> {
  const body: unknown = await res.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return `Request failed (${res.status})`;
}

/** Exchanges the Firebase ID token for a session cookie; returns where to go next. */
async function startSession(user: FirebaseUser): Promise<string> {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const { redirectTo } = (await res.json()) as { redirectTo: string };
  return redirectTo;
}

export async function signInWithGoogle(): Promise<string> {
  const credential = await signInWithPopup(getClientAuth(), new GoogleAuthProvider());
  return startSession(credential.user);
}

export async function signInAsDemo(): Promise<string> {
  const res = await fetch("/api/auth/demo", { method: "POST" });
  if (!res.ok) throw new Error(await readError(res));
  const { customToken } = (await res.json()) as { customToken: string };
  const credential = await signInWithCustomToken(getClientAuth(), customToken);
  return startSession(credential.user);
}

export async function signOut(): Promise<void> {
  await Promise.allSettled([
    fetch("/api/auth/signout", { method: "POST" }),
    firebaseSignOut(getClientAuth()),
  ]);
}

/** Human-readable message for a sign-in failure, or null if the user just closed the popup. */
export function signInErrorMessage(error: unknown): string | null {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return null;
      case "auth/popup-blocked":
        return "Your browser blocked the sign-in popup. Allow popups for this site and try again.";
      case "auth/operation-not-allowed":
      case "auth/configuration-not-found":
        return "Google sign-in is not enabled for this Firebase project yet.";
      default:
        return `Sign-in failed (${error.code}).`;
    }
  }
  return error instanceof Error ? error.message : "Sign-in failed.";
}
