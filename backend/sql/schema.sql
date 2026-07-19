-- NYC 311 AI Management Platform — canonical DDL for schema `platform`.
-- This mirrors the SQLAlchemy models in app/models.py. In this vertical slice the
-- tables are created by SQLAlchemy (python -m app.seed); this file is the
-- human-readable / migration reference and is applied by Docker as an init script.

CREATE SCHEMA IF NOT EXISTS platform;
SET search_path TO platform;

-- ---------- RBAC / auth ----------
CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    full_name       VARCHAR(120) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL DEFAULT '',
    role_id         INTEGER REFERENCES roles(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- reference dimensions ----------
CREATE TABLE IF NOT EXISTS boroughs (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(60) UNIQUE NOT NULL,
    population INTEGER,
    area_sq_mi DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS agencies (
    id      SERIAL PRIMARY KEY,
    acronym VARCHAR(30) UNIQUE NOT NULL,
    name    VARCHAR(160) NOT NULL
);

CREATE TABLE IF NOT EXISTS complaint_types (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(120) UNIQUE NOT NULL,
    category          VARCHAR(60) NOT NULL DEFAULT 'Other',
    default_agency_id INTEGER REFERENCES agencies(id),
    default_sla_hours INTEGER NOT NULL DEFAULT 72
);

-- ---------- people ----------
CREATE TABLE IF NOT EXISTS citizens (
    id         SERIAL PRIMARY KEY,
    first_name VARCHAR(80) NOT NULL,
    last_name  VARCHAR(80) NOT NULL,
    email      VARCHAR(255),
    phone      VARCHAR(40),
    borough_id INTEGER REFERENCES boroughs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspectors (
    id             SERIAL PRIMARY KEY,
    full_name      VARCHAR(120) NOT NULL,
    badge_number   VARCHAR(30) UNIQUE NOT NULL,
    borough_id     INTEGER REFERENCES boroughs(id),
    specialization VARCHAR(80),
    user_id        INTEGER REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- core operational entity ----------
CREATE TABLE IF NOT EXISTS service_requests (
    id                     SERIAL PRIMARY KEY,
    request_number         VARCHAR(30) UNIQUE NOT NULL,
    citizen_id             INTEGER REFERENCES citizens(id),
    complaint_type_id      INTEGER REFERENCES complaint_types(id),
    agency_id              INTEGER REFERENCES agencies(id),
    borough_id             INTEGER REFERENCES boroughs(id),
    description            TEXT,
    status                 VARCHAR(30) NOT NULL DEFAULT 'new',
    priority               VARCHAR(20) NOT NULL DEFAULT 'medium',
    channel                VARCHAR(30) NOT NULL DEFAULT 'ONLINE',
    incident_zip           VARCHAR(10),
    latitude               DOUBLE PRECISION,
    longitude              DOUBLE PRECISION,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at        TIMESTAMPTZ,
    closed_at              TIMESTAMPTZ,
    sla_due_at             TIMESTAMPTZ,
    resolution_description TEXT,
    risk_score             DOUBLE PRECISION,
    priority_score         DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS ix_service_requests_status         ON service_requests(status);
CREATE INDEX IF NOT EXISTS ix_service_requests_priority       ON service_requests(priority);
CREATE INDEX IF NOT EXISTS ix_service_requests_borough_id     ON service_requests(borough_id);
CREATE INDEX IF NOT EXISTS ix_service_requests_complaint_type ON service_requests(complaint_type_id);
CREATE INDEX IF NOT EXISTS ix_service_requests_created_at     ON service_requests(created_at);

-- ---------- inspections ----------
CREATE TABLE IF NOT EXISTS inspections (
    id                 SERIAL PRIMARY KEY,
    service_request_id INTEGER NOT NULL REFERENCES service_requests(id),
    inspector_id       INTEGER REFERENCES inspectors(id),
    scheduled_at       TIMESTAMPTZ,
    performed_at       TIMESTAMPTZ,
    status             VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    outcome            VARCHAR(60),
    compliance_status  VARCHAR(30),
    violation_found    BOOLEAN NOT NULL DEFAULT FALSE,
    risk_score         DOUBLE PRECISION,
    notes              TEXT,
    recommendations    TEXT
);

-- ---------- AI, comms, reporting, audit ----------
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id                 SERIAL PRIMARY KEY,
    service_request_id INTEGER REFERENCES service_requests(id),
    kind               VARCHAR(40) NOT NULL,
    content            TEXT NOT NULL,
    confidence         DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    model              VARCHAR(60) NOT NULL DEFAULT 'mock-1',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id                 SERIAL PRIMARY KEY,
    citizen_id         INTEGER REFERENCES citizens(id),
    service_request_id INTEGER REFERENCES service_requests(id),
    channel            VARCHAR(20) NOT NULL DEFAULT 'email',
    subject            VARCHAR(200) NOT NULL,
    body               TEXT,
    is_read            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
    id           SERIAL PRIMARY KEY,
    kind         VARCHAR(40) NOT NULL,
    title        VARCHAR(200) NOT NULL,
    period_start TIMESTAMPTZ,
    period_end   TIMESTAMPTZ,
    summary      TEXT,
    created_by   VARCHAR(120),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id          SERIAL PRIMARY KEY,
    actor       VARCHAR(120) NOT NULL DEFAULT 'system',
    action      VARCHAR(60) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id   VARCHAR(60),
    details     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
