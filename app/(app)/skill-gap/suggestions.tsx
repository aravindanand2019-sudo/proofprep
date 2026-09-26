"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { ErrorAlert, Spinner } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, errorMessage } from "@/lib/client/api";
import type { PGapOutput } from "@/lib/schemas";

type Report = PGapOutput & { createdAt: string };

export function Suggestions({
  initial,
  companyNames,
}: {
  initial: Report | null;
  companyNames: Record<string, string>;
}) {
  const [report, setReport] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ report: Report }>("/api/skill-gap", { body: {} });
      setReport(res.report);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Suggestions for your role and companies</h2>
        <Button onClick={generate} disabled={loading} variant={report ? "outline" : "default"}>
          <Sparkles className="size-4" aria-hidden />
          {report ? "Refresh" : "Generate suggestions"}
        </Button>
      </div>
      {loading && <Spinner label="Analysing your gaps (AI)..." />}
      {error && <ErrorAlert message={error} onRetry={generate} />}
      {!report && !loading && !error && (
        <p className="text-muted-foreground text-sm">
          AI suggestions use your scores, weakest skills and target companies.
        </p>
      )}
      {report && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Must learn</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {report.mustLearn.map((m) => (
                <div key={m.skill}>
                  <p className="font-medium">{m.skill}</p>
                  <p className="text-muted-foreground">{m.why}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Should have</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {report.shouldHave.map((m) => (
                <div key={m.item}>
                  <p className="font-medium">{m.item}</p>
                  <p className="text-muted-foreground">{m.why}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          {report.companyExpectations.map((c) => (
            <Card key={c.companyId}>
              <CardHeader>
                <CardTitle>{companyNames[c.companyId] ?? c.companyId} expects</CardTitle>
                <CardDescription>Your gap: {c.yourGap}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 text-sm">
                  {c.expects.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
