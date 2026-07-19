"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Card, CardTitle } from "@/components/ui/card";
import { LanguageToggle, useI18n } from "@/lib/i18n";
import { ThemeToggle } from "@/lib/theme";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { t } = useI18n();
  const [health, setHealth] = useState<{ ai_provider: string; database: string } | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <div>
      <Topbar title={t("settings.title")} subtitle={t("settings.sub")} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>{t("settings.language")}</CardTitle>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-ink-2">{t("settings.language_hint")}</p>
            <LanguageToggle />
          </div>
        </Card>

        <Card>
          <CardTitle>{t("settings.ai_provider")}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="badge bg-brand/15 text-brand">{health?.ai_provider ?? "—"}</span>
            <span className="text-sm text-muted">
              Provider-agnostic · mock / OpenAI / Claude (set via <code>AI_PROVIDER</code>)
            </span>
          </div>
        </Card>

        <Card>
          <CardTitle>{t("settings.theme")}</CardTitle>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-ink-2">Light, Dark, or follow your system preference.</span>
            <ThemeToggle />
          </div>
        </Card>

        <Card>
          <CardTitle>System</CardTitle>
          <ul className="space-y-1.5 text-sm text-ink-2">
            <li>• Database: <span className="text-emerald-700 dark:text-emerald-300">{health?.database ?? "—"}</span></li>
            <li>• API: <code>/api/v1</code></li>
            <li>• Version: v0.1 · vertical slice</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
