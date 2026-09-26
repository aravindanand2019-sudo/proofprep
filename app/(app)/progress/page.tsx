import { EmptyState, PageHeader } from "@/components/kit";
import {
  getCategoryScoreHistory,
  getCompanies,
  getReadinessSnapshots,
  getUserDoc,
} from "@/lib/data";
import { getSessionUid } from "@/lib/server/session";
import { ProgressCharts, type CategoryPoint, type ReadinessPoint } from "./charts";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const uid = (await getSessionUid()) ?? "";
  const [user, companies, snapshots, categories] = await Promise.all([
    getUserDoc(uid),
    getCompanies(),
    getReadinessSnapshots(uid),
    getCategoryScoreHistory(uid),
  ]);
  const targets = user?.profile.targetCompanies ?? [];
  const series = companies
    .filter((c) => targets.includes(c.id))
    .map((c) => ({ id: c.id, name: c.name }));

  const readiness: ReadinessPoint[] = snapshots.map((s) => ({
    at: s.createdAt.toISOString(),
    trigger: s.trigger,
    ...Object.fromEntries(
      series.map((c) => [c.id, Math.round((s.perCompany[c.id]?.score ?? 0) * 10) / 10]),
    ),
  }));
  const history: CategoryPoint[] = categories.map((s) => ({
    at: s.createdAt.toISOString(),
    aptitude: Math.round(s.scores.aptitude),
    coding: Math.round(s.scores.dsa),
    cs: Math.round(s.scores.cs),
    communication: Math.round(s.scores.communication),
    projects: Math.round(s.scores.projects),
  }));

  return (
    <>
      <PageHeader
        title="Progress"
        description="Every assessment, practice session and interview adds a snapshot."
      />
      {snapshots.length === 0 ? (
        <EmptyState
          title="No history yet"
          description="Your first snapshot is saved when you finish the Quick Assessment."
          href="/assessment"
          cta="Take Quick Assessment"
        />
      ) : (
        <ProgressCharts readiness={readiness} categories={history} companies={series} />
      )}
    </>
  );
}
