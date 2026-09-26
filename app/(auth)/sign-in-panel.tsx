"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signInAsDemo, signInErrorMessage, signInWithGoogle } from "@/lib/auth/client";

type Pending = "google" | "demo" | null;

export function SignInPanel() {
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: Exclude<Pending, null>) {
    setPending(kind);
    setError(null);
    try {
      const redirectTo = kind === "google" ? await signInWithGoogle() : await signInAsDemo();
      // Full navigation so proxy.ts sees the new session cookie.
      window.location.assign(redirectTo);
    } catch (err) {
      setError(signInErrorMessage(err));
      setPending(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <Button size="lg" onClick={() => run("google")} disabled={pending !== null}>
        {pending === "google" ? "Signing in..." : "Continue with Google"}
      </Button>
      <Button size="lg" variant="outline" onClick={() => run("demo")} disabled={pending !== null}>
        {pending === "demo" ? "Opening demo..." : "Try demo account"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
