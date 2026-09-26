// Lets plain Node (native TypeScript stripping) run scripts that import app code:
// resolves "@/..." to the repo root and adds missing ".ts" / "/index.ts" extensions.
// Usage: node --import ./scripts/alias-loader.mjs scripts/seed-demo.ts
import { existsSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = new URL("../", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  let spec = specifier;
  if (spec.startsWith("@/")) spec = new URL(spec.slice(2), ROOT).href;
  const isPath = spec.startsWith("file:") || spec.startsWith("./") || spec.startsWith("../");
  if (isPath && !/\.[cm]?[jt]sx?$/.test(spec)) {
    const base = new URL(spec, context.parentURL);
    for (const candidate of [`${base.href}.ts`, `${base.href}/index.ts`]) {
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate, context);
    }
  }
  try {
    return await nextResolve(spec, context);
  } catch (error) {
    // CommonJS packages without an "exports" map (e.g. next/server) need the extension.
    if (!isPath && error?.code === "ERR_MODULE_NOT_FOUND")
      return nextResolve(`${spec}.js`, context);
    throw error;
  }
}

if (!process.env.__ALIAS_LOADER_CHILD) {
  process.env.__ALIAS_LOADER_CHILD = "1";
  register(import.meta.url, pathToFileURL("./"));
}
