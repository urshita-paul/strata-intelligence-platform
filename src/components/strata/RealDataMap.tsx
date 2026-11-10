import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, ArrowUpRight, Crosshair, Flame, Layers3, MapPin, Satellite } from "lucide-react";
import { DatasetBadge, DatasetIcon, DetailItem, EmptyState, Panel, StatusNotice, type Dataset } from "@/components/strata/ui";

const API = import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000";

type Station = { station_id: string; station_name: string; state_name: string; city_name: string; latitude: number; longitude: number; parameter_name: string; mean: number; unit: string; n: number; coverage_flag: string };
type SatellitePoint = { point_id: string; grid_lat: number; grid_lon: number; pollutant: string; unit: string; window_start: string; window_end_exclusive: string; anomaly_difference: number | null; anomaly_z_score: number | null; anomaly_direction: string | null; score_available: boolean; negative_retrieval: boolean; [key: string]: unknown };
type Fire = { latitude: number; longitude: number; date: string; acq_time: string; satellite: string; confidence: string; frp: number; daynight: string; type: number };
type SelectedObservation = { dataset: "CPCB"; key: string; record: Station } | { dataset: "Sentinel-5P"; key: string; record: SatellitePoint } | { dataset: "VIIRS"; key: string; record: Fire };

function popup(dataset: Dataset, title: string, reading: string, details: string[]) {
  const container = document.createElement("div");
  container.className = "map-popup";
  const source = document.createElement("div");
  source.className = "map-popup__source";
  source.textContent = dataset;
  const heading = document.createElement("div");
  heading.className = "map-popup__heading";
  heading.textContent = title;
  const measurement = document.createElement("div");
  measurement.className = "map-popup__reading";
  measurement.textContent = reading;
  const detailList = document.createElement("div");
  detailList.className = "map-popup__details";
  details.forEach((detail) => { const line = document.createElement("div"); line.textContent = detail; detailList.appendChild(line); });
  container.append(source, heading, measurement, detailList);
  return container;
}

function satelliteColour(point: SatellitePoint) {
  if (point.negative_retrieval || !point.score_available) return "var(--muted-foreground)";
  if (point.anomaly_direction === "above_baseline") return "var(--caution)";
  if (point.anomaly_direction === "below_baseline") return "var(--satellite)";
  return "var(--muted-foreground)";
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
  const [selected, setSelected] = useState<SelectedObservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mapContainer.current) return;
    const map = L.map(mapContainer.current, { center: [29.2, 75.5], zoom: 6, minZoom: 4, maxZoom: 13, zoomControl: false });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
    satelliteLayer.current = L.layerGroup().addTo(map);
    fireLayer.current = L.layerGroup().addTo(map);
    cpcbLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    fetch("/ncr-states.geojson").then((response) => {
      if (!response.ok) throw new Error("Boundary file could not be loaded.");
      return response.json();
    }).then((data) => {
      if (!mapRef.current) return;
      boundaryLayer.current = L.geoJSON(data, {
        style: () => ({ color: "var(--boundary)", weight: 1.5, opacity: 0.72, fillOpacity: 0.015, dashArray: "4 4" }),
        onEachFeature: (feature, layer) => { layer.bindTooltip(feature.properties?.shapeName ?? "State", { permanent: true, direction: "center", className: "state-label" }); },
      }).addTo(map);
    }).catch((boundaryError) => console.error("Boundary loading error:", boundaryError));
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(mapContainer.current);
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; boundaryLayer.current = null; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadData() {
      setLoading(true);
      setError("");
      setSelected(null);
      try {
        const results = await Promise.all([
          fetch(`${API}/api/cpcb?date=${date}&pollutant=${encodeURIComponent(pollutant)}`, { signal: controller.signal }),
          fetch(`${API}/api/satellite?pollutant=${satellitePollutant}&window_id=11-12`, { signal: controller.signal }),
          fetch(`${API}/api/fires?date=${date}`, { signal: controller.signal }),
        ]);
        if (results.some((response) => !response.ok)) throw new Error("One or more environmental data requests failed.");
        const cpcbData = (await results[0].json()) as { stations?: Station[] };
        const satelliteData = (await results[1].json()) as { points?: SatellitePoint[] };
        const fireData = (await results[2].json()) as { detections?: Fire[] };
        setStations(cpcbData.stations ?? []);
        setSatellitePoints(satelliteData.points ?? []);
        setFires(fireData.detections ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Unable to load environmental data. Check the data service connection and try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadData();
    return () => controller.abort();
  }, [date, pollutant, satellitePollutant]);

  useEffect(() => {
    const cpcb = cpcbLayer.current;
    const satellite = satelliteLayer.current;
    const fire = fireLayer.current;
    if (!cpcb || !satellite || !fire) return;
    cpcb.clearLayers();
    satellite.clearLayers();
    fire.clearLayers();
    if (showSatellite) satellitePoints.forEach((point) => {
      const marker = L.circleMarker([point.grid_lat, point.grid_lon], { radius: 5, color: "var(--background)", weight: 1, fillColor: satelliteColour(point), fillOpacity: 0.88, bubblingMouseEvents: false });
      marker.bindPopup(popup("Sentinel-5P", `${point.pollutant} grid observation`, point.anomaly_z_score === null ? "Z-score unavailable" : `Diagnostic Z-score · ${point.anomaly_z_score.toFixed(3)}`, [`Grid: ${point.point_id}`, `Direction: ${point.anomaly_direction?.replaceAll("_", " ") ?? "Unavailable"}`, `Negative retrieval: ${point.negative_retrieval ? "Yes" : "No"}`, `Composite: ${point.window_start} to ${point.window_end_exclusive}`]));
      marker.on("click", () => setSelected({ dataset: "Sentinel-5P", key: point.point_id, record: point }));
      marker.addTo(satellite);
    });
    if (showFires) fires.forEach((detection, index) => {
      const key = `${index}-${detection.date}-${detection.acq_time}-${detection.latitude}-${detection.longitude}`;
      const marker = L.circleMarker([detection.latitude, detection.longitude], { radius: 4.5, color: "var(--background)", weight: 1, fillColor: "var(--fire)", fillOpacity: 0.9, bubblingMouseEvents: false });
      marker.bindPopup(popup("VIIRS", "Satellite fire detection", `${detection.frp.toFixed(2)} MW · FRP`, [`${detection.date} · ${detection.acq_time} UTC`, `Satellite: ${detection.satellite}`, `Confidence: ${detection.confidence}`, `Day/night: ${detection.daynight}`]));
      marker.on("click", () => setSelected({ dataset: "VIIRS", key, record: detection }));
      marker.addTo(fire);
    });
    if (showCpcb) stations.forEach((station) => {
      const marker = L.circleMarker([station.latitude, station.longitude], { radius: 7.5, color: "var(--background)", weight: 2, fillColor: "var(--primary)", fillOpacity: 0.96, bubblingMouseEvents: false });
      marker.bindPopup(popup("CPCB", station.station_name, `${station.parameter_name} · ${station.mean.toFixed(2)} ${station.unit}`, [`${station.city_name}, ${station.state_name}`, `${station.n} hourly observations`, `Coverage: ${station.coverage_flag.replaceAll("_", " ")}`]));
      marker.on("click", () => setSelected({ dataset: "CPCB", key: station.station_id, record: station }));
      marker.addTo(cpcb);
    });
  }, [stations, satellitePoints, fires, showCpcb, showSatellite, showFires]);

  const layerControls: { label: string; dataset: Dataset; count: number; checked: boolean; onChange: (value: boolean) => void }[] = [
    { label: "CPCB stations", dataset: "CPCB", count: stations.length, checked: showCpcb, onChange: setShowCpcb },
    { label: "Sentinel-5P grid", dataset: "Sentinel-5P", count: satellitePoints.length, checked: showSatellite, onChange: setShowSatellite },
    { label: "VIIRS detections", dataset: "VIIRS", count: fires.length, checked: showFires, onChange: setShowFires },
  ];

  return <div className="space-y-4">
    <Panel title="Map parameters" description="Daily ground and fire observations share the selected date; satellite data uses its composite window.">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="control-label">CPCB / VIIRS date<input type="date" value={date} min="2024-11-09" max="2024-11-17" onChange={(event) => setDate(event.target.value)} className="control-input w-full" /></label>
        <label className="control-label">CPCB pollutant<select value={pollutant} onChange={(event) => setPollutant(event.target.value)} className="control-input w-full"><option>PM2.5</option><option>PM10</option><option>NO2</option><option>CO</option></select></label>
        <label className="control-label">Sentinel-5P pollutant<select value={satellitePollutant} onChange={(event) => setSatellitePollutant(event.target.value)} className="control-input w-full"><option value="NO2">NO₂</option><option value="HCHO">HCHO</option></select></label>
      </div>
      {error && <StatusNotice tone="error" className="mt-4" title="Map data unavailable">{error}</StatusNotice>}
    </Panel>

    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_330px]">
      <Panel title="Geospatial observation workspace" description="Select any marker to inspect its exact source record" action={<span className="hidden items-center gap-2 text-[10px] text-muted-foreground sm:flex"><Crosshair className="h-3.5 w-3.5 text-primary" />Interactive observation map</span>} contentClassName="p-3 sm:p-3">
        <div className="mb-3 grid gap-2 sm:grid-cols-3">{layerControls.map((layer) => <label key={layer.dataset} className="flex cursor-pointer items-center gap-2.5 rounded-md border bg-surface/65 px-3 py-2.5 transition-colors hover:border-primary/35"><input type="checkbox" checked={layer.checked} onChange={(event) => layer.onChange(event.target.checked)} className="h-3.5 w-3.5 accent-primary" /><DatasetIcon dataset={layer.dataset} /><span className="min-w-0 flex-1 truncate text-xs font-medium">{layer.label}</span><span className="font-mono text-[10px] text-muted-foreground">{layer.count}</span></label>)}</div>
        <div className="relative"><div ref={mapContainer} className="h-[520px] w-full overflow-hidden rounded-lg border border-border sm:h-[620px]" role="application" aria-label="Historical environmental intelligence map" />{loading && <div className="absolute inset-0 z-[500] flex items-center justify-center rounded-lg bg-background/65 backdrop-blur-[2px]"><div className="flex items-center gap-2 rounded-md border bg-popover px-4 py-3 text-xs shadow-[var(--shadow-float)]"><Layers3 className="h-4 w-4 animate-pulse text-primary" />Refreshing observation layers…</div></div>}</div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 rounded-md border bg-surface/55 px-3 py-2.5 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" />CPCB source</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-caution" />Sentinel above baseline</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-fire" />VIIRS detection</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-satellite" />Sentinel below baseline</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />Unscored / negative retrieval</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-3 border border-dashed border-boundary" />Administrative boundary</span>
        </div>
      </Panel>

      <Panel title="Selected observation" description="Exact record details and source context" contentClassName="p-3 sm:p-3">
        {!selected ? <EmptyState icon={<MapPin className="h-5 w-5" />} title="Select a map marker" description="Station measurements, satellite baseline context or fire-detection metadata will appear here." className="min-h-[420px]" /> : <div>
          <div className="rounded-lg border bg-surface/60 p-4"><DatasetBadge dataset={selected.dataset} /><h2 className="mt-3 text-base font-semibold leading-snug">{selected.dataset === "CPCB" ? selected.record.station_name : selected.dataset === "Sentinel-5P" ? `${selected.record.pollutant} grid observation` : "VIIRS fire detection"}</h2><p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">{selected.key}</p></div>
          {selected.dataset === "CPCB" && <div className="mt-3 grid grid-cols-2 gap-2"><DetailItem label="Reported mean" mono className="col-span-2">{selected.record.mean.toFixed(2)} {selected.record.unit}</DetailItem><DetailItem label="Pollutant">{selected.record.parameter_name}</DetailItem><DetailItem label="Samples" mono>{selected.record.n}</DetailItem><DetailItem label="Location" className="col-span-2">{selected.record.city_name}, {selected.record.state_name}</DetailItem><DetailItem label="Coordinates" mono className="col-span-2">{selected.record.latitude.toFixed(5)}, {selected.record.longitude.toFixed(5)}</DetailItem><DetailItem label="Coverage" className="col-span-2">{selected.record.coverage_flag.replaceAll("_", " ")}</DetailItem></div>}
          {selected.dataset === "Sentinel-5P" && <div className="mt-3 grid grid-cols-2 gap-2"><DetailItem label="Direction" className="col-span-2">{selected.record.anomaly_direction?.replaceAll("_", " ") ?? "Unavailable"}</DetailItem><DetailItem label="Diagnostic Z-score" mono>{selected.record.anomaly_z_score?.toFixed(3) ?? "Unavailable"}</DetailItem><DetailItem label="Negative retrieval">{selected.record.negative_retrieval ? "Yes" : "No"}</DetailItem><DetailItem label="Coordinates" mono className="col-span-2">{selected.record.grid_lat.toFixed(5)}, {selected.record.grid_lon.toFixed(5)}</DetailItem><DetailItem label="Composite period" className="col-span-2">{selected.record.window_start} to {selected.record.window_end_exclusive} (end exclusive)</DetailItem></div>}
          {selected.dataset === "VIIRS" && <div className="mt-3 grid grid-cols-2 gap-2"><DetailItem label="Fire radiative power" mono className="col-span-2">{selected.record.frp.toFixed(2)} MW</DetailItem><DetailItem label="Confidence">{selected.record.confidence}</DetailItem><DetailItem label="Day / night">{selected.record.daynight}</DetailItem><DetailItem label="Coordinates" mono className="col-span-2">{selected.record.latitude.toFixed(5)}, {selected.record.longitude.toFixed(5)}</DetailItem><DetailItem label="Acquisition" className="col-span-2">{selected.record.date} · {selected.record.acq_time} UTC</DetailItem></div>}
          <Link to="/events" search={{ dataset: selected.dataset, q: "", id: selected.key }} className="primary-button mt-3 w-full">Open exact observation<ArrowUpRight className="h-3.5 w-3.5" /></Link>
          {selected.dataset === "Sentinel-5P" && <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">Atmospheric column observations are not direct ground-level exposure measurements. Colour shows baseline direction only.</p>}
        </div>}
      </Panel>
    </div>
    <StatusNotice title="Geospatial methodology">CPCB and VIIRS use the selected daily date. Sentinel-5P uses 12–18 November 2024, end date exclusive. Marker colour identifies source or baseline direction, not a validated pollution-risk class. Administrative boundaries: geoBoundaries, India ADM1 (2011), CC BY 2.5 IN.</StatusNotice>
  </div>;
}
