import { Topbar } from "@/components/topbar";
import { Card, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div>
      <Topbar title="About" subtitle="NYC 311 AI Management Platform" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>What this is</CardTitle>
          <p className="text-sm leading-relaxed text-ink-2">
            An enterprise-style platform simulating how New York City manages millions
            of 311 service requests, inspections, and citizen complaints — with an AI
            copilot, analytics, and GIS. Built as an AI/ML Technical Program Manager
            portfolio project, delivered as a verified, runnable vertical slice.
          </p>
        </Card>
        <Card>
          <CardTitle>Architecture</CardTitle>
          <ul className="space-y-1.5 text-sm text-ink-2">
            <li>• <b>Frontend:</b> Next.js 15, React, TypeScript, Tailwind, Recharts</li>
            <li>• <b>Backend:</b> FastAPI, SQLAlchemy 2.0, Pydantic v2</li>
            <li>• <b>Database:</b> PostgreSQL (schema <code>platform</code>)</li>
            <li>• <b>AI:</b> provider-agnostic (mock / OpenAI / Claude) with grounded retrieval</li>
            <li>• <b>Infra:</b> Docker, Docker Compose</li>
          </ul>
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle>Data foundation</CardTitle>
          <p className="text-sm leading-relaxed text-ink-2">
            Reference dimensions (agencies, complaint taxonomy, borough & geographic
            mix) are derived from 60,000+ real NYC 311 records already ingested by the
            companion data pipeline, then layered with a synthetic, scalable
            operational timeline. The AI assistant answers natural-language questions by
            routing them to real SQL aggregations, so the numbers are always truthful.
          </p>
        </Card>
      </div>
    </div>
  );
}
