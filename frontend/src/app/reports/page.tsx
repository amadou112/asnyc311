"use client";

import { useEffect, useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Report } from "@/lib/types";

const KINDS = ["executive", "weekly", "monthly", "compliance"];
const KIND_STYLE: Record<string, string> = {
  executive: "bg-brand/15 text-brand",
  weekly: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  monthly: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  compliance: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export default function ReportsPage() {
  const { t } = useI18n();
  const [reports, setReports] = useState<Report[]>([]);
  const [kind, setKind] = useState("executive");
  const [busy, setBusy] = useState(false);

  const load = () => api.reports().then(setReports).catch(() => setReports([]));
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setBusy(true);
    try { await api.generateReport(kind); await load(); } finally { setBusy(false); }
  };

  return (
    <div>
      <Topbar title={t("reports.title")} subtitle={t("reports.sub")} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <button className="btn-brand" onClick={generate} disabled={busy}>
          <Sparkles size={16} /> {busy ? t("reports.generating") : t("reports.generate")}
        </button>
      </div>

      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="card">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-overlay/5 text-muted">
                <FileText size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{r.title}</h3>
                  <span className={`badge ${KIND_STYLE[r.kind] ?? "bg-overlay/10 text-ink-2"}`}>{r.kind}</span>
                </div>
                {r.summary && <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{r.summary}</p>}
                <div className="mt-2 text-xs text-muted">
                  {r.created_by} · {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        {!reports.length && <div className="card text-center text-sm text-muted">{t("common.no_data")}</div>}
      </div>
    </div>
  );
}
