"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "es";

// Flat dot-keyed dictionary. Data values (from the DB) are never translated;
// only UI chrome is. Add keys here and reference them via t("key").
const DICT: Record<Lang, Record<string, string>> = {
  en: {
    "nav.home": "Home",
    "nav.dashboard": "Dashboard",
    "nav.requests": "Service Requests",
    "nav.inspections": "Inspections",
    "nav.citizens": "Citizens Portal",
    "nav.ai": "AI Assistant",
    "nav.analytics": "Analytics",
    "nav.maps": "Maps & GIS",
    "nav.reports": "Reports",
    "nav.admin": "Administration",
    "nav.settings": "Settings",
    "nav.about": "About",

    "home.title": "NYC 311 — Executive Overview",
    "home.sub": "Live service-request operations across the five boroughs",
    "kpi.total": "Total Requests",
    "kpi.open": "Open Requests",
    "kpi.resolution_rate": "Resolution Rate",
    "kpi.avg_resolution": "Avg Resolution",
    "home.high_critical": "high / critical",
    "home.closed": "closed",
    "home.emergency_open": "emergency open",
    "home.trend": "Complaint volume — last 30 days",
    "home.ai_insight": "AI Insight",
    "home.by_borough": "Requests by borough",
    "home.recent": "Recent activity",
    "home.emergency_alert": "emergency-category requests need attention.",

    "requests.title": "Service Requests",
    "requests.sub": "create, search, triage, and close",
    "inspections.title": "Inspections",
    "inspections.sub": "Scheduling, compliance tracking, and violation detection",
    "citizens.title": "Citizens Portal",
    "citizens.sub": "Resident profiles and their service-request history",
    "maps.title": "Maps & GIS",
    "maps.sub": "Request locations, complaint hotspots, and borough filters",
    "reports.title": "Reports",
    "reports.sub": "Executive, weekly, monthly, and compliance reports with AI summaries",
    "admin.title": "Administration",
    "admin.sub": "Users, roles, agencies, and audit logs",
    "settings.title": "Settings",
    "settings.sub": "Language, AI provider, and preferences",
    "analytics.title": "Analytics",
    "analytics.sub": "Complaint trends, borough performance, and status distribution",
    "dashboard.title": "Operations Dashboard",
    "dashboard.sub": "Status mix, priority load, and borough performance",
    "ai.title": "AI Assistant",
    "ai.sub": "Executive copilot · natural-language questions grounded in live 311 data",

    "common.search": "Search…",
    "common.all_status": "All status",
    "common.all_priority": "All priority",
    "common.all_borough": "All borough",
    "common.new_request": "New request",
    "common.close": "Close",
    "common.cancel": "Cancel",
    "common.prev": "Prev",
    "common.next": "Next",
    "common.showing": "Showing",
    "common.of": "of",
    "common.loading": "Loading…",
    "common.no_data": "No data",
    "common.back": "Back",
    "common.violations": "Violations",
    "common.all": "All",

    "th.request": "Request #",
    "th.complaint": "Complaint",
    "th.borough": "Borough",
    "th.agency": "Agency",
    "th.priority": "Priority",
    "th.status": "Status",
    "th.risk": "Risk",
    "th.created": "Created",
    "th.type": "Type",
    "th.inspector": "Inspector",
    "th.scheduled": "Scheduled",
    "th.compliance": "Compliance",
    "th.name": "Name",
    "th.email": "Email",
    "th.role": "Role",
    "th.mfa": "MFA",
    "th.requests": "Requests",
    "th.open": "Open",
    "th.actor": "Actor",
    "th.action": "Action",
    "th.entity": "Entity",
    "th.when": "When",

    "ai.try": "Try asking",
    "ai.placeholder": "Ask a question…",
    "ai.empty": "Ask about complaints, boroughs, agencies, forecasts, or SLAs.",
    "reports.generate": "Generate report",
    "reports.generating": "Generating…",
    "settings.language": "Language",
    "settings.ai_provider": "AI provider",
    "settings.theme": "Theme",
    "settings.language_hint": "Switch the interface language. Applies instantly across every page.",
    "citizens.history": "Service-request history",
    "citizens.select": "Select a citizen to view their profile and request history.",
    "maps.legend": "Priority",
    "maps.points": "locations",
  },
  es: {
    "nav.home": "Inicio",
    "nav.dashboard": "Panel",
    "nav.requests": "Solicitudes",
    "nav.inspections": "Inspecciones",
    "nav.citizens": "Portal Ciudadano",
    "nav.ai": "Asistente IA",
    "nav.analytics": "Analítica",
    "nav.maps": "Mapas y SIG",
    "nav.reports": "Informes",
    "nav.admin": "Administración",
    "nav.settings": "Configuración",
    "nav.about": "Acerca de",

    "home.title": "NYC 311 — Resumen Ejecutivo",
    "home.sub": "Operaciones de solicitudes en vivo en los cinco distritos",
    "kpi.total": "Solicitudes Totales",
    "kpi.open": "Solicitudes Abiertas",
    "kpi.resolution_rate": "Tasa de Resolución",
    "kpi.avg_resolution": "Resolución Promedio",
    "home.high_critical": "alta / crítica",
    "home.closed": "cerradas",
    "home.emergency_open": "emergencias abiertas",
    "home.trend": "Volumen de quejas — últimos 30 días",
    "home.ai_insight": "Perspectiva de IA",
    "home.by_borough": "Solicitudes por distrito",
    "home.recent": "Actividad reciente",
    "home.emergency_alert": "solicitudes de categoría emergencia requieren atención.",

    "requests.title": "Solicitudes de Servicio",
    "requests.sub": "crear, buscar, gestionar y cerrar",
    "inspections.title": "Inspecciones",
    "inspections.sub": "Programación, cumplimiento y detección de infracciones",
    "citizens.title": "Portal Ciudadano",
    "citizens.sub": "Perfiles de residentes y su historial de solicitudes",
    "maps.title": "Mapas y SIG",
    "maps.sub": "Ubicaciones de solicitudes, focos de quejas y filtros por distrito",
    "reports.title": "Informes",
    "reports.sub": "Informes ejecutivos, semanales, mensuales y de cumplimiento con resúmenes de IA",
    "admin.title": "Administración",
    "admin.sub": "Usuarios, roles, agencias y registros de auditoría",
    "settings.title": "Configuración",
    "settings.sub": "Idioma, proveedor de IA y preferencias",
    "analytics.title": "Analítica",
    "analytics.sub": "Tendencias de quejas, desempeño por distrito y distribución de estados",
    "dashboard.title": "Panel de Operaciones",
    "dashboard.sub": "Distribución de estados, carga por prioridad y desempeño por distrito",
    "ai.title": "Asistente IA",
    "ai.sub": "Copiloto ejecutivo · preguntas en lenguaje natural sobre datos 311 en vivo",

    "common.search": "Buscar…",
    "common.all_status": "Todos los estados",
    "common.all_priority": "Todas las prioridades",
    "common.all_borough": "Todos los distritos",
    "common.new_request": "Nueva solicitud",
    "common.close": "Cerrar",
    "common.cancel": "Cancelar",
    "common.prev": "Anterior",
    "common.next": "Siguiente",
    "common.showing": "Mostrando",
    "common.of": "de",
    "common.loading": "Cargando…",
    "common.no_data": "Sin datos",
    "common.back": "Volver",
    "common.violations": "Infracciones",
    "common.all": "Todas",

    "th.request": "N.º solicitud",
    "th.complaint": "Queja",
    "th.borough": "Distrito",
    "th.agency": "Agencia",
    "th.priority": "Prioridad",
    "th.status": "Estado",
    "th.risk": "Riesgo",
    "th.created": "Creado",
    "th.type": "Tipo",
    "th.inspector": "Inspector",
    "th.scheduled": "Programada",
    "th.compliance": "Cumplimiento",
    "th.name": "Nombre",
    "th.email": "Correo",
    "th.role": "Rol",
    "th.mfa": "MFA",
    "th.requests": "Solicitudes",
    "th.open": "Abiertas",
    "th.actor": "Actor",
    "th.action": "Acción",
    "th.entity": "Entidad",
    "th.when": "Cuándo",

    "ai.try": "Prueba a preguntar",
    "ai.placeholder": "Haz una pregunta…",
    "ai.empty": "Pregunta sobre quejas, distritos, agencias, pronósticos o SLAs.",
    "reports.generate": "Generar informe",
    "reports.generating": "Generando…",
    "settings.language": "Idioma",
    "settings.ai_provider": "Proveedor de IA",
    "settings.theme": "Tema",
    "settings.language_hint": "Cambia el idioma de la interfaz. Se aplica al instante en todas las páginas.",
    "citizens.history": "Historial de solicitudes",
    "citizens.select": "Selecciona un ciudadano para ver su perfil e historial de solicitudes.",
    "maps.legend": "Prioridad",
    "maps.points": "ubicaciones",
  },
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nCtx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    if (saved === "en" || saved === "es") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (key: string) => DICT[lang][key] ?? DICT.en[key] ?? key;

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-hair text-xs font-semibold">
      {(["en", "es"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={l === lang ? "bg-brand px-2.5 py-1 text-white" : "px-2.5 py-1 text-muted hover:text-ink"}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
