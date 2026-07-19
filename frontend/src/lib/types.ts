export interface DashboardSummary {
  total_requests: number;
  open_requests: number;
  closed_requests: number;
  emergency_requests: number;
  avg_resolution_hours: number | null;
  resolution_rate: number;
  high_priority_open: number;
}

export interface TrendPoint {
  day: string;
  count: number;
}

export interface BoroughStat {
  borough: string;
  total: number;
  open: number;
  avg_resolution_hours: number | null;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
  complaint_type: string | null;
  borough: string | null;
  priority: string;
  status: string;
}

export interface ServiceRequest {
  id: number;
  request_number: string;
  complaint_type: string | null;
  category: string | null;
  borough: string | null;
  agency: string | null;
  description: string | null;
  status: string;
  priority: string;
  channel: string;
  incident_zip: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  closed_at: string | null;
  sla_due_at: string | null;
  resolution_description: string | null;
  risk_score: number | null;
  priority_score: number | null;
}

export interface PaginatedRequests {
  total: number;
  limit: number;
  offset: number;
  items: ServiceRequest[];
}

export interface StatusCount {
  key: string;
  count: number;
}

export interface RequestStats {
  by_status: StatusCount[];
  by_priority: StatusCount[];
}

export interface AIAnswer {
  question: string;
  intent: string;
  answer: string;
  data: Record<string, unknown>[];
  provider: string;
  model: string;
  confidence: number;
}

export interface Recommendation {
  id: number;
  service_request_id: number | null;
  kind: string;
  content: string;
  confidence: number;
  model: string;
  created_at: string;
}

export interface Citizen {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  borough: string | null;
  request_count: number;
  open_count: number;
  created_at: string;
}

export interface PaginatedCitizens {
  total: number;
  limit: number;
  offset: number;
  items: Citizen[];
}

export interface CitizenDetail {
  citizen: Citizen;
  requests: ServiceRequest[];
}

export interface Inspection {
  id: number;
  request_number: string | null;
  complaint_type: string | null;
  borough: string | null;
  inspector_name: string | null;
  scheduled_at: string | null;
  performed_at: string | null;
  status: string;
  compliance_status: string | null;
  violation_found: boolean;
  risk_score: number | null;
  notes: string | null;
}

export interface PaginatedInspections {
  total: number;
  limit: number;
  offset: number;
  items: Inspection[];
}

export interface Agency {
  id: number;
  acronym: string;
  name: string;
  request_count: number;
  open_count: number;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string | null;
  is_active: boolean;
  mfa_enabled: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}

export interface Report {
  id: number;
  kind: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  summary: string | null;
  created_by: string | null;
  created_at: string;
}
