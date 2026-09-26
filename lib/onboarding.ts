// Onboarding steps and request shapes (PLAN.md Section 1, point 1). Shared by the
// stepper (client) and /api/onboarding (server).
import { z } from "zod";
import { MAX_TARGET_COMPANIES } from "./schemas/index.ts";

// Links and resume moved to /connect, so the "optional" step is skipped.
export const FORM_STEPS = ["target", "timeline", "assessment"] as const;
export type FormStep = (typeof FORM_STEPS)[number];

export const STEP_TITLES: Record<FormStep, string> = {
  target: "Your target",
  timeline: "Your timeline",
  assessment: "Quick assessment",
};

export const ROLE_SUGGESTIONS = [
  "Software Development Engineer",
  "Full-stack Developer",
  "Data / ML Engineer",
  "Associate Software Engineer (service company)",
];

export function nextStep(step: FormStep): FormStep | "done" {
  const index = FORM_STEPS.indexOf(step);
  return FORM_STEPS[index + 1] ?? "done";
}

/** YYYY-MM-DD from <input type="date">. */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

export const OnboardingRequestSchema = z.discriminatedUnion("step", [
  z.object({
    step: z.literal("target"),
    targetRole: z.string().trim().min(2, "Enter a role").max(80),
    targetCompanies: z
      .array(z.string().min(1))
      .min(1, "Pick at least one company")
      .max(MAX_TARGET_COMPANIES, `Pick at most ${MAX_TARGET_COMPANIES} companies`),
  }),
  z.object({
    step: z.literal("timeline"),
    placementDate: isoDate,
    hoursPerDay: z.number().min(0.5, "At least 30 minutes").max(16),
  }),
  z.object({
    step: z.literal("assessment"),
    choice: z.literal("skip"),
  }),
]);
export type OnboardingRequest = z.infer<typeof OnboardingRequestSchema>;
