"""Synthetic data generator for the `platform` schema.

Strategy:
  * Reference dims (boroughs, agencies, complaint types) are derived from the REAL
    60k+ rows in `curated.requests` produced by the existing 311 pipeline, so the
    taxonomy and agency mapping are authentic.
  * Service requests are bootstrapped from real curated rows (real geo, dates,
    complaint mix) and, past the available count, topped up synthetically — so the
    generator scales to millions with `--requests`.
  * Citizens / inspectors / recommendations are fabricated with Faker.

Usage:
    python -m app.seed --requests 5000
    python -m app.seed --requests 2000000 --batch 20000     # scale test
    python -m app.seed --reset --requests 5000              # wipe platform data first
"""
from __future__ import annotations

import argparse
import random
from datetime import datetime, timedelta, timezone

from faker import Faker
from sqlalchemy import func, select, text

from app import models
from app.constants import (
    BOROUGH_FACTS,
    CHANNELS,
    COMPLAINT_CATEGORIES,
    COMPLIANCE_STATUSES,
    PRIORITIES,
    RBAC_ROLES,
)
from app.db import Base, SessionLocal, engine, ensure_schema

fake = Faker()
rng = random.Random(311)

_SLA_BY_CATEGORY = {
    "Emergency": 4, "Water": 24, "Housing": 48, "Utilities": 72,
    "Sanitation": 72, "Transportation": 96, "Noise": 120, "Parking": 120, "Other": 96,
}
_STATUS_MAP = {
    "closed": "closed", "resolved": "resolved", "open": "new", "assigned": "triaged",
    "in progress": "in_progress", "pending": "pending_inspection", "started": "in_progress",
}


def _reset(db) -> None:
    print("  resetting platform tables …")
    Base.metadata.drop_all(engine)


def _create_schema() -> None:
    ensure_schema()
    Base.metadata.create_all(engine)


# --------------------------------------------------------------------------- #
# Reference dimensions from curated.requests
# --------------------------------------------------------------------------- #
def _seed_roles(db) -> None:
    existing = {r.name for r in db.execute(select(models.Role)).scalars()}
    for name, desc in RBAC_ROLES:
        if name not in existing:
            db.add(models.Role(name=name, description=desc))
    db.commit()


def _seed_boroughs(db) -> dict[str, int]:
    ids: dict[str, int] = {}
    for name, (pop, area) in BOROUGH_FACTS.items():
        b = db.scalar(select(models.Borough).where(models.Borough.name == name))
        if not b:
            b = models.Borough(name=name, population=pop, area_sq_mi=area)
            db.add(b)
            db.flush()
        ids[name] = b.id
    db.commit()
    return ids


def _seed_agencies(db) -> dict[str, int]:
    rows = db.execute(
        text(
            "SELECT DISTINCT agency, agency_name FROM curated.requests "
            "WHERE agency IS NOT NULL AND agency <> '' LIMIT 100"
        )
    ).all()
    if not rows:  # pipeline data absent → minimal fallback
        rows = [("NYPD", "Police Department"), ("HPD", "Housing Preservation"),
                ("DOT", "Transportation"), ("DSNY", "Sanitation"), ("DEP", "Environmental Protection")]
    ids: dict[str, int] = {}
    for acr, name in rows:
        acr = (acr or "UNK")[:30]
        a = db.scalar(select(models.Agency).where(models.Agency.acronym == acr))
        if not a:
            a = models.Agency(acronym=acr, name=(name or acr)[:160])
            db.add(a)
            db.flush()
        ids[acr] = a.id
    db.commit()
    return ids


def _seed_complaint_types(db, agency_ids: dict[str, int]) -> dict[str, int]:
    # modal agency per complaint type from real data
    modal = db.execute(
        text(
            """
            SELECT complaint_type, agency
            FROM (
              SELECT complaint_type, agency,
                     ROW_NUMBER() OVER (PARTITION BY complaint_type ORDER BY COUNT(*) DESC) rn
              FROM curated.requests
              WHERE complaint_type IS NOT NULL
              GROUP BY complaint_type, agency
            ) t WHERE rn = 1
            """
        )
    ).all()
    modal_agency = {ct: ag for ct, ag in modal}

    types = [r[0] for r in db.execute(
        text("SELECT DISTINCT complaint_type FROM curated.requests WHERE complaint_type IS NOT NULL LIMIT 400")
    ).all()]
    if not types:
        types = list(COMPLAINT_CATEGORIES.keys())

    ids: dict[str, int] = {}
    for name in types:
        name = name[:120]
        ct = db.scalar(select(models.ComplaintType).where(models.ComplaintType.name == name))
        if not ct:
            category = COMPLAINT_CATEGORIES.get(name, "Other")
            ct = models.ComplaintType(
                name=name,
                category=category,
                default_agency_id=agency_ids.get(modal_agency.get(name)),
                default_sla_hours=_SLA_BY_CATEGORY.get(category, 96),
            )
            db.add(ct)
            db.flush()
        ids[name] = ct.id
    db.commit()
    return ids


def _seed_people(db, borough_ids: dict[str, int], n_citizens: int) -> list[int]:
    have = db.scalar(select(func.count()).select_from(models.Citizen)) or 0
    borough_list = list(borough_ids.values())
    if have < n_citizens:
        batch = []
        for _ in range(n_citizens - have):
            batch.append(
                dict(
                    first_name=fake.first_name(),
                    last_name=fake.last_name(),
                    email=fake.email(),
                    phone=fake.numerify("###-###-####"),
                    borough_id=rng.choice(borough_list),
                    created_at=datetime.now(timezone.utc),
                )
            )
        db.bulk_insert_mappings(models.Citizen, batch)
        db.commit()

    if not db.scalar(select(func.count()).select_from(models.Inspector)):
        specs = ["Housing", "Sanitation", "Noise", "Water", "Transportation", "Emergency"]
        insp = [
            dict(
                full_name=fake.name(),
                badge_number=f"NYC{10000 + i}",
                borough_id=rng.choice(borough_list),
                specialization=rng.choice(specs),
                created_at=datetime.now(timezone.utc),
            )
            for i in range(60)
        ]
        db.bulk_insert_mappings(models.Inspector, insp)
        db.commit()

    return list(db.execute(select(models.Citizen.id)).scalars().all())


# --------------------------------------------------------------------------- #
# Service requests
# --------------------------------------------------------------------------- #
def _priority_for(category: str) -> str:
    weights = {
        "Emergency": [("critical", 6), ("high", 3), ("medium", 1)],
        "Water": [("high", 4), ("medium", 4), ("low", 2)],
        "Housing": [("high", 3), ("medium", 5), ("low", 2)],
    }.get(category, [("medium", 5), ("low", 3), ("high", 2)])
    pool = [p for p, w in weights for _ in range(w)]
    return rng.choice(pool)


def _score(priority: str) -> tuple[float, float]:
    base = {"low": 20, "medium": 45, "high": 70, "critical": 90}[priority]
    val = max(0.0, min(100.0, base + rng.uniform(-8, 8)))
    return round(val, 1), round(min(100.0, val + 5), 1)


def _synth_timeline(now: datetime, priority: str) -> tuple[datetime, str, datetime | None]:
    """Synthesize a *current* operational timeline (created within the last ~120
    days, realistic status mix, priority-dependent resolution time). Keeps the
    dashboard/trends alive with a healthy open backlog while the complaint mix and
    geography still come from real curated data."""
    age_days = min(119, int(abs(rng.gauss(0, 38))))
    created = now - timedelta(days=age_days, hours=rng.randint(0, 23), minutes=rng.randint(0, 59))
    r = rng.random()
    if r < 0.60:
        status = "closed"
    elif r < 0.68:
        status = "resolved"
    elif r < 0.80:
        status = "in_progress"
    elif r < 0.88:
        status = "pending_inspection"
    elif r < 0.95:
        status = "triaged"
    else:
        status = "new"
    closed_at = None
    if status in ("closed", "resolved"):
        lo, hi = {"critical": (1, 12), "high": (2, 48), "medium": (6, 120), "low": (12, 300)}[priority]
        closed_at = min(now, created + timedelta(hours=rng.uniform(lo, hi)))
    return created, status, closed_at


def _seed_requests(db, *, target: int, batch_size: int,
                   borough_ids, agency_ids, ctype_ids, citizen_ids) -> int:
    start_count = db.scalar(select(func.count()).select_from(models.ServiceRequest)) or 0
    now = datetime.now(timezone.utc)
    year = now.year
    ctype_by_id = {v: k for k, v in ctype_ids.items()}
    ctype_meta = {
        c.id: (c.category, c.default_agency_id, c.default_sla_hours)
        for c in db.execute(select(models.ComplaintType)).scalars()
    }
    ctype_id_list = list(ctype_ids.values())
    borough_name_to_id = borough_ids
    agency_id_list = list(agency_ids.values())

    curated_total = db.scalar(text("SELECT count(*) FROM curated.requests")) or 0
    made = 0
    offset = 0
    seq = start_count

    while made < target:
        n = min(batch_size, target - made)
        rows = []
        if curated_total and offset < curated_total:
            rows = db.execute(
                text(
                    """
                    SELECT created_date, closed_date, agency, complaint_type,
                           borough, incident_zip, latitude, longitude, status
                    FROM curated.requests
                    ORDER BY created_date
                    LIMIT :lim OFFSET :off
                    """
                ),
                {"lim": n, "off": offset},
            ).all()
            offset += n

        batch = []
        for i in range(n):
            seq += 1
            if rows and i < len(rows):
                # Real dimensional + geographic mix from curated.requests …
                _cd, _closed, agency, complaint, borough, zip_, lat, lon, _status = rows[i]
                ct_id = ctype_ids.get((complaint or "")[:120])
                b_id = borough_name_to_id.get((borough or "").upper())
                a_id = agency_ids.get((agency or "")[:30])
            else:  # synthetic top-up beyond curated volume
                ct_id = rng.choice(ctype_id_list)
                b_id = rng.choice(list(borough_name_to_id.values()))
                a_id = rng.choice(agency_id_list)
                zip_, lat, lon = None, None, None

            category, def_agency, sla = ctype_meta.get(ct_id, ("Other", a_id, 96))
            priority = _priority_for(category)
            # … but a *current* operational timeline so dashboards read as live ops.
            created, mapped, closed_at = _synth_timeline(now, priority)
            risk, pscore = _score(priority)
            batch.append(
                dict(
                    request_number=f"SR-{year}-{seq:08d}",
                    citizen_id=rng.choice(citizen_ids) if citizen_ids else None,
                    complaint_type_id=ct_id,
                    agency_id=a_id or def_agency,
                    borough_id=b_id,
                    description=None,
                    status=mapped,
                    priority=priority,
                    channel=rng.choice(CHANNELS),
                    incident_zip=(zip_ or None),
                    latitude=lat,
                    longitude=lon,
                    created_at=created,
                    closed_at=closed_at,
                    sla_due_at=(created + timedelta(hours=sla)) if created else None,
                    resolution_description=("Resolved by responding agency." if closed_at else None),
                    risk_score=risk,
                    priority_score=pscore,
                )
            )
        db.bulk_insert_mappings(models.ServiceRequest, batch)
        db.commit()
        made += n
        print(f"  requests: {made:,}/{target:,}", end="\r")
    print()
    return made


def _seed_ai_and_inspections(db) -> None:
    """Attach a few inspections + AI recommendations to high-risk open requests."""
    if db.scalar(select(func.count()).select_from(models.AIRecommendation)):
        return
    high = db.execute(
        select(models.ServiceRequest)
        .where(models.ServiceRequest.priority.in_(["high", "critical"]))
        .order_by(models.ServiceRequest.risk_score.desc())
        .limit(200)
    ).scalars().all()
    inspector_ids = list(db.execute(select(models.Inspector.id)).scalars().all())
    recs, insps = [], []
    for sr in high:
        recs.append(
            dict(
                service_request_id=sr.id,
                kind="triage",
                content=(f"High risk ({sr.risk_score}). Recommend expedited dispatch and "
                         f"SLA monitoring; likely violation category based on complaint type."),
                confidence=round(rng.uniform(0.6, 0.95), 2),
                model="mock-1",
                created_at=datetime.now(timezone.utc),
            )
        )
        if inspector_ids and rng.random() < 0.4:
            insps.append(
                dict(
                    service_request_id=sr.id,
                    inspector_id=rng.choice(inspector_ids),
                    scheduled_at=sr.created_at + timedelta(days=rng.randint(1, 5)),
                    status="scheduled",
                    compliance_status=rng.choice(COMPLIANCE_STATUSES),
                    violation_found=rng.random() < 0.35,
                    risk_score=sr.risk_score,
                    notes="Auto-scheduled from risk queue.",
                )
            )
    db.bulk_insert_mappings(models.AIRecommendation, recs)
    if insps:
        db.bulk_insert_mappings(models.Inspection, insps)
    db.commit()
    print(f"  ai recommendations: {len(recs)} · inspections: {len(insps)}")


def _seed_users(db) -> None:
    if db.scalar(select(func.count()).select_from(models.User)):
        return
    roles = {r.name: r.id for r in db.execute(select(models.Role)).scalars()}
    # A realistic staffing mix across the RBAC roles.
    plan = [
        ("executive", 2), ("agency_manager", 4), ("supervisor", 5),
        ("inspector", 8), ("administrator", 2), ("citizen", 3),
    ]
    users = []
    for role_name, n in plan:
        for _ in range(n):
            name = fake.name()
            handle = name.lower().replace(" ", ".").replace("'", "")
            users.append(
                dict(
                    email=f"{handle}@nyc.gov",
                    full_name=name,
                    hashed_password="",  # auth enforcement is a later phase
                    role_id=roles.get(role_name),
                    is_active=rng.random() > 0.1,
                    mfa_enabled=role_name in ("executive", "administrator", "agency_manager") or rng.random() < 0.3,
                    created_at=datetime.now(timezone.utc) - timedelta(days=rng.randint(30, 400)),
                )
            )
    db.bulk_insert_mappings(models.User, users)
    db.commit()
    print(f"  users: {len(users)}")


def _seed_audit_logs(db) -> None:
    if db.scalar(select(func.count()).select_from(models.AuditLog)) > 5:
        return
    actors = ["j.rivera@nyc.gov", "a.chen@nyc.gov", "system", "m.okafor@nyc.gov", "AI copilot (mock)"]
    actions = [("create", "service_request"), ("update", "service_request"),
               ("close", "service_request"), ("assign", "inspection"),
               ("generate", "report"), ("login", "user")]
    ids = list(db.execute(select(models.ServiceRequest.id).limit(500)).scalars().all())
    now = datetime.now(timezone.utc)
    logs = []
    for _ in range(80):
        action, entity = rng.choice(actions)
        logs.append(
            dict(
                actor=rng.choice(actors),
                action=action,
                entity_type=entity,
                entity_id=str(rng.choice(ids)) if ids and entity == "service_request" else None,
                created_at=now - timedelta(hours=rng.randint(0, 720), minutes=rng.randint(0, 59)),
            )
        )
    db.bulk_insert_mappings(models.AuditLog, logs)
    db.commit()
    print(f"  audit logs: {len(logs)}")


def _seed_reports(db) -> None:
    if db.scalar(select(func.count()).select_from(models.Report)):
        return
    now = datetime.now(timezone.utc)
    kinds = ["executive", "weekly", "monthly", "compliance", "weekly"]
    reports = []
    for i, kind in enumerate(kinds):
        end = now - timedelta(days=i * 7)
        reports.append(
            dict(
                kind=kind,
                title=f"{kind.title()} Report — {end.strftime('%b %d, %Y')}",
                period_start=end - timedelta(days=30 if kind == "monthly" else 7),
                period_end=end,
                summary=(f"Automated {kind} summary: operations nominal across the five boroughs; "
                         f"resolution SLAs tracked; high-priority queue monitored by the AI copilot."),
                created_by="AI copilot (mock)",
                created_at=end,
            )
        )
    db.bulk_insert_mappings(models.Report, reports)
    db.commit()
    print(f"  reports: {len(reports)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the NYC 311 platform schema.")
    parser.add_argument("--requests", type=int, default=5000, help="number of service requests")
    parser.add_argument("--batch", type=int, default=5000, help="insert batch size")
    parser.add_argument("--reset", action="store_true", help="drop platform tables first")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.reset:
            _reset(db)
        print("• creating schema + tables")
        _create_schema()
        print("• seeding reference data")
        _seed_roles(db)
        borough_ids = _seed_boroughs(db)
        agency_ids = _seed_agencies(db)
        ctype_ids = _seed_complaint_types(db, agency_ids)
        n_citizens = max(1000, args.requests // 20)
        citizen_ids = _seed_people(db, borough_ids, n_citizens)
        print(f"  boroughs={len(borough_ids)} agencies={len(agency_ids)} "
              f"complaint_types={len(ctype_ids)} citizens={len(citizen_ids)}")
        print("• generating service requests")
        _seed_requests(
            db,
            target=args.requests,
            batch_size=args.batch,
            borough_ids=borough_ids,
            agency_ids=agency_ids,
            ctype_ids=ctype_ids,
            citizen_ids=citizen_ids,
        )
        print("• generating AI recommendations + inspections")
        _seed_ai_and_inspections(db)
        print("• seeding users, audit logs, reports")
        _seed_users(db)
        _seed_audit_logs(db)
        _seed_reports(db)
        total = db.scalar(select(func.count()).select_from(models.ServiceRequest))
        print(f"✓ done. platform.service_requests now has {total:,} rows.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
