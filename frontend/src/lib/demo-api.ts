// Client-side "demo mode" data layer. Activated when no backend URL is configured
// (e.g. the Vercel deploy). It serves a snapshot of real seeded data and reproduces
// the grounded-AI behaviour in TypeScript, so the site works fully standalone.
import raw from "./demo-data.json";
import type {
  AIAnswer, Agency, AuditLog, BoroughStat, CitizenDetail, DashboardSummary,
  GeoPoint, PaginatedCitizens, PaginatedInspections, PaginatedRequests,
  Recommendation, Report, RequestStats, ServiceRequest, TrendPoint, User,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const data = raw as any;
const OPEN = new Set(["new", "triaged", "in_progress", "pending_inspection", "reopened"]);

// Mutable copies so create/close/generate appear during the session.
let requests: ServiceRequest[] = [...data.requests];
let reports: Report[] = [...data.reports];

const wait = <T>(v: T) => Promise.resolve(v);
const paginate = <T>(items: T[], limit: number, offset: number) => ({
  total: items.length, limit, offset, items: items.slice(offset, offset + limit),
});

// ---- AI (grounded, ported from the backend mock provider) ------------------
const BOROUGHS = ["MANHATTAN", "BRONX", "BROOKLYN", "QUEENS", "STATEN ISLAND"];

function detectBorough(q: string): string | null {
  const up = q.toUpperCase();
  return BOROUGHS.find((b) => up.includes(b) || up.replace(/ /g, "").includes(b.replace(/ /g, ""))) ?? null;
}

function classify(q: string): string {
  const s = q.toLowerCase();
  if (/forecast|predict|next (month|quarter|week)|projection|volume/.test(s)) return "forecast";
  if (/older than|unresolved|aging|overdue|\d+\s*days/.test(s)) return "aging";
  if (/agency|agencies|underperform|performance/.test(s)) return "agency";
  if (/resolution time|resolve|slowest|fastest|highest.*(time|resolution)/.test(s)) return "resolution";
  if (/executive|summary|report|overview|brief/.test(s)) return "executive";
  if (/trend|over time|daily|per day/.test(s)) return "trend";
  if (detectBorough(s) || /complaint|request|show me/.test(s)) return "borough_complaints";
  return "overview";
}

function topComplaints(borough: string | null, limit: number) {
  const counts: Record<string, number> = {};
  for (const r of requests) {
    if (borough && r.borough !== borough) continue;
    if (!r.complaint_type) continue;
    counts[r.complaint_type] = (counts[r.complaint_type] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([complaint_type, count]) => ({ complaint_type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function agencyPerformance() {
  return (data.agencies as Agency[]).map((a) => ({
    agency: a.acronym,
    total: a.request_count,
    open: a.open_count,
    closure_rate: a.request_count ? Math.round((1000 * (a.request_count - a.open_count)) / a.request_count) / 10 : 0,
  }));
}

function forecast() {
  const counts = (data.trends90 as TrendPoint[]).map((p) => p.count);
  const avg = counts.reduce((s, c) => s + c, 0) / (counts.length || 1);
  const recent = counts.slice(-7);
  const prior = counts.slice(-14, -7);
  const rA = recent.reduce((s, c) => s + c, 0) / (recent.length || 1);
  const pA = prior.reduce((s, c) => s + c, 0) / (prior.length || 1);
  const trend = pA ? rA / pA : 1;
  const projectedDaily = avg * trend;
  return {
    window_days: 90, avg_daily: Math.round(avg * 10) / 10,
    trend_factor: Math.round(trend * 1000) / 1000,
    projected_daily: Math.round(projectedDaily * 10) / 10,
    projected_next_30d: Math.round(projectedDaily * 30),
  };
}

function aiAnswer(question: string): AIAnswer {
  const intent = classify(question);
  const borough = detectBorough(question);
  const base = { question, provider: "mock", model: "mock-1 (demo)" };

  if (intent === "resolution") {
    const ranked = [...(data.boroughs as BoroughStat[])]
      .filter((b) => b.avg_resolution_hours != null)
      .sort((a, b) => (b.avg_resolution_hours! - a.avg_resolution_hours!));
    const top = ranked[0], tail = ranked[ranked.length - 1];
    return { ...base, intent, confidence: 0.9, data: ranked as any,
      answer: top ? `${cap(top.borough)} has the highest average resolution time at ${top.avg_resolution_hours}h, while ${cap(tail.borough)} is fastest at ${tail.avg_resolution_hours}h.` : "No data." };
  }
  if (intent === "forecast") {
    const f = forecast();
    const dir = f.trend_factor > 1 ? "up" : f.trend_factor < 1 ? "down" : "flat";
    return { ...base, intent, confidence: 0.72, data: [f] as any,
      answer: `Projected ~${f.projected_next_30d.toLocaleString()} requests over the next 30 days (~${f.projected_daily}/day), trending ${dir} (factor ${f.trend_factor}).` };
  }
  if (intent === "aging") {
    const m = question.match(/(\d+)\s*days/);
    const days = m ? parseInt(m[1]) : 30;
    const cutoff = Date.now() - days * 864e5;
    const aging = requests.filter((r) => OPEN.has(r.status) && new Date(r.created_at).getTime() < cutoff);
    return { ...base, intent, confidence: 0.95, data: aging as any,
      answer: `There are ${aging.length} open requests older than ${days} days in view. The oldest appear first for triage.` };
  }
  if (intent === "agency") {
    const rows = agencyPerformance();
    const worst = rows.reduce((a, b) => (a.closure_rate < b.closure_rate ? a : b));
    const best = rows.reduce((a, b) => (a.closure_rate > b.closure_rate ? a : b));
    return { ...base, intent, confidence: 0.88, data: rows as any,
      answer: `${worst.agency} is the most underperforming agency (${worst.closure_rate}% closure rate), versus ${best.agency} leading at ${best.closure_rate}%.` };
  }
  if (intent === "executive") {
    const s = data.summary as DashboardSummary;
    return { ...base, intent, confidence: 0.9, data: [s, { top_complaints: topComplaints(null, 5) }] as any,
      answer: `Executive brief: ${s.total_requests.toLocaleString()} total requests, ${s.open_requests.toLocaleString()} open (${s.resolution_rate}% resolved). Average resolution ${s.avg_resolution_hours}h; ${s.high_priority_open.toLocaleString()} high/critical still open.` };
  }
  if (intent === "trend") {
    const t = (data.trends90 as TrendPoint[]).slice(-30);
    return { ...base, intent, confidence: 0.85, data: t as any,
      answer: `Daily complaint volume for the last ${t.length} days is in the data payload.` };
  }
  if (intent === "borough_complaints") {
    const rows = topComplaints(borough, 10);
    return { ...base, intent, confidence: 0.9, data: rows as any,
      answer: rows.length ? `The top complaint type${borough ? ` in ${cap(borough)}` : ""} is '${rows[0].complaint_type}' (${rows[0].count.toLocaleString()} requests). Full ranking in the data payload.` : "No data." };
  }
  const s = data.summary as DashboardSummary;
  return { ...base, intent: "overview", confidence: 0.8, data: [s] as any,
    answer: `${s.total_requests.toLocaleString()} total requests, ${s.open_requests.toLocaleString()} currently open.` };
}

const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

// ---- API surface (mirrors lib/api.ts) --------------------------------------
export const demoApi = {
  base: "demo",
  health: () => wait({ status: "ok", ai_provider: "mock (demo)", database: "snapshot" }),

  dashboardSummary: () => wait(data.summary as DashboardSummary),
  trends: (days = 30) => wait((data.trends90 as TrendPoint[]).slice(-days)),
  boroughs: () => wait(data.boroughs as BoroughStat[]),
  geo: (limit = 1000) => wait((data.geo as GeoPoint[]).slice(0, limit)),

  requests: (params: Record<string, any> = {}): Promise<PaginatedRequests> => {
    const { status, priority, borough, search, limit = 25, offset = 0 } = params;
    let items = requests;
    if (status) items = items.filter((r) => r.status === status);
    if (priority) items = items.filter((r) => r.priority === priority);
    if (borough) items = items.filter((r) => r.borough === borough);
    if (search) {
      const q = String(search).toLowerCase();
      items = items.filter((r) =>
        (r.description ?? "").toLowerCase().includes(q) ||
        r.request_number.toLowerCase().includes(q) ||
        (r.complaint_type ?? "").toLowerCase().includes(q));
    }
    return wait(paginate(items, limit, offset));
  },
  requestStats: () => wait(data.requestStats as RequestStats),

  createRequest: (body: any): Promise<ServiceRequest> => {
    const now = new Date().toISOString();
    const sr: ServiceRequest = {
      id: 900000 + requests.length,
      request_number: `SR-2026-${String(90000000 + requests.length)}`,
      complaint_type: body.complaint_type, category: null, borough: body.borough,
      agency: "NYPD", description: body.description ?? null, status: "new",
      priority: body.priority ?? "medium", channel: body.channel ?? "ONLINE",
      incident_zip: null, latitude: null, longitude: null, created_at: now,
      closed_at: null, sla_due_at: null, resolution_description: null,
      risk_score: 60, priority_score: 65,
    };
    requests = [sr, ...requests];
    return wait(sr);
  },
  closeRequest: (id: number, resolution: string): Promise<ServiceRequest> => {
    requests = requests.map((r) =>
      r.id === id ? { ...r, status: "closed", closed_at: new Date().toISOString(), resolution_description: resolution } : r);
    return wait(requests.find((r) => r.id === id)!);
  },

  aiQuery: (question: string) => wait(aiAnswer(question)),
  recommendations: (limit = 20) => wait((data.recommendations as Recommendation[]).slice(0, limit)),

  citizens: (params: Record<string, any> = {}): Promise<PaginatedCitizens> => {
    const { search, borough, limit = 25, offset = 0 } = params;
    let items = data.citizens as any[];
    if (borough) items = items.filter((c) => c.borough === borough);
    if (search) {
      const q = String(search).toLowerCase();
      items = items.filter((c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q));
    }
    return wait(paginate(items, limit, offset));
  },
  citizen: (id: number) => wait(data.citizenDetails[String(id)] as CitizenDetail),

  inspections: (params: Record<string, any> = {}): Promise<PaginatedInspections> => {
    const { status, violation, limit = 25, offset = 0 } = params;
    let items = data.inspections as any[];
    if (status) items = items.filter((i) => i.status === status);
    if (violation !== undefined) items = items.filter((i) => String(i.violation_found) === String(violation));
    return wait(paginate(items, limit, offset));
  },

  agencies: () => wait(data.agencies as Agency[]),
  users: () => wait(data.users as User[]),
  auditLogs: (limit = 50) => wait((data.auditLogs as AuditLog[]).slice(0, limit)),

  reports: () => wait(reports),
  generateReport: (kind = "executive"): Promise<Report> => {
    const s = data.summary as DashboardSummary;
    const now = new Date();
    const top = topComplaints(null, 3).map((t) => `${t.complaint_type} (${t.count.toLocaleString()})`).join(", ");
    const rep: Report = {
      id: 90000 + reports.length, kind,
      title: `${cap(kind)} Report — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      period_start: null, period_end: now.toISOString(),
      summary: `${cap(kind)} report — ${s.total_requests.toLocaleString()} total requests, ${s.open_requests.toLocaleString()} open (${s.resolution_rate}% resolved). Average resolution ${s.avg_resolution_hours}h. Leading complaint types: ${top}.`,
      created_by: "AI copilot (demo)", created_at: now.toISOString(),
    };
    reports = [rep, ...reports];
    return wait(rep);
  },
};
