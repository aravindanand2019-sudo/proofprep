// Roadmap: code computes the budget (PLAN.md Section 6, P5); P5 only sequences it.
import {
  getActiveRoadmap,
  getCompanies,
  getMistakes,
  getSkills,
  getSkillStates,
  getUserDoc,
  saveRoadmap,
} from "@/lib/data";
import { communicationScore } from "@/lib/engine/readiness";
import {
  DEFAULT_HOURS_PER_DAY,
  P5RoadmapGeneratorOutputSchema,
  type MistakeTarget,
  type RoadmapTrigger,
  type SkillState,
  type Task,
  type TaskKind,
} from "@/lib/schemas";
import { tryLlm } from "./llm";
import { loadReadinessInput } from "./readiness";

const DAY_MS = 864e5;
const PLAN_DAYS = 14;
const MAX_SKILLS = 6;
const TASKS_PER_DAY = 3;

export type BudgetItem = {
  skillId: string;
  skillName: string;
  category: string;
  minutesPerDay: number;
  kind: TaskKind;
  targetsMistakeType: MistakeTarget | null;
  reason: string;
  priority: number;
};

const KIND_FOR: Record<MistakeTarget, TaskKind> = {
  concept: "learn",
  application: "drill",
  careless: "timed_drill",
  overconfident: "calibration",
};

const KIND_LABEL: Record<TaskKind, string> = {
  learn: "Learn",
  drill: "Mixed drill",
  timed_drill: "Timed drill",
  calibration: "Calibration drill",
  mock_interview: "Mock interview",
  project_defense: "Project defense",
  comm_drill: "Communication practice",
};

function dominantMistake(state: SkillState | undefined): MistakeTarget | null {
  if (!state) return null;
  const entries = Object.entries(state.mistakeCounts) as Array<[MistakeTarget, number]>;
  const [top] = entries.sort((a, b) => b[1] - a[1]);
  return top && top[1] > 0 ? top[0] : null;
}

export async function computeBudget(uid: string): Promise<{
  items: BudgetItem[];
  daysLeft: number;
  hoursPerDay: number;
  companies: string[];
  targetRole: string;
}> {
  const [user, companiesAll, skills, states, mistakes, input] = await Promise.all([
    getUserDoc(uid),
    getCompanies(),
    getSkills(),
    getSkillStates(uid),
    getMistakes(uid, { openOnly: true }),
    loadReadinessInput(uid),
  ]);
  const targets = user?.profile.targetCompanies ?? [];
  const companies = companiesAll.filter((c) => targets.includes(c.id));
  const chosen = companies.length > 0 ? companies : companiesAll;
  const hoursPerDay = user?.profile.hoursPerDay ?? DEFAULT_HOURS_PER_DAY;
  const placement = user?.profile.placementDate?.getTime() ?? Date.now() + 60 * DAY_MS;
  const daysLeft = Math.max(1, Math.ceil((placement - Date.now()) / DAY_MS));
  const openBySkill = new Map<string, number>();
  for (const m of mistakes) openBySkill.set(m.skillId, (openBySkill.get(m.skillId) ?? 0) + 1);

  const scored = skills
    .filter((s) => s.category === "aptitude" || s.category === "dsa" || s.category === "cs")
    .map((skill) => {
      const cat = skill.category as "aptitude" | "dsa" | "cs";
      const mastery = states[skill.id]?.mastery ?? 0.3;
      let priority = 0;
      for (const c of chosen) {
        const gap = Math.max(0, c.bars[cat] - mastery * 100) / 100;
        priority += c.weights[cat] * gap * (c.skillImportance[skill.id] ?? 1);
      }
      priority *= 1 + 0.25 * (openBySkill.get(skill.id) ?? 0);
      const dominant = dominantMistake(states[skill.id]);
      return { skill, priority, dominant, mastery };
    })
    .filter((s) => s.priority > 0)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_SKILLS);

  const dailyMinutes = hoursPerDay * 60;
  const comm = communicationScore(input.commOveralls);
  const commBar = chosen.reduce((sum, c) => sum + c.bars.communication, 0) / chosen.length;
  const commMinutes = comm < commBar ? Math.min(20, Math.round(dailyMinutes * 0.15)) : 0;
  const skillMinutes = dailyMinutes - commMinutes;
  const total = scored.reduce((s, x) => s + x.priority, 0) || 1;

  const items: BudgetItem[] = scored.map(({ skill, priority, dominant, mastery }) => ({
    skillId: skill.id,
    skillName: skill.name,
    category: skill.category,
    minutesPerDay: Math.max(10, Math.round(((priority / total) * skillMinutes) / 5) * 5),
    kind: dominant ? KIND_FOR[dominant] : mastery < 0.4 ? "learn" : "drill",
    targetsMistakeType: dominant,
    reason: dominant
      ? `Most of your mistakes here are ${dominant === "overconfident" ? "overconfident answers" : `${dominant} ${dominant === "careless" ? "slips" : "gaps"}`}; mastery ${Math.round(mastery * 100)}%.`
      : `Mastery ${Math.round(mastery * 100)}% is below your companies' bar.`,
    priority,
  }));
  if (commMinutes > 0) {
    items.push({
      skillId: "comm-behavioral-star",
      skillName: "Communication (STAR / claim-reason-example)",
      category: "communication",
      minutesPerDay: commMinutes,
      kind: "comm_drill",
      targetsMistakeType: null,
      reason: `Communication is ${Math.round(comm)} vs an average bar of ${Math.round(commBar)}.`,
      priority: 0,
    });
  }
  return {
    items,
    daysLeft,
    hoursPerDay,
    companies: chosen.map((c) => c.name),
    targetRole: user?.profile.targetRole ?? "Software engineer",
  };
}

type DraftTask = Omit<Task, "roadmapId">;

/** Deterministic plan used when P5 is unavailable: rotate top skills, 3 tasks a day. */
function fallbackPlan(items: BudgetItem[], dailyMinutes: number, start: Date): DraftTask[] {
  if (items.length === 0) return [];
  const tasks: DraftTask[] = [];
  for (let day = 0; day < PLAN_DAYS; day += 1) {
    const picks = Array.from(
      { length: Math.min(TASKS_PER_DAY, items.length) },
      (_, k) => items[(day + k) % items.length],
    ).filter((x): x is BudgetItem => Boolean(x));
    const sum = picks.reduce((s, p) => s + p.minutesPerDay, 0);
    const scale = sum > dailyMinutes ? dailyMinutes / sum : 1;
    for (const item of picks) {
      const minutes = Math.max(15, Math.round((item.minutesPerDay * scale * 1.5) / 5) * 5);
      tasks.push({
        skillId: item.skillId,
        kind: item.kind,
        ...(item.targetsMistakeType ? { targetsMistakeType: item.targetsMistakeType } : {}),
        title: `${KIND_LABEL[item.kind]}: ${item.skillName} (${minutes} min)`,
        estMinutes: minutes,
        dueDate: new Date(start.getTime() + day * DAY_MS),
        status: "todo",
      });
    }
  }
  return tasks;
}

export async function generateRoadmap(
  uid: string,
  trigger: RoadmapTrigger,
): Promise<{ roadmapId: string; usedAi: boolean; note: string | null }> {
  const budget = await computeBudget(uid);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const dailyMinutes = budget.hoursPerDay * 60;
  const known = new Map(budget.items.map((i) => [i.skillId, i]));

  const ai = budget.items.length
    ? await tryLlm(
        "p5-roadmap-generator",
        {
          targetRole: budget.targetRole,
          companies: budget.companies,
          daysLeft: budget.daysLeft,
          hoursPerDay: budget.hoursPerDay,
          budget: budget.items.map(({ priority: _p, ...rest }) => rest),
        },
        P5RoadmapGeneratorOutputSchema,
      )
    : ({ ok: false, error: "Nothing to plan yet." } as const);

  let tasks: DraftTask[] = [];
  let rationale = "";
  if (ai.ok) {
    rationale = ai.data.rationale;
    for (const week of ai.data.weeks.slice(0, 2)) {
      const perDay = new Map<number, number>();
      for (const t of week.tasks) {
        const item = t.skillId ? known.get(t.skillId) : undefined;
        if (!item) continue;
        const used = perDay.get(t.day) ?? 0;
        if (used + t.estMinutes > dailyMinutes) continue;
        perDay.set(t.day, used + t.estMinutes);
        tasks.push({
          skillId: item.skillId,
          kind: item.kind,
          ...(item.targetsMistakeType ? { targetsMistakeType: item.targetsMistakeType } : {}),
          title: t.title,
          estMinutes: t.estMinutes,
          dueDate: new Date(start.getTime() + ((week.week - 1) * 7 + (t.day - 1)) * DAY_MS),
          status: "todo",
        });
      }
    }
  }
  const usedAi = tasks.length > 0;
  if (!usedAi) {
    tasks = fallbackPlan(budget.items, dailyMinutes, start);
    rationale =
      budget.items.length === 0
        ? "You're at or above every bar we track. Keep practising to stay there."
        : `Focus on ${budget.items
            .slice(0, 3)
            .map((i) => i.skillName)
            .join(
              ", ",
            )}: they cost you the most readiness points for ${budget.companies.join(", ")}. Each task type matches the kind of mistake you make.`;
  }

  const focusFor = (week: number) => {
    const inWeek = tasks.filter(
      (t) => Math.floor((t.dueDate.getTime() - start.getTime()) / (7 * DAY_MS)) === week,
    );
    const top = [...new Set(inWeek.map((t) => known.get(t.skillId ?? "")?.skillName ?? ""))]
      .filter(Boolean)
      .slice(0, 2);
    return top.length ? top.join(" + ") : "Maintenance";
  };

  const { roadmapId } = await saveRoadmap(
    uid,
    {
      generatedAt: start,
      trigger,
      rationale,
      weeks: [
        { week: 1, focus: focusFor(0), taskIds: [] },
        { week: 2, focus: focusFor(1), taskIds: [] },
      ],
    },
    tasks,
  );
  return { roadmapId, usedAi, note: ai.ok ? null : ai.error };
}

export { getActiveRoadmap, KIND_LABEL };
