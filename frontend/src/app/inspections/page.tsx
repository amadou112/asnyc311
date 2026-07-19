"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn, fmt } from "@/lib/utils";
import type { PaginatedInspections } from "@/lib/types";

const PAGE = 15;
const COMPLIANCE_STYLE: Record<string, string> = {
  compliant: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  non_compliant: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

export default function InspectionsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<PaginatedInspections | null>(null);
  const [offset, setOffset] = useState(0);
  const [violation, setViolation] = useState<string>("");

  const load = useCallback(() => {
    api
      .inspections({ limit: PAGE, offset, violation: violation === "" ? undefined : violation })
      .then(setData)
      .catch(() => setData(null));
  }, [offset, violation]);

  useEffect(() => { load(); }, [load]);

  const total = data?.total ?? 0;

  return (
    <div>
      <Topbar title={t("inspections.title")} subtitle={t("inspections.sub")} />

      <div className="mb-4 flex items-center gap-2">
        <select className="input" value={violation}
          onChange={(e) => { setOffset(0); setViolation(e.target.value); }}>
          <option value="">{t("common.all")} · {t("common.violations")}</option>
          <option value="true">{t("common.violations")}</option>
          <option value="false">{t("th.compliance")}</option>
        </select>
        <span className="ml-auto text-sm text-muted">{fmt(total)}</span>
      </div>

      <div className="card overflow-hidden !p-0">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-[0.68rem] uppercase tracking-wide text-muted">
            <tr>
              {[t("th.request"), t("th.complaint"), t("th.borough"), t("th.inspector"),
                t("th.scheduled"), t("th.status"), t("th.compliance"), t("th.risk")].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.items.map((r) => (
              <tr key={r.id} className="border-t border-hair hover:bg-overlay/[0.02]">
                <td className="px-3 py-2 font-mono text-xs text-ink-2">{r.request_number}</td>
                <td className="px-3 py-2">{r.complaint_type ?? "—"}</td>
                <td className="px-3 py-2 text-ink-2">{r.borough ?? "—"}</td>
                <td className="px-3 py-2 text-ink-2">{r.inspector_name ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted">
                  {r.scheduled_at ? new Date(r.scheduled_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-3 py-2">
                  <span className="badge bg-overlay/10 text-ink-2">{r.status.replace(/_/g, " ")}</span>
                </td>
                <td className="px-3 py-2">
                  {r.violation_found ? (
                    <span className="badge inline-flex items-center gap-1 bg-rose-500/15 text-rose-700 dark:text-rose-300">
                      <AlertTriangle size={11} /> {t("common.violations")}
                    </span>
                  ) : (
                    <span className={cn("badge inline-flex items-center gap-1",
                      COMPLIANCE_STYLE[r.compliance_status ?? "pending"] ?? "bg-overlay/10 text-ink-2")}>
                      <CheckCircle2 size={11} /> {r.compliance_status?.replace(/_/g, " ") ?? "pending"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums text-ink-2">{r.risk_score ?? "—"}</td>
              </tr>
            ))}
            {!data?.items.length && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted">{t("common.no_data")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span>{t("common.showing")} {total ? offset + 1 : 0}–{Math.min(offset + PAGE, total)} {t("common.of")} {fmt(total)}</span>
        <div className="flex gap-2">
          <button className="btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>{t("common.prev")}</button>
          <button className="btn-ghost" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>{t("common.next")}</button>
        </div>
      </div>
    </div>
  );
}
