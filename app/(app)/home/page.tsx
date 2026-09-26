// Home (screen #6): readiness headline → Today → module grid.
import Link from "next/link";
import { PageHeader } from "@/components/kit";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getHomeData } from "@/lib/home/getHomeData";
import { COMPONENT_NAMES, CONFIDENCE_TEXT, LABEL_STYLE } from "@/lib/home/format";
import type { ReadinessCard } from "@/lib/home/types";
import { getSessionUid } from "@/lib/server/session";

export const dynamic = "force-dynamic";

function ReadinessTile({ card, assessed }: { card: ReadinessCard; assessed: boolean }) {
  return (
    <Link
      href={`/readiness/${card.companyId}`}
      className="bg-card hover:border-primary/50 flex flex-col gap-3 rounded-xl border p-5 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{card.companyName}</p>
        {assessed && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${LABEL_STYLE[card.label]}`}
          >
            {card.label}
          </span>
        )}
      </div>
      <p className="text-5xl font-semibold tabular-nums">
        {assessed ? Math.round(card.score) : "—"}
      </p>
      <p className="text-muted-foreground text-xs">
        {assessed ? CONFIDENCE_TEXT[card.confidence] : "Not enough data yet"}
      </p>
      {assessed && card.biggestLever && (
        <p className="text-sm">
          Biggest lever: <span className="font-medium">{COMPONENT_NAMES[card.biggestLever]}</span>
        </p>
      )}
    </Link>
  );
}

export default async function HomePage() {
  const data = await getHomeData((await getSessionUid()) ?? "");
  const assessed = data.assessmentStatus === "done";

  return (
    <>
      <PageHeader
        title={`Hi ${data.firstName}`}
        description="Your placement readiness, per target company."
      />

      <section aria-label="Readiness" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.readiness.map((card) => (
          <ReadinessTile key={card.companyId} card={card} assessed={assessed} />
        ))}
      </section>

      <section aria-labelledby="today-heading">
        <h2 id="today-heading" className="mb-3 text-lg font-semibold">
          Today
        </h2>
        <Card className={assessed ? undefined : "border-primary/40 bg-primary/5"}>
          <CardHeader>
            <CardTitle>{data.today.title}</CardTitle>
            <CardDescription>{data.today.reason}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-sm">
              {data.today.estMinutes ? `About ${data.today.estMinutes} min` : ""}
            </span>
            <Link href={data.today.href} className={buttonVariants()}>
              {data.today.cta}
            </Link>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="mb-3 text-lg font-semibold">
          Modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.modules.map((m) => (
            <Link
              key={m.id}
              href={m.href}
              className="bg-card hover:border-primary/50 flex flex-col gap-2 rounded-xl border p-5 transition-colors"
            >
              <p className="font-medium">{m.title}</p>
              <p className="text-muted-foreground text-sm">{m.description}</p>
              {m.stat && <p className="text-sm font-medium">{m.stat}</p>}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
