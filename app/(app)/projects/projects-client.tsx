"use client";

import { ExternalLink, FileUp, GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EmptyState, ErrorAlert, Spinner } from "@/components/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, errorMessage } from "@/lib/client/api";
import type { InterviewHook, ProjectClaim } from "@/lib/schemas";

export type ProjectView = {
  id: string;
  name: string;
  source: "github" | "resume";
  repoUrl: string | null;
  summary: string;
  stack: string[];
  claims: ProjectClaim[];
  hooks: InterviewHook[];
  defenseScore: number | null;
};

const VERDICT_STYLE: Record<string, string> = {
  supported: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  unsupported: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  unverified: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

function fileLink(repoUrl: string | null, ref: string): string | null {
  if (!repoUrl) return null;
  const [path, lines] = ref.split(":");
  const anchor = lines ? `#L${lines.replace("-", "-L")}` : "";
  return `${repoUrl.replace(/\/$/, "")}/blob/HEAD/${path}${anchor}`;
}

export function ProjectsClient({ projects }: { projects: ProjectView[] }) {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"repo" | "resume" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function analyze(
    e?: FormEvent,
    override?: { repoUrl: string; name?: string; claims?: ProjectClaim[] },
  ) {
    e?.preventDefault();
    setBusy("repo");
    setError(null);
    setWarning(null);
    try {
      const res = await api<{ warning: string | null }>("/api/projects/analyze", {
        body: override
          ? {
              repoUrl: override.repoUrl,
              name: override.name,
              claims: override.claims?.map((c) => ({ id: c.id, text: c.text })),
            }
          : { repoUrl },
      });
      setWarning(res.warning);
      setRepoUrl("");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function importResume() {
    if (!file) return;
    setBusy("resume");
    setError(null);
    setWarning(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await api<{ storageWarning: string | null }>("/api/projects/resume", { form });
      setWarning(res.storageWarning);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="size-4" aria-hidden /> Add from GitHub
            </CardTitle>
            <CardDescription>
              Public repos only. We read the README, the file tree and up to 8 key files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={analyze} className="flex flex-col gap-3">
              <Label htmlFor="repo">Repository URL</Label>
              <Input
                id="repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/you/project"
              />
              <Button type="submit" disabled={busy !== null || !repoUrl.trim()}>
                {busy === "repo" ? "Analyzing..." : "Analyze repository"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="size-4" aria-hidden /> Import from resume
            </CardTitle>
            <CardDescription>
              AI extracts your projects and claims. Claims stay unverified until you link a repo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button onClick={importResume} disabled={busy !== null || !file}>
              {busy === "resume" ? "Reading resume..." : "Import projects"}
            </Button>
          </CardContent>
        </Card>
      </div>
      {busy && <Spinner label="Working with AI. This can take up to a minute." />}
      {error && <ErrorAlert message={error} />}
      {warning && <p className="text-sm text-amber-600">{warning}</p>}

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Add a GitHub repository or import your resume to see which of your claims the code supports."
        />
      ) : (
        projects.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {p.name}
                <Badge variant="outline">{p.source === "github" ? "GitHub" : "Resume"}</Badge>
                {p.defenseScore !== null && (
                  <Badge variant="secondary">Defense {p.defenseScore.toFixed(1)}/5</Badge>
                )}
                {p.repoUrl && (
                  <a
                    href={p.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Open repository"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                )}
              </CardTitle>
              <CardDescription>{p.summary}</CardDescription>
              {p.stack.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {p.stack.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {p.claims.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Claim</TableHead>
                        <TableHead>Verdict</TableHead>
                        <TableHead>Evidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.claims.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="max-w-xs whitespace-normal">{c.text}</TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_STYLE[c.verdict]}`}
                            >
                              {c.verdict}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-md text-sm whitespace-normal">
                            <p>{c.evidence}</p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {c.fileRefs.map((ref) => {
                                const href = fileLink(p.repoUrl, ref);
                                return href ? (
                                  <a
                                    key={ref}
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-mono text-xs underline"
                                  >
                                    {ref}
                                  </a>
                                ) : (
                                  <code key={ref} className="text-xs">
                                    {ref}
                                  </code>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No claims recorded.</p>
              )}
              {p.hooks.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Interviewers will probe</p>
                  <ul className="mt-1 list-disc pl-5 text-sm">
                    {p.hooks.map((h) => (
                      <li key={h.topic}>
                        {h.topic}: <span className="text-muted-foreground">{h.why}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {p.source === "resume" && p.repoUrl && (
                <Button
                  variant="outline"
                  className="self-start"
                  disabled={busy !== null}
                  onClick={() =>
                    void analyze(undefined, {
                      repoUrl: p.repoUrl ?? "",
                      name: p.name,
                      claims: p.claims,
                    })
                  }
                >
                  Verify against {p.repoUrl.replace("https://github.com/", "")}
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
