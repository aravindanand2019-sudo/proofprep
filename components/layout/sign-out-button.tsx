"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
