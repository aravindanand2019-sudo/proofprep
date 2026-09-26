// Compares a submission's returned value with the expected value (pure; client + server).
import type { CompareMode } from "../schemas/index.ts";

const key = (v: unknown) => JSON.stringify(v);

function sortDeep(v: unknown, depth: number): unknown {
  if (!Array.isArray(v)) return v;
  const inner = depth > 1 ? v.map((x) => sortDeep(x, depth - 1)) : v;
  return [...inner].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

export function outputsMatch(actual: unknown, expected: unknown, mode: CompareMode): boolean {
  switch (mode) {
    case "exact":
      return key(actual) === key(expected);
    case "sorted":
      return key(sortDeep(actual, 1)) === key(sortDeep(expected, 1));
    case "deep-sorted":
      return key(sortDeep(actual, 2)) === key(sortDeep(expected, 2));
    case "float":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        Math.abs(actual - expected) <= 1e-6
      );
  }
}

export function camelCase(snake: string): string {
  return snake.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export type RunnableLanguage = "python" | "javascript";
export type Language = RunnableLanguage | "cpp" | "java";

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
  java: "Java",
};

export function isRunnable(lang: Language): lang is RunnableLanguage {
  return lang === "python" || lang === "javascript";
}

/** Function name the harness calls for a language. */
export function entryName(fn: string, lang: Language): string {
  return lang === "python" ? fn : camelCase(fn);
}

export function starterCode(lang: Language, fn: string, params: string[]): string {
  const name = entryName(fn, lang);
  const args = params.join(", ");
  switch (lang) {
    case "python":
      return `def ${name}(${args}):\n    # Write your solution here\n    pass\n`;
    case "javascript":
      return `function ${name}(${params.map(camelCase).join(", ")}) {\n  // Write your solution here\n}\n`;
    case "cpp":
      return `// C++ can't run in the browser: submit for an AI review.\n// Write a function named ${name}.\n\n`;
    case "java":
      return `// Java can't run in the browser: submit for an AI review.\nclass Solution {\n    // Write a method named ${name}\n}\n`;
  }
}
