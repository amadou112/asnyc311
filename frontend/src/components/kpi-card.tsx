import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  sub,
  icon,
  accent = "brand",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  accent?: "brand" | "good" | "warn" | "crit";
}) {
  const bar = {
    brand: "from-brand",
    good: "from-good",
    warn: "from-warn",
    crit: "from-crit",
  }[accent];
  return (
    <div className="card card-hover relative overflow-hidden p-5">
      <div className={cn("absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b to-transparent", bar)} />
      <div className="flex items-start justify-between">
        <span className="kpi-label">{label}</span>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
