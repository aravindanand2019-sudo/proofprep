// Shared by proxy.ts, API routes and client code. No server-only imports here.

/** Firebase session cookie (httpOnly). "__session" is the name Firebase Hosting forwards. */
export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

/** Fixed Firebase Auth uid of the judges' demo account. */
export const DEMO_UID = "demo-student";
