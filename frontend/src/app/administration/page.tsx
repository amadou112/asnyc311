"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { fmt } from "@/lib/utils";
import type { Agency, AuditLog, User } from "@/lib/types";

const TABS = ["users", "agencies", "audit"] as const;
type Tab = (typeof TABS)[number];

const ROLE_STYLE: Record<string, string> = {
  executive: "bg-brand/15 text-brand",
  administrator: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  agency_manager: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  supervisor: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  inspector: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  citizen: "bg-overlay/10 text-ink-2",
};

export default function AdministrationPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<User[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    api.users().then(setUsers).catch(() => {});
    api.agencies().then(setAgencies).catch(() => {});
    api.auditLogs(50).then(setLogs).catch(() => {});
  }, []);

  const TAB_LABEL: Record<Tab, string> = {
    users: `${t("th.name")} (${fmt(users.length)})`,
    agencies: `${t("th.agency")} (${fmt(agencies.length)})`,
    audit: `${t("th.action")} (${fmt(logs.length)})`,
  };

  return (
    <div>
      <Topbar title={t("admin.title")} subtitle={t("admin.sub")} />

      <div className="mb-4 flex gap-1 border-b border-hair">
        {TABS.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
              tab === tb ? "border-b-2 border-brand text-ink" : "text-muted hover:text-ink"
            }`}>
            {TAB_LABEL[tb]}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <Card className="!p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-[0.68rem] uppercase tracking-wide text-muted">
              <tr>
                {[t("th.name"), t("th.email"), t("th.role"), t("th.mfa"), t("th.status")].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-hair hover:bg-overlay/[0.02]">
                  <td className="px-4 py-2 font-medium">{u.full_name}</td>
                  <td className="px-4 py-2 text-ink-2">{u.email}</td>
                  <td className="px-4 py-2">
                    <span className={`badge ${ROLE_STYLE[u.role ?? ""] ?? "bg-overlay/10 text-ink-2"}`}>
                      {u.role?.replace(/_/g, " ") ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {u.mfa_enabled
                      ? <ShieldCheck size={16} className="text-emerald-400" />
                      : <ShieldOff size={16} className="text-muted" />}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`badge ${u.is_active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-overlay/10 text-muted"}`}>
                      {u.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "agencies" && (
        <Card className="!p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-[0.68rem] uppercase tracking-wide text-muted">
              <tr>
                {[t("th.agency"), t("th.name"), t("th.requests"), t("th.open")].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agencies.map((a) => (
                <tr key={a.id} className="border-t border-hair hover:bg-overlay/[0.02]">
                  <td className="px-4 py-2 font-mono text-xs text-brand">{a.acronym}</td>
                  <td className="px-4 py-2 text-ink-2">{a.name}</td>
                  <td className="px-4 py-2 tabular-nums">{fmt(a.request_count)}</td>
                  <td className="px-4 py-2 tabular-nums text-amber-700 dark:text-amber-300">{fmt(a.open_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "audit" && (
        <Card className="!p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-[0.68rem] uppercase tracking-wide text-muted">
              <tr>
                {[t("th.actor"), t("th.action"), t("th.entity"), t("th.when")].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-hair hover:bg-overlay/[0.02]">
                  <td className="px-4 py-2 text-ink-2">{l.actor}</td>
                  <td className="px-4 py-2"><span className="badge bg-overlay/10 text-ink-2">{l.action}</span></td>
                  <td className="px-4 py-2 text-ink-2">{l.entity_type}{l.entity_id ? ` #${l.entity_id}` : ""}</td>
                  <td className="px-4 py-2 text-xs text-muted">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
