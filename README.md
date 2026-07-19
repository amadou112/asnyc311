# NYC 311 AI Management Platform

https://asnyc311.vercel.app/

An enterprise-style platform that simulates how New York City manages millions of
311 service requests, inspections, and citizen complaints — with an AI copilot,
analytics, and GIS on top. Built as an AI/ML Technical Program Manager portfolio
project.

> **Status: runnable vertical slice.** This repo currently ships a working
> end-to-end path — **Service Requests + Dashboard + Postgres + Docker + a
> provider-agnostic AI layer** — and a clean scaffold for the remaining pages.
> It is intentionally built one verified layer at a time rather than as an
> unrunnable 150-file dump. See [Roadmap](#roadmap) for what is live vs. stubbed.

## Architecture at a glance

```
┌──────────────────────┐     HTTPS      ┌────────────────────────┐
│  Next.js 15 (React,  │ ─────────────► │  FastAPI (Python 3.12) │
│  TS, Tailwind, ShadCN│ ◄───────────── │  REST /api/v1          │
│  Recharts, Leaflet)  │     JSON       │                        │
└──────────────────────┘                │  ┌──────────────────┐  │
                                        │  │ AI layer         │  │
                                        │  │ (provider-       │  │
                                        │  │  agnostic)       │  │
                                        │  │  mock│openai│    │  │
                                        │  │  claude          │  │
                                        │  └──────────────────┘  │
                                        └───────────┬────────────┘
                                                    │ SQLAlchemy
                                          ┌─────────▼──────────┐
                                          │ PostgreSQL         │
                                          │  schema `platform` │  ← this project
                                          │  schema `curated`  │  ← existing 311 pipeline
                                          └────────────────────┘
```

The platform **reuses the Postgres instance from the existing 311 data pipeline**
in this workspace (60k+ real NYC 311 records in `curated.requests`) and adds its
own normalized operational schema, `platform`. Nothing in the existing pipeline /
Streamlit dashboard is modified.

Full design: [ARCHITECTURE.md](./ARCHITECTURE.md).

## Tech stack

| Layer        | Technology                                                             |
|--------------|------------------------------------------------------------------------|
| Frontend     | Next.js 15, React 18, TypeScript, TailwindCSS, ShadCN-style UI, Recharts |
| Backend      | FastAPI, Pydantic v2, SQLAlchemy 2.0                                    |
| Database     | PostgreSQL 16 (shared with the 311 pipeline)                           |
| AI           | Provider-agnostic LLM interface — `mock` (default), OpenAI, or Claude; RAG retrieval over requests |
| Infra        | Docker, Docker Compose, Nginx (reverse proxy, prod profile)            |

## Quick start (local, no external keys required)

### Option A — backend only, against the running pipeline Postgres

```bash
cd nyc311-platform/backend
python -m venv .venv && . .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# points at the existing pipeline Postgres on localhost:5434 by default
python -m app.seed --requests 5000        # generate synthetic operational data
uvicorn app.main:app --reload --port 8000
# open http://localhost:8000/docs
```

### Option B — full stack with Docker Compose

```bash
cd nyc311-platform
cp .env.example .env
docker compose build
docker compose run --rm backend python -m app.seed --reset --requests 8000   # one-time seed
docker compose up -d
# frontend  → http://localhost:3007
# backend   → http://localhost:8008/docs
```

> Ports 3007 / 8008 are used to avoid colliding with other local containers; change
> them in `docker-compose.yml` (and `CORS_ORIGINS` / `NEXT_PUBLIC_API_BASE`) if you
> prefer 3000 / 8000.

The compose file attaches to the existing pipeline's Postgres network, so the
platform and the pipeline share one database.

## AI layer

The AI provider is chosen by `AI_PROVIDER` (`mock` | `openai` | `claude`):

- **`mock`** (default) — deterministic, no API key, safe for demos and CI. It
  answers natural-language questions by routing to real SQL aggregations, so the
  numbers are true even though no LLM is called.
- **`openai`** / **`claude`** — set the matching API key and the same endpoints
  call a real model. Note: "GPT-5.5" is not a released model; configure a real
  current model id via `AI_MODEL`.

## Roadmap

| Page / capability            | State in this slice                                  |
|------------------------------|------------------------------------------------------|
| Dashboard / Home KPIs        | ✅ live (real aggregates)                             |
| Service Requests (CRUD)      | ✅ live (list/search/create/update/close + stats)     |
| AI Assistant (NL → data)     | ✅ live via mock provider (real SQL under the hood)   |
| Analytics                    | ◑ charts wired to live trend endpoints                |
| Inspections                  | ◑ schema + endpoints; UI stub                         |
| Maps & GIS                   | ◑ endpoints return geo points; Leaflet UI stub        |
| Reports (PDF)                | ◐ report records + summaries; PDF export stub         |
| Citizens Portal / Admin / Settings / About | ◐ routed page stubs                    |
| RBAC / JWT / MFA / Audit     | ◐ models + hooks in place; enforcement stubbed        |

✅ done · ◑ partial · ◐ scaffolded

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full 12-phase plan (CI/CD, AWS,
testing) and how each remaining phase slots in.
