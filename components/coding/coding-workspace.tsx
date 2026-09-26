"use client";

import { CheckCircle2, ExternalLink, Play, Send, XCircle } from "lucide-react";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { ErrorAlert, Spinner } from "@/components/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/client/api";
import {
  isRunnable,
  LANGUAGE_LABELS,
  outputsMatch,
  starterCode,
  type Language,
} from "@/lib/coding/compare";
import type { PCodeOutput, PracticeProblem } from "@/lib/schemas";
import { runTests, type TestRun } from "./runner";

type Problem = PracticeProblem & { id: string };
type Daily = {
  domainLabel: string;
  date: string;
  today: Problem[];
  all: Problem[];
  solved: string[];
  attempted: string[];
};
type TestRow = {
  index: number;
  example: boolean;
  args: unknown[];
  expected: unknown;
  run: TestRun;
  pass: boolean;
};
type SubmitResult = {
  solved: boolean;
  firstSolve: boolean;
  review: PCodeOutput | null;
  reviewError: string | null;
  mastery: { before: number; after: number };
};

const DIFF_STYLE: Record<string, string> = {
  Easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Hard: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};
const LANGS: Language[] = ["python", "javascript", "cpp", "java"];

function draftKey(problemId: string, lang: Language) {
  return `proofprep:draft:${problemId}:${lang}`;
}
function loadDraft(problemId: string, lang: Language): string | null {
  try {
    return window.localStorage.getItem(draftKey(problemId, lang));
  } catch {
    return null;
  }
}
function saveDraft(problemId: string, lang: Language, code: string) {
  try {
    window.localStorage.setItem(draftKey(problemId, lang), code);
  } catch {
    // Storage unavailable (private mode): drafts just aren't kept.
  }
}

const show = (v: unknown) => JSON.stringify(v);
const formatArgs = (p: Problem, args: unknown[]) =>
  p.params.map((name, i) => `${name} = ${show(args[i])}`).join(", ");

export function CodingWorkspace() {
  const [daily, setDaily] = useState<Daily | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [solved, setSolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    api<Daily>("/api/coding").then(
      (data) => {
        if (cancelled) return;
        setLoadError(null);
        setDaily(data);
        setSolved(new Set(data.solved));
        setSelectedId((cur) => cur ?? data.today[0]?.id ?? null);
      },
      (err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (loadError) return <ErrorAlert message={loadError} onRetry={() => setAttempt((a) => a + 1)} />;
  if (!daily) return <Spinner label="Picking today's problems..." />;
  const selected = daily.all.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Today&apos;s problems{" "}
          <span className="text-muted-foreground font-normal">· {daily.domainLabel}</span>
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {daily.today.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`bg-card flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${selectedId === p.id ? "border-primary ring-primary/30 ring-2" : "hover:border-primary/50"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{p.title}</span>
                {solved.has(p.id) && (
                  <CheckCircle2 className="size-4 text-emerald-600" aria-label="Solved" />
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFF_STYLE[p.difficulty]}`}
                >
                  {p.difficulty}
                </span>
                <Badge variant="outline">{p.source.platform}</Badge>
                <Badge variant="secondary">{p.pattern}</Badge>
              </div>
            </button>
          ))}
        </div>
        <ProblemBrowser
          daily={daily}
          solved={solved}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </section>

      {selected && (
        <Solver
          key={selected.id}
          problem={selected}
          onSolved={() => setSolved((s) => new Set(s).add(selected.id))}
        />
      )}
    </div>
  );
}

function ProblemBrowser({
  daily,
  solved,
  selectedId,
  onSelect,
}: {
  daily: Daily;
  solved: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [difficulty, setDifficulty] = useState("All");
  const [platform, setPlatform] = useState("All");
  const rows = daily.all.filter(
    (p) =>
      (difficulty === "All" || p.difficulty === difficulty) &&
      (platform === "All" || p.source.platform === platform),
  );
  const platforms = [...new Set(daily.all.map((p) => p.source.platform))];

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-xl border"
    >
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
        All problems ({daily.all.length}) · {solved.size} solved
      </summary>
      <div className="flex flex-col gap-3 border-t p-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="bg-background rounded-md border px-2 py-1"
            aria-label="Difficulty"
          >
            {["All", "Easy", "Medium", "Hard"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-background rounded-md border px-2 py-1"
            aria-label="Platform"
          >
            {["All", ...platforms].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <ul className="divide-y text-sm">
          {rows.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(p.id);
                  window.scrollTo({ top: document.body.scrollHeight / 3, behavior: "smooth" });
                }}
                className={`flex w-full items-center gap-3 py-2 text-left ${selectedId === p.id ? "font-medium" : ""}`}
              >
                {solved.has(p.id) ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-label="Solved" />
                ) : (
                  <span className="size-4 shrink-0" />
                )}
                <span className="flex-1">{p.title}</span>
                <span className="text-muted-foreground hidden sm:inline">{p.pattern}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${DIFF_STYLE[p.difficulty]}`}>
                  {p.difficulty}
                </span>
                <span className="text-muted-foreground w-24 text-right text-xs">
                  {p.source.platform}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function Solver({ problem, onSolved }: { problem: Problem; onSolved: () => void }) {
  const [lang, setLang] = useState<Language>("python");
  // Solver only renders after the client-side fetch, so reading localStorage here is safe.
  const [code, setCode] = useState(
    () => loadDraft(problem.id, "python") ?? starterCode("python", problem.fn, problem.params),
  );
  const [status, setStatus] = useState<string | null>(null);
  const [rows, setRows] = useState<TestRow[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"run" | "submit" | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const examples = useMemo(() => problem.tests.filter((t) => t.example), [problem]);

  function switchLang(next: Language) {
    saveDraft(problem.id, lang, code);
    setLang(next);
    setCode(loadDraft(problem.id, next) ?? starterCode(next, problem.fn, problem.params));
    setRows(null);
    setRunError(null);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const indent = lang === "javascript" ? "  " : "    ";
    const { selectionStart: start, selectionEnd: end } = el;
    const next = `${code.slice(0, start)}${indent}${code.slice(end)}`;
    setCode(next);
    requestAnimationFrame(() => el.setSelectionRange(start + indent.length, start + indent.length));
  }

  async function execute(onlyExamples: boolean): Promise<TestRow[] | null> {
    if (!isRunnable(lang)) return null;
    const tests = problem.tests
      .map((t, index) => ({ ...t, index }))
      .filter((t) => !onlyExamples || t.example);
    setRunError(null);
    const res = await runTests(
      lang,
      code,
      problem.fn,
      tests.map((t) => t.args),
      setStatus,
    );
    setStatus(null);
    if (res.kind === "error") {
      setRunError(res.message);
      setRows(null);
      return null;
    }
    const out = tests.map((t, i) => {
      const run = res.runs[i] ?? { ok: false as const, error: "No result" };
      return {
        index: t.index,
        example: t.example,
        args: t.args,
        expected: t.expected,
        run,
        pass: run.ok && outputsMatch(run.output, t.expected, problem.compare),
      };
    });
    setRows(out);
    return out;
  }

  async function run() {
    saveDraft(problem.id, lang, code);
    setBusy("run");
    setResult(null);
    await execute(true);
    setBusy(null);
  }

  async function submit() {
    saveDraft(problem.id, lang, code);
    setBusy("submit");
    setResult(null);
    setSubmitError(null);
    try {
      let tests: { passed: number; total: number } | null = null;
      if (isRunnable(lang)) {
        const out = await execute(false);
        if (!out) return;
        tests = { passed: out.filter((r) => r.pass).length, total: out.length };
      }
      setStatus("AI is reviewing your code...");
      const res = await api<SubmitResult>("/api/coding/submit", {
        body: { problemId: problem.id, language: lang, code, tests },
      });
      setResult(res);
      if (res.solved) onSolved();
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setStatus(null);
      setBusy(null);
    }
  }

  const passed = rows?.filter((r) => r.pass).length ?? 0;

  return (
    <section className="grid gap-6 lg:grid-cols-2" aria-label={problem.title}>
      <Card className="self-start">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {problem.title}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFF_STYLE[problem.difficulty]}`}
            >
              {problem.difficulty}
            </span>
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{problem.pattern}</Badge>
            <a
              href={problem.source.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm underline"
            >
              Open on {problem.source.platform} <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <p className="leading-relaxed">{problem.statement}</p>
          {examples.map((t, i) => (
            <div key={i} className="bg-muted rounded-md p-3 font-mono text-xs">
              <p>
                <span className="text-muted-foreground">Input:</span> {formatArgs(problem, t.args)}
              </p>
              <p>
                <span className="text-muted-foreground">Output:</span> {show(t.expected)}
              </p>
              {t.explanation && (
                <p className="text-muted-foreground mt-1 font-sans">{t.explanation}</p>
              )}
            </div>
          ))}
          <div>
            <p className="font-medium">Constraints</p>
            <ul className="mt-1 list-disc pl-5">
              {problem.constraints.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <p className="text-muted-foreground text-xs">
            Problem restated in our own words; the original is linked above. Write the function{" "}
            <code>
              {lang === "python"
                ? problem.fn
                : problem.fn.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())}
            </code>{" "}
            and return the answer; don&apos;t read input or print.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1" role="tablist" aria-label="Language">
            {LANGS.map((l) => (
              <button
                key={l}
                role="tab"
                aria-selected={lang === l}
                onClick={() => switchLang(l)}
                className={`rounded-md border px-3 py-1 text-sm ${lang === l ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {LANGUAGE_LABELS[l]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {isRunnable(lang) && (
              <Button variant="outline" onClick={run} disabled={busy !== null}>
                <Play className="size-4" aria-hidden /> Run examples
              </Button>
            )}
            <Button onClick={submit} disabled={busy !== null}>
              <Send className="size-4" aria-hidden /> Submit
            </Button>
          </div>
        </div>
        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={onKeyDown}
          rows={20}
          spellCheck={false}
          className="font-mono text-sm leading-relaxed"
          aria-label="Code editor"
        />
        <p className="text-muted-foreground text-xs">
          {isRunnable(lang)
            ? "Runs in your browser against the examples (Run) or all tests including hidden ones (Submit), then an AI reviews complexity and style."
            : "C++ and Java can't run in the browser, so Submit gets an AI review only (not an execution)."}
        </p>

        {status && <Spinner label={status} />}
        {runError && <ErrorAlert message={runError} />}
        {submitError && <ErrorAlert message={submitError} onRetry={submit} />}

        {result && (
          <Card className={result.solved ? "border-emerald-500/50" : "border-destructive/40"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.solved ? (
                  <>
                    <CheckCircle2 className="size-5 text-emerald-600" aria-hidden /> Accepted
                    {result.firstSolve ? " · first solve!" : ""}
                  </>
                ) : (
                  <>
                    <XCircle className="text-destructive size-5" aria-hidden />
                    {rows ? `Wrong answer (${passed}/${rows.length} tests)` : "Not accepted"}
                  </>
                )}
              </CardTitle>
              <CardDescription>
                Skill mastery {Math.round(result.mastery.before * 100)}% →{" "}
                {Math.round(result.mastery.after * 100)}%
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {result.review ? (
                <>
                  <p className="font-medium">
                    AI review: {result.review.score}/10 · time {result.review.timeComplexity} ·
                    space {result.review.spaceComplexity}
                  </p>
                  {result.review.issues.map((i) => (
                    <p key={`${i.line}-${i.problem}`}>
                      {i.line ? `Line ${i.line}: ` : ""}
                      {i.problem}
                    </p>
                  ))}
                  {result.review.edgeCasesMissed.length > 0 && (
                    <p>Edge cases: {result.review.edgeCasesMissed.join("; ")}</p>
                  )}
                  <p className="text-muted-foreground">Hint: {result.review.hint}</p>
                </>
              ) : (
                <p className="text-muted-foreground">AI review unavailable: {result.reviewError}</p>
              )}
            </CardContent>
          </Card>
        )}

        {rows && (
          <div className="flex flex-col gap-2" aria-live="polite">
            <p className="text-sm font-medium">
              Tests: {passed}/{rows.length} passed
            </p>
            {rows.map((r) => (
              <div
                key={r.index}
                className={`rounded-md border p-2 font-mono text-xs ${r.pass ? "border-emerald-500/40" : "border-destructive/40"}`}
              >
                <p className="flex items-center gap-1.5 font-sans text-sm">
                  {r.pass ? (
                    <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
                  ) : (
                    <XCircle className="text-destructive size-4" aria-hidden />
                  )}
                  Test {r.index + 1}
                  {r.example ? "" : " (hidden)"}
                  {r.run.ok && (
                    <span className="text-muted-foreground ml-auto">{r.run.ms.toFixed(1)} ms</span>
                  )}
                </p>
                {!r.pass && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    <p>Input: {formatArgs(problem, r.args)}</p>
                    <p>Expected: {show(r.expected)}</p>
                    <p>{r.run.ok ? `Got: ${show(r.run.output)}` : `Error: ${r.run.error}`}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
