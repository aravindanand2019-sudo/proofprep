// Readiness Score (PLAN.md Section 5). Pure functions only: no Firestore, no clock.
import type {
  Company,
  ReadinessComponent,
  ReadinessConfidence,
  ReadinessResult,
  Skill,
  SkillCategory,
  WithId,
} from "../schemas/index.ts";

export const READINESS_COMPONENTS: readonly ReadinessComponent[] = [
  "aptitude",
  "dsa",
  "cs",
  "projects",
  "communication",
];

/** Components with at least this weight decide the overall confidence. */
export const CONFIDENCE_WEIGHT_THRESHOLD = 0.15;
export const COMM_ATTEMPTS_USED = 3;
export const TOP_PROJECTS_USED = 2;

export type ComponentRecord<T> = Record<ReadinessComponent, T>;
export type ReadinessLabel = "Ready" | "Close" | "Building";

/** Everything the formula needs about one student, gathered by the caller. */
export type ReadinessInput = {
  skills: WithId<Skill>[];
  /** mastery (0–1) per skillId; skills the student has never attempted are absent. */
  mastery: Record<string, number>;
  /** Attempts in each question category (aptitude / dsa / cs), for confidence. */
  categoryAttempts: Record<"aptitude" | "dsa" | "cs", number>;
  /** One entry per analyzed project. */
  projects: ProjectEvidence[];
  /** Comm attempt `overall` scores (0–100), newest first. */
  commOveralls: number[];
};

export type ProjectEvidence = {
  supported: number;
  partial: number;
  totalClaims: number;
  /** overall.score (0–5) of the latest completed project_defense session, or null if none. */
  defenseScore: number | null;
};

export type ReadinessBreakdown = {
  /** w · min(1, S/B) · 100 per component; these sum to the score. */
  contributions: ComponentRecord<number>;
  /** w · (1 − min(1, S/B)) · 100: points still available per component. */
  missing: ComponentRecord<number>;
  biggestLever: ReadinessComponent | null;
  label: ReadinessLabel;
};

export type ReadinessReport = ReadinessResult & {
  componentConfidence: ComponentRecord<ReadinessConfidence>;
  breakdown: ReadinessBreakdown;
};

const CONFIDENCE_ORDER: readonly ReadinessConfidence[] = ["low", "medium", "high"];

function clamp100(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * S for aptitude / dsa / cs: mean of mastery × 100 over the category's attempted skills,
 * weighted by the company's skillImportance (default 1). 0 when nothing was attempted.
 */
export function categoryScore(
  category: SkillCategory,
  company: Company,
  skills: WithId<Skill>[],
  mastery: Record<string, number>,
): number {
  let weighted = 0;
  let totalWeight = 0;
  for (const skill of skills) {
    const m = mastery[skill.id];
    if (skill.category !== category || m === undefined) continue;
    const importance = company.skillImportance[skill.id] ?? 1;
    weighted += importance * m * 100;
    totalWeight += importance;
  }
  return totalWeight === 0 ? 0 : clamp100(weighted / totalWeight);
}

/** projectScore = 50·(supported + 0.5·partial)/totalClaims + 10·defenseScore. */
export function projectScore(project: ProjectEvidence): number {
  const claimPart =
    project.totalClaims === 0
      ? 0
      : (50 * (project.supported + 0.5 * project.partial)) / project.totalClaims;
  return clamp100(claimPart + 10 * (project.defenseScore ?? 0));
}

/** S_projects = mean of the top 2 projectScores; 0 with no projects. */
export function projectsScore(projects: ProjectEvidence[]): number {
  const top = projects
    .map(projectScore)
    .sort((a, b) => b - a)
    .slice(0, TOP_PROJECTS_USED);
  return mean(top);
}

/** S_communication = mean overall of the latest 3 attempts; 0 with none. */
export function communicationScore(commOveralls: number[]): number {
  return clamp100(mean(commOveralls.slice(0, COMM_ATTEMPTS_USED)));
}

export function componentScores(company: Company, input: ReadinessInput): ComponentRecord<number> {
  return {
    aptitude: categoryScore("aptitude", company, input.skills, input.mastery),
    dsa: categoryScore("dsa", company, input.skills, input.mastery),
    cs: categoryScore("cs", company, input.skills, input.mastery),
    projects: projectsScore(input.projects),
    communication: communicationScore(input.commOveralls),
  };
}

function attemptConfidence(attempts: number): ReadinessConfidence {
  if (attempts >= 10) return "high";
  if (attempts >= 6) return "medium";
  return "low";
}

export function componentConfidence(input: ReadinessInput): ComponentRecord<ReadinessConfidence> {
  const hasProject = input.projects.length > 0;
  const hasDefense = input.projects.some((p) => p.defenseScore !== null);
  const comm = input.commOveralls.length;
  return {
    aptitude: attemptConfidence(input.categoryAttempts.aptitude),
    dsa: attemptConfidence(input.categoryAttempts.dsa),
    cs: attemptConfidence(input.categoryAttempts.cs),
    projects: hasProject && hasDefense ? "high" : hasProject ? "medium" : "low",
    communication: comm >= 3 ? "high" : comm >= 1 ? "medium" : "low",
  };
}

/** Lowest level among components with weight ≥ 0.15 (all components if none qualify). */
export function overallConfidence(
  company: Company,
  perComponent: ComponentRecord<ReadinessConfidence>,
): ReadinessConfidence {
  const deciding = READINESS_COMPONENTS.filter(
    (k) => company.weights[k] >= CONFIDENCE_WEIGHT_THRESHOLD,
  );
  const considered = deciding.length > 0 ? deciding : READINESS_COMPONENTS;
  const lowest = Math.min(...considered.map((k) => CONFIDENCE_ORDER.indexOf(perComponent[k])));
  return CONFIDENCE_ORDER[lowest] ?? "low";
}

export function readinessLabel(score: number): ReadinessLabel {
  if (score >= 85) return "Ready";
  if (score >= 65) return "Close";
  return "Building";
}

/** Readiness_c = Σ_k w_ck · min(1, S_k / B_ck) · 100, plus the per-component breakdown. */
export function scoreFromComponents(
  company: Company,
  components: ComponentRecord<number>,
): { score: number; breakdown: ReadinessBreakdown } {
  const contributions = {} as ComponentRecord<number>;
  const missing = {} as ComponentRecord<number>;
  let biggestLever: ReadinessComponent | null = null;

  for (const k of READINESS_COMPONENTS) {
    const bar = company.bars[k];
    const ratio = bar === 0 ? 1 : Math.min(1, components[k] / bar);
    contributions[k] = company.weights[k] * ratio * 100;
    missing[k] = company.weights[k] * (1 - ratio) * 100;
    if (missing[k] > 0 && (biggestLever === null || missing[k] > missing[biggestLever])) {
      biggestLever = k;
    }
  }

  const score = READINESS_COMPONENTS.reduce((sum, k) => sum + contributions[k], 0);
  return {
    score,
    breakdown: { contributions, missing, biggestLever, label: readinessLabel(score) },
  };
}

export function computeReadiness(company: Company, input: ReadinessInput): ReadinessReport {
  const components = componentScores(company, input);
  const perComponent = componentConfidence(input);
  const { score, breakdown } = scoreFromComponents(company, components);
  return {
    score,
    components,
    confidence: overallConfidence(company, perComponent),
    componentConfidence: perComponent,
    breakdown,
  };
}
