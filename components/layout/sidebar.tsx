"use client";

import {
  BarChart3,
  Briefcase,
  ClipboardCheck,
  Dumbbell,
  FolderGit2,
  Gauge,
  Home,
  Link2,
  Map,
  MessagesSquare,
  Target,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

export const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/personal-details", label: "Personal Details", icon: User },
  { href: "/assessment", label: "Quick Assessment", icon: ClipboardCheck },
  { href: "/skill-gap", label: "Skill Gap", icon: Target },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/mock-interview", label: "Mock Interview", icon: MessagesSquare },
  { href: "/daily-practice", label: "Daily Practice", icon: Dumbbell },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/readiness", label: "Placement Readiness", icon: Gauge },
  { href: "/connect", label: "Connect", icon: Link2 },
] as const;

export function Sidebar({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <aside className="bg-muted/30 hidden w-60 shrink-0 flex-col border-r md:flex">
      <Link href="/home" className="flex h-14 items-center gap-2 border-b px-5 font-semibold">
        <Briefcase className="size-4" aria-hidden />
        ProofPrep
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5 p-3 text-sm" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors ${
                active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between gap-2 border-t p-3">
        <span className="truncate text-sm">{name}</span>
        <SignOutButton />
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b px-3 py-2 text-sm md:hidden"
      aria-label="Main"
    >
      {NAV.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`shrink-0 rounded-md px-2.5 py-1.5 ${
            pathname.startsWith(href) ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
