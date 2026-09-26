// Three-state routing (PLAN.md Section 1): new → onboarding, partial → resume, done → /home.
// Pure so it can be unit tested and used by proxy.ts.
import type { OnboardingStep } from "../schemas/index.ts";

export const PUBLIC_PATHS = ["/", "/status"];

/** Pages a user may open before onboarding is done. */
const ONBOARDING_PATHS = ["/onboarding"];
/** The assessment is part of onboarding's last step, and also available afterwards. */
const ASSESSMENT_PATHS = ["/assessment"];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function homeFor(step: OnboardingStep): string {
  return step === "done" ? "/home" : "/onboarding";
}

/**
 * Where a request should go instead, or null to let it through.
 * `step` is null when there is no valid session.
 */
export function redirectFor(pathname: string, step: OnboardingStep | null): string | null {
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (step === null) return isPublic ? null : "/";
  if (pathname === "/") return homeFor(step);
  if (isPublic) return null;

  if (step === "done") {
    return matches(pathname, ONBOARDING_PATHS) ? "/home" : null;
  }
  if (matches(pathname, ONBOARDING_PATHS)) return null;
  if (step === "assessment" && matches(pathname, ASSESSMENT_PATHS)) return null;
  return "/onboarding";
}
