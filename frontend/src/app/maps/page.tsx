"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Topbar } from "@/components/topbar";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { fmt } from "@/lib/utils";
import type { GeoPoint } from "@/lib/types";

// Leaflet touches window → load the map only on the client.
const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading map…</div>,
});

const BOROUGHS = ["", "MANHATTAN", "BRONX", "BROOKLYN", "QUEENS", "STATEN ISLAND"];
const PRIORITIES = ["", "low", "medium", "high", "critical"];
const LEGEND: { key: string; color: string }[] = [
  { key: "low", color: "#94a3b8" },
  { key: "medium", color: "#38bdf8" },
  { key: "high", color: "#f59e0b" },
  { key: "critical", color: "#ef4444" },
];

export default function MapsPage() {
  const { t } = useI18n();
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [borough, setBorough] = useState("");
  const [priority, setPriority] = useState("");

  useEffect(() => {
    api.geo(1500).then(setPoints).catch(() => setPoints([]));
  }, []);

  const filtered = useMemo(
    () =>
      points.filter(
        (p) => (!borough || p.borough === borough) && (!priority || p.priority === priority),
      ),
    [points, borough, priority],
  );

  return (
    <div>
      <Topbar title={t("maps.title")} subtitle={t("maps.sub")} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="input" value={borough} onChange={(e) => setBorough(e.target.value)}>
          {BOROUGHS.map((b) => <option key={b} value={b}>{b || t("common.all_borough")}</option>)}
        </select>
        <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p || t("common.all_priority")}</option>)}
        </select>
        <span className="ml-auto text-sm text-muted">{fmt(filtered.length)} {t("maps.points")}</span>
      </div>

      <div className="card overflow-hidden !p-0">
        <div className="h-[62vh] w-full">
          <MapView points={filtered} />
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-hair px-4 py-2.5 text-xs text-muted">
          <span className="font-semibold uppercase tracking-wide">{t("maps.legend")}</span>
          {LEGEND.map((l) => (
            <span key={l.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
              {l.key}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
