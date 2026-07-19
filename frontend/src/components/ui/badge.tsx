import { cn } from "@/lib/utils";

// Each variant sets a tinted background plus text that has good contrast in BOTH
// themes: a darker shade by default (light mode) and a lighter shade under
// [data-theme="dark"] via the `dark:` variant.
const STATUS_STYLES: Record<string, string> = {
  new: "bg-brand/15 text-brand",
  triaged: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  pending_inspection: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  resolved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  closed: "bg-overlay/10 text-ink-2",
  reopened: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-overlay/10 text-ink-2",
  medium: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  critical: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("badge", STATUS_STYLES[status] ?? "bg-overlay/10 text-ink-2")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn("badge", PRIORITY_STYLES[priority] ?? "bg-overlay/10 text-ink-2")}>
      {priority}
    </span>
  );
}
