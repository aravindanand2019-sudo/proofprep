import Link from "next/link";
import { SignOutButton } from "./sign-out-button";

export function AppHeader({ showNav = true }: { showNav?: boolean }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href={showNav ? "/home" : "/onboarding"} className="font-semibold tracking-tight">
          ProofPrep
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {showNav && (
            <Link href="/home" className="hover:bg-muted rounded-md px-3 py-1.5">
              Home
            </Link>
          )}
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
