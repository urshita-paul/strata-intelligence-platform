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

interface LiveDashboardMapProps {
  stations: Station[];
}

function stationPopup(station: Station) {
  const container = document.createElement("div");

  const heading = document.createElement("strong");
  heading.textContent = station.station_name;
  container.appendChild(heading);

  const details = [
    `${station.parameter_name}: ${station.mean.toFixed(2)} ${station.unit}`,
    `City: ${station.city_name}`,
    `State: ${station.state_name}`,
    `Hourly observations: ${station.n}`,
    `Coverage: ${station.coverage_flag.replaceAll("_", " ")}`,
  ];

  details.forEach((detail) => {
    const line = document.createElement("div");
    line.textContent = detail;
    container.appendChild(line);
  });

  return container;
}

export default function LiveDashboardMap({
  stations,
}: LiveDashboardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: [22.7, 79.2],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });

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

    stations.forEach((station) => {
      const marker = L.circleMarker(
        [station.latitude, station.longitude],
        {
          radius: 7,
          color: "#ffffff",
          weight: 1.5,
          fillColor: "#0f766e",
          fillOpacity: 0.9,
        }
      );

      marker.bindPopup(stationPopup(station));
      marker.addTo(markers);
    });

    if (stations.length > 0) {
      map.fitBounds(
        L.latLngBounds(
          stations.map(
            (station) =>
              [station.latitude, station.longitude] as [number, number]
          )
        ),
        {
          padding: [30, 30],
          maxZoom: 6,
          animate: false,
        }
      );
    } else {
      map.setView([22.7, 79.2], 5);
    }
  }, [stations]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[390px] w-full"
      role="application"
      aria-label="Map of actual CPCB monitoring station observations"
    />
  );
}