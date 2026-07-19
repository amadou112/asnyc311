"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Card, CardTitle } from "@/components/ui/card";
import { TrendArea } from "@/components/charts/trend-area";
import { BoroughBar } from "@/components/charts/borough-bar";
import { StatusDonut } from "@/components/charts/status-donut";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { BoroughStat, RequestStats, TrendPoint } from "@/lib/types";

export default function AnalyticsPage() {
  const { t } = useI18n();
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [boroughs, setBoroughs] = useState<BoroughStat[]>([]);
  const [stats, setStats] = useState<RequestStats | null>(null);

  useEffect(() => {
    api.trends(90).then(setTrends).catch(() => {});
    api.boroughs().then(setBoroughs).catch(() => {});
    api.requestStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div>
      <Topbar title={t("analytics.title")} subtitle={t("analytics.sub")} />
      <Card>
        <CardTitle>Complaint volume — last 90 days</CardTitle>
        {trends.length ? <TrendArea data={trends} /> : <Empty />}
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Requests by borough</CardTitle>
          {boroughs.length ? <BoroughBar data={boroughs} /> : <Empty />}
        </Card>
        <Card>
          <CardTitle>Status distribution</CardTitle>
          {stats?.by_status.length ? <StatusDonut data={stats.by_status} /> : <Empty />}
        </Card>
      </div>
      <div className="mt-4 rounded-xl border border-hair bg-overlay/[0.02] p-4 text-xs text-muted">
        Forecasting, anomaly detection, and ML model dashboards are wired in the AI
        layer (see the AI Assistant&apos;s forecast intent) and surface here in the next phase.
      </div>
    </div>
  );
}

function Empty() {
  return <div className="grid h-[260px] place-items-center text-sm text-muted">Loading…</div>;
}
