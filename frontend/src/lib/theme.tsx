"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type ThemeMode = "light" | "dark" | "system";
type Resolved = "light" | "dark";

interface ThemeCtx {
  theme: ThemeMode;
  resolved: Resolved;
  setTheme: (t: ThemeMode) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "dark", resolved: "dark", setTheme: () => {} });

function systemResolved(): Resolved {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [resolved, setResolved] = useState<Resolved>("dark");

  // hydrate from storage
  useEffect(() => {
    const saved = localStorage.getItem("theme") as ThemeMode | null;
    if (saved === "light" || saved === "dark" || saved === "system") setThemeState(saved);
  }, []);

  // apply + react to system changes when in "system"
  useEffect(() => {
    const apply = () => {
      const r = theme === "system" ? systemResolved() : theme;
      setResolved(r);
      document.documentElement.dataset.theme = r;
    };
    apply();
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
  };

  return <Ctx.Provider value={{ theme, resolved, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);

// Colors for Recharts (series colors stay constant; chrome flips per theme).
export function useChartTheme() {
  const { resolved } = useTheme();
  return resolved === "light"
    ? { axis: "#64748b", label: "#475569", tooltipBg: "#ffffff", tooltipBorder: "#e2e8f0", tooltipText: "#0f172a", cursor: "rgba(15,23,42,.05)" }
    : { axis: "#8b909a", label: "#c4c8d0", tooltipBg: "#1b1f26", tooltipBorder: "rgba(255,255,255,.12)", tooltipText: "#f4f5f7", cursor: "rgba(255,255,255,.05)" };
}

const OPTIONS: [ThemeMode, typeof Sun][] = [
  ["light", Sun],
  ["dark", Moon],
  ["system", Monitor],
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-hair">
      {OPTIONS.map(([m, Icon]) => (
        <button
          key={m}
          onClick={() => setTheme(m)}
          title={m}
          aria-label={m}
          className={m === theme ? "bg-brand px-2 py-1.5 text-white" : "px-2 py-1.5 text-muted hover:text-ink"}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}
