// View models for Home (screen #6).
import type { ReadinessLabel } from "@/lib/engine/readiness";
import type { AssessmentStatus, ReadinessComponent, ReadinessConfidence } from "@/lib/schemas";

export type ReadinessCard = {
  companyId: string;
  companyName: string;
  score: number;
  label: ReadinessLabel;
  confidence: ReadinessConfidence;
  biggestLever: ReadinessComponent | null;
};

export type TodayCard = {
  title: string;
  reason: string;
  estMinutes: number | null;
  href: string;
  cta: string;
};

export type ModuleCard = {
  id: string;
  title: string;
  description: string;
  stat: string | null;
  href: string;
};

export type HomeData = {
  firstName: string;
  assessmentStatus: AssessmentStatus;
  readiness: ReadinessCard[];
  today: TodayCard;
  modules: ModuleCard[];
};
