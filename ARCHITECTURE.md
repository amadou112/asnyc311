# NYC 311 AI Management Platform — Architecture

This document is the system-design deliverable (Phases 1–12). It describes the
target production architecture and marks what is implemented in the current
vertical slice vs. planned.

## 1. System architecture

Three tiers plus an AI sidecar, all containerized:

- **Web tier** — Next.js 15 (App Router) served by Node; static assets via CDN in
  prod. Talks to the API over HTTPS.
- **API tier** — FastAPI (ASGI/uvicorn) exposing versioned REST under `/api/v1`.
  Stateless; horizontally scalable behind Nginx / an ALB.
- **Data tier** — PostgreSQL (operational schema `platform`) + the existing
  analytical `curated` schema from the 311 pipeline. A vector store (pgvector)
  backs RAG.
- **AI layer** — an in-process, provider-agnostic module (`app/ai`) with a common
  interface and swappable backends (mock / OpenAI / Claude). RAG retrieval runs
  over request text; agentic flows (LangGraph-style) are modeled as explicit
  server-side steps so they work without external orchestration.

```
Browser ─► Nginx (TLS) ─► Next.js ─► FastAPI ─► Postgres
                                        │
                                        └─► AI layer ─► (mock | OpenAI | Claude)
                                                          ▲
                                             RAG retrieval│(pgvector / SQL)
```

### Design principles
- **Runnable at every commit.** Each phase is independently verifiable.
- **No hard dependency on paid APIs.** The default AI provider is a deterministic
  mock that routes NL questions to real SQL, so demos and CI are free and offline.
- **Reuse, don't duplicate.** Shares the pipeline's Postgres; the 311 records are
  the realistic dimension source (boroughs, agencies, complaint types).

## 2. Folder structure

```
nyc311-platform/
├── README.md
├── ARCHITECTURE.md
├── docker-compose.yml            # backend + frontend, joins pipeline Postgres net
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── sql/schema.sql            # canonical DDL (documentation + migration)
│   └── app/
│       ├── main.py               # FastAPI app factory, CORS, router mount
│       ├── core/config.py        # pydantic-settings, env-driven
│       ├── db.py                 # engine, session, Base (schema=platform)
│       ├── models.py             # SQLAlchemy ORM — all normalized tables
│       ├── schemas.py            # Pydantic request/response models
│       ├── crud.py               # query/aggregation layer
│       ├── seed.py               # scalable synthetic data generator
│       ├── ai/
│       │   ├── base.py           # Provider protocol + shared types
│       │   ├── mock.py           # deterministic provider (NL → SQL)
│       │   ├── providers.py      # OpenAI + Claude adapters (lazy import)
│       │   └── factory.py        # selects provider from settings
│       └── api/
│           ├── router.py         # /api/v1 aggregate router
│           ├── health.py
│           ├── requests.py       # Service Requests CRUD + stats
│           ├── dashboard.py      # KPIs, trends, borough stats
│           └── ai.py             # NL query + recommendations
│   └── tests/test_smoke.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.ts / tsconfig.json / tailwind.config.ts
    └── src/
        ├── app/                  # App Router: 12 routes
        │   ├── layout.tsx, globals.css, page.tsx (Dashboard/Home)
        │   ├── service-requests/page.tsx
        │   ├── ai-assistant/page.tsx
        │   └── {inspections,citizens,analytics,maps,reports,admin,settings,about}/page.tsx
        ├── components/           # Nav, KPI cards, charts, ShadCN-style UI
        └── lib/                  # api client, utils
```

## 3. Database design (schema `platform`)

Normalized, 3NF. Reference tables seed from real `curated.requests` values.

| Table                | Purpose                                                   |
|----------------------|-----------------------------------------------------------|
| `roles`              | RBAC roles (citizen…administrator)                        |
| `users`              | Auth principals; `role_id` FK; MFA + password hash fields |
| `boroughs`           | 5 boroughs + population/area                              |
| `agencies`           | City agencies (acronym, name)                             |
| `complaint_types`    | Complaint taxonomy → category, default agency, SLA hours  |
| `citizens`           | Requesters (PII), borough FK                              |
| `inspectors`         | Field inspectors, borough + specialization                |
| `service_requests`   | Core entity; FKs to citizen/complaint/agency/borough; status, priority, geo, SLA, risk/priority scores |
| `inspections`        | Linked to a request + inspector; outcome, compliance, notes |
| `ai_recommendations` | Model-generated guidance, confidence, provenance          |
| `notifications`      | Outbound citizen/user messages                            |
| `reports`            | Generated report records + AI summaries                   |
| `audit_logs`         | Immutable action trail (actor, action, entity, metadata)  |

Key indexes: `service_requests(borough_id)`, `(complaint_type_id)`, `(status)`,
`(created_at)`, `(priority)`. Canonical DDL: [`backend/sql/schema.sql`](./backend/sql/schema.sql).

## 4. API design (`/api/v1`)

| Method | Path                          | Description                              | State |
|--------|-------------------------------|------------------------------------------|-------|
| GET    | `/health`                     | Liveness + DB check                      | ✅ |
| GET    | `/requests`                   | List/search (filters, pagination)        | ✅ |
| POST   | `/requests`                   | Create a service request                 | ✅ |
| GET    | `/requests/{id}`              | Retrieve one                             | ✅ |
| PATCH  | `/requests/{id}`              | Update fields / status                   | ✅ |
| POST   | `/requests/{id}/close`        | Close with resolution                    | ✅ |
| GET    | `/requests/stats/summary`     | Counts by status/priority                | ✅ |
| GET    | `/dashboard/summary`          | Executive KPIs                           | ✅ |
| GET    | `/dashboard/trends`           | Daily complaint volume                   | ✅ |
| GET    | `/dashboard/boroughs`         | Per-borough stats                        | ✅ |
| GET    | `/dashboard/geo`              | Geo points for maps/hotspots             | ✅ |
| POST   | `/ai/query`                   | Natural-language question → answer+data  | ✅ |
| GET    | `/ai/recommendations`         | AI recommendations feed                  | ✅ |

Responses are Pydantic-typed; pagination via `limit`/`offset`; errors use FastAPI
`HTTPException` with structured detail.

## 5–7. Frontend, Backend, AI
See folder structure. The AI layer's `Provider` protocol has one method,
`answer(question, context) -> AIAnswer`. The **mock** provider classifies the
question (borough / trend / forecast / aging / agency / summary) and calls the
matching `crud` aggregation, returning real numbers + a natural-language gloss and
a `data` payload the frontend charts. Swapping `AI_PROVIDER=openai|claude` sends
the same retrieved context to a real model.

## 8. Docker deployment
`docker compose up` builds backend + frontend and joins the external network
`localdatapipelinedashboard_default` to reach the shared `postgres` service. A
`prod` profile adds Nginx for TLS termination and a single public origin.

## 9. Cloud architecture (target)
- **AWS**: ECS Fargate (api, web) behind an ALB; RDS Postgres (pgvector); S3 for
  uploads/report PDFs; CloudFront for the web tier; Secrets Manager for keys;
  CloudWatch logs/metrics.
- IaC via Terraform (planned).

## 10. Testing
- `pytest` smoke + API tests (in-repo). Contract tests against the OpenAPI schema.
- Frontend: type-check + component tests (planned: Vitest + Playwright).

## 11. CI/CD (target)
- GitHub Actions: lint → typecheck → pytest → build images → push to ECR →
  deploy to ECS (staging → prod with approval).

## 12. Production deployment (target)
- Blue/green on ECS; DB migrations via Alembic gated in the pipeline; health
  checks + autoscaling on ALB target group; WAF on CloudFront.

## Security model
RBAC roles: citizen, inspector, supervisor, agency_manager, executive,
administrator. JWT bearer auth, optional TOTP MFA, audit logging on writes,
encryption in transit (TLS) and at rest (RDS/S3). Models + hooks exist in this
slice; full enforcement is a later phase.
