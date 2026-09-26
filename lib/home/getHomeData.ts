// The single data source for Home: live readiness, the next roadmap task, module stats.
import {
  getActiveRoadmap,
  getMistakes,
  getProjects,
  getReadinessSnapshots,
  getUserDoc,
} from "@/lib/data";
import { computeUserReadiness } from "@/lib/server/readiness";
import type { HomeData, ModuleCard, TodayCard } from "./types";

const TASK_HREF: Record<string, string> = {
  learn: "/daily-practice",
  drill: "/daily-practice",
  timed_drill: "/daily-practice",
  calibration: "/daily-practice",
  comm_drill: "/assessment",
  mock_interview: "/mock-interview",
  project_defense: "/mock-interview",
};

export async function getHomeData(uid: string): Promise<HomeData> {
  const user = await getUserDoc(uid);
  if (!user) throw new Error(`No user document for ${uid}`);
  const [{ reports }, roadmap, mistakes, projects, snapshots] = await Promise.all([
    computeUserReadiness(uid),
    getActiveRoadmap(uid, user.activeRoadmapId),
    getMistakes(uid, { openOnly: true }),
    getProjects(uid),
    getReadinessSnapshots(uid),
  ]);
  const assessed = user.assessmentStatus === "done";

  const nextTask = roadmap?.tasks.find((t) => t.status === "todo");
  let today: TodayCard;
  if (!assessed) {
    today = {
      title: "Take the Quick Assessment",
      reason: "30 questions across aptitude, coding and communication set your real readiness.",
      estMinutes: 20,
      href: "/assessment",
      cta: "Start",
    };
  } else if (nextTask) {
    today = {
      title: nextTask.title,
      reason: nextTask.targetsMistakeType
        ? `Targets your ${nextTask.targetsMistakeType} mistakes.`
        : "Next task on your roadmap.",
      estMinutes: nextTask.estMinutes,
      href: TASK_HREF[nextTask.kind] ?? "/roadmap",
      cta: "Start",
    };
  } else {
    today = {
      title: "Build your roadmap",
      reason: "Turn your gaps into a day-by-day plan.",
      estMinutes: null,
      href: "/roadmap",
      cta: "Open roadmap",
    };
  }

  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const firstTarget = reports[0]?.company.id;
  const delta =
    first && last && firstTarget && snapshots.length > 1
      ? (last.perCompany[firstTarget]?.score ?? 0) - (first.perCompany[firstTarget]?.score ?? 0)
      : null;
  const doneTasks = roadmap?.tasks.filter((t) => t.status === "done").length ?? 0;

  const modules: ModuleCard[] = [
    {
      id: "skill-gap",
      title: "Skill Gap",
      description: "Where you stand and why you get questions wrong.",
      stat: assessed ? `${mistakes.length} open mistakes` : null,
      href: "/skill-gap",
    },
    {
      id: "roadmap",
      title: "Roadmap",
      description: "A day-by-day plan matched to your mistake types.",
      stat: roadmap ? `${doneTasks}/${roadmap.tasks.length} tasks done` : null,
      href: "/roadmap",
    },
    {
      id: "practice",
      title: "Daily Practice",
      description: "10 questions from your weakest skills.",
      stat: null,
      href: "/daily-practice",
    },
    {
      id: "interview",
      title: "Mock Interview",
      description: "Aptitude, coding and project-defense rounds.",
      stat: null,
      href: "/mock-interview",
    },
    {
      id: "projects",
      title: "Projects",
      description: "We check your resume claims against your code.",
      stat: projects.length ? `${projects.length} project(s)` : null,
      href: "/projects",
    },
    {
      id: "progress",
      title: "Progress",
      description: "Readiness and category scores over time.",
      stat: delta === null ? null : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} since start`,
      href: "/progress",
    },
  ];

  return {
    firstName: user.name.split(" ")[0] || "there",
    assessmentStatus: user.assessmentStatus,
    readiness: reports.map(({ company, report }) => ({
      companyId: company.id,
      companyName: company.name,
      score: report.score,
      label: report.breakdown.label,
      confidence: report.confidence,
      biggestLever: report.breakdown.biggestLever,
    })),
    today,
    modules,
  };
}
