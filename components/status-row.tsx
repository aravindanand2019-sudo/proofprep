export type Status = "checking" | "ok" | "warn" | "error";

const DOT: Record<Status, string> = {
  checking: "bg-muted-foreground animate-pulse",
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  error: "bg-red-500",
};

export function StatusRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: Status;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${DOT[status]}`} aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-sm break-words">{detail}</p>
      </div>
    </li>
  );
}
