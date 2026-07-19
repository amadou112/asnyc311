import { Topbar } from "@/components/topbar";
import { Construction } from "lucide-react";

export function StubPage({
  title,
  subtitle,
  planned,
}: {
  title: string;
  subtitle: string;
  planned: string[];
}) {
  return (
    <div>
      <Topbar title={title} subtitle={subtitle} />
      <div className="card p-8">
        <div className="mb-4 flex items-center gap-3 text-brand">
          <Construction size={22} />
          <span className="text-sm font-semibold uppercase tracking-wide">Scaffolded — next phase</span>
        </div>
        <p className="max-w-2xl text-sm text-ink-2">
          This page is routed and part of the information architecture. The backend
          data model and API groundwork exist in the vertical slice; the UI for this
          module is planned for the next build phase.
        </p>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {planned.map((p) => (
            <li key={p} className="flex items-center gap-2 rounded-lg border border-hair bg-overlay/[0.02] px-3 py-2 text-sm text-ink-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
