// Placement Readiness (screen #7): every target company, formula shown.
import { EmptyState, PageHeader } from "@/components/kit";
import { ReadinessDetail } from "@/components/readiness-detail";
import { getUserDoc } from "@/lib/data";
import { computeUserReadiness } from "@/lib/server/readiness";
import { getSessionUid } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function ReadinessPage() {
  const uid = (await getSessionUid()) ?? "";
  const [user, { reports }] = await Promise.all([getUserDoc(uid), computeUserReadiness(uid)]);

  return (
    <>
      <PageHeader
        title="Placement Readiness"
        description="Readiness = Σ weight × min(1, your score ÷ company bar) × 100. Labels: 85+ Ready · 65–84 Close · below 65 Building."
      />
      {user?.assessmentStatus !== "done" && (
        <EmptyState
          title="No data yet"
          description="These scores start at zero. Take the Quick Assessment to measure where you stand."
          href="/assessment"
          cta="Take Quick Assessment"
        />
      )}
      {reports.map((r) => (
        <ReadinessDetail key={r.company.id} company={r.company} report={r.report} />
      ))}
    </>
  );
}
