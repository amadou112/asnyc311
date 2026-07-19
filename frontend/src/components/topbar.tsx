"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LanguageToggle } from "@/lib/i18n";
import { ThemeToggle } from "@/lib/theme";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [health, setHealth] = useState<{ status: string; ai_provider: string } | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  const ok = health?.status === "ok";
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-hair pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LanguageToggle />
        <div className="flex items-center gap-2 rounded-full border border-hair bg-overlay/5 px-3 py-1.5 text-xs font-semibold text-ink-2">
          <span
            className={`h-2 w-2 rounded-full ${ok ? "bg-good" : "bg-crit"}`}
            style={ok ? { boxShadow: "0 0 0 3px rgba(34,197,94,.18)" } : undefined}
          />
          {health ? `API ${health.status} · AI: ${health.ai_provider}` : "API offline"}
        </div>
      </div>
    </header>
  );
}
