"use client";

import { useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { AIAnswer } from "@/lib/types";

const SAMPLES = [
  "Show me all complaints in Brooklyn.",
  "Which borough has the highest resolution time?",
  "Forecast complaint volumes for the next quarter.",
  "Show unresolved requests older than 30 days.",
  "Which agencies are underperforming?",
  "Generate an executive report.",
];

interface Turn { role: "user" | "assistant"; text: string; answer?: AIAnswer; }

export default function AIAssistantPage() {
  const { t } = useI18n();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const ask = async (q: string) => {
    if (!q.trim() || busy) return;
    setTurns((t) => [...t, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const answer = await api.aiQuery(q);
      setTurns((t) => [...t, { role: "assistant", text: answer.answer, answer }]);
    } catch {
      setTurns((t) => [...t, { role: "assistant", text: "Sorry — the AI service is unavailable." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Topbar title={t("ai.title")} subtitle={t("ai.sub")} />

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="card flex min-h-[60vh] flex-col !p-0">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {turns.length === 0 && (
              <div className="grid h-full place-items-center text-center text-muted">
                <div>
                  <Bot size={34} className="mx-auto mb-3 text-brand" />
                  <p className="text-sm">{t("ai.empty")}</p>
                </div>
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={`flex gap-3 ${t.role === "user" ? "justify-end" : ""}`}>
                {t.role === "assistant" && <Avatar role="assistant" />}
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                  t.role === "user" ? "bg-brand text-white" : "border border-hair bg-surface-2 text-ink-2"
                }`}>
                  <p className="leading-relaxed">{t.text}</p>
                  {t.answer && (
                    <div className="mt-2 flex flex-wrap gap-2 text-[0.65rem] text-muted">
                      <span className="rounded bg-black/20 px-1.5 py-0.5">intent: {t.answer.intent}</span>
                      <span className="rounded bg-black/20 px-1.5 py-0.5">provider: {t.answer.provider}</span>
                      <span className="rounded bg-black/20 px-1.5 py-0.5">confidence: {Math.round(t.answer.confidence * 100)}%</span>
                      {t.answer.data.length > 0 && (
                        <span className="rounded bg-black/20 px-1.5 py-0.5">{t.answer.data.length} rows</span>
                      )}
                    </div>
                  )}
                </div>
                {t.role === "user" && <Avatar role="user" />}
              </div>
            ))}
            {busy && <div className="text-sm text-muted">Thinking…</div>}
          </div>
          <form
            className="flex gap-2 border-t border-hair p-3"
            onSubmit={(e) => { e.preventDefault(); ask(input); }}
          >
            <input className="input flex-1" placeholder={t("ai.placeholder")} value={input}
              onChange={(e) => setInput(e.target.value)} />
            <button className="btn-brand" type="submit" disabled={busy}><Send size={16} /></button>
          </form>
        </div>

        <div className="card h-fit">
          <div className="section-title mb-3">{t("ai.try")}</div>
          <div className="space-y-2">
            {SAMPLES.map((s) => (
              <button key={s} className="w-full rounded-lg border border-hair bg-overlay/[0.02] px-3 py-2 text-left text-xs text-ink-2 hover:border-brand/40 hover:text-ink"
                onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  return (
    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
      role === "assistant" ? "bg-brand/15 text-brand" : "bg-overlay/10 text-ink-2"
    }`}>
      {role === "assistant" ? <Bot size={16} /> : <User size={16} />}
    </div>
  );
}
