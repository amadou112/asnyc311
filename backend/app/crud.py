"""Query + aggregation layer.

Used by both the REST endpoints and the mock AI provider, so the assistant's
answers are backed by the same real SQL the dashboards use.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app import models
from app.constants import CLOSED_STATUSES, OPEN_STATUSES
from app.schemas import ServiceRequestCreate, ServiceRequestOut

_RES_HOURS = func.extract("epoch", models.ServiceRequest.closed_at - models.ServiceRequest.created_at) / 3600.0


# --------------------------------------------------------------------------- #
# Serialization
# --------------------------------------------------------------------------- #
def to_out(sr: models.ServiceRequest) -> ServiceRequestOut:
    return ServiceRequestOut(
        id=sr.id,
        request_number=sr.request_number,
        complaint_type=sr.complaint_type.name if sr.complaint_type else None,
        category=sr.complaint_type.category if sr.complaint_type else None,
        borough=sr.borough.name if sr.borough else None,
        agency=sr.agency.acronym if sr.agency else None,
        description=sr.description,
        status=sr.status,
        priority=sr.priority,
        channel=sr.channel,
        incident_zip=sr.incident_zip,
        latitude=sr.latitude,
        longitude=sr.longitude,
        created_at=sr.created_at,
        closed_at=sr.closed_at,
        sla_due_at=sr.sla_due_at,
        resolution_description=sr.resolution_description,
        risk_score=sr.risk_score,
        priority_score=sr.priority_score,
    )


def _with_relations():
    return (
        joinedload(models.ServiceRequest.complaint_type),
        joinedload(models.ServiceRequest.borough),
        joinedload(models.ServiceRequest.agency),
    )


# --------------------------------------------------------------------------- #
# Service requests: read
# --------------------------------------------------------------------------- #
def list_requests(
    db: Session,
    *,
    status: str | None = None,
    priority: str | None = None,
    borough: str | None = None,
    complaint_type: str | None = None,
    search: str | None = None,
    citizen_id: int | None = None,
    limit: int = 25,
    offset: int = 0,
) -> tuple[int, list[ServiceRequestOut]]:
    conditions = []
    if status:
        conditions.append(models.ServiceRequest.status == status)
    if priority:
        conditions.append(models.ServiceRequest.priority == priority)
    if citizen_id:
        conditions.append(models.ServiceRequest.citizen_id == citizen_id)
    if borough:
        conditions.append(models.Borough.name == borough.upper())
    if complaint_type:
        conditions.append(models.ComplaintType.name == complaint_type)
    if search:
        like = f"%{search}%"
        conditions.append(
            or_(
                models.ServiceRequest.description.ilike(like),
                models.ServiceRequest.request_number.ilike(like),
                models.ComplaintType.name.ilike(like),
            )
        )

    base = (
        select(models.ServiceRequest)
        .outerjoin(models.Borough, models.ServiceRequest.borough_id == models.Borough.id)
        .outerjoin(models.ComplaintType, models.ServiceRequest.complaint_type_id == models.ComplaintType.id)
    )
    if conditions:
        base = base.where(and_(*conditions))

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0

    rows = (
        db.execute(
            base.options(*_with_relations())
            .order_by(models.ServiceRequest.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        .unique()
        .scalars()
        .all()
    )
    return total, [to_out(r) for r in rows]


def get_request(db: Session, request_id: int) -> models.ServiceRequest | None:
    return db.execute(
        select(models.ServiceRequest)
        .options(*_with_relations())
        .where(models.ServiceRequest.id == request_id)
    ).unique().scalar_one_or_none()


# --------------------------------------------------------------------------- #
# Service requests: write
# --------------------------------------------------------------------------- #
def _next_request_number(db: Session) -> str:
    n = db.scalar(select(func.count()).select_from(models.ServiceRequest)) or 0
    year = datetime.now(timezone.utc).year
    return f"SR-{year}-{n + 1:08d}"


def _score(priority: str) -> tuple[float, float]:
    """Deterministic-ish risk/priority scores (0–100) for a new request."""
    base = {"low": 20, "medium": 45, "high": 70, "critical": 90}.get(priority, 45)
    jitter = random.Random(f"{priority}{base}").uniform(-8, 8)
    val = max(0.0, min(100.0, base + jitter))
    return round(val, 1), round(min(100.0, val + 5), 1)


def create_request(db: Session, payload: ServiceRequestCreate) -> models.ServiceRequest:
    borough = db.scalar(select(models.Borough).where(models.Borough.name == payload.borough.upper()))
    ctype = db.scalar(select(models.ComplaintType).where(models.ComplaintType.name == payload.complaint_type))
    agency_id = ctype.default_agency_id if ctype else None
    sla_hours = ctype.default_sla_hours if ctype else 72

    now = datetime.now(timezone.utc)
    risk, prio = _score(payload.priority)
    sr = models.ServiceRequest(
        request_number=_next_request_number(db),
        citizen_id=payload.citizen_id,
        complaint_type_id=ctype.id if ctype else None,
        agency_id=agency_id,
        borough_id=borough.id if borough else None,
        description=payload.description,
        status="new",
        priority=payload.priority,
        channel=payload.channel,
        incident_zip=payload.incident_zip,
        latitude=payload.latitude,
        longitude=payload.longitude,
        sla_due_at=now + timedelta(hours=sla_hours),
        risk_score=risk,
        priority_score=prio,
    )
    db.add(sr)
    db.flush()
    db.add(models.AuditLog(action="create", entity_type="service_request", entity_id=str(sr.id)))
    db.commit()
    return get_request(db, sr.id)


def update_request(db: Session, sr: models.ServiceRequest, changes: dict) -> models.ServiceRequest:
    for field, value in changes.items():
        if value is not None and hasattr(sr, field):
            setattr(sr, field, value)
    if changes.get("status") in CLOSED_STATUSES and sr.closed_at is None:
        sr.closed_at = datetime.now(timezone.utc)
    db.add(models.AuditLog(action="update", entity_type="service_request", entity_id=str(sr.id), details=changes))
    db.commit()
    return get_request(db, sr.id)


def close_request(db: Session, sr: models.ServiceRequest, resolution: str) -> models.ServiceRequest:
    sr.status = "closed"
    sr.closed_at = datetime.now(timezone.utc)
    sr.resolution_description = resolution
    db.add(models.AuditLog(action="close", entity_type="service_request", entity_id=str(sr.id)))
    db.commit()
    return get_request(db, sr.id)


# --------------------------------------------------------------------------- #
# Aggregations (dashboards + AI)
# --------------------------------------------------------------------------- #
def request_stats(db: Session) -> dict:
    by_status = db.execute(
        select(models.ServiceRequest.status, func.count()).group_by(models.ServiceRequest.status)
    ).all()
    by_priority = db.execute(
        select(models.ServiceRequest.priority, func.count()).group_by(models.ServiceRequest.priority)
    ).all()
    return {
        "by_status": [{"key": k, "count": c} for k, c in by_status],
        "by_priority": [{"key": k, "count": c} for k, c in by_priority],
    }


def dashboard_summary(db: Session) -> dict:
    total = db.scalar(select(func.count()).select_from(models.ServiceRequest)) or 0
    open_count = db.scalar(
        select(func.count()).where(models.ServiceRequest.status.in_(OPEN_STATUSES))
    ) or 0
    closed_count = db.scalar(
        select(func.count()).where(models.ServiceRequest.status.in_(CLOSED_STATUSES))
    ) or 0
    emergency = db.scalar(
        select(func.count())
        .select_from(models.ServiceRequest)
        .join(models.ComplaintType, models.ServiceRequest.complaint_type_id == models.ComplaintType.id)
        .where(models.ComplaintType.category == "Emergency")
    ) or 0
    avg_hours = db.scalar(
        select(func.avg(_RES_HOURS)).where(models.ServiceRequest.closed_at.isnot(None))
    )
    high_open = db.scalar(
        select(func.count()).where(
            and_(
                models.ServiceRequest.status.in_(OPEN_STATUSES),
                models.ServiceRequest.priority.in_(["high", "critical"]),
            )
        )
    ) or 0
    return {
        "total_requests": total,
        "open_requests": open_count,
        "closed_requests": closed_count,
        "emergency_requests": emergency,
        "avg_resolution_hours": round(float(avg_hours), 1) if avg_hours is not None else None,
        "resolution_rate": round(100.0 * closed_count / total, 1) if total else 0.0,
        "high_priority_open": high_open,
    }


def trends(db: Session, days: int = 30) -> list[dict]:
    day = func.date_trunc("day", models.ServiceRequest.created_at)
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.execute(
        select(day.label("d"), func.count())
        .where(models.ServiceRequest.created_at >= since)
        .group_by("d")
        .order_by("d")
    ).all()
    return [{"day": d.strftime("%Y-%m-%d"), "count": c} for d, c in rows]


def borough_stats(db: Session) -> list[dict]:
    rows = db.execute(
        select(
            models.Borough.name,
            func.count(models.ServiceRequest.id),
            func.count(models.ServiceRequest.id).filter(models.ServiceRequest.status.in_(OPEN_STATUSES)),
            func.avg(_RES_HOURS).filter(models.ServiceRequest.closed_at.isnot(None)),
        )
        .join(models.ServiceRequest, models.ServiceRequest.borough_id == models.Borough.id)
        .group_by(models.Borough.name)
        .order_by(func.count(models.ServiceRequest.id).desc())
    ).all()
    return [
        {
            "borough": name,
            "total": total,
            "open": open_,
            "avg_resolution_hours": round(float(avg), 1) if avg is not None else None,
        }
        for name, total, open_, avg in rows
    ]


def geo_points(db: Session, limit: int = 1000) -> list[dict]:
    rows = (
        db.execute(
            select(models.ServiceRequest)
            .options(*_with_relations())
            .where(
                and_(
                    models.ServiceRequest.latitude.isnot(None),
                    models.ServiceRequest.longitude.isnot(None),
                )
            )
            .order_by(models.ServiceRequest.created_at.desc())
            .limit(limit)
        )
        .unique()
        .scalars()
        .all()
    )
    return [
        {
            "latitude": r.latitude,
            "longitude": r.longitude,
            "complaint_type": r.complaint_type.name if r.complaint_type else None,
            "borough": r.borough.name if r.borough else None,
            "priority": r.priority,
            "status": r.status,
        }
        for r in rows
    ]


# --- AI-oriented aggregations -------------------------------------------------
def borough_resolution_ranking(db: Session) -> list[dict]:
    stats = borough_stats(db)
    ranked = [s for s in stats if s["avg_resolution_hours"] is not None]
    ranked.sort(key=lambda s: s["avg_resolution_hours"], reverse=True)
    return ranked


def top_complaints(db: Session, borough: str | None = None, limit: int = 10) -> list[dict]:
    q = (
        select(models.ComplaintType.name, func.count(models.ServiceRequest.id))
        .join(models.ServiceRequest, models.ServiceRequest.complaint_type_id == models.ComplaintType.id)
        .group_by(models.ComplaintType.name)
        .order_by(func.count(models.ServiceRequest.id).desc())
        .limit(limit)
    )
    if borough:
        q = q.join(models.Borough, models.ServiceRequest.borough_id == models.Borough.id).where(
            models.Borough.name == borough.upper()
        )
    return [{"complaint_type": n, "count": c} for n, c in db.execute(q).all()]


def aging_requests(db: Session, older_than_days: int = 30, limit: int = 50) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=older_than_days)
    rows = (
        db.execute(
            select(models.ServiceRequest)
            .options(*_with_relations())
            .where(
                and_(
                    models.ServiceRequest.status.in_(OPEN_STATUSES),
                    models.ServiceRequest.created_at < cutoff,
                )
            )
            .order_by(models.ServiceRequest.created_at.asc())
            .limit(limit)
        )
        .unique()
        .scalars()
        .all()
    )
    return [to_out(r).model_dump(mode="json") for r in rows]


def agency_performance(db: Session) -> list[dict]:
    rows = db.execute(
        select(
            models.Agency.acronym,
            func.count(models.ServiceRequest.id),
            func.count(models.ServiceRequest.id).filter(models.ServiceRequest.status.in_(OPEN_STATUSES)),
            func.avg(_RES_HOURS).filter(models.ServiceRequest.closed_at.isnot(None)),
        )
        .join(models.ServiceRequest, models.ServiceRequest.agency_id == models.Agency.id)
        .group_by(models.Agency.acronym)
        .order_by(func.count(models.ServiceRequest.id).desc())
    ).all()
    out = []
    for acr, total, open_, avg in rows:
        rate = round(100.0 * (total - open_) / total, 1) if total else 0.0
        out.append(
            {
                "agency": acr,
                "total": total,
                "open": open_,
                "closure_rate": rate,
                "avg_resolution_hours": round(float(avg), 1) if avg is not None else None,
            }
        )
    return out


def forecast_next_period(db: Session, days: int = 30) -> dict:
    """Naive but real forecast: mean daily volume over the trailing window,
    projected forward with a simple 7-day trend factor."""
    series = trends(db, days=days)
    counts = [p["count"] for p in series] or [0]
    avg = sum(counts) / len(counts)
    recent = counts[-7:] if len(counts) >= 7 else counts
    prior = counts[-14:-7] if len(counts) >= 14 else counts[:7] or [avg]
    trend = (sum(recent) / len(recent)) / (sum(prior) / len(prior)) if sum(prior) else 1.0
    projected_daily = avg * trend
    return {
        "window_days": days,
        "avg_daily": round(avg, 1),
        "trend_factor": round(trend, 3),
        "projected_daily": round(projected_daily, 1),
        "projected_next_30d": round(projected_daily * 30),
    }


def recommendations(db: Session, limit: int = 20) -> list[models.AIRecommendation]:
    return list(
        db.execute(
            select(models.AIRecommendation)
            .order_by(models.AIRecommendation.created_at.desc())
            .limit(limit)
        ).scalars().all()
    )


# --------------------------------------------------------------------------- #
# Citizens (+ request history)
# --------------------------------------------------------------------------- #
def list_citizens(
    db: Session, *, search: str | None = None, borough: str | None = None,
    limit: int = 25, offset: int = 0,
) -> tuple[int, list[dict]]:
    open_expr = func.count(models.ServiceRequest.id).filter(
        models.ServiceRequest.status.in_(OPEN_STATUSES)
    )
    base = (
        select(
            models.Citizen,
            models.Borough.name.label("borough"),
            func.count(models.ServiceRequest.id).label("req_count"),
            open_expr.label("open_count"),
        )
        .outerjoin(models.Borough, models.Citizen.borough_id == models.Borough.id)
        .outerjoin(models.ServiceRequest, models.ServiceRequest.citizen_id == models.Citizen.id)
        .group_by(models.Citizen.id, models.Borough.name)
    )
    conditions = []
    if borough:
        conditions.append(models.Borough.name == borough.upper())
    if search:
        like = f"%{search}%"
        conditions.append(
            or_(
                models.Citizen.first_name.ilike(like),
                models.Citizen.last_name.ilike(like),
                models.Citizen.email.ilike(like),
            )
        )
    if conditions:
        base = base.where(and_(*conditions))

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(
        base.order_by(func.count(models.ServiceRequest.id).desc()).limit(limit).offset(offset)
    ).all()
    items = [
        {
            "id": c.id, "first_name": c.first_name, "last_name": c.last_name,
            "email": c.email, "phone": c.phone, "borough": borough_name,
            "request_count": req_count, "open_count": open_count, "created_at": c.created_at,
        }
        for c, borough_name, req_count, open_count in rows
    ]
    return total, items


def get_citizen(db: Session, citizen_id: int) -> dict | None:
    c = db.get(models.Citizen, citizen_id)
    if not c:
        return None
    borough = db.get(models.Borough, c.borough_id) if c.borough_id else None
    total, _ = list_requests(db, citizen_id=citizen_id, limit=1)
    open_total = db.scalar(
        select(func.count()).where(
            and_(
                models.ServiceRequest.citizen_id == citizen_id,
                models.ServiceRequest.status.in_(OPEN_STATUSES),
            )
        )
    ) or 0
    return {
        "id": c.id, "first_name": c.first_name, "last_name": c.last_name,
        "email": c.email, "phone": c.phone,
        "borough": borough.name if borough else None,
        "request_count": total, "open_count": open_total, "created_at": c.created_at,
    }


# --------------------------------------------------------------------------- #
# Inspections
# --------------------------------------------------------------------------- #
def list_inspections(
    db: Session, *, status: str | None = None, violation: bool | None = None,
    limit: int = 25, offset: int = 0,
) -> tuple[int, list[dict]]:
    base = (
        select(models.Inspection, models.ServiceRequest, models.Inspector.full_name)
        .join(models.ServiceRequest, models.Inspection.service_request_id == models.ServiceRequest.id)
        .outerjoin(models.Inspector, models.Inspection.inspector_id == models.Inspector.id)
        .options(joinedload(models.ServiceRequest.complaint_type), joinedload(models.ServiceRequest.borough))
    )
    conditions = []
    if status:
        conditions.append(models.Inspection.status == status)
    if violation is not None:
        conditions.append(models.Inspection.violation_found == violation)
    if conditions:
        base = base.where(and_(*conditions))

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(
        base.order_by(models.Inspection.scheduled_at.desc().nullslast()).limit(limit).offset(offset)
    ).unique().all()
    items = [
        {
            "id": insp.id,
            "request_number": sr.request_number,
            "complaint_type": sr.complaint_type.name if sr.complaint_type else None,
            "borough": sr.borough.name if sr.borough else None,
            "inspector_name": inspector_name,
            "scheduled_at": insp.scheduled_at,
            "performed_at": insp.performed_at,
            "status": insp.status,
            "compliance_status": insp.compliance_status,
            "violation_found": insp.violation_found,
            "risk_score": insp.risk_score,
            "notes": insp.notes,
        }
        for insp, sr, inspector_name in rows
    ]
    return total, items


# --------------------------------------------------------------------------- #
# Administration
# --------------------------------------------------------------------------- #
def list_agencies(db: Session) -> list[dict]:
    open_expr = func.count(models.ServiceRequest.id).filter(
        models.ServiceRequest.status.in_(OPEN_STATUSES)
    )
    rows = db.execute(
        select(models.Agency, func.count(models.ServiceRequest.id), open_expr)
        .outerjoin(models.ServiceRequest, models.ServiceRequest.agency_id == models.Agency.id)
        .group_by(models.Agency.id)
        .order_by(func.count(models.ServiceRequest.id).desc())
    ).all()
    return [
        {"id": a.id, "acronym": a.acronym, "name": a.name, "request_count": rc, "open_count": oc}
        for a, rc, oc in rows
    ]


def list_users(db: Session, limit: int = 100) -> list[dict]:
    rows = db.execute(
        select(models.User, models.Role.name)
        .outerjoin(models.Role, models.User.role_id == models.Role.id)
        .order_by(models.User.id)
        .limit(limit)
    ).all()
    return [
        {
            "id": u.id, "email": u.email, "full_name": u.full_name, "role": role,
            "is_active": u.is_active, "mfa_enabled": u.mfa_enabled, "created_at": u.created_at,
        }
        for u, role in rows
    ]


def list_audit_logs(db: Session, limit: int = 50) -> list[models.AuditLog]:
    return list(
        db.execute(
            select(models.AuditLog).order_by(models.AuditLog.created_at.desc()).limit(limit)
        ).scalars().all()
    )


# --------------------------------------------------------------------------- #
# Reports
# --------------------------------------------------------------------------- #
def list_reports(db: Session, limit: int = 50) -> list[models.Report]:
    return list(
        db.execute(
            select(models.Report).order_by(models.Report.created_at.desc()).limit(limit)
        ).scalars().all()
    )


def generate_report(db: Session, kind: str = "executive") -> models.Report:
    s = dashboard_summary(db)
    top = top_complaints(db, limit=3)
    boroughs = borough_stats(db)
    lead_borough = boroughs[0]["borough"].title() if boroughs else "N/A"
    top_str = ", ".join(f"{t['complaint_type']} ({t['count']:,})" for t in top)
    now = datetime.now(timezone.utc)
    summary = (
        f"{kind.title()} report — {s['total_requests']:,} total requests, "
        f"{s['open_requests']:,} open ({s['resolution_rate']}% resolved). "
        f"Average resolution {s['avg_resolution_hours']}h; {s['high_priority_open']:,} high/critical open. "
        f"Highest-volume borough: {lead_borough}. Leading complaint types: {top_str}."
    )
    report = models.Report(
        kind=kind,
        title=f"{kind.title()} Report — {now.strftime('%b %d, %Y')}",
        period_start=now - timedelta(days=30),
        period_end=now,
        summary=summary,
        created_by="AI copilot (mock)",
    )
    db.add(report)
    db.add(models.AuditLog(action="generate", entity_type="report", entity_id=kind))
    db.commit()
    db.refresh(report)
    return report
