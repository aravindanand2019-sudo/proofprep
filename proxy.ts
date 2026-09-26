// Three-state routing (Next.js 16 "proxy", formerly middleware). Verifies the Firebase
// session cookie and routes by users/{uid}.onboardingStep; see lib/auth/routing.ts.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { redirectFor } from "@/lib/auth/routing";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { OnboardingStepSchema, type OnboardingStep } from "@/lib/schemas";

async function onboardingStepFor(
  sessionCookie: string | undefined,
): Promise<OnboardingStep | null> {
  if (!sessionCookie) return null;
  try {
    const { uid } = await getAdminAuth().verifySessionCookie(sessionCookie);
    const snap = await getAdminDb().collection("users").doc(uid).get();
    const step = OnboardingStepSchema.safeParse(snap.get("onboardingStep"));
    return step.success ? step.data : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const step = await onboardingStepFor(sessionCookie);
  const target = redirectFor(request.nextUrl.pathname, step);

  const response = target
    ? NextResponse.redirect(new URL(target, request.url))
    : NextResponse.next();
  // Drop a cookie that no longer verifies so the browser stops sending it.
  if (sessionCookie && step === null) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  // Pages only: skip API routes, Next internals and files with an extension.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
