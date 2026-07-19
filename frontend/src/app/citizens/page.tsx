"use client";

import { useEffect, useState } from "react";
import { Mail, MapPin, Phone, Search, User } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { fmt } from "@/lib/utils";
import type { Citizen, CitizenDetail } from "@/lib/types";

export default function CitizensPage() {
  const { t } = useI18n();
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CitizenDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      api.citizens({ search, limit: 40 }).then((r) => setCitizens(r.items)).catch(() => setCitizens([]));
    }, 200);
    return () => clearTimeout(id);
  }, [search]);

  const openCitizen = (cid: number) => {
    setLoadingDetail(true);
    api.citizen(cid).then(setSelected).catch(() => setSelected(null)).finally(() => setLoadingDetail(false));
  };

  return (
    <div>
      <Topbar title={t("citizens.title")} subtitle={t("citizens.sub")} />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Master list */}
        <div className="card !p-0">
          <div className="relative border-b border-hair p-3">
            <Search size={15} className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input w-full pl-9" placeholder={t("common.search")}
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="max-h-[68vh] overflow-y-auto">
            {citizens.map((c) => (
              <button key={c.id} onClick={() => openCitizen(c.id)}
                className={`flex w-full items-center justify-between gap-2 border-b border-hair px-4 py-3 text-left transition hover:bg-overlay/[0.03] ${
                  selected?.citizen.id === c.id ? "bg-brand/10" : ""
                }`}>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.first_name} {c.last_name}</div>
                  <div className="truncate text-xs text-muted">{c.borough ?? "—"}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold tabular-nums">{fmt(c.request_count)}</div>
                  <div className="text-[0.65rem] text-muted">{fmt(c.open_count)} {t("th.open").toLowerCase()}</div>
                </div>
              </button>
            ))}
            {!citizens.length && <div className="px-4 py-6 text-center text-sm text-muted">{t("common.no_data")}</div>}
          </div>
        </div>

        {/* Detail */}
        <div>
          {!selected && !loadingDetail && (
            <div className="card grid h-full min-h-[40vh] place-items-center text-center text-muted">
              <div>
                <User size={30} className="mx-auto mb-3 text-brand" />
                <p className="text-sm">{t("citizens.select")}</p>
              </div>
            </div>
          )}
          {loadingDetail && <div className="card grid h-40 place-items-center text-muted">{t("common.loading")}</div>}
          {selected && !loadingDetail && (
            <div className="space-y-4">
              <div className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand/15 text-lg font-bold text-brand">
                      {selected.citizen.first_name[0]}{selected.citizen.last_name[0]}
                    </div>
                    <div>
                      <div className="text-lg font-bold">{selected.citizen.first_name} {selected.citizen.last_name}</div>
                      <div className="text-xs text-muted">Citizen #{selected.citizen.id}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 text-center">
                    <div className="rounded-lg border border-hair bg-overlay/[0.02] px-3 py-1.5">
                      <div className="text-lg font-bold tabular-nums">{fmt(selected.citizen.request_count)}</div>
                      <div className="text-[0.6rem] uppercase tracking-wide text-muted">{t("th.requests")}</div>
                    </div>
                    <div className="rounded-lg border border-hair bg-overlay/[0.02] px-3 py-1.5">
                      <div className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300">{fmt(selected.citizen.open_count)}</div>
                      <div className="text-[0.6rem] uppercase tracking-wide text-muted">{t("th.open")}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink-2">
                  <span className="flex items-center gap-1.5"><Mail size={14} className="text-muted" />{selected.citizen.email ?? "—"}</span>
                  <span className="flex items-center gap-1.5"><Phone size={14} className="text-muted" />{selected.citizen.phone ?? "—"}</span>
                  <span className="flex items-center gap-1.5"><MapPin size={14} className="text-muted" />{selected.citizen.borough ?? "—"}</span>
                </div>
              </div>

              <div className="card !p-0">
                <div className="border-b border-hair px-4 py-3 section-title">{t("citizens.history")}</div>
                <div className="max-h-[46vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-2 text-[0.68rem] uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">{t("th.request")}</th>
                        <th className="px-3 py-2 text-left font-semibold">{t("th.complaint")}</th>
                        <th className="px-3 py-2 text-left font-semibold">{t("th.priority")}</th>
                        <th className="px-3 py-2 text-left font-semibold">{t("th.status")}</th>
                        <th className="px-3 py-2 text-left font-semibold">{t("th.created")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.requests.map((r) => (
                        <tr key={r.id} className="border-t border-hair hover:bg-overlay/[0.02]">
                          <td className="px-4 py-2 font-mono text-xs text-ink-2">{r.request_number}</td>
                          <td className="px-3 py-2">{r.complaint_type ?? "—"}</td>
                          <td className="px-3 py-2"><PriorityBadge priority={r.priority} /></td>
                          <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                          <td className="px-3 py-2 text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {!selected.requests.length && (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">{t("common.no_data")}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
