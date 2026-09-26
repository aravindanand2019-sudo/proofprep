import type { ReadinessLabel } from "@/lib/engine/readiness";
import type { ReadinessComponent, ReadinessConfidence } from "@/lib/schemas";

export const COMPONENT_NAMES: Record<ReadinessComponent, string> = {
  aptitude: "Aptitude",
  dsa: "Coding & DSA",
  cs: "CS fundamentals",
  projects: "Projects",
  communication: "Communication",
};

export const CONFIDENCE_TEXT: Record<ReadinessConfidence, string> = {
  low: "Low confidence: not enough practice data yet",
  medium: "Medium confidence",
  high: "High confidence",
};

export const LABEL_STYLE: Record<ReadinessLabel, string> = {
  Ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Close: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Building: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

/** One decimal place, e.g. 69.95 → "70.0". */
export function fmt1(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}
