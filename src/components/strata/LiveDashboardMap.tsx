import L from "leaflet";
import { useEffect, useRef } from "react";

export type Station = {
  station_id: string;
  station_name: string;
  state_name: string;
  city_name: string;
  latitude: number;
  longitude: number;
  parameter_name: string;
  mean: number;
  unit: string;
  n: number;
  coverage_flag: string;
};

function stationPopup(station: Station) {
  const container = document.createElement("div");
  container.className = "map-popup";
  const source = document.createElement("div");
  source.className = "map-popup__source";
  source.textContent = "CPCB · Ground observation";
  const heading = document.createElement("div");
  heading.className = "map-popup__heading";
  heading.textContent = station.station_name;
  const reading = document.createElement("div");
  reading.className = "map-popup__reading";
  reading.textContent = `${station.parameter_name} · ${station.mean.toFixed(2)} ${station.unit}`;
  const details = document.createElement("div");
  details.className = "map-popup__details";
  [`${station.city_name}, ${station.state_name}`, `${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}`, `${station.n} hourly observations`, `Coverage: ${station.coverage_flag.replaceAll("_", " ")}`].forEach((detail) => {
    const line = document.createElement("div");
    line.textContent = detail;
    details.appendChild(line);
  });
  container.append(source, heading, reading, details);
  return container;
}

export default function LiveDashboardMap({ stations }: { stations: Station[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = L.map(container, { center: [22.7, 79.2], zoom: 5, minZoom: 4, maxZoom: 12, zoomControl: true, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; markersRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;
    markers.clearLayers();
    stations.forEach((station) => {
      const marker = L.circleMarker([station.latitude, station.longitude], { radius: 7, color: "var(--background)", weight: 2, fillColor: "var(--primary)", fillOpacity: 0.95, bubblingMouseEvents: false });
      marker.bindPopup(stationPopup(station), { closeButton: true, autoPanPadding: L.point(28, 28) });
      marker.bindTooltip(station.station_name, { direction: "top", offset: [0, -5], opacity: 0.9 });
      marker.addTo(markers);
    });
    if (stations.length > 0) map.fitBounds(L.latLngBounds(stations.map((station) => [station.latitude, station.longitude] as [number, number])), { padding: [34, 34], maxZoom: 6, animate: false });
    else map.setView([22.7, 79.2], 5, { animate: false });
  }, [stations]);

  return <div ref={containerRef} className="h-full min-h-[390px] w-full" role="application" aria-label="Map of CPCB monitoring station observations" />;
}
