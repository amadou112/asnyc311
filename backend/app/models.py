"""SQLAlchemy ORM models — the normalized `platform` schema.

Kept in a single module for the vertical slice; split per-domain as it grows.
Enumerated values are stored as short strings (no PG enum types) to keep
migrations frictionless. Canonical values live in `app.constants`.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# --------------------------------------------------------------------------- #
# RBAC / auth
# --------------------------------------------------------------------------- #
class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    users: Mapped[list["User"]] = relationship(back_populates="role")


class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    role_id: Mapped[int | None] = mapped_column(ForeignKey("roles.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    role: Mapped[Role | None] = relationship(back_populates="users")


# --------------------------------------------------------------------------- #
# Reference / dimension tables (seeded from real curated.requests values)
# --------------------------------------------------------------------------- #
class Borough(Base):
    __tablename__ = "boroughs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    population: Mapped[int | None] = mapped_column(Integer)
    area_sq_mi: Mapped[float | None] = mapped_column(Float)


class Agency(Base):
    __tablename__ = "agencies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    acronym: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)


class ComplaintType(Base):
    __tablename__ = "complaint_types"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(60), nullable=False, default="Other")
    default_agency_id: Mapped[int | None] = mapped_column(ForeignKey("agencies.id"))
    default_sla_hours: Mapped[int] = mapped_column(Integer, default=72, nullable=False)


# --------------------------------------------------------------------------- #
# People
# --------------------------------------------------------------------------- #
class Citizen(Base, TimestampMixin):
    __tablename__ = "citizens"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(40))
    borough_id: Mapped[int | None] = mapped_column(ForeignKey("boroughs.id"))
    borough: Mapped[Borough | None] = relationship()


class Inspector(Base, TimestampMixin):
    __tablename__ = "inspectors"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    badge_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    borough_id: Mapped[int | None] = mapped_column(ForeignKey("boroughs.id"))
    specialization: Mapped[str | None] = mapped_column(String(80))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    borough: Mapped[Borough | None] = relationship()


# --------------------------------------------------------------------------- #
# Core operational entity
# --------------------------------------------------------------------------- #
class ServiceRequest(Base):
    __tablename__ = "service_requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)

    citizen_id: Mapped[int | None] = mapped_column(ForeignKey("citizens.id"))
    complaint_type_id: Mapped[int | None] = mapped_column(ForeignKey("complaint_types.id"), index=True)
    agency_id: Mapped[int | None] = mapped_column(ForeignKey("agencies.id"))
    borough_id: Mapped[int | None] = mapped_column(ForeignKey("boroughs.id"), index=True)

    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="new", nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium", nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(30), default="ONLINE", nullable=False)

    incident_zip: Mapped[str | None] = mapped_column(String(10))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sla_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolution_description: Mapped[str | None] = mapped_column(Text)

    # AI-derived scores (0–100)
    risk_score: Mapped[float | None] = mapped_column(Float)
    priority_score: Mapped[float | None] = mapped_column(Float)

    citizen: Mapped[Citizen | None] = relationship()
    complaint_type: Mapped[ComplaintType | None] = relationship()
    agency: Mapped[Agency | None] = relationship()
    borough: Mapped[Borough | None] = relationship()
    inspections: Mapped[list["Inspection"]] = relationship(back_populates="service_request")


class Inspection(Base):
    __tablename__ = "inspections"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    service_request_id: Mapped[int] = mapped_column(
        ForeignKey("service_requests.id"), nullable=False, index=True
    )
    inspector_id: Mapped[int | None] = mapped_column(ForeignKey("inspectors.id"))
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    performed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), default="scheduled", nullable=False)
    outcome: Mapped[str | None] = mapped_column(String(60))
    compliance_status: Mapped[str | None] = mapped_column(String(30))
    violation_found: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    risk_score: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)
    recommendations: Mapped[str | None] = mapped_column(Text)
    service_request: Mapped[ServiceRequest] = relationship(back_populates="inspections")
    inspector: Mapped[Inspector | None] = relationship()


# --------------------------------------------------------------------------- #
# AI, comms, reporting, audit
# --------------------------------------------------------------------------- #
class AIRecommendation(Base, TimestampMixin):
    __tablename__ = "ai_recommendations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    service_request_id: Mapped[int | None] = mapped_column(ForeignKey("service_requests.id"))
    kind: Mapped[str] = mapped_column(String(40), nullable=False)  # triage|risk|resolution|forecast
    content: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    model: Mapped[str] = mapped_column(String(60), default="mock-1", nullable=False)


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    citizen_id: Mapped[int | None] = mapped_column(ForeignKey("citizens.id"))
    service_request_id: Mapped[int | None] = mapped_column(ForeignKey("service_requests.id"))
    channel: Mapped[str] = mapped_column(String(20), default="email", nullable=False)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str | None] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Report(Base, TimestampMixin):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(40), nullable=False)  # weekly|monthly|executive|compliance
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    summary: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(String(120))


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor: Mapped[str] = mapped_column(String(120), default="system", nullable=False)
    action: Mapped[str] = mapped_column(String(60), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(60), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(60))
    details: Mapped[dict | None] = mapped_column(JSONB)
