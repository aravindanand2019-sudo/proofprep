import { EmptyState, PageHeader } from "@/components/kit";
import { getActiveRoadmap, getSkills, getUserDoc } from "@/lib/data";
import { getSessionUid } from "@/lib/server/session";
import { RoadmapClient, type TaskView } from "./roadmap-client";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const uid = (await getSessionUid()) ?? "";
  const user = await getUserDoc(uid);
  if (user?.assessmentStatus !== "done") {
    return (
      <>
        <PageHeader title="Roadmap" description="A day-by-day plan built from your mistakes." />
        <EmptyState
          title="Take the Quick Assessment first"
          description="Your roadmap is built from what you get wrong and why. Without results there's nothing to plan."
          href="/assessment"
          cta="Take Quick Assessment"
        />
      </>
    );
  }
  const [active, skills] = await Promise.all([
    getActiveRoadmap(uid, user.activeRoadmapId),
    getSkills(),
  ]);
  const names = Object.fromEntries(skills.map((s) => [s.id, s.name]));
  const tasks: TaskView[] =
    active?.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      kind: t.kind,
      skillName: t.skillId ? (names[t.skillId] ?? t.skillId) : null,
      targetsMistakeType: t.targetsMistakeType ?? null,
      estMinutes: t.estMinutes,
      dueDate: t.dueDate.toISOString(),
      status: t.status,
    })) ?? [];

  return (
    <>
      <PageHeader
        title="Roadmap"
        description="Code sets the time budget from your gaps and company weights; each task type matches the kind of mistake you make."
      />
      <RoadmapClient
        key={active?.roadmap.id ?? "none"}
        tasks={tasks}
        rationale={active?.roadmap.rationale ?? null}
        weeks={active?.roadmap.weeks.map((w) => ({ week: w.week, focus: w.focus })) ?? []}
        hoursPerDay={user.profile.hoursPerDay ?? 2}
      />
    </>
  );
}
