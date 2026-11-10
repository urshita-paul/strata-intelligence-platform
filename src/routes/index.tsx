import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowUpRight, BarChart3, CalendarDays, Database, Flame, Layers3, MapPinned, Satellite } from "lucide-react";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Station } from "@/components/strata/LiveDashboardMap";
import { DatasetBadge, EmptyState, PageHeader, Panel, StatCard, StatusNotice, tooltipStyle } from "@/components/strata/ui";

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
  return <div className="map-grid flex h-full min-h-[390px] items-center justify-center text-sm text-muted-foreground"><div className="flex items-center gap-2 rounded-md border bg-popover px-4 py-3 shadow-[var(--shadow-panel)]"><MapPinned className="h-4 w-4 animate-pulse text-primary" />Preparing station geography…</div></div>;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "STRATA Command Centre — Environmental Intelligence" },
      { name: "description", content: "A unified command centre for historical CPCB ground measurements, Sentinel-5P atmospheric observations and VIIRS fire detections." },
      { property: "og:title", content: "STRATA Command Centre — Environmental Intelligence" },
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
  }, [date, pollutant, satellitePollutant]);

  const filteredStations = useMemo(() => stations.filter((station) => region === "All India" || STATE_REGION[station.state_name] === region), [stations, region]);
  const statesCount = new Set(stations.map((station) => station.state_name)).size;
  const hourlyObservations = stations.reduce((total, station) => total + station.n, 0);
  const lowCoverageCount = stations.filter((station) => station.coverage_flag?.startsWith("low_coverage")).length;
  const topStations = [...filteredStations].sort((a, b) => b.mean - a.mean).slice(0, 8);
  const chartStations = topStations.slice(0, 6);
  const unit = filteredStations[0]?.unit ?? "dataset unit";

  return <>
    <PageHeader
      eyebrow="Unified observation workspace"
      title="Environmental Command Centre"
      subtitle="A single operational view of ground-station measurements, atmospheric column observations and satellite fire detections."
      actions={<><span className="inline-flex items-center gap-2 rounded-md border bg-surface/70 px-3 py-2 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 text-primary" />Historical archive · {date}</span><Link to="/reports" className="primary-button">Build report<ArrowUpRight className="h-3.5 w-3.5" /></Link></>}
    />

    <Panel title="Observation parameters" description="Filters query the existing historical datasets; each source retains its own measurement period.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="control-label">CPCB observation date<input type="date" value={date} min="2024-11-09" max="2024-11-17" onChange={(event) => setDate(event.target.value)} className="control-input w-full" /></label>
        <label className="control-label">CPCB pollutant<select value={pollutant} onChange={(event) => setPollutant(event.target.value)} className="control-input w-full"><option>PM2.5</option><option>PM10</option><option>NO2</option><option>CO</option></select></label>
        <label className="control-label">Sentinel-5P pollutant<select value={satellitePollutant} onChange={(event) => setSatellitePollutant(event.target.value)} className="control-input w-full"><option value="NO2">NO₂</option><option value="HCHO">HCHO</option></select></label>
        <label className="control-label">Map geographic region<select value={region} onChange={(event) => setRegion(event.target.value as Region)} className="control-input w-full">{REGIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      {error && <StatusNotice tone="error" title="Environmental data unavailable" className="mt-4">{error}</StatusNotice>}
    </Panel>

    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <StatCard label="CPCB Stations" value={String(stations.length)} delta={`${pollutant} · ${date}`} icon={<Activity className="h-4 w-4" />} accent="primary" to="/map" loading={loading} />
      <StatCard label="Satellite Grid" value={String(satellitePoints.length)} delta={`${satellitePollutant} · composite period`} icon={<Satellite className="h-4 w-4" />} accent="satellite" to="/analytics" loading={loading} />
      <StatCard label="VIIRS Detections" value={String(fires.length)} delta={`Detection records · ${date}`} icon={<Flame className="h-4 w-4" />} accent="fire" to="/analytics" loading={loading} />
      <StatCard label="States Represented" value={String(statesCount)} delta="States with returned CPCB stations" icon={<MapPinned className="h-4 w-4" />} accent="primary" to="/map" loading={loading} />
      <StatCard label="Hourly Samples" value={hourlyObservations.toLocaleString("en-IN")} delta="Combined station observations" icon={<Database className="h-4 w-4" />} accent="success" to="/analytics" loading={loading} />
    </div>

    <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel title="Ground-station distribution" description={`${pollutant} station means · markers identify source, not pollution severity`} action={<Link to="/map" className="secondary-button min-h-8 px-2.5 text-[11px]">Full map<ArrowUpRight className="h-3 w-3" /></Link>}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><DatasetBadge dataset="CPCB" /><span className="font-mono text-[10px] text-muted-foreground">{filteredStations.length} of {stations.length} stations visible</span></div>
        <div className="h-[430px] overflow-hidden rounded-lg border bg-surface"><ClientOnly fallback={<MapLoading />}><Suspense fallback={<MapLoading />}><LiveDashboardMap stations={filteredStations} /></Suspense></ClientOnly></div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full border-2 border-background bg-primary ring-1 ring-primary" />CPCB monitoring station · select a marker for the reported mean and coverage</div>
      </Panel>

      <Panel title="Source ledger" description="Coverage and measurement context for this selection" contentClassName="p-3 sm:p-3">
        <div className="space-y-3">
          <div className="rounded-lg border border-primary/20 bg-primary/[0.045] p-4"><div className="flex items-center justify-between"><DatasetBadge dataset="CPCB" /><Activity className="h-4 w-4 text-primary" /></div><div className="mt-4 font-display text-3xl font-semibold">{stations.length}</div><div className="mt-1 text-xs text-muted-foreground">Monitoring stations · {pollutant}</div><div className="mt-4 grid grid-cols-2 gap-2 border-t border-primary/15 pt-3 text-[11px]"><div><span className="block text-muted-foreground">Low coverage</span><strong className="mt-1 block font-mono font-medium">{lowCoverageCount}</strong></div><div><span className="block text-muted-foreground">Daily period</span><strong className="mt-1 block font-mono font-medium">{date.slice(5)}</strong></div></div></div>
          <div className="rounded-lg border border-satellite/20 bg-satellite/[0.045] p-4"><div className="flex items-center justify-between"><DatasetBadge dataset="Sentinel-5P" /><Satellite className="h-4 w-4 text-satellite" /></div><div className="mt-4 font-display text-3xl font-semibold">{satellitePoints.length}</div><div className="mt-1 text-xs text-muted-foreground">{satellitePollutant} grid observations</div><p className="mt-4 border-t border-satellite/15 pt-3 text-[11px] leading-relaxed text-muted-foreground">Composite: 12–18 November 2024, end date exclusive. Atmospheric columns are not direct ground-level exposure.</p></div>
          <div className="rounded-lg border border-fire/20 bg-fire/[0.045] p-4"><div className="flex items-center justify-between"><DatasetBadge dataset="VIIRS" /><Flame className="h-4 w-4 text-fire" /></div><div className="mt-4 font-display text-3xl font-semibold">{fires.length}</div><div className="mt-1 text-xs text-muted-foreground">Detection records · {date}</div><p className="mt-4 border-t border-fire/15 pt-3 text-[11px] leading-relaxed text-muted-foreground">Satellite detections are not necessarily unique confirmed fires.</p></div>
        </div>
      </Panel>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Panel title="Station mean comparison" description="Six highest reported means in the selected map region · not a risk ranking">
        {chartStations.length > 0 ? <div className="h-[320px]"><ResponsiveContainer><RechartsBarChart data={chartStations} margin={{ top: 8, right: 8, left: -16, bottom: 34 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="city_name" stroke="var(--muted-foreground)" fontSize={10} interval={0} angle={-28} textAnchor="end" height={64} /><YAxis stroke="var(--muted-foreground)" fontSize={10} /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)", opacity: 0.35 }} formatter={(value) => [`${Number(value).toFixed(2)} ${unit}`, "Reported mean"]} /><Bar dataKey="mean" name="Reported mean" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={42} /></RechartsBarChart></ResponsiveContainer></div> : <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No station measurements" description={loading ? "Loading station observations…" : "No CPCB records match this region and pollutant selection."} />}
        <p className="border-t pt-3 text-[11px] text-muted-foreground">Unit: {unit}. Values are station-reported means for {date}.</p>
      </Panel>

      <Panel title="Station observation ledger" description="Highest reported means with sample-count and coverage context" action={<Link to="/events" search={{ dataset: "CPCB", q: "", id: "" }} className="text-[11px] font-medium text-primary hover:underline">Open explorer →</Link>} contentClassName="p-0 sm:p-0">
        {topStations.length === 0 ? <EmptyState title="No observations returned" description={loading ? "Loading station readings…" : "Try another region, pollutant or date."} /> : <div className="overflow-x-auto"><table className="data-table min-w-[680px]"><thead><tr><th>Station</th><th>City / State</th><th>Mean reading</th><th>Samples</th><th>Coverage</th></tr></thead><tbody>{topStations.map((station) => <tr key={station.station_id}><td><Link to="/events" search={{ dataset: "CPCB", q: "", id: station.station_id }} className="font-medium text-foreground hover:text-primary">{station.station_name}</Link></td><td className="text-xs text-muted-foreground">{station.city_name}, {station.state_name}</td><td className="whitespace-nowrap font-mono text-xs text-primary">{station.mean.toFixed(2)} {station.unit}</td><td className="font-mono text-xs">{station.n}</td><td className="text-xs capitalize text-muted-foreground">{station.coverage_flag.replaceAll("_", " ")}</td></tr>)}</tbody></table></div>}
      </Panel>
    </div>

    <StatusNotice className="mt-4" title="Measurement methodology">CPCB values are station-level reported means. Sentinel-5P uses composite-period atmospheric column measurements. VIIRS records are satellite fire detections. Counts describe returned records, not environmental severity, causation or population exposure.</StatusNotice>
  </>;
}
