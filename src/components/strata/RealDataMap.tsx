
import L from "leaflet";
import { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

type Station = {
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

type SatellitePoint = {
  point_id: string;
  grid_lat: number;
  grid_lon: number;
  pollutant: string;
  unit: string;
  window_start: string;
  window_end_exclusive: string;
  anomaly_difference: number | null;
  anomaly_z_score: number | null;
  anomaly_direction: string | null;
  score_available: boolean;
  negative_retrieval: boolean;
  [key: string]: unknown;
};

type Fire = {
  latitude: number;
  longitude: number;
  date: string;
  acq_time: string;
  satellite: string;
  confidence: string;
  frp: number;
  daynight: string;
  type: number;
};

function popup(title: string, details: string[]) {
  const container = document.createElement("div");
  const heading = document.createElement("strong");
  heading.textContent = title;
  container.appendChild(heading);

  details.forEach((detail) => {
    const line = document.createElement("div");
    line.textContent = detail;
    container.appendChild(line);
  });

  return container;
}

function cpcbColour(value: number) {
  if (value <= 30) return "#22c55e";
  if (value <= 60) return "#84cc16";
  if (value <= 90) return "#eab308";
  if (value <= 120) return "#f97316";
  if (value <= 250) return "#ef4444";
  return "#7f1d1d";
}

function anomalyColour(z: number | null) {
  if (z === null) return "#94a3b8";
  if (z >= 2) return "#ef4444";
  if (z >= 0) return "#f97316";
  if (z <= -2) return "#2563eb";
  return "#38bdf8";
}

export default function RealDataMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const cpcbLayer = useRef<L.LayerGroup | null>(null);
  const satelliteLayer = useRef<L.LayerGroup | null>(null);
  const fireLayer = useRef<L.LayerGroup | null>(null);
  const boundaryLayer = useRef<L.GeoJSON | null>(null);

  const [date, setDate] = useState("2024-11-17");
  const [pollutant, setPollutant] = useState("PM2.5");
  const [satellitePollutant, setSatellitePollutant] = useState("NO2");

  const [showCpcb, setShowCpcb] = useState(true);
  const [showSatellite, setShowSatellite] = useState(true);
  const [showFires, setShowFires] = useState(true);

  const [stations, setStations] = useState<Station[]>([]);
  const [satellitePoints, setSatellitePoints] = useState<SatellitePoint[]>([]);
  const [fires, setFires] = useState<Fire[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Initialize the Leaflet map once.
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = L.map(mapContainer.current, {
      center: [29.2, 75.5],
      zoom: 6,
      minZoom: 4,
      maxZoom: 13,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    cpcbLayer.current = L.layerGroup().addTo(map);
    satelliteLayer.current = L.layerGroup().addTo(map);
    fireLayer.current = L.layerGroup().addTo(map);

    mapRef.current = map;
// Load real administrative boundaries for Delhi, Haryana and Punjab.
fetch("/ncr-states.geojson")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Boundary file could not be loaded.");
    }
    return response.json();
  })
  .then((data) => {
    if (!mapRef.current) return;

    boundaryLayer.current = L.geoJSON(data, {
      style: () => ({
        color: "#facc15",
        weight: 2.5,
        opacity: 0.95,
        fillOpacity: 0.03,
      }),
      onEachFeature: (feature, layer) => {
        const stateName = feature.properties?.shapeName ?? "State";
        layer.bindTooltip(stateName, {
          permanent: true,
          direction: "center",
          className: "state-label",
        });
      },
    }).addTo(map);
  })
  .catch((error) => console.error("Boundary loading error:", error));

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });

    observer.observe(mapContainer.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      boundaryLayer.current = null;
    };
  }, []);

  // Fetch all three datasets.
  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const results = await Promise.all([
          fetch(
            `${API}/api/cpcb?date=${date}&pollutant=${encodeURIComponent(pollutant)}`,
            { signal: controller.signal }
          ),
          fetch(
            `${API}/api/satellite?pollutant=${satellitePollutant}&window_id=11-12`,
            { signal: controller.signal }
          ),
          fetch(
            `${API}/api/fires?date=${date}`,
            { signal: controller.signal }
          ),
        ]);

        if (results.some((response) => !response.ok)) {
          throw new Error("One or more API requests failed.");
        }

        const cpcbData = await results[0].json();
        const satelliteData = await results[1].json();
        const fireData = await results[2].json();

        setStations(cpcbData.stations || []);
        setSatellitePoints(satelliteData.points || []);
        setFires(fireData.detections || []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Unable to load environmental data. Check that the backend is running.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, [date, pollutant, satellitePollutant]);

  // Update the three independent map layers.
  useEffect(() => {
    const cpcb = cpcbLayer.current;
    const satellite = satelliteLayer.current;
    const fire = fireLayer.current;

    if (!cpcb || !satellite || !fire) return;

    cpcb.clearLayers();
    satellite.clearLayers();
    fire.clearLayers();

    stations.forEach((station) => {
      const marker = L.circleMarker(
        [station.latitude, station.longitude],
        {
          radius: 7,
          color: "#ffffff",
          weight: 1,
          fillColor: cpcbColour(station.mean),
          fillOpacity: showCpcb ? 0.9 : 0,
          opacity: showCpcb ? 1 : 0,
        }
      );

      marker.bindPopup(
        popup(station.station_name, [
          `${station.parameter_name}: ${station.mean.toFixed(2)} ${station.unit}`,
          `City: ${station.city_name}`,
          `State: ${station.state_name}`,
          `Hourly observations: ${station.n}`,
          `Coverage: ${station.coverage_flag}`,
        ])
      );

      marker.addTo(cpcb);
    });

    satellitePoints.forEach((point) => {
      const z = point.anomaly_z_score;
      const marker = L.circleMarker(
        [point.grid_lat, point.grid_lon],
        {
          radius: 4,
          color: anomalyColour(z),
          weight: 1,
          fillColor: anomalyColour(z),
          fillOpacity: showSatellite ? 0.7 : 0,
          opacity: showSatellite ? 1 : 0,
        }
      );

      marker.bindPopup(
        popup(`${point.pollutant} satellite observation`, [
          `Grid: ${point.point_id}`,
          `Anomaly z-score: ${z === null ? "Unavailable" : z.toFixed(3)}`,
          `Anomaly difference: ${point.anomaly_difference ?? "Unavailable"}`,
          `Direction: ${point.anomaly_direction ?? "Unavailable"}`,
          `Scored: ${point.score_available ? "Yes" : "No"}`,
          `Composite: ${point.window_start} to ${point.window_end_exclusive}`,
        ])
      );

      marker.addTo(satellite);
    });

    fires.forEach((detection) => {
      const marker = L.circleMarker(
        [detection.latitude, detection.longitude],
        {
          radius: 4,
          color: "#ffffff",
          weight: 0.5,
          fillColor: "#ff5722",
          fillOpacity: showFires ? 0.85 : 0,
          opacity: showFires ? 1 : 0,
        }
      );

      marker.bindPopup(
        popup("VIIRS fire detection", [
          `Date: ${detection.date}`,
          `Time: ${detection.acq_time} UTC`,
          `Satellite: ${detection.satellite}`,
          `Confidence: ${detection.confidence}`,
          `FRP: ${detection.frp} MW`,
          `Day/night: ${detection.daynight}`,
        ])
      );

      marker.addTo(fire);
    });
  }, [
    stations,
    satellitePoints,
    fires,
    showCpcb,
    showSatellite,
    showFires,
  ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-muted-foreground">
          Date
          <input
            type="date"
            value={date}
            min="2024-11-09"
            max="2024-11-17"
            onChange={(e) => setDate(e.target.value)}
            className="ml-2 rounded border border-border bg-background p-2 text-foreground"
          />
        </label>

        <label className="text-xs text-muted-foreground">
          CPCB pollutant
          <select
            value={pollutant}
            onChange={(e) => setPollutant(e.target.value)}
            className="ml-2 rounded border border-border bg-background p-2 text-foreground"
          >
            <option>PM2.5</option>
            <option>PM10</option>
            <option>NO2</option>
            <option>CO</option>
          </select>
        </label>

        <label className="text-xs text-muted-foreground">
          Satellite
          <select
            value={satellitePollutant}
            onChange={(e) => setSatellitePollutant(e.target.value)}
            className="ml-2 rounded border border-border bg-background p-2 text-foreground"
          >
            <option value="NO2">NO₂</option>
            <option value="HCHO">HCHO</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showCpcb} onChange={(e) => setShowCpcb(e.target.checked)} />
          CPCB stations
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showSatellite} onChange={(e) => setShowSatellite(e.target.checked)} />
          Sentinel-5P
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showFires} onChange={(e) => setShowFires(e.target.checked)} />
          VIIRS fires
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>CPCB: {stations.length} stations</span>
        <span>Satellite: {satellitePoints.length} grid points</span>
        <span>VIIRS: {fires.length} detections</span>
        {loading && <span>Loading data…</span>}
      </div>

      {error && (
        <div className="rounded border border-red-500/40 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
<div className="flex flex-wrap gap-x-5 gap-y-2 rounded-md border border-border bg-background p-3 text-xs">
  <span className="font-semibold">MAP LEGEND</span>

  <span className="flex items-center gap-2">
    <span className="h-3 w-3 rounded-full bg-red-500" />
    CPCB ground stations
  </span>

  <span className="flex items-center gap-2">
    <span className="h-3 w-3 rounded-full bg-blue-500" />
    Sentinel-5P below baseline
  </span>

  <span className="flex items-center gap-2">
    <span className="h-3 w-3 rounded-full bg-orange-500" />
    Sentinel-5P above baseline
  </span>

  <span className="flex items-center gap-2">
    <span className="h-3 w-3 rounded-full bg-orange-600" />
    VIIRS fire detections
  </span>

  <span className="flex items-center gap-2">
    <span className="h-3 w-3 border-2 border-yellow-400" />
    State boundaries
  </span>
</div>
      <div
        ref={mapContainer}
        className="h-[620px] w-full overflow-hidden rounded-md border border-border"
        role="application"
        aria-label="Historical environmental intelligence map"
      />

      <p className="text-xs text-muted-foreground">
        Historical replay: CPCB and VIIRS use the selected daily date.
        Sentinel-5P uses the November 12–18 composite window (end date exclusive).
        Fire detections are satellite observations, not unique confirmed fires.
      </p>
      <p className="text-xs text-muted-foreground">
  Administrative boundaries: geoBoundaries, India ADM1 (2011),
  CC BY 2.5 IN. CPCB archive, Sentinel-5P and NASA FIRMS VIIRS
  observations are historical datasets.
</p>
    </div>
  );
}
