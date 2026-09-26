// Small shared UI pieces used across pages.
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-medium underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      {href && cta && (
        <Link href={href} className={buttonVariants()}>
          {cta}
        </Link>
      )}
    </div>
  );
}

/** Circular percentage ring (SVG). */
export function Ring({
  value,
  label,
  size = 120,
}: {
  value: number | null;
  label: string;
  size?: number;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <figure className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${value === null ? "no data" : `${Math.round(pct)}%`}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={
            pct >= 70 ? "stroke-emerald-500" : pct >= 45 ? "stroke-amber-500" : "stroke-primary"
          }
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="fill-foreground text-xl font-semibold"
        >
          {value === null ? "—" : `${Math.round(pct)}%`}
        </text>
      </svg>
      <figcaption className="text-sm font-medium">{label}</figcaption>
    </figure>
  );
}

/** Horizontal bar with a marker at the company bar. */
export function BarVsTarget({ score, bar }: { score: number; bar: number }) {
  return (
    <div className="bg-muted relative h-3 w-full rounded-full" role="presentation">
      <div
        className={`h-3 rounded-full ${score >= bar ? "bg-emerald-500" : "bg-primary"}`}
        style={{ width: `${Math.min(100, score)}%` }}
      />
      <div
        className="bg-foreground absolute -top-1 h-5 w-0.5"
        style={{ left: `${Math.min(100, bar)}%` }}
        title={`Bar: ${bar}`}
      />
    </div>
  );
}
