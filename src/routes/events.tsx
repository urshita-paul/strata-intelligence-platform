import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowUpRight, Crosshair, Flame, MapPinned, Satellite, Search, ShieldAlert, X } from "lucide-react";
import type { Station } from "@/components/strata/LiveDashboardMap";
import { DatasetBadge, DatasetIcon, DetailItem, EmptyState, FilterChip, LoadingRows, PageHeader, Panel, StatCard, StatusNotice, type Dataset } from "@/components/strata/ui";

const API = import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000";
const isDataset = (value: unknown): value is Dataset => value === "CPCB" || value === "Sentinel-5P" || value === "VIIRS";
type SatellitePoint = { point_id: string; grid_lat: number; grid_lon: number; pollutant: string; unit: string; window_start: string; window_end_exclusive: string; anomaly_difference: number | null; anomaly_z_score: number | null; anomaly_direction: string | null; score_available: boolean; negative_retrieval: boolean };
type Fire = { latitude: number; longitude: number; date: string; acq_time: string; satellite: string; confidence: string; frp: number; daynight: string; type: number };
type ObservationRecord = Station | SatellitePoint | Fire;
type ObservationRow = { key: string; title: string; subtitle: string; value: string; meta: string; record: ObservationRecord };

export const Route = createFileRoute("/events")({
  validateSearch: (search: Record<string, unknown>) => ({
    dataset: isDataset(search["dataset"]) ? search["dataset"] : "CPCB",
    q: typeof search["q"] === "string" ? search["q"] : "",
    id: typeof search["id"] === "string" ? search["id"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Event Intelligence — STRATA" },
      { name: "description", content: "Investigate exact CPCB, Sentinel-5P and VIIRS environmental observation records in a professional intelligence workspace." },
      { property: "og:title", content: "Event Intelligence — STRATA" },
      { property: "og:description", content: "Search, select and inspect historical environmental observations across three sources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const routeSearch = Route.useSearch();
  const [dataset, setDataset] = useState<Dataset>("CPCB");
  const [date, setDate] = useState("2024-11-17");
  const [pollutant, setPollutant] = useState("PM2.5");
  const [satellitePollutant, setSatellitePollutant] = useState("NO2");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [stations, setStations] = useState<Station[]>([]);
  const [satellitePoints, setSatellitePoints] = useState<SatellitePoint[]>([]);
  const [fires, setFires] = useState<Fire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setDataset(routeSearch.dataset);
    setQuery(routeSearch.q);
    setSelectedId(routeSearch.id);
  }, [routeSearch.dataset, routeSearch.q, routeSearch.id]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const responses = await Promise.all([
          fetch(`${API}/api/cpcb?date=${date}&pollutant=${encodeURIComponent(pollutant)}`, { signal: controller.signal }),
          fetch(`${API}/api/satellite?pollutant=${satellitePollutant}&window_id=11-12`, { signal: controller.signal }),
          fetch(`${API}/api/fires?date=${date}`, { signal: controller.signal }),
        ]);
        if (responses.some((response) => !response.ok)) throw new Error("One or more environmental data requests failed.");
        const cpcbData = (await responses[0].json()) as { stations?: Station[] };
        const satelliteData = (await responses[1].json()) as { points?: SatellitePoint[] };
        const fireData = (await responses[2].json()) as { detections?: Fire[] };
        setStations(cpcbData.stations ?? []);
        setSatellitePoints(satelliteData.points ?? []);
        setFires(fireData.detections ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unable to load environmental observations.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadData();
    return () => controller.abort();
  }, [date, pollutant, satellitePollutant]);

  const allRows = useMemo<ObservationRow[]>(() => {
    if (dataset === "CPCB") return stations.map((station) => ({ key: station.station_id, title: station.station_name, subtitle: `${station.city_name}, ${station.state_name}`, value: `${station.mean.toFixed(2)} ${station.unit}`, meta: `${station.n} hourly observations · ${station.coverage_flag.replaceAll("_", " ")}`, record: station }));
    if (dataset === "Sentinel-5P") return satellitePoints.map((point) => ({ key: point.point_id, title: point.point_id, subtitle: `${point.grid_lat.toFixed(4)}, ${point.grid_lon.toFixed(4)}`, value: point.negative_retrieval ? "Negative retrieval flagged" : point.anomaly_z_score === null ? "Score unavailable" : `Z-score ${point.anomaly_z_score.toFixed(3)}`, meta: `${point.pollutant} · ${point.anomaly_direction?.replaceAll("_", " ") ?? "Direction unavailable"}`, record: point }));
    return fires.map((fire, index) => ({ key: `${index}-${fire.date}-${fire.acq_time}-${fire.latitude}-${fire.longitude}`, title: `VIIRS detection ${index + 1}`, subtitle: `${fire.latitude.toFixed(4)}, ${fire.longitude.toFixed(4)}`, value: `${fire.frp.toFixed(2)} MW`, meta: `${fire.date} · ${fire.acq_time} UTC · ${fire.confidence} confidence`, record: fire }));
  }, [dataset, stations, satellitePoints, fires]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return allRows;
    return allRows.filter((row) => `${row.key} ${row.title} ${row.subtitle} ${row.value} ${row.meta}`.toLowerCase().includes(search));
  }, [allRows, query]);
  const selectedRow = filteredRows.find((row) => row.key === selectedId) ?? filteredRows[0];
  const displayedRows = filteredRows.slice(0, 100);
  const counts: Record<Dataset, number> = { CPCB: stations.length, "Sentinel-5P": satellitePoints.length, VIIRS: fires.length };

  return <>
    <PageHeader eyebrow="Observation investigation workspace" title="Event Intelligence" subtitle="Search and inspect individual ground measurements, atmospheric grid observations and satellite fire detections with full source context." actions={<Link to="/map" className="secondary-button">Open geospatial map<ArrowUpRight className="h-3.5 w-3.5" /></Link>} />

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard label="CPCB Stations" value={String(stations.length)} delta={`${pollutant} · ${date}`} icon={<Activity className="h-4 w-4" />} accent="primary" loading={loading} />
      <StatCard label="Satellite Grid" value={String(satellitePoints.length)} delta={`${satellitePollutant} · composite observations`} icon={<Satellite className="h-4 w-4" />} accent="satellite" loading={loading} />
      <StatCard label="VIIRS Detections" value={String(fires.length)} delta={`Satellite records · ${date}`} icon={<Flame className="h-4 w-4" />} accent="fire" loading={loading} />
    </div>

    <Panel title="Observation parameters" description="Source tabs preserve exact record identifiers used by global search and map selection." className="mt-4">
      <div className="flex flex-wrap gap-2 border-b pb-4" aria-label="Observation source">{(["CPCB", "Sentinel-5P", "VIIRS"] as Dataset[]).map((item) => <FilterChip key={item} active={dataset === item} count={counts[item]} onClick={() => { setDataset(item); setQuery(""); setSelectedId(""); }}><span className="flex items-center gap-2"><DatasetIcon dataset={item} className="h-3.5 w-3.5" />{item}</span></FilterChip>)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(dataset === "CPCB" || dataset === "VIIRS") && <label className="control-label">Observation date<input type="date" value={date} min="2024-11-09" max="2024-11-17" onChange={(event) => setDate(event.target.value)} className="control-input w-full" /></label>}
        {dataset === "CPCB" && <label className="control-label">CPCB pollutant<select value={pollutant} onChange={(event) => setPollutant(event.target.value)} className="control-input w-full"><option>PM2.5</option><option>PM10</option><option>NO2</option><option>CO</option></select></label>}
        {dataset === "Sentinel-5P" && <><label className="control-label">Satellite pollutant<select value={satellitePollutant} onChange={(event) => setSatellitePollutant(event.target.value)} className="control-input w-full"><option value="NO2">NO₂</option><option value="HCHO">HCHO</option></select></label><div className="flex items-center rounded-md border bg-surface/50 px-3 text-xs leading-relaxed text-muted-foreground">Composite period<br /><strong className="ml-1 font-mono font-medium text-foreground">12–18 Nov 2024</strong></div></>}
      </div>
      {error && <StatusNotice tone="error" title="Observation data unavailable" className="mt-4">{error}</StatusNotice>}
    </Panel>

    <div className="mt-4 grid items-start gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Panel title={`${dataset} observation index`} description={`${filteredRows.length} matching records${filteredRows.length > 100 ? " · first 100 shown" : ""}`} contentClassName="p-3 sm:p-3">
        <div className="relative mb-3"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ID, place, value or metadata…" aria-label={`Search ${dataset} observations`} className="control-input w-full pl-9 pr-9" />{query && <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Clear observation search"><X className="h-3.5 w-3.5" /></button>}</div>
        {loading ? <LoadingRows count={6} /> : <div className="max-h-[700px] space-y-1.5 overflow-y-auto pr-0.5">{displayedRows.map((row) => <button key={row.key} onClick={() => setSelectedId(row.key)} aria-pressed={selectedRow?.key === row.key} className={`w-full rounded-md border px-3 py-3 text-left transition-all ${selectedRow?.key === row.key ? "border-primary/55 bg-primary/[0.08] shadow-[inset_2px_0_0_var(--primary)]" : "border-border/55 bg-surface/35 hover:border-primary/30 hover:bg-accent/55"}`}><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium leading-snug">{row.title}</div><div className="mt-1 truncate text-[11px] text-muted-foreground">{row.subtitle}</div></div><Crosshair className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${selectedRow?.key === row.key ? "text-primary" : "text-muted-foreground/50"}`} /></div><div className="mt-2.5 font-mono text-xs font-medium text-primary">{row.value}</div><div className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{row.meta}</div></button>)}{filteredRows.length === 0 && <EmptyState icon={<Search className="h-5 w-5" />} title="No matching observations" description="Try a different record ID, location, measurement or source." />}</div>}
      </Panel>

      <div className="space-y-4">
        <Panel title="Selected observation" description="Measurement values and source metadata for analyst review">
          {!selectedRow ? <EmptyState icon={<Crosshair className="h-5 w-5" />} title={loading ? "Loading observations" : "Select an observation"} description={loading ? "The selected source records are being retrieved." : "Choose a record from the observation index to inspect its details."} /> : <>
            <div className="rounded-lg border bg-surface/55 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><DatasetBadge dataset={dataset} /><span className="break-all font-mono text-[10px] text-muted-foreground">{selectedRow.key}</span></div><h2 className="mt-4 text-xl font-semibold sm:text-2xl">{selectedRow.title}</h2><p className="mt-2 text-sm text-muted-foreground">{selectedRow.subtitle}</p><div className="mt-5 border-t pt-4"><div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Primary measurement / diagnostic</div><div className="mt-2 font-mono text-xl font-medium text-primary">{selectedRow.value}</div></div></div>

            {dataset === "CPCB" && "station_id" in selectedRow.record && <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3"><DetailItem label="Reported mean" mono>{selectedRow.record.mean.toFixed(2)} {selectedRow.record.unit}</DetailItem><DetailItem label="Pollutant" mono>{selectedRow.record.parameter_name}</DetailItem><DetailItem label="Hourly observations" mono>{selectedRow.record.n}</DetailItem><DetailItem label="Station ID" mono>{selectedRow.record.station_id}</DetailItem><DetailItem label="City / State">{selectedRow.record.city_name}, {selectedRow.record.state_name}</DetailItem><DetailItem label="Coverage flag">{selectedRow.record.coverage_flag.replaceAll("_", " ")}</DetailItem></div>}
            {dataset === "Sentinel-5P" && "point_id" in selectedRow.record && <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3"><DetailItem label="Pollutant">{selectedRow.record.pollutant}</DetailItem><DetailItem label="Anomaly Z-score" mono>{selectedRow.record.anomaly_z_score === null ? "Unavailable" : selectedRow.record.anomaly_z_score.toFixed(3)}</DetailItem><DetailItem label="Anomaly difference" mono>{selectedRow.record.anomaly_difference ?? "Unavailable"}</DetailItem><DetailItem label="Direction">{selectedRow.record.anomaly_direction?.replaceAll("_", " ") ?? "Unavailable"}</DetailItem><DetailItem label="Score available">{selectedRow.record.score_available ? "Yes" : "No"}</DetailItem><DetailItem label="Negative retrieval">{selectedRow.record.negative_retrieval ? "Yes" : "No"}</DetailItem><DetailItem label="Composite period" className="col-span-2 md:col-span-3">{selectedRow.record.window_start} to {selectedRow.record.window_end_exclusive} (end date exclusive)</DetailItem></div>}
            {dataset === "VIIRS" && "frp" in selectedRow.record && <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3"><DetailItem label="Detection date">{selectedRow.record.date}</DetailItem><DetailItem label="Acquisition time" mono>{selectedRow.record.acq_time} UTC</DetailItem><DetailItem label="Fire radiative power" mono>{selectedRow.record.frp.toFixed(2)} MW</DetailItem><DetailItem label="Satellite">{selectedRow.record.satellite}</DetailItem><DetailItem label="Confidence">{selectedRow.record.confidence}</DetailItem><DetailItem label="Day / night">{selectedRow.record.daynight}</DetailItem><DetailItem label="Detection type" mono>{selectedRow.record.type}</DetailItem></div>}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-surface/55 p-4"><div className="flex items-start gap-3"><MapPinned className="mt-0.5 h-4 w-4 text-primary" /><div><div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Geographic coordinates</div><div className="mt-1.5 font-mono text-sm">{"station_id" in selectedRow.record ? `${selectedRow.record.latitude}, ${selectedRow.record.longitude}` : "point_id" in selectedRow.record ? `${selectedRow.record.grid_lat}, ${selectedRow.record.grid_lon}` : `${selectedRow.record.latitude}, ${selectedRow.record.longitude}`}</div></div></div><Link to="/map" className="secondary-button min-h-8 text-[11px]">Open map<ArrowUpRight className="h-3 w-3" /></Link></div>
            {dataset === "Sentinel-5P" && <StatusNotice className="mt-3">Sentinel-5P atmospheric column measurements are not direct ground-level exposure measurements. Z-scores are diagnostics, not pollution-risk scores.</StatusNotice>}
          </>}
        </Panel>

        <Panel title="Predictive assessment" description="Integration status"><div className="flex items-start gap-3 rounded-md border border-dashed bg-surface/35 p-4"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-caution" /><div><div className="text-sm font-semibold">Pending model integration</div><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">XGBoost risk classification, future predictions and SHAP explanations are not connected to this observation. No predictive assessment is currently issued.</p></div></div></Panel>
      </div>
    </div>
    <StatusNotice className="mt-4" title="Observation limitations">CPCB records are reported station-level means. Sentinel-5P records are composite-period atmospheric columns. VIIRS records are detections, not necessarily unique confirmed fires. An observation alone does not establish an incident, its cause or population impact.</StatusNotice>
  </>;
}
