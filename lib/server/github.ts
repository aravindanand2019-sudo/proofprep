// Public-repo fetcher for Project Defense (Octokit; GITHUB_TOKEN optional but recommended).
import { Octokit } from "octokit";

const MAX_KEY_FILES = 8;
const MAX_FILE_BYTES = 40_000;
const TREE_DEPTH = 3;

const SOURCE_EXT =
  /\.(py|js|jsx|ts|tsx|java|kt|go|rb|php|cs|cpp|cc|c|h|rs|swift|dart|vue|svelte|sql)$/i;
const SKIP =
  /(^|\/)(node_modules|dist|build|out|\.next|vendor|venv|\.venv|__pycache__|coverage|\.git)(\/|$)|(\.min\.|lock\.json$|\.lock$)/i;
const ENTRY = /(^|\/)(main|app|index|server|manage|wsgi|asgi|run)\.[a-z]+$/i;
const IMPORTANT = /(route|controller|api|model|schema|service|handler|views?)[^/]*\.[a-z]+$/i;

export class GitHubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubError";
  }
}

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const m = url.trim().match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i);
  return m?.[1] && m[2] ? { owner: m[1], repo: m[2] } : null;
}

export type RepoSnapshot = {
  name: string;
  url: string;
  description: string | null;
  languages: Record<string, number>;
  readme: string;
  tree: string;
  files: Array<{ path: string; content: string }>;
};

function treeText(paths: string[]): string {
  const shown = new Set<string>();
  for (const p of paths) {
    const parts = p.split("/");
    for (let d = 1; d <= Math.min(parts.length, TREE_DEPTH); d += 1) {
      shown.add(parts.slice(0, d).join("/") + (d < parts.length ? "/" : ""));
    }
  }
  return [...shown]
    .sort()
    .map(
      (p) =>
        `${"  ".repeat(p.replace(/\/$/, "").split("/").length - 1)}${p.split("/").filter(Boolean).pop()}${p.endsWith("/") ? "/" : ""}`,
    )
    .join("\n");
}

export function pickKeyFiles(files: Array<{ path: string; size: number }>): string[] {
  const candidates = files.filter(
    (f) => SOURCE_EXT.test(f.path) && !SKIP.test(f.path) && f.size <= MAX_FILE_BYTES && f.size > 0,
  );
  const score = (f: { path: string; size: number }) =>
    (ENTRY.test(f.path) ? 3 : 0) + (IMPORTANT.test(f.path) ? 2 : 0) + f.size / MAX_FILE_BYTES;
  return candidates
    .sort((a, b) => score(b) - score(a))
    .slice(0, MAX_KEY_FILES)
    .map((f) => f.path);
}

export async function fetchRepo(url: string): Promise<RepoSnapshot> {
  const parsed = parseRepoUrl(url);
  if (!parsed) throw new GitHubError("That doesn't look like a GitHub repository URL.");
  const octokit = new Octokit(process.env.GITHUB_TOKEN ? { auth: process.env.GITHUB_TOKEN } : {});
  const { owner, repo } = parsed;

  try {
    const { data: meta } = await octokit.rest.repos.get({ owner, repo });
    if (meta.fork)
      throw new GitHubError("This repository is a fork. Add your original repository instead.");
    if (meta.private) throw new GitHubError("Private repositories aren't supported.");

    const [languages, readme, tree] = await Promise.all([
      octokit.rest.repos.listLanguages({ owner, repo }).then((r) => r.data),
      octokit.rest.repos
        .getReadme({ owner, repo, mediaType: { format: "raw" } })
        .then((r) => String(r.data))
        .catch(() => ""),
      octokit.rest.git
        .getTree({ owner, repo, tree_sha: meta.default_branch, recursive: "true" })
        .then((r) => r.data.tree),
    ]);

    const blobs = tree
      .filter((t) => t.type === "blob" && t.path)
      .map((t) => ({ path: t.path ?? "", size: t.size ?? 0 }));
    const keyPaths = pickKeyFiles(blobs);
    const files = await Promise.all(
      keyPaths.map(async (path) => {
        const r = await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          mediaType: { format: "raw" },
        });
        return { path, content: String(r.data) };
      }),
    );

    return {
      name: meta.name,
      url: meta.html_url,
      description: meta.description,
      languages,
      readme,
      tree: treeText(blobs.map((b) => b.path).filter((p) => !SKIP.test(p))),
      files,
    };
  } catch (error) {
    if (error instanceof GitHubError) throw error;
    const status = (error as { status?: number }).status;
    if (status === 404) throw new GitHubError("Repository not found. Is it public?");
    if (status === 403) throw new GitHubError("GitHub rate limit reached. Try again later.");
    throw new GitHubError("Couldn't reach GitHub. Try again.");
  }
}
