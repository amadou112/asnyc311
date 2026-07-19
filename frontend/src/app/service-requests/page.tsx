"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { fmt } from "@/lib/utils";
import type { PaginatedRequests, ServiceRequest } from "@/lib/types";

const STATUSES = ["", "new", "triaged", "in_progress", "pending_inspection", "resolved", "closed", "reopened"];
const PRIORITIES = ["", "low", "medium", "high", "critical"];
const BOROUGHS = ["", "MANHATTAN", "BRONX", "BROOKLYN", "QUEENS", "STATEN ISLAND"];
const COMPLAINTS = [
  "Noise - Residential", "Illegal Parking", "Water System", "HEAT/HOT WATER",
  "Street Condition", "Unsanitary Condition", "Blocked Driveway", "Street Light Condition",
];
const PAGE = 15;

export default function ServiceRequestsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<PaginatedRequests | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({ search: "", status: "", priority: "", borough: "" });
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .requests({ ...filters, limit: PAGE, offset })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [filters, offset]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (k: string, v: string) => { setOffset(0); setFilters((f) => ({ ...f, [k]: v })); };

  const close = async (r: ServiceRequest) => {
    const resolution = window.prompt(`Resolution for ${r.request_number}:`, "Resolved by responding agency.");
    if (!resolution) return;
    await api.closeRequest(r.id, resolution);
    load();
  };

  const total = data?.total ?? 0;

  return (
    <div>
      <Topbar title={t("requests.title")} subtitle={`${fmt(total)} · ${t("requests.sub")}`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input w-64 pl-9" placeholder="Search description or SR #"
            value={filters.search} onChange={(e) => setFilter("search", e.target.value)} />
        </div>
        <Select value={filters.status} onChange={(v) => setFilter("status", v)} options={STATUSES} label="Status" />
        <Select value={filters.priority} onChange={(v) => setFilter("priority", v)} options={PRIORITIES} label="Priority" />
        <Select value={filters.borough} onChange={(v) => setFilter("borough", v)} options={BOROUGHS} label="Borough" />
        <button className="btn-brand ml-auto" onClick={() => setShowForm((s) => !s)}>
          {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? t("common.cancel") : t("common.new_request")}
        </button>
      </div>

      {showForm && <CreateForm onCreated={() => { setShowForm(false); setOffset(0); load(); }} />}

      <div className="card overflow-hidden !p-0">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-[0.68rem] uppercase tracking-wide text-muted">
            <tr>
              {["Request #", "Complaint", "Borough", "Agency", "Priority", "Status", "Risk", "Created", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-3 py-8 text-center text-muted">Loading…</td></tr>}
            {!loading && data?.items.map((r) => (
              <tr key={r.id} className="border-t border-hair hover:bg-overlay/[0.02]">
                <td className="px-3 py-2 font-mono text-xs text-ink-2">{r.request_number}</td>
                <td className="px-3 py-2">{r.complaint_type ?? "—"}</td>
                <td className="px-3 py-2 text-ink-2">{r.borough ?? "—"}</td>
                <td className="px-3 py-2 text-ink-2">{r.agency ?? "—"}</td>
                <td className="px-3 py-2"><PriorityBadge priority={r.priority} /></td>
                <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2 tabular-nums text-ink-2">{r.risk_score ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-right">
                  {!["closed", "resolved"].includes(r.status) && (
                    <button className="text-xs font-semibold text-brand hover:underline" onClick={() => close(r)}>Close</button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && !data?.items.length && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted">No matching requests</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span>
          {t("common.showing")} {total ? offset + 1 : 0}–{Math.min(offset + PAGE, total)} {t("common.of")} {fmt(total)}
        </span>
        <div className="flex gap-2">
          <button className="btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>{t("common.prev")}</button>
          <button className="btn-ghost" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>{t("common.next")}</button>
        </div>
      </div>
    </div>
  );
}

function Select({ value, onChange, options, label }: {
  value: string; onChange: (v: string) => void; options: string[]; label: string;
}) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o} value={o}>{o === "" ? `All ${label.toLowerCase()}` : o.replace(/_/g, " ")}</option>
      ))}
    </select>
  );
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ complaint_type: COMPLAINTS[0], borough: "BROOKLYN", priority: "medium", description: "" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.createRequest(form);
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs text-muted">Complaint type
        <select className="input mt-1 w-full" value={form.complaint_type}
          onChange={(e) => setForm({ ...form, complaint_type: e.target.value })}>
          {COMPLAINTS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label className="text-xs text-muted">Borough
        <select className="input mt-1 w-full" value={form.borough}
          onChange={(e) => setForm({ ...form, borough: e.target.value })}>
          {BOROUGHS.filter(Boolean).map((b) => <option key={b}>{b}</option>)}
        </select>
      </label>
      <label className="text-xs text-muted">Priority
        <select className="input mt-1 w-full" value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          {PRIORITIES.filter(Boolean).map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label className="text-xs text-muted">Description
        <input className="input mt-1 w-full" placeholder="Optional"
          value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>
      <div className="sm:col-span-2 lg:col-span-4">
        <button className="btn-brand" onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create request"}</button>
      </div>
    </div>
  );
}
