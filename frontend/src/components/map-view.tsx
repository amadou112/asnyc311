"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { GeoPoint } from "@/lib/types";
import { useTheme } from "@/lib/theme";

const PRIORITY_COLOR: Record<string, string> = {
  low: "#94a3b8",
  medium: "#38bdf8",
  high: "#f59e0b",
  critical: "#ef4444",
};

// CircleMarker (SVG) avoids Leaflet's image-asset marker-icon pitfalls with bundlers.
export default function MapView({ points }: { points: GeoPoint[] }) {
  const { resolved } = useTheme();
  const tiles =
    resolved === "light"
      ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const bg = resolved === "light" ? "#eef1f5" : "#0b0d10";

  return (
    <MapContainer
      key={resolved} // re-mount so the tile layer swaps cleanly on theme change
      center={[40.7128, -73.96]}
      zoom={11}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", background: bg }}
    >
      <TileLayer attribution="&copy; OpenStreetMap contributors &copy; CARTO" url={tiles} />
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.latitude, p.longitude]}
          radius={p.priority === "critical" ? 7 : p.priority === "high" ? 6 : 4}
          pathOptions={{
            color: PRIORITY_COLOR[p.priority] ?? "#38bdf8",
            fillColor: PRIORITY_COLOR[p.priority] ?? "#38bdf8",
            fillOpacity: 0.6,
            weight: 1,
          }}
        >
          <Popup>
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              <b>{p.complaint_type ?? "Request"}</b>
              <br />
              {p.borough} · {p.priority} · {p.status.replace(/_/g, " ")}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
