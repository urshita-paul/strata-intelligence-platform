import L from "leaflet";
import { useEffect, useRef } from "react";
import { getRiskScore, type PollutionEvent, type Severity } from "@/lib/demo-data";

const MARKER_COLOURS: Record<Severity, string> = {
  low: "var(--low)",
  moderate: "var(--moderate)",
  high: "var(--high)",
  critical: "var(--critical)",
};
const MARKER_PRIORITY: Record<Severity, number> = { low: 0, moderate: 1, high: 2, critical: 3 };

interface DashboardMapProps {
  events: PollutionEvent[];
  onView: (id: string) => void;
}

function eventPopup(event: PollutionEvent, onView: (id: string) => void) {
  const container = document.createElement("div");
  container.className = "strata-map-popup";

  const heading = document.createElement("div");
  heading.className = "strata-map-popup__heading";
  heading.textContent = event.title;

  const meta = document.createElement("div");
  meta.className = "strata-map-popup__meta";
  meta.textContent = `${event.location}, ${event.state} · ${event.pollutant}`;

  const reading = document.createElement("div");
  reading.className = "strata-map-popup__reading";
  reading.textContent = `${event.reading} ${event.unit} · Risk ${getRiskScore(event)}/100`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "strata-map-popup__action";
  button.textContent = "View Event";
  button.addEventListener("click", () => onView(event.id));

  container.append(heading, meta, reading, button);
  return container;
}

export default function DashboardMap({ events, onView }: DashboardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const onViewRef = useRef(onView);
  onViewRef.current = onView;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: [22.7, 79.2],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;
    markers.clearLayers();

    const orderedEvents = [...events].sort((a, b) => MARKER_PRIORITY[a.severity] - MARKER_PRIORITY[b.severity]);
    for (const event of orderedEvents) {
      const marker = L.circleMarker([event.lat, event.lon], {
        radius: event.severity === "critical" ? 9 : 7,
        color: "var(--background)",
        weight: 2,
        fillColor: MARKER_COLOURS[event.severity],
        fillOpacity: 1,
        bubblingMouseEvents: false,
      });
      marker.bindPopup(eventPopup(event, (id) => onViewRef.current(id)), {
        closeButton: true,
        autoPanPadding: L.point(24, 24),
      });
      marker.addTo(markers);
      if (event.severity === "critical") marker.bringToFront();
    }

    if (events.length > 0) {
      map.fitBounds(L.latLngBounds(events.map((event) => [event.lat, event.lon] as [number, number])), {
        padding: [34, 34],
        maxZoom: 6,
        animate: false,
      });
    } else {
      map.setView([22.7, 79.2], 5, { animate: false });
    }
  }, [events]);

  return <div ref={containerRef} className="h-full min-h-[390px] w-full" role="application" aria-label="Interactive map of simulated pollution events in India" />;
}
