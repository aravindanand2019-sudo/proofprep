// Readiness breakdown for one company (PLAN.md Section 5), with the arithmetic shown.
import { BarVsTarget } from "@/components/kit";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { READINESS_COMPONENTS } from "@/lib/engine/readiness";
import { COMPONENT_NAMES, CONFIDENCE_TEXT, fmt1, LABEL_STYLE } from "@/lib/home/format";
import type { CompanyReport } from "@/lib/server/readiness";

export function ReadinessDetail({ company, report }: CompanyReport) {
  const { components, breakdown } = report;
  const lever = breakdown.biggestLever;

  return (
    <section className="flex flex-col gap-6 rounded-xl border p-5 md:p-6" id={company.id}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{company.name}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{CONFIDENCE_TEXT[report.confidence]}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-1 text-sm font-medium ${LABEL_STYLE[breakdown.label]}`}
          >
            {breakdown.label}
          </span>
          <span className="text-4xl font-semibold tabular-nums">{fmt1(report.score)}</span>
        </div>
      </header>

      {lever && (
        <div className="bg-primary/5 border-primary/30 rounded-lg border p-4 text-sm">
          <p className="font-medium">Biggest lever: {COMPONENT_NAMES[lever]}</p>
          <p className="text-muted-foreground mt-1">
            Reaching the bar of {company.bars[lever]} would add{" "}
            <span className="text-foreground font-medium">
              {fmt1(breakdown.missing[lever])} points
            </span>{" "}
            of the {fmt1(100 - report.score)} still available.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {READINESS_COMPONENTS.map((k) => (
          <div key={k} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{COMPONENT_NAMES[k]}</span>
              <span className="text-muted-foreground tabular-nums">
                {fmt1(components[k])} / bar {company.bars[k]} · {report.componentConfidence[k]}{" "}
                confidence
              </span>
            </div>
            <BarVsTarget score={components[k]} bar={company.bars[k]} />
          </div>
        ))}
        <p className="text-muted-foreground text-xs">
          The dark line marks the company bar. Scoring above it earns no extra credit.
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead className="text-right">You</TableHead>
              <TableHead className="text-right">Bar</TableHead>
              <TableHead className="text-right">Points = w × min(1, you ÷ bar) × 100</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {READINESS_COMPONENTS.map((k) => {
              const ratio = Math.min(1, components[k] / company.bars[k]);
              return (
                <TableRow key={k} className={k === lever ? "bg-primary/5" : undefined}>
                  <TableCell className="font-medium">{COMPONENT_NAMES[k]}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {company.weights[k].toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmt1(components[k])}</TableCell>
                  <TableCell className="text-right tabular-nums">{company.bars[k]}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {company.weights[k].toFixed(2)} × {ratio.toFixed(3)} × 100 ={" "}
                    {breakdown.contributions[k].toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="font-medium">
                Readiness
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {report.score.toFixed(2)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </section>
  );
}
