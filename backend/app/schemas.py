"""Pydantic v2 request/response schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# --------------------------------------------------------------------------- #
# Service requests
# --------------------------------------------------------------------------- #
class ServiceRequestCreate(BaseModel):
    complaint_type: str = Field(..., examples=["Noise - Residential"])
    borough: str = Field(..., examples=["BROOKLYN"])
    description: str | None = None
    priority: str = "medium"
    channel: str = "ONLINE"
    incident_zip: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    citizen_id: int | None = None


class ServiceRequestUpdate(BaseModel):
    status: str | None = None
    priority: str | None = None
    description: str | None = None
    agency_id: int | None = None
    resolution_description: str | None = None


class ServiceRequestClose(BaseModel):
    resolution_description: str = Field(..., examples=["Inspected; no violation found."])


class ServiceRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_number: str
    complaint_type: str | None = None
    category: str | None = None
    borough: str | None = None
    agency: str | None = None
    description: str | None = None
    status: str
    priority: str
    channel: str
    incident_zip: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    created_at: datetime
    closed_at: datetime | None = None
    sla_due_at: datetime | None = None
    resolution_description: str | None = None
    risk_score: float | None = None
    priority_score: float | None = None


class PaginatedRequests(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[ServiceRequestOut]


class StatusCount(BaseModel):
    key: str
    count: int


class RequestStats(BaseModel):
    by_status: list[StatusCount]
    by_priority: list[StatusCount]


# --------------------------------------------------------------------------- #
# Dashboard
# --------------------------------------------------------------------------- #
class DashboardSummary(BaseModel):
    total_requests: int
    open_requests: int
    closed_requests: int
    emergency_requests: int
    avg_resolution_hours: float | None
    resolution_rate: float  # % closed
    high_priority_open: int


class TrendPoint(BaseModel):
    day: str
    count: int


class BoroughStat(BaseModel):
    borough: str
    total: int
    open: int
    avg_resolution_hours: float | None


class GeoPoint(BaseModel):
    latitude: float
    longitude: float
    complaint_type: str | None = None
    borough: str | None = None
    priority: str
    status: str


# --------------------------------------------------------------------------- #
# AI
# --------------------------------------------------------------------------- #
class AIQuery(BaseModel):
    question: str = Field(..., examples=["Which borough has the highest resolution time?"])


class AIAnswer(BaseModel):
    question: str
    intent: str
    answer: str
    data: list[dict] = []
    provider: str
    model: str
    confidence: float


class RecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_request_id: int | None
    kind: str
    content: str
    confidence: float
    model: str
    created_at: datetime


# --------------------------------------------------------------------------- #
# Citizens (+ request history)
# --------------------------------------------------------------------------- #
class CitizenOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str | None = None
    phone: str | None = None
    borough: str | None = None
    request_count: int = 0
    open_count: int = 0
    created_at: datetime


class PaginatedCitizens(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[CitizenOut]


class CitizenDetail(BaseModel):
    citizen: CitizenOut
    requests: list[ServiceRequestOut]


# --------------------------------------------------------------------------- #
# Inspections
# --------------------------------------------------------------------------- #
class InspectionOut(BaseModel):
    id: int
    request_number: str | None = None
    complaint_type: str | None = None
    borough: str | None = None
    inspector_name: str | None = None
    scheduled_at: datetime | None = None
    performed_at: datetime | None = None
    status: str
    compliance_status: str | None = None
    violation_found: bool
    risk_score: float | None = None
    notes: str | None = None


class PaginatedInspections(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[InspectionOut]


# --------------------------------------------------------------------------- #
# Administration (agencies, users, audit logs)
# --------------------------------------------------------------------------- #
class AgencyOut(BaseModel):
    id: int
    acronym: str
    name: str
    request_count: int = 0
    open_count: int = 0


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str | None = None
    is_active: bool
    mfa_enabled: bool
    created_at: datetime


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor: str
    action: str
    entity_type: str
    entity_id: str | None
    created_at: datetime


# --------------------------------------------------------------------------- #
# Reports
# --------------------------------------------------------------------------- #
class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    title: str
    period_start: datetime | None
    period_end: datetime | None
    summary: str | None
    created_by: str | None
    created_at: datetime


class ReportGenerate(BaseModel):
    kind: str = "executive"  # executive | weekly | monthly | compliance
