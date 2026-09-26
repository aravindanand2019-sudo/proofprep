// Onboarding (PLAN.md Section 1, point 1). Opens at the step saved in users/{uid}.
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { FORM_STEPS, type FormStep } from "@/lib/onboarding";
import { DEFAULT_HOURS_PER_DAY } from "@/lib/schemas";
import { getSessionUid } from "@/lib/server/session";
import { getCompanies, getUser } from "@/lib/server/users";
import { OnboardingStepper, type OnboardingDefaults } from "./onboarding-stepper";

export const dynamic = "force-dynamic";

function toDateInput(date: Date | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function OnboardingPage() {
  const uid = await getSessionUid();
  if (!uid) redirect("/");
  const [user, companies] = await Promise.all([getUser(uid), getCompanies()]);
  if (!user) redirect("/");
  if (user.onboardingStep === "done") redirect("/home");

  const saved = user.onboardingStep === "optional" ? "assessment" : user.onboardingStep;
  const step: FormStep = (FORM_STEPS as readonly string[]).includes(saved)
    ? (saved as FormStep)
    : "target";
  const { profile } = user;
  const defaults: OnboardingDefaults = {
    targetRole: profile.targetRole ?? "",
    targetCompanies: profile.targetCompanies ?? [],
    placementDate: toDateInput(profile.placementDate),
    hoursPerDay: profile.hoursPerDay ?? DEFAULT_HOURS_PER_DAY,
    github: profile.links?.github ?? "",
    linkedin: profile.links?.linkedin ?? "",
    leetcode: profile.links?.leetcode ?? "",
  };

  return (
    <>
      <AppHeader showNav={false} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <OnboardingStepper
          initialStep={step}
          firstName={user.name.split(" ")[0] || "there"}
          defaults={defaults}
          companies={companies.map((c) => ({ id: c.id, name: c.name, tier: c.tier }))}
        />
      </main>
    </>
  );
}
