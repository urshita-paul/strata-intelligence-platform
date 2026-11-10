import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowUpRight, BarChart3, CalendarDays, Database, Flame, MapPinned, RefreshCw, Satellite } from "lucide-react";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Station } from "@/components/strata/LiveDashboardMap";
import { DatasetBadge, EmptyState, StatusNotice, tooltipStyle } from "@/components/strata/ui";

import { Button } from "@/components/ui/button";
import { NexusMark } from "@/components/strata/NexusMark";
import { observationDisplay } from "@/lib/observation-display";

const LiveDashboardMap = lazy(() => import("@/components/strata/LiveDashboardMap"));
const API = import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000";
const REGIONS = ["All India", "North", "South", "East", "West", "Central"] as const;
type Region = (typeof REGIONS)[number];
const STATE_REGION: Record<string, Region> = {
  Delhi: "North", Haryana: "North", Punjab: "North", Rajasthan: "North", "Uttar Pradesh": "North", Uttarakhand: "North", "Himachal Pradesh": "North",
  Karnataka: "South", "Tamil Nadu": "South", Kerala: "South", "Andhra Pradesh": "South", Telangana: "South",
  "West Bengal": "East", Bihar: "East", Jharkhand: "East", Odisha: "East", Assam: "East",
  Maharashtra: "West", Gujarat: "West", Goa: "West", "Madhya Pradesh": "Central", Chhattisgarh: "Central",
};
type SatellitePoint = { point_id: string };

function MapLoading() {
  return <div className="map-grid flex h-full min-h-[390px] items-center justify-center"><div className="flex max-w-xs flex-col items-center gap-4 px-5 text-center"><NexusMark animated className="h-14 w-14 text-mint" /><span className="text-xs leading-relaxed text-muted-foreground">Connecting to environmental intelligence services...</span><div className="nexus-skeleton h-px w-32" /></div></div>;
}

function Measurement({ label, value, context, icon, to, loading, error }: { label: string; value: number; context: string; icon: React.ReactNode; to: "/map" | "/analytics"; loading: boolean; error: string }) {
  const display = observationDisplay(value, loading, error);
  return <Link to={to} className="nexus-measurement group" title={context} aria-label={`${label}: ${display ?? "Loading"}. ${context}`}>
    <div className="mb-3 flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-[11px] text-muted-foreground">{icon}{label}</span><ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
    {display === null ? <div className="nexus-skeleton mb-1 h-10 w-24" /> : <div className={`nexus-measurement-value ${error ? "text-sm text-muted-foreground" : "text-foreground"}`}>{display}</div>}
    <div className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{context}</div>
  </Link>;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "STRATA NEXUS Overview — Environmental Intelligence" },
      { name: "description", content: "A unified command centre for historical CPCB ground measurements, Sentinel-5P atmospheric observations and VIIRS fire detections." },
      { property: "og:title", content: "STRATA NEXUS Overview — Environmental Intelligence" },
      { property: "og:description", content: "Explore historical environmental measurements, satellite observations and fire detections in one intelligence workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommandCentre,
});

function CommandCentre() {
  const [date, setDate] = useState("2024-11-17");
  const [pollutant, setPollutant] = useState("PM2.5");
  const [satellitePollutant, setSatellitePollutant] = useState("NO2");
  const [region, setRegion] = useState<Region>("All India");
  const [stations, setStations] = useState<Station[]>([]);
  const [satellitePoints, setSatellitePoints] = useState<SatellitePoint[]>([]);
  const [fires, setFires] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

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
        if (responses.some((response) => !response.ok)) throw new Error("An environmental data request failed.");
        const cpcbData = (await responses[0].json()) as { stations?: Station[] };
        const satelliteData = (await responses[1].json()) as { points?: SatellitePoint[] };
        const fireData = (await responses[2].json()) as { detections?: unknown[] };
        setStations(cpcbData.stations ?? []);
        setSatellitePoints(satelliteData.points ?? []);
        setFires(fireData.detections ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Unable to load environmental data. Check the data service connection and try another selection.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadData();
    return () => controller.abort();
  }, [date, pollutant, satellitePollutant, retry]);

  const filteredStations = useMemo(() => stations.filter((station) => region === "All India" || STATE_REGION[station.state_name] === region), [stations, region]);
  const statesCount = new Set(stations.map((station) => station.state_name)).size;
  const hourlyObservations = stations.reduce((total, station) => total + station.n, 0);
  const lowCoverageCount = stations.filter((station) => station.coverage_flag?.startsWith("low_coverage")).length;
  const topStations = [...filteredStations].sort((a, b) => b.mean - a.mean).slice(0, 8);
  const chartStations = topStations.slice(0, 6);
  const unit = filteredStations[0]?.unit ?? "dataset unit";

  const unavailable = loading || Boolean(error);
  return <div className="nexus-overview">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
      <div><div className="nexus-eyebrow mb-4">STRATA NEXUS / Observation intelligence</div><h1 className="nexus-heading">Environmental intelligence,<br className="hidden sm:block" /> <span className="text-mint">at a glance.</span></h1><p className="mt-4 flex items-center gap-2 text-xs leading-relaxed text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 shrink-0" />Historical observations · 9–17 November 2024</p></div>
      <Button asChild variant="outline" className="border-primary/30 bg-transparent text-mint"><Link to="/reports">Build intelligence report<ArrowUpRight /></Link></Button>
    </div>

    <div className="nexus-filterbar mb-7 grid gap-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
      <label className="control-label">Observation date<input type="date" value={date} min="2024-11-09" max="2024-11-17" onChange={(event) => setDate(event.target.value)} className="control-input w-full" /></label>
      <label className="control-label">Ground measurement<select value={pollutant} onChange={(event) => setPollutant(event.target.value)} className="control-input w-full"><option>PM2.5</option><option>PM10</option><option>NO2</option><option>CO</option></select></label>
      <label className="control-label">Atmospheric column<select value={satellitePollutant} onChange={(event) => setSatellitePollutant(event.target.value)} className="control-input w-full"><option value="NO2">NO₂</option><option value="HCHO">HCHO</option></select></label>
      <label className="control-label">Geographic region<select value={region} onChange={(event) => setRegion(event.target.value as Region)} className="control-input w-full">{REGIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
    </div>

    {error && <StatusNotice tone="error" title="Environmental data unavailable" className="mb-5"><div className="flex flex-wrap items-center justify-between gap-3"><span>{error}</span><Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}><RefreshCw />Retry connection</Button></div></StatusNotice>}

    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_230px] 2xl:grid-cols-[minmax(0,1fr)_270px]">
      <section className="min-w-0" aria-label="Geospatial observation workspace">
        <div className="nexus-section-header"><div className="flex items-center gap-3"><span className="font-mono text-[9px] text-primary">01 /</span><h2>Ground-station intelligence</h2></div><Link to="/map" className="flex items-center gap-2 text-[11px] text-mint">Explore full map<ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
        <div className="nexus-map-stage">
          {unavailable ? loading ? <MapLoading /> : <EmptyState icon={<MapPinned className="h-5 w-5" />} title="Station geography unavailable" description="Retry the environmental connection to load station observations." className="h-full" /> : <ClientOnly fallback={<MapLoading />}><Suspense fallback={<MapLoading />}><LiveDashboardMap stations={filteredStations} /></Suspense></ClientOnly>}
          <div className="pointer-events-none absolute left-4 right-4 top-4 z-[450] flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 border border-border bg-background/90 px-2.5 py-1.5 font-mono text-[9px] text-mint"><span className="h-1.5 w-1.5 rounded-full bg-primary" />CPCB / {pollutant}</span><span className="bg-background/90 px-2.5 py-1.5 font-mono text-[9px] text-muted-foreground">{loading ? "CONNECTING" : error ? "UNAVAILABLE" : `${filteredStations.length} STATIONS / ${region.toUpperCase()}`}</span></div>
          <div className="pointer-events-none absolute bottom-7 left-4 z-[450] border-l border-primary/50 bg-background/90 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">Ground monitoring network<br /><span className="text-foreground">{date} · Source markers, not severity</span></div>
        </div>
        <div className="nexus-bottom-band mt-4"><div className="flex items-center gap-4"><MapPinned className="h-4 w-4 text-mint" /><div><span className="font-mono text-xl">{observationDisplay(statesCount, loading, error) ?? "—"}</span><span className="ml-2 text-[11px] text-muted-foreground">states represented</span><p className="mt-1 text-[10px] text-muted-foreground">Returned ground-station coverage</p></div></div><div className="flex items-center gap-4"><Database className="h-4 w-4 text-lime" /><div><span className="font-mono text-xl">{observationDisplay(hourlyObservations, loading, error) ?? "—"}</span><span className="ml-2 text-[11px] text-muted-foreground">hourly samples</span><p className="mt-1 text-[10px] text-muted-foreground">Combined observations, not unique stations</p></div></div></div>
      </section>

      <aside className="min-w-0 border-t border-border xl:border-l xl:border-t-0 xl:pl-6" aria-label="Environmental observation statistics">
        <div className="nexus-section-header pt-4 xl:pt-0"><span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Observation signals</span><Activity className="h-3.5 w-3.5 text-mint" /></div>
        <Measurement label="Ground stations" value={stations.length} context={`${pollutant} · Daily reported station means`} icon={<Activity className="h-3.5 w-3.5 text-primary" />} to="/map" loading={loading} error={error} />
        <Measurement label="Atmospheric grid" value={satellitePoints.length} context={`${satellitePollutant} · Sentinel-5P composite, 12–18 Nov`} icon={<Satellite className="h-3.5 w-3.5 text-satellite" />} to="/analytics" loading={loading} error={error} />
        <Measurement label="Fire detections" value={fires.length} context={`VIIRS · ${date} · Not unique confirmed fires`} icon={<Flame className="h-3.5 w-3.5 text-fire" />} to="/analytics" loading={loading} error={error} />
        <div className="mt-5 border-t border-border pt-5"><div className="flex items-center gap-2 font-mono text-[9px] uppercase text-muted-foreground"><span className={`h-1.5 w-1.5 rounded-full ${loading ? "animate-pulse bg-caution" : error ? "bg-critical" : "bg-mint"}`} />{loading ? "Connecting services" : error ? "Sources unavailable" : "3 sources responded"}</div><p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">{loading ? "Connecting to environmental intelligence services..." : error ? "No measurements are displayed until the request succeeds." : `${lowCoverageCount} CPCB stations flagged for low coverage. Source availability does not certify completeness.`}</p></div>
      </aside>
    </div>

    <div className="mt-8 grid gap-8 border-t border-border pt-7 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
      <section className="min-w-0"><div className="nexus-section-header"><div><div className="nexus-eyebrow mb-2">02 / Measurement comparison</div><h2>Reported station means</h2></div><DatasetBadge dataset="CPCB" /></div><p className="mb-4 text-[11px] text-muted-foreground">Six highest returned means · {region} · Not a risk ranking</p>
        {loading ? <div className="flex h-[285px] items-end gap-5 px-8 pb-8" aria-label="Loading station comparison">{[45,70,55,80,60,40].map((height, index) => <div key={index} className="nexus-skeleton flex-1" style={{ height: `${height}%` }} />)}</div> : !error && chartStations.length > 0 ? <div className="h-[285px]"><ResponsiveContainer><RechartsBarChart data={chartStations} margin={{ top: 8, right: 8, left: -16, bottom: 34 }}><CartesianGrid stroke="var(--border)" strokeDasharray="2 6" vertical={false} /><XAxis dataKey="city_name" stroke="var(--muted-foreground)" axisLine={false} tickLine={false} fontSize={10} interval={0} angle={-28} textAnchor="end" height={64} /><YAxis stroke="var(--muted-foreground)" axisLine={false} tickLine={false} fontSize={10} /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)", opacity: 0.35 }} formatter={(value) => [`${Number(value).toFixed(2)} ${unit}`, "Reported mean"]} /><Bar dataKey="mean" name="Reported mean" fill="var(--chart-1)" radius={[2,2,0,0]} maxBarSize={32} /></RechartsBarChart></ResponsiveContainer></div> : <EmptyState icon={<BarChart3 className="h-5 w-5" />} title={error ? "Measurements unavailable" : "No station measurements"} description={error ? "Retry the connection to view the comparison." : "No CPCB records match this selection."} />}
        <p className="mt-2 text-[10px] text-muted-foreground">{unavailable ? "Measurement unit available once observations load." : `Unit: ${unit}. Station-reported means for ${date}.`}</p><Link to="/analytics" className="mt-4 inline-flex items-center gap-2 text-[11px] text-mint">Historical trends<ArrowUpRight className="h-3 w-3" /></Link>
      </section>
      <section className="nexus-ledger min-w-0"><div className="nexus-section-header"><div><div className="nexus-eyebrow mb-2">03 / Observation ledger</div><h2>Station records & coverage</h2></div><Link to="/events" search={{ dataset: "CPCB", q: "", id: "" }} aria-label="Open observation explorer" title="Open observation explorer" className="text-mint"><ArrowUpRight className="h-4 w-4" /></Link></div>
        {loading ? <div className="space-y-5 py-3" aria-label="Loading station records">{[0,1,2,3,4].map((row) => <div key={row} className="nexus-skeleton h-8 w-full" />)}</div> : error || topStations.length === 0 ? <EmptyState title={error ? "Records unavailable" : "No observations returned"} description={error ? "Retry the connection to load station records." : "Try another region, pollutant or date."} /> : <div className="overflow-x-auto"><table className="data-table min-w-[520px]"><thead><tr><th>Station / location</th><th>Mean reading</th><th>Samples</th></tr></thead><tbody>{topStations.slice(0,6).map((station) => <tr key={station.station_id}><td><Link to="/events" search={{ dataset: "CPCB", q: "", id: station.station_id }} className="block max-w-64 truncate text-xs font-medium hover:text-mint" title={station.station_name}>{station.station_name}</Link><div className="mt-1 text-[10px] text-muted-foreground">{station.city_name}, {station.state_name}</div></td><td className="whitespace-nowrap font-mono text-xs text-mint">{station.mean.toFixed(2)}<span className="ml-1 text-[9px] text-muted-foreground">{station.unit}</span></td><td className="font-mono text-xs">{station.n}<div className="mt-1 max-w-28 font-sans text-[9px] text-muted-foreground">{station.coverage_flag.replaceAll("_", " ")}</div></td></tr>)}</tbody></table></div>}
      </section>
    </div>
    <details className="nexus-methodology mt-8"><summary>Measurement methodology & source limitations</summary><p className="pb-4">CPCB values are station-level reported means. Sentinel-5P uses composite-period atmospheric column measurements (12–18 November 2024, end exclusive), not direct ground-level exposure. VIIRS records are satellite fire detections. Counts describe returned records, not environmental severity, causation or population exposure. Predictive model integration remains pending.</p></details>
  </div>;
}
