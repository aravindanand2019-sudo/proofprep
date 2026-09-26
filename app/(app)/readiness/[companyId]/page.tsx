// One company's readiness (linked from Home).
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReadinessDetail } from "@/components/readiness-detail";
import { computeUserReadiness } from "@/lib/server/readiness";
import { getSessionUid } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function CompanyReadinessPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { reports } = await computeUserReadiness((await getSessionUid()) ?? "");
  const match = reports.find((r) => r.company.id === companyId);
  if (!match) notFound();
  return (
    <>
      <Link href="/readiness" className="text-muted-foreground text-sm hover:underline">
        ← All companies
      </Link>
      <ReadinessDetail company={match.company} report={match.report} />
    </>
  );
}
