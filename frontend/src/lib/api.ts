import type {
  Agency,
  AIAnswer,
  AuditLog,
  BoroughStat,
  CitizenDetail,
  DashboardSummary,
  GeoPoint,
  PaginatedCitizens,
  PaginatedInspections,
  PaginatedRequests,
  Recommendation,
  Report,
  RequestStats,
  ServiceRequest,
  TrendPoint,
  User,
} from "./types";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8008/api/v1";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
}

export const api = {
  base: BASE,
  health: () => get<{ status: string; ai_provider: string; database: string }>("/health"),

  dashboardSummary: () => get<DashboardSummary>("/dashboard/summary"),
  trends: (days = 30) => get<TrendPoint[]>(`/dashboard/trends?days=${days}`),
  boroughs: () => get<BoroughStat[]>("/dashboard/boroughs"),
  geo: (limit = 1000) => get<GeoPoint[]>(`/dashboard/geo?limit=${limit}`),

  requests: (params: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") q.set(k, String(v));
    });
    return get<PaginatedRequests>(`/requests?${q.toString()}`);
  },
  requestStats: () => get<RequestStats>("/requests/stats/summary"),
  createRequest: (body: {
    complaint_type: string;
    borough: string;
    priority: string;
    description?: string;
    channel?: string;
  }) => send<ServiceRequest>("/requests", "POST", body),
  closeRequest: (id: number, resolution_description: string) =>
    send<ServiceRequest>(`/requests/${id}/close`, "POST", { resolution_description }),

  aiQuery: (question: string) => send<AIAnswer>("/ai/query", "POST", { question }),
  recommendations: (limit = 20) =>
    get<Recommendation[]>(`/ai/recommendations?limit=${limit}`),

  citizens: (params: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") q.set(k, String(v));
    });
    return get<PaginatedCitizens>(`/citizens?${q.toString()}`);
  },
  citizen: (id: number) => get<CitizenDetail>(`/citizens/${id}`),

  inspections: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") q.set(k, String(v));
    });
    return get<PaginatedInspections>(`/inspections?${q.toString()}`);
  },

  agencies: () => get<Agency[]>("/admin/agencies"),
  users: () => get<User[]>("/admin/users"),
  auditLogs: (limit = 50) => get<AuditLog[]>(`/admin/audit-logs?limit=${limit}`),

  reports: () => get<Report[]>("/reports"),
  generateReport: (kind = "executive") => send<Report>("/reports/generate", "POST", { kind }),
};
