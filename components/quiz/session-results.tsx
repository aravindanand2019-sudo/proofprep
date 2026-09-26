"use client";

import { ArrowRight, Check, X } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicQ, SessionResultView } from "./types";

const TYPE_STYLE: Record<string, string> = {
  concept: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  application: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  careless: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function SessionResults({
  result,
  questions,
  commTexts,
  next,
}: {
  result: SessionResultView;
  questions: Map<string, PublicQ>;
  commTexts?: Map<string, string>;
  next?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {result.correct}/{result.total} correct
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">Readiness before → after this session</p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {result.after.map((a) => {
              const b = result.before.find((x) => x.companyId === a.companyId)?.score ?? 0;
              const d = a.score - b;
              return (
                <li key={a.companyId} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{a.companyName}</p>
                  <p className="mt-1 flex items-center gap-2 text-lg tabular-nums">
                    {b.toFixed(1)} <ArrowRight className="size-4" aria-hidden />{" "}
                    {a.score.toFixed(1)}
                    <span
                      className={`text-sm ${d > 0 ? "text-emerald-600" : d < 0 ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {d >= 0 ? "+" : ""}
                      {d.toFixed(1)}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
          {result.aiNotes.map((n) => (
            <p key={n} className="text-muted-foreground text-xs">
              {n}
            </p>
          ))}
          {next && (
            <Link href={next.href} className={`${buttonVariants()} self-start`}>
              {next.label}
            </Link>
          )}
        </CardContent>
      </Card>

      {result.graded.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Answers</h2>
          {result.graded.map((g, i) => {
            const q = questions.get(g.questionId);
            return (
              <div key={g.questionId} className="rounded-lg border p-4 text-sm">
                <div className="flex items-start gap-2">
                  {g.isCorrect ? (
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-emerald-600"
                      aria-label="Correct"
                    />
                  ) : (
                    <X className="text-destructive mt-0.5 size-4 shrink-0" aria-label="Wrong" />
                  )}
                  <p className="font-medium whitespace-pre-wrap">
                    {i + 1}. {q?.prompt.split("\n")[0]}
                  </p>
                </div>
                {!g.isCorrect && q && (
                  <p className="text-muted-foreground mt-2">
                    Your answer: {g.selectedIndex === null ? "(none)" : q.options[g.selectedIndex]}{" "}
                    · Correct: {g.correctIndex === null ? "" : q.options[g.correctIndex]}
                  </p>
                )}
                {g.mistake && (
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[g.mistake.primaryType] ?? ""}`}
                      >
                        {g.mistake.primaryType}
                      </span>
                      {g.mistake.overconfident && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium dark:bg-slate-800">
                          overconfident
                        </span>
                      )}
                    </div>
                    <p>{g.mistake.explanation}</p>
                  </div>
                )}
                {g.isCorrect && <p className="text-muted-foreground mt-1">{g.explanation}</p>}
                {g.pattern && (
                  <div className="bg-muted/50 mt-2 rounded-md p-3">
                    <p className="text-xs font-medium">
                      Pattern: <span className="text-foreground">{g.pattern}</span>
                    </p>
                    {!g.isCorrect && <p className="mt-1">{g.explanation}</p>}
                    {g.approach && (
                      <p className="mt-1 whitespace-pre-wrap">
                        <span className="font-medium">Approach: </span>
                        {g.approach}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {result.comm.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Communication</h2>
          {result.comm.map((c) => (
            <div key={c.promptId} className="rounded-lg border p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{commTexts?.get(c.promptId) ?? c.promptId}</p>
                <span className="tabular-nums">{Math.round(c.overall)}/100</span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Structure detected: {c.attempt.structureDetected}
                {c.attempt.missingParts.length
                  ? ` · missing ${c.attempt.missingParts.join(", ")}`
                  : ""}
                {c.scoredBy === "heuristic" ? " · scored without AI" : ""}
              </p>
              {c.attempt.restructured && (
                <div className="bg-muted/50 mt-2 rounded-md p-3">
                  <p className="text-xs font-medium">Your answer, restructured</p>
                  <p className="mt-1 whitespace-pre-wrap">{c.attempt.restructured}</p>
                </div>
              )}
              <ul className="mt-2 list-disc pl-5">
                {c.attempt.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
