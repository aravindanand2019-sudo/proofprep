"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FORM_STEPS,
  ROLE_SUGGESTIONS,
  STEP_TITLES,
  type FormStep,
  type OnboardingRequest,
} from "@/lib/onboarding";
import { MAX_TARGET_COMPANIES } from "@/lib/schemas";

export type OnboardingDefaults = {
  targetRole: string;
  targetCompanies: string[];
  placementDate: string;
  hoursPerDay: number;
  github: string;
  linkedin: string;
  leetcode: string;
};

type CompanyOption = { id: string; name: string; tier: string };

type Props = {
  initialStep: FormStep;
  firstName: string;
  defaults: OnboardingDefaults;
  companies: CompanyOption[];
};

async function saveStep(request: OnboardingRequest): Promise<FormStep | "done"> {
  const res = await fetch("/api/onboarding", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const body = (await res.json().catch(() => ({}))) as {
    onboardingStep?: FormStep | "done";
    error?: string;
  };
  if (!res.ok || !body.onboardingStep) throw new Error(body.error ?? "Could not save. Try again.");
  return body.onboardingStep;
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        selected ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function OnboardingStepper({ initialStep, firstName, defaults, companies }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<FormStep>(initialStep);
  const [values, setValues] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const index = FORM_STEPS.indexOf(step);
  const set = <K extends keyof OnboardingDefaults>(key: K, value: OnboardingDefaults[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  function toggleCompany(id: string) {
    const selected = values.targetCompanies.includes(id);
    if (!selected && values.targetCompanies.length >= MAX_TARGET_COMPANIES) {
      setError(`Pick at most ${MAX_TARGET_COMPANIES} companies.`);
      return;
    }
    setError(null);
    set(
      "targetCompanies",
      selected ? values.targetCompanies.filter((c) => c !== id) : [...values.targetCompanies, id],
    );
  }

  function requestFor(current: FormStep): OnboardingRequest {
    switch (current) {
      case "target":
        return {
          step: "target",
          targetRole: values.targetRole,
          targetCompanies: values.targetCompanies,
        };
      case "timeline":
        return {
          step: "timeline",
          placementDate: values.placementDate,
          hoursPerDay: values.hoursPerDay,
        };
      case "assessment":
        return { step: "assessment", choice: "skip" };
    }
  }

  async function submit(event?: FormEvent, override?: OnboardingRequest) {
    event?.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const next = await saveStep(override ?? requestFor(step));
      if (next === "done") {
        router.replace("/home");
        return;
      }
      setStep(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const prev = FORM_STEPS[index - 1];

  return (
    <div>
      <p className="text-muted-foreground text-sm">
        Step {index + 1} of {FORM_STEPS.length}
      </p>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {FORM_STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{STEP_TITLES[step]}</h1>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-6">
        {step === "target" && (
          <>
            <p className="text-muted-foreground">
              Hi {firstName}. What role are you preparing for, and where?
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="role">Target role</Label>
              <div className="flex flex-wrap gap-2">
                {ROLE_SUGGESTIONS.map((role) => (
                  <Chip
                    key={role}
                    selected={values.targetRole === role}
                    onClick={() => set("targetRole", role)}
                  >
                    {role}
                  </Chip>
                ))}
              </div>
              <Input
                id="role"
                value={values.targetRole}
                onChange={(e) => set("targetRole", e.target.value)}
                placeholder="Or type your own"
                maxLength={80}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Target companies (up to {MAX_TARGET_COMPANIES})</Label>
              <div className="flex flex-wrap gap-2">
                {companies.map((c) => (
                  <Chip
                    key={c.id}
                    selected={values.targetCompanies.includes(c.id)}
                    onClick={() => toggleCompany(c.id)}
                  >
                    {c.name}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}

        {step === "timeline" && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="placementDate">When do placements start?</Label>
              <Input
                id="placementDate"
                type="date"
                value={values.placementDate}
                onChange={(e) => set("placementDate", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hours">Hours you can practise per day</Label>
              <Input
                id="hours"
                type="number"
                min={0.5}
                max={16}
                step={0.5}
                value={values.hoursPerDay}
                onChange={(e) => set("hoursPerDay", Number(e.target.value))}
                required
              />
              <p className="text-muted-foreground text-sm">You can change this later.</p>
            </div>
          </>
        )}

        {step === "assessment" && (
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              About 20 minutes across aptitude, coding and communication. It sets your first
              readiness score and builds your roadmap. You can skip it and take it from Home.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {[
                "Aptitude · 10 questions",
                "Coding · 10 questions",
                "Communication · 10 prompts",
                "Spoken or typed answers",
              ].map((item) => (
                <li key={item} className="rounded-lg border p-3 text-sm">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          {prev ? (
            <Button type="button" variant="ghost" onClick={() => setStep(prev)} disabled={saving}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {step === "assessment" ? (
            <div className="flex gap-2">
              <Button type="submit" variant="outline" disabled={saving}>
                {saving ? "Saving..." : "Skip for now"}
              </Button>
              <Link href="/assessment" className={buttonVariants()}>
                Start assessment
              </Link>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Continue"}
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
