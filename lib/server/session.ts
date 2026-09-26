// Session-cookie helpers for server components and route handlers.
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { getAdminAuth } from "@/lib/firebase/admin";

/** Verifies a session cookie value; returns the uid or null. */
export async function verifySession(cookieValue: string | undefined): Promise<string | null> {
  if (!cookieValue) return null;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookieValue);
    return decoded.uid;
  } catch {
    return null;
  }
}

/** The signed-in uid from the session cookie, or from an "Authorization: Bearer <Firebase ID token>" header. */
export async function getSessionUid(): Promise<string | null> {
  const bearer = (await headers()).get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (bearer) {
    try {
      return (await getAdminAuth().verifyIdToken(bearer)).uid;
    } catch {
      return null;
    }
  }
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in");
    this.name = "UnauthorizedError";
  }
}

/** For route handlers: the signed-in uid, or throws UnauthorizedError. */
export async function requireUid(): Promise<string> {
  const uid = await getSessionUid();
  if (!uid) throw new UnauthorizedError();
  return uid;
}

/** Maps thrown errors to JSON responses so routes never leak stack traces. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
