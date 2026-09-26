// POST { idToken } → verifies the Firebase ID token, creates users/{uid} on first
// sign-in, and sets the httpOnly session cookie that proxy.ts checks.
import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth/constants";
import { homeFor } from "@/lib/auth/routing";
import { getAdminAuth } from "@/lib/firebase/admin";
import { errorResponse } from "@/lib/server/session";
import { ensureUser } from "@/lib/server/users";

const BodySchema = z.object({ idToken: z.string().min(1) });

export async function POST(request: Request) {
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  const auth = getAdminAuth();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(body.data.idToken);
  } catch {
    return NextResponse.json({ error: "Invalid sign-in token" }, { status: 401 });
  }

  try {
    const user = await ensureUser(decoded.uid, {
      name: typeof decoded.name === "string" ? decoded.name : "Student",
      email: decoded.email ?? `${decoded.uid}@users.proofprep.app`,
      photoURL: typeof decoded.picture === "string" ? decoded.picture : null,
    });
    const sessionCookie = await auth.createSessionCookie(body.data.idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const response = NextResponse.json({ redirectTo: homeFor(user.onboardingStep) });
    response.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
