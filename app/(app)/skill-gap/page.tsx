// Skill Gap: rings, where I stand, what I lag behind, AI suggestions (P-GAP).
import { BarVsTarget, EmptyState, PageHeader, Ring } from "@/components/kit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { READINESS_COMPONENTS } from "@/lib/engine/readiness";
import { COMPONENT_NAMES, fmt1 } from "@/lib/home/format";
import type { MistakeTarget } from "@/lib/schemas";
import { getSessionUid } from "@/lib/server/session";
import { loadSkillGap } from "@/lib/server/skillGap";
import { Suggestions } from "./suggestions";

export const dynamic = "force-dynamic";

const MISTAKE_INFO: Record<MistakeTarget, { label: string; text: string; style: string }> = {
  concept: {
    label: "Concept gap",
    text: "You don't yet know the idea. Fix: learn it, then do basic questions.",
    style: "bg-rose-500",
  },
  application: {
    label: "Application gap",
    text: "You know the idea but miss it in applied, multi-step questions. Fix: worked examples, then mixed drills.",
    style: "bg-violet-500",
  },
  careless: {
    label: "Careless slip",
    text: "You knew it but rushed or fell for a trap. Fix: timed accuracy drills with a re-check habit.",
    style: "bg-amber-500",
  },
  overconfident: {
    label: "Overconfident",
    text: "You marked Sure and were wrong. Fix: calibration drills where you justify each answer.",
    style: "bg-slate-500",
  },
};

export default async function SkillGapPage() {
  const data = await loadSkillGap((await getSessionUid()) ?? "");
  if (!data.hasData) {
    return (
      <>
        <PageHeader title="Skill Gap" description="Where you stand and what to improve." />
        <EmptyState
          title="No results yet"
          description="Your skill gap is built from the Quick Assessment. It takes about 20 minutes."
          href="/assessment"
          cta="Take Quick Assessment"
        />
      </>
    );
  }
  const totalMistakes = Object.values(data.mistakeTotals).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader title="Skill Gap" description="Where you stand and what to improve." />

      <section className="flex flex-wrap items-center justify-around gap-6 rounded-xl border p-6">
        <Ring value={data.overall} label="Overall" size={150} />
        <Ring value={data.categories.dsa} label="Coding" />
        <Ring value={data.categories.aptitude} label="Aptitude" />
        <Ring value={data.categories.communication} label="Communication" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Where I stand</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {data.reports.map(({ company, report }) => (
            <Card key={company.id}>
              <CardHeader>
                <CardTitle>
                  {company.name} · {fmt1(report.score)}
                </CardTitle>
                <CardDescription>Your score vs the company bar per component.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {READINESS_COMPONENTS.map((k) => (
                  <div key={k} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>{COMPONENT_NAMES[k]}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {fmt1(report.components[k])} / {company.bars[k]}
                      </span>
                    </div>
                    <BarVsTarget score={report.components[k]} bar={company.bars[k]} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">What I lag behind</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Weakest skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {data.weakest.map((w) => (
                <div key={w.skillId} className="flex flex-col gap-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span>{w.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {Math.round(w.mastery * 100)}% · {w.attempts} attempts
                    </span>
                  </div>
                  <BarVsTarget score={w.mastery * 100} bar={70} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Why you get questions wrong</CardTitle>
              <CardDescription>{totalMistakes} classified mistakes</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {(Object.keys(MISTAKE_INFO) as MistakeTarget[]).map((k) => {
                const n = data.mistakeTotals[k];
                const pct = totalMistakes ? (100 * n) / totalMistakes : 0;
                return (
                  <div key={k} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{MISTAKE_INFO[k].label}</span>
                      <span className="tabular-nums">{n}</span>
                    </div>
                    <div className="bg-muted h-2 rounded-full">
                      <div
                        className={`h-2 rounded-full ${MISTAKE_INFO[k].style}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">{MISTAKE_INFO[k].text}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
        {data.recentMistakes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Open mistakes</CardTitle>
              <CardDescription>Each one explained. Daily Practice resolves them.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {data.recentMistakes.map((m) => (
                <div key={m.id} className="border-b pb-3 text-sm last:border-0">
                  <p className="font-medium">
                    {m.skillName} · {MISTAKE_INFO[m.primaryType].label}
                    {m.overconfident ? " · overconfident" : ""}
                  </p>
                  <p className="text-muted-foreground mt-1">{m.explanation}</p>
                  <p className="mt-1">Fix: {m.fixAction}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <Suggestions
        initial={
          data.suggestions
            ? { ...data.suggestions, createdAt: data.suggestions.createdAt.toISOString() }
            : null
        }
        companyNames={Object.fromEntries(data.reports.map((r) => [r.company.id, r.company.name]))}
      />
    </>
  );
}
