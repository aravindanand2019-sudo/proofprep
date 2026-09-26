"use client";

import { useEffect, useState } from "react";
import { ErrorAlert, Spinner } from "@/components/kit";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { SessionResults } from "@/components/quiz/session-results";
import type {
  CommQ,
  PublicQ,
  QuizSection,
  QuizSubmission,
  SessionResultView,
} from "@/components/quiz/types";
import { api, errorMessage } from "@/lib/client/api";

type AssessmentContent = { aptitude: PublicQ[]; coding: PublicQ[]; communication: CommQ[] };

export function AssessmentClient() {
  const [content, setContent] = useState<AssessmentContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<SessionResultView | null>(null);

  const [attempt, setAttempt] = useState(0);
  const load = () => setAttempt((a) => a + 1);

  useEffect(() => {
    let cancelled = false;
    api<AssessmentContent>("/api/assessment").then(
      (data) => {
        if (cancelled) return;
        setLoadError(null);
        setContent(data);
      },
      (err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (loadError) return <ErrorAlert message={loadError} onRetry={load} />;
  if (!content) return <Spinner label="Loading questions..." />;

  const questions = new Map([...content.aptitude, ...content.coding].map((q) => [q.id, q]));
  const commTexts = new Map(content.communication.map((c) => [c.id, c.text]));

  if (result) {
    return (
      <SessionResults
        result={result}
        questions={questions}
        commTexts={commTexts}
        next={{ href: "/skill-gap", label: "See your skill gap" }}
      />
    );
  }

  const sections: QuizSection[] = [
    { id: "aptitude", label: "Aptitude", items: content.aptitude.map((q) => ({ kind: "mcq", q })) },
    { id: "coding", label: "Coding", items: content.coding.map((q) => ({ kind: "mcq", q })) },
    {
      id: "communication",
      label: "Communication",
      items: content.communication.map((q) => ({ kind: "comm", q })),
    },
  ];

  async function submit(s: QuizSubmission) {
    const res = await api<SessionResultView>("/api/assessment/submit", {
      body: { answers: s.mcq, comm: s.comm },
    });
    setResult(res);
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      <p className="text-muted-foreground text-sm">
        Submitting grades everything on the server, classifies each mistake, and scores your spoken
        or typed answers. This can take up to a minute.
      </p>
      <QuizRunner sections={sections} onSubmit={submit} submitLabel="Submit assessment" />
    </>
  );
}
