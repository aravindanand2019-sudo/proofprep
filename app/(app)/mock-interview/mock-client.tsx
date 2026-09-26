"use client";

import { ArrowRight, Bot, Timer, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ErrorAlert, Spinner } from "@/components/kit";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import type { PublicQ, QuizSubmission } from "@/components/quiz/types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/client/api";
import type { CodingProblem, MockInterview, PCodeOutput } from "@/lib/schemas";

type MockContent = {
  questions: PublicQ[];
  problem: (CodingProblem & { id: string }) | null;
  projects: Array<{ id: string; name: string; claims: number; unsupported: number }>;
};
type Graded = { questionId: string; isCorrect: boolean; explanation: string };
type Stage = "r1" | "r1-done" | "r2" | "r3" | "report";

const LANGUAGES = ["Python", "Java", "C++", "JavaScript", "C"];
const CODING_SECONDS = 20 * 60;

export function MockInterviewClient() {
  const [content, setContent] = useState<MockContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("r1");
  const [mcq, setMcq] = useState<QuizSubmission["mcq"]>([]);
  const [graded, setGraded] = useState<Graded[]>([]);
  const [coding, setCoding] = useState<{
    language: string;
    code: string;
    review: PCodeOutput | null;
  } | null>(null);
  const [defenseSessionId, setDefenseSessionId] = useState<string | null>(null);
  const [report, setReport] = useState<MockInterview | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);
  const load = () => setAttempt((a) => a + 1);
  useEffect(() => {
    let cancelled = false;
    api<MockContent>("/api/mock").then(
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

  async function finish(defenseId: string | null) {
    if (!content) return;
    setStage("report");
    setFinishing(true);
    setFinishError(null);
    try {
      const res = await api<{ report: MockInterview }>("/api/mock/finish", {
        body: {
          mcq,
          coding:
            coding && content.problem
              ? {
                  problemId: content.problem.id,
                  language: coding.language,
                  code: coding.code,
                  review: coding.review,
                }
              : null,
          defenseSessionId: defenseId,
        },
      });
      setReport(res.report);
    } catch (err) {
      setFinishError(errorMessage(err));
    } finally {
      setFinishing(false);
    }
  }

  if (loadError) return <ErrorAlert message={loadError} onRetry={load} />;
  if (!content) return <Spinner label="Setting up your interview..." />;

  const steps: Array<[Stage[], string]> = [
    [["r1", "r1-done"], "1. Technical & Aptitude"],
    [["r2"], "2. Coding"],
    [["r3"], "3. Project Defense"],
    [["report"], "Report"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-wrap gap-2 text-sm">
        {steps.map(([ids, label]) => (
          <li
            key={label}
            className={`rounded-full border px-3 py-1 ${ids.includes(stage) ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {label}
          </li>
        ))}
      </ol>

      {stage === "r1" && (
        <QuizRunner
          sections={[
            {
              id: "r1",
              label: "Technical & Aptitude",
              items: content.questions.map((q) => ({ kind: "mcq", q })),
            },
          ]}
          timeLimitSec={600}
          submitLabel="Submit round 1"
          onSubmit={async (s) => {
            const res = await api<{ results: Graded[] }>("/api/grade", {
              body: {
                answers: s.mcq.map((a) => ({
                  questionId: a.questionId,
                  selectedIndex: a.selectedIndex,
                })),
              },
            });
            setMcq(s.mcq);
            setGraded(res.results);
            setStage("r1-done");
          }}
        />
      )}

      {stage === "r1-done" && (
        <Card>
          <CardHeader>
            <CardTitle>
              Round 1: {graded.filter((g) => g.isCorrect).length}/{graded.length} correct
            </CardTitle>
            <CardDescription>Explanations are in your final report.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setStage(content.problem ? "r2" : "r3")}>
              Next Round <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>
      )}

      {stage === "r2" && content.problem && (
        <CodingRound
          problem={content.problem}
          onDone={(c) => {
            setCoding(c);
            setStage("r3");
          }}
        />
      )}

      {stage === "r3" && (
        <DefenseRound
          projects={content.projects}
          onDone={(sessionId) => {
            setDefenseSessionId(sessionId);
            void finish(sessionId);
          }}
        />
      )}

      {stage === "report" && (
        <>
          {finishing && <Spinner label="Scoring your interview..." />}
          {finishError && (
            <ErrorAlert message={finishError} onRetry={() => void finish(defenseSessionId)} />
          )}
          {report && <FinalReport report={report} graded={graded} questions={content.questions} />}
        </>
      )}
    </div>
  );
}

function CodingRound({
  problem,
  onDone,
}: {
  problem: CodingProblem & { id: string };
  onDone: (c: { language: string; code: string; review: PCodeOutput | null }) => void;
}) {
  const [language, setLanguage] = useState("Python");
  const [code, setCode] = useState("");
  const [left, setLeft] = useState(CODING_SECONDS);
  const [review, setReview] = useState<PCodeOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ review: PCodeOutput }>("/api/llm/p-code", {
        body: { problemId: problem.id, language, code },
      });
      setReview(res.review);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{problem.title}</CardTitle>
          <CardDescription className="whitespace-pre-wrap">{problem.statement}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div>
            <p className="font-medium">Constraints</p>
            <ul className="mt-1 list-disc pl-5">
              {problem.constraints.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium">Examples</p>
            {problem.examples.map((ex) => (
              <pre key={ex.input} className="bg-muted rounded-md p-3 text-xs whitespace-pre-wrap">
                Input: {ex.input}
                {"\n"}Output: {ex.output}
                {ex.explanation ? `\nWhy: ${ex.explanation}` : ""}
              </pre>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-background rounded-md border px-3 py-1.5 text-sm"
            aria-label="Language"
          >
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <span
            className={`flex items-center gap-1.5 font-mono text-sm tabular-nums ${left < 120 ? "text-destructive" : ""}`}
          >
            <Timer className="size-4" aria-hidden /> {clock}
          </span>
        </div>
        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={18}
          spellCheck={false}
          className="font-mono text-sm"
          placeholder="Write your solution here."
          aria-label="Code editor"
          disabled={left === 0 || review !== null}
        />
        <p className="text-muted-foreground text-xs">
          Your code is <strong>not executed</strong>. An AI reviewer reads it and traces the
          examples by hand.
        </p>
        {error && <ErrorAlert message={error} onRetry={submit} />}
        {loading && <Spinner label="AI is reviewing your code..." />}
        {review ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                AI review: {review.score}/10
                <Badge variant={review.likelyCorrect ? "secondary" : "destructive"}>
                  {review.likelyCorrect ? "Likely correct" : "Likely incorrect"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Time {review.timeComplexity} · Space {review.spaceComplexity}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {review.issues.map((i) => (
                <p key={`${i.line}-${i.problem}`}>
                  {i.line ? `Line ${i.line}: ` : ""}
                  {i.problem}
                </p>
              ))}
              {review.edgeCasesMissed.length > 0 && (
                <p>Missed edge cases: {review.edgeCasesMissed.join("; ")}</p>
              )}
              <p className="text-muted-foreground">Hint: {review.hint}</p>
              <Button className="self-start" onClick={() => onDone({ language, code, review })}>
                Next Round <ArrowRight className="size-4" aria-hidden />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-2">
            <Button onClick={submit} disabled={loading || !code.trim()}>
              Submit for AI review
            </Button>
            <Button variant="ghost" onClick={() => onDone({ language, code, review: null })}>
              Skip review
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

type Turn = { question: string; answer: string | null };
type DefenseReport = {
  score: number;
  strengths: string[];
  gaps: string[];
  turns: Array<{ question: string; answer: string; score: number; gaps: string[] }>;
};

function DefenseRound({
  projects,
  onDone,
}: {
  projects: MockContent["projects"];
  onDone: (sessionId: string | null) => void;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DefenseReport | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ sessionId: string; question: string }>("/api/interview/start", {
        body: projectId ? { projectId } : { description },
      });
      setSessionId(res.sessionId);
      setTurns([{ question: res.question, answer: null }]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!sessionId || !answer.trim()) return;
    const text = answer.trim();
    setLoading(true);
    setError(null);
    try {
      const res = await api<
        { done: false; question: string } | { done: true; report: DefenseReport }
      >("/api/interview/answer", { body: { sessionId, answer: text } });
      setTurns((t) => {
        const copy = t.map((x, i) => (i === t.length - 1 ? { ...x, answer: text } : x));
        return res.done ? copy : [...copy, { question: res.question, answer: null }];
      });
      setAnswer("");
      if (res.done) setReport(res.report);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!sessionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Defense</CardTitle>
          <CardDescription>
            5 questions about your own project. Unsupported claims are asked first.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {projects.length > 0 ? (
            <div className="flex flex-col gap-2">
              {projects.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="project"
                    checked={projectId === p.id}
                    onChange={() => setProjectId(p.id)}
                  />
                  {p.name}
                  <span className="text-muted-foreground">
                    · {p.claims} claims{p.unsupported ? `, ${p.unsupported} unsupported` : ""}
                  </span>
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="project"
                  checked={projectId === ""}
                  onChange={() => setProjectId("")}
                />
                Describe a different project
              </label>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No analyzed projects yet (
              <Link className="underline" href="/projects">
                add one
              </Link>
              ). Describe a project instead:
            </p>
          )}
          {projectId === "" && (
            <Textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What it does, your role, the stack, and one hard problem you solved."
              aria-label="Project description"
            />
          )}
          {error && <ErrorAlert message={error} onRetry={start} />}
          <div className="flex gap-2">
            <Button
              onClick={start}
              disabled={loading || (projectId === "" && description.trim().length < 20)}
            >
              {loading ? "Preparing questions..." : "Start defense"}
            </Button>
            <Button variant="ghost" onClick={() => onDone(null)}>
              Skip round
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3" aria-live="polite">
        {turns.map((t, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="bg-muted flex max-w-[85%] gap-2 rounded-xl p-3 text-sm">
              <Bot className="mt-0.5 size-4 shrink-0" aria-label="Interviewer" />
              <p>{t.question}</p>
            </div>
            {t.answer && (
              <div className="bg-primary/10 ml-auto flex max-w-[85%] gap-2 rounded-xl p-3 text-sm">
                <p className="whitespace-pre-wrap">{t.answer}</p>
                <User className="mt-0.5 size-4 shrink-0" aria-label="You" />
              </div>
            )}
          </div>
        ))}
      </div>
      {loading && <Spinner label={report ? "" : "Interviewer is thinking..."} />}
      {error && <ErrorAlert message={error} />}
      {report ? (
        <Card>
          <CardHeader>
            <CardTitle>Defense score: {report.score.toFixed(1)}/5</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => onDone(sessionId)}>
              See final report <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-2">
          <Textarea
            rows={4}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer"
            aria-label="Your answer"
            disabled={loading}
          />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Question {turns.length} of 5</span>
            <Button type="submit" disabled={loading || !answer.trim()}>
              Send
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function FinalReport({
  report,
  graded,
  questions,
}: {
  report: MockInterview;
  graded: Graded[];
  questions: PublicQ[];
}) {
  const q = new Map(questions.map((x) => [x.id, x]));
  const rows: Array<[string, string]> = [
    ["Technical & Aptitude", report.mcq ? `${report.mcq.correct}/${report.mcq.total}` : "Skipped"],
    [
      "Coding (AI review)",
      report.coding?.review
        ? `${report.coding.review.score}/10`
        : report.coding
          ? "Not reviewed"
          : "Skipped",
    ],
    ["Project Defense", report.defense ? `${report.defense.score.toFixed(1)}/5` : "Skipped"],
  ];
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Overall: {Math.round(report.overall.score)}/100</CardTitle>
          <CardDescription>Saved to your profile; readiness updated.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-lg border p-3">
              <p className="text-muted-foreground text-sm">{label}</p>
              <p className="text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm">
              {report.overall.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
              {report.overall.strengths.length === 0 && (
                <li>Keep practising; strengths show up as scores rise.</li>
              )}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm">
              {report.overall.gaps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      {graded.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Round 1 explanations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {graded.map((g, i) => (
              <div key={g.questionId}>
                <p className="font-medium">
                  {g.isCorrect ? "✓" : "✗"} {i + 1}. {q.get(g.questionId)?.prompt.split("\n")[0]}
                </p>
                <p className="text-muted-foreground">{g.explanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Link href="/readiness" className={`${buttonVariants()} self-start`}>
        See updated readiness
      </Link>
    </div>
  );
}
