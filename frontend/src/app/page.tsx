"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Inbox, Sparkles, TrendingUp } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { TrendArea } from "@/components/charts/trend-area";
import { BoroughBar } from "@/components/charts/borough-bar";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { fmt, hours } from "@/lib/utils";
import type { BoroughStat, DashboardSummary, ServiceRequest, TrendPoint } from "@/lib/types";

export default function HomePage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [boroughs, setBoroughs] = useState<BoroughStat[]>([]);
  const [recent, setRecent] = useState<ServiceRequest[]>([]);
  const [insight, setInsight] = useState<string>("Analyzing operations…");

  useEffect(() => {
    api.dashboardSummary().then(setSummary).catch(() => {});
    api.trends(30).then(setTrends).catch(() => {});
    api.boroughs().then(setBoroughs).catch(() => {});
    api.requests({ limit: 6 }).then((r) => setRecent(r.items)).catch(() => {});
    api.aiQuery("Give me an executive summary").then((a) => setInsight(a.answer)).catch(() =>
      setInsight("AI insight unavailable."),
    );
  }, []);

  return (
    <div>
      <Topbar title={t("home.title")} subtitle={t("home.sub")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("kpi.total")} value={fmt(summary?.total_requests)} icon={<Inbox size={16} />} />
        <KpiCard label={t("kpi.open")} value={fmt(summary?.open_requests)} accent="warn"
          sub={`${fmt(summary?.high_priority_open)} ${t("home.high_critical")}`} icon={<Clock size={16} />} />
        <KpiCard label={t("kpi.resolution_rate")} value={summary ? `${summary.resolution_rate}%` : "—"} accent="good"
          sub={`${fmt(summary?.closed_requests)} ${t("home.closed")}`} icon={<CheckCircle2 size={16} />} />
        <KpiCard label={t("kpi.avg_resolution")} value={hours(summary?.avg_resolution_hours)} accent="brand"
          sub={`${fmt(summary?.emergency_requests)} ${t("home.emergency_open")}`} icon={<TrendingUp size={16} />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>{t("home.trend")}</CardTitle>
          {trends.length ? <TrendArea data={trends} /> : <Placeholder />}
        </Card>
        <Card className="border-brand/30 bg-brand/[0.06]">
          <div className="mb-2 flex items-center gap-2 text-brand">
            <Sparkles size={16} />
            <span className="section-title !text-brand">{t("home.ai_insight")}</span>
          </div>
          <p className="text-sm leading-relaxed text-ink-2">{insight}</p>
          <div className="mt-4 rounded-lg border border-hair bg-overlay/[0.02] p-3 text-xs text-muted">
            Grounded in live SQL aggregates via the platform&apos;s provider-agnostic AI layer.
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>{t("home.by_borough")}</CardTitle>
          {boroughs.length ? <BoroughBar data={boroughs} /> : <Placeholder />}
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle>{t("home.recent")}</CardTitle>
          <div className="overflow-hidden rounded-lg border border-hair">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-[0.68rem] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">{t("th.request")}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t("th.type")}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t("th.borough")}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t("th.priority")}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t("th.status")}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-hair hover:bg-overlay/[0.02]">
                    <td className="px-3 py-2 font-mono text-xs text-ink-2">{r.request_number}</td>
                    <td className="px-3 py-2">{r.complaint_type ?? "—"}</td>
                    <td className="px-3 py-2 text-ink-2">{r.borough ?? "—"}</td>
                    <td className="px-3 py-2"><PriorityBadge priority={r.priority} /></td>
                    <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {!recent.length && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">{t("common.no_data")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {summary && summary.emergency_requests > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-crit/30 bg-crit/[0.08] px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
          <AlertTriangle size={18} />
          {fmt(summary.emergency_requests)} {t("home.emergency_alert")}
        </div>
      )}
    </div>
  );
}

function Placeholder() {
  return <div className="grid h-[260px] place-items-center text-sm text-muted">Loading…</div>;
}
