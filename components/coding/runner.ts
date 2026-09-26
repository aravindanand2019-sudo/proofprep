"use client";

// Runs user code against test cases inside a Web Worker, never on our server.
// JavaScript runs directly; Python runs on Pyodide (CPython compiled to WebAssembly),
// loaded from jsDelivr on first use. A run that exceeds the time limit kills the worker.
import { entryName, type RunnableLanguage } from "@/lib/coding/compare";

const PYODIDE_VERSION = "314.0.7";
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
/** Per run (all tests). Python's first run also pays the Pyodide download, handled separately. */
export const RUN_TIMEOUT_MS = 6000;
const PYODIDE_LOAD_TIMEOUT_MS = 60_000;

export type TestRun = { ok: true; output: unknown; ms: number } | { ok: false; error: string };

export type RunResult = { kind: "ok"; runs: TestRun[] } | { kind: "error"; message: string };

export const JS_WORKER = `
self.onmessage = (event) => {
  const { code, entry, tests } = event.data;
  let fn;
  try {
    fn = new Function(code + "\\n;return typeof " + entry + " === 'function' ? " + entry + " : undefined;")();
  } catch (err) {
    self.postMessage({ kind: "error", message: "Syntax error: " + (err && err.message ? err.message : String(err)) });
    return;
  }
  if (typeof fn !== "function") {
    self.postMessage({ kind: "error", message: "Define a function named " + entry + "." });
    return;
  }
  const runs = tests.map((args) => {
    const start = performance.now();
    try {
      const out = fn(...JSON.parse(JSON.stringify(args)));
      return { ok: true, output: out === undefined ? null : JSON.parse(JSON.stringify(out)), ms: performance.now() - start };
    } catch (err) {
      return { ok: false, error: (err && err.name ? err.name + ": " : "") + (err && err.message ? err.message : String(err)) };
    }
  });
  self.postMessage({ kind: "ok", runs });
};`;

export const PY_WORKER = `
importScripts("${PYODIDE_URL}pyodide.js");
const ready = loadPyodide({ indexURL: "${PYODIDE_URL}" });
self.postMessage({ kind: "loading" });
ready.then(() => self.postMessage({ kind: "ready" }), (err) => self.postMessage({ kind: "error", message: "Couldn't load Python: " + err }));
const HARNESS = [
  "import json, time",
  "__fn = __ns.get(__entry)",
  "if not callable(__fn):",
  "    __result = json.dumps({'kind': 'error', 'message': 'Define a function named ' + __entry + '.'})",
  "else:",
  "    __runs = []",
  "    for __args in json.loads(__tests_json):",
  "        __t = time.perf_counter()",
  "        try:",
  "            __out = __fn(*__args)",
  "            __runs.append({'ok': True, 'output': json.loads(json.dumps(__out)), 'ms': (time.perf_counter() - __t) * 1000})",
  "        except Exception as __e:",
  "            __runs.append({'ok': False, 'error': type(__e).__name__ + ': ' + str(__e)})",
  "    __result = json.dumps({'kind': 'ok', 'runs': __runs})",
].join("\\n");
self.onmessage = async (event) => {
  const py = await ready;
  const { code, entry, tests } = event.data;
  const ns = py.globals.get("dict")();
  try {
    py.runPython(code, { globals: ns });
  } catch (err) {
    self.postMessage({ kind: "error", message: String(err.message || err).split("\\n").slice(-3).join("\\n") });
    ns.destroy();
    return;
  }
  const scope = py.globals.get("dict")();
  scope.set("__ns", ns);
  scope.set("__entry", entry);
  scope.set("__tests_json", JSON.stringify(tests));
  try {
    py.runPython(HARNESS, { globals: scope });
    self.postMessage(JSON.parse(scope.get("__result")));
  } catch (err) {
    self.postMessage({ kind: "error", message: String(err.message || err).split("\\n").slice(-3).join("\\n") });
  } finally {
    scope.destroy();
    ns.destroy();
  }
};`;

type WorkerState = { worker: Worker; ready: Promise<void> };
const workers = new Map<RunnableLanguage, WorkerState>();

function spawn(lang: RunnableLanguage, onStatus?: (s: string) => void): WorkerState {
  const src = lang === "python" ? PY_WORKER : JS_WORKER;
  const worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
  const ready =
    lang === "javascript"
      ? Promise.resolve()
      : new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(
            () => reject(new Error("Loading Python timed out. Check your connection.")),
            PYODIDE_LOAD_TIMEOUT_MS,
          );
          const onMessage = (e: MessageEvent<{ kind: string; message?: string }>) => {
            if (e.data.kind === "loading") onStatus?.("Loading Python (first run only, ~10 MB)...");
            if (e.data.kind === "ready") {
              window.clearTimeout(timer);
              worker.removeEventListener("message", onMessage);
              resolve();
            }
            if (e.data.kind === "error") {
              window.clearTimeout(timer);
              worker.removeEventListener("message", onMessage);
              reject(new Error(e.data.message ?? "Python failed to load"));
            }
          };
          worker.addEventListener("message", onMessage);
        });
  const state = { worker, ready };
  workers.set(lang, state);
  return state;
}

function kill(lang: RunnableLanguage) {
  workers.get(lang)?.worker.terminate();
  workers.delete(lang);
}

/** Runs `code` against each test's args. Never throws; errors come back as results. */
export async function runTests(
  lang: RunnableLanguage,
  code: string,
  fn: string,
  tests: unknown[][],
  onStatus?: (s: string) => void,
): Promise<RunResult> {
  let state = workers.get(lang) ?? spawn(lang, onStatus);
  try {
    await state.ready;
  } catch (error) {
    kill(lang);
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }
  onStatus?.("Running tests...");
  state = workers.get(lang) ?? spawn(lang, onStatus);

  return new Promise<RunResult>((resolve) => {
    const { worker } = state;
    const timer = window.setTimeout(() => {
      worker.removeEventListener("message", onMessage);
      kill(lang);
      resolve({
        kind: "error",
        message: `Time limit exceeded (${RUN_TIMEOUT_MS / 1000} s). Look for an infinite loop or a slow approach.`,
      });
    }, RUN_TIMEOUT_MS);
    const onMessage = (e: MessageEvent<RunResult | { kind: "loading" | "ready" }>) => {
      const data = e.data;
      if (data.kind === "loading" || data.kind === "ready") return;
      window.clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      resolve(data as RunResult);
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ code, entry: entryName(fn, lang), tests });
  });
}
