"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Card, CardTitle } from "@/components/ui/card";
import { TrendArea } from "@/components/charts/trend-area";
import { StatusDonut } from "@/components/charts/status-donut";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { fmt, hours, titleCase } from "@/lib/utils";
import type { BoroughStat, RequestStats, TrendPoint } from "@/lib/types";

export default function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<RequestStats | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [boroughs, setBoroughs] = useState<BoroughStat[]>([]);

  useEffect(() => {
    api.requestStats().then(setStats).catch(() => {});
    api.trends(60).then(setTrends).catch(() => {});
    api.boroughs().then(setBoroughs).catch(() => {});
  }, []);

  return (
    <div>
      <Topbar title={t("dashboard.title")} subtitle={t("dashboard.sub")} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Requests by status</CardTitle>
          {stats?.by_status.length ? <StatusDonut data={stats.by_status} /> : <Empty />}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
            {stats?.by_status.map((s) => (
              <span key={s.key} className="rounded bg-overlay/5 px-2 py-1">{s.key.replace(/_/g, " ")}: {fmt(s.count)}</span>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Priority load</CardTitle>
          <div className="space-y-3 py-2">
            {stats?.by_priority
              .slice()
              .sort((a, b) => order(b.key) - order(a.key))
              .map((p) => {
                const max = Math.max(...(stats?.by_priority.map((x) => x.count) ?? [1]));
                return (
                  <div key={p.key}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-ink-2">{titleCase(p.key)}</span>
                      <span className="tabular-nums text-muted">{fmt(p.count)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-overlay/5">
                      <div className={`h-2 rounded-full ${barColor(p.key)}`} style={{ width: `${(p.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>

        <Card>
          <CardTitle>Borough SLAs</CardTitle>
          <table className="w-full text-sm">
            <thead className="text-[0.68rem] uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 text-left font-semibold">Borough</th>
                <th className="py-2 text-right font-semibold">Open</th>
                <th className="py-2 text-right font-semibold">Avg</th>
              </tr>
            </thead>
            <tbody>
              {boroughs.map((b) => (
                <tr key={b.borough} className="border-t border-hair">
                  <td className="py-2">{titleCase(b.borough)}</td>
                  <td className="py-2 text-right tabular-nums text-ink-2">{fmt(b.open)}</td>
                  <td className="py-2 text-right tabular-nums text-ink-2">{hours(b.avg_resolution_hours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>Complaint volume — last 60 days</CardTitle>
        {trends.length ? <TrendArea data={trends} /> : <Empty />}
      </Card>
    </div>
  );
}

const order = (k: string) => ["low", "medium", "high", "critical"].indexOf(k);
const barColor = (k: string) =>
  ({ low: "bg-slate-400", medium: "bg-sky-400", high: "bg-amber-400", critical: "bg-rose-500" }[k] ?? "bg-brand");

function Empty() {
  return <div className="grid h-[260px] place-items-center text-sm text-muted">Loading…</div>;
}
