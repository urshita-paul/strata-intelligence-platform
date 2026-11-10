import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, BarChart3, CalendarRange, Database, Flame, Satellite } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Station } from "@/components/strata/LiveDashboardMap";
import { DatasetBadge, EmptyState, FilterChip, PageHeader, Panel, StatCard, StatusNotice, tooltipStyle } from "@/components/strata/ui";

const API = import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000";
const DATES = Array.from({ length: 9 }, (_, i) => `2024-11-${String(i + 9).padStart(2, "0")}`);
const RANGES = { "3D": 3, "7D": 7, "9D": 9 } as const;
type Range = keyof typeof RANGES;
type SatellitePoint = { point_id: string; score_available?: boolean; anomaly_z_score?: number | null };
type DailyRecord = { date: string; label: string; stations: number; observations: number; fires: number; weightedMean: number | null; unit: string | null };

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Historical Analytics — STRATA" },
      { name: "description", content: "Analyse historical CPCB measurements, Sentinel-5P composite coverage and VIIRS satellite fire detections." },
      { property: "og:title", content: "Historical Analytics — STRATA" },
      { property: "og:description", content: "Historical environmental trends, observation coverage and measurement methodology." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

const axis = { stroke: "var(--muted-foreground)", fontSize: 10, tickLine: false, axisLine: false } as const;
const grid = <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />;

function AnalyticsPage() {
  const [range, setRange] = useState<Range>("9D");
  const [pollutant, setPollutant] = useState("PM2.5");
  const [satellitePollutant, setSatellitePollutant] = useState("NO2");
  const [dailyData, setDailyData] = useState<DailyRecord[]>([]);
  const [satellitePoints, setSatellitePoints] = useState<SatellitePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadAnalytics() {
      setLoading(true);
      setError("");
      try {
        const rows: DailyRecord[] = [];
        for (const date of DATES) {
          if (controller.signal.aborted) return;
          const [cpcbResponse, fireResponse] = await Promise.all([
            fetch(`${API}/api/cpcb?date=${date}&pollutant=${encodeURIComponent(pollutant)}`, { signal: controller.signal }),
            fetch(`${API}/api/fires?date=${date}`, { signal: controller.signal }),
          ]);
          if (!cpcbResponse.ok) throw new Error(`CPCB request failed for ${date}.`);
          if (!fireResponse.ok) throw new Error(`VIIRS request failed for ${date}.`);
          const cpcbData = (await cpcbResponse.json()) as { stations?: Station[] };
          const fireData = (await fireResponse.json()) as { detections?: unknown[] };
          const stations = cpcbData.stations ?? [];
          const observations = stations.reduce((total, station) => total + station.n, 0);
          const weightedTotal = stations.reduce((total, station) => total + station.mean * station.n, 0);
          rows.push({ date, label: `${date.slice(8, 10)} Nov`, stations: stations.length, observations, fires: (fireData.detections ?? []).length, weightedMean: observations > 0 ? weightedTotal / observations : null, unit: stations[0]?.unit ?? null });
        }
        if (controller.signal.aborted) return;
        const satelliteResponse = await fetch(`${API}/api/satellite?pollutant=${satellitePollutant}&window_id=11-12`, { signal: controller.signal });
        if (!satelliteResponse.ok) throw new Error("Unable to load satellite observations.");
        const satelliteData = (await satelliteResponse.json()) as { points?: SatellitePoint[] };
        setDailyData(rows);
        setSatellitePoints(satelliteData.points ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unable to load historical analytics.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadAnalytics();
    return () => controller.abort();
  }, [pollutant, satellitePollutant]);

  const visibleData = useMemo(() => dailyData.slice(-RANGES[range]), [dailyData, range]);
  const stationDays = visibleData.reduce((total, day) => total + day.stations, 0);
  const observations = visibleData.reduce((total, day) => total + day.observations, 0);
  const fireDetections = visibleData.reduce((total, day) => total + day.fires, 0);
  const daysWithData = visibleData.filter((day) => day.stations > 0).length;
  const weightedTotal = visibleData.reduce((total, day) => total + (day.weightedMean ?? 0) * day.observations, 0);
  const overallMean = observations > 0 ? weightedTotal / observations : null;
  const unit = visibleData.find((day) => day.unit)?.unit ?? "";
  const scoredPoints = satellitePoints.filter((point) => point.score_available).length;
  const peakFireDay = [...visibleData].filter((day) => day.fires > 0).sort((a, b) => b.fires - a.fires)[0];
  const hasMeasurements = visibleData.some((day) => day.weightedMean !== null);
  const scoredShare = satellitePoints.length > 0 ? (scoredPoints / satellitePoints.length) * 100 : 0;

  return <>
    <PageHeader eyebrow="Historical measurement analysis" title="Historical Analytics" subtitle="Compare measurement trends, reporting coverage and satellite detection records across the available November 2024 archive." actions={<div className="flex rounded-md border bg-surface/60 p-1" aria-label="Date range">{(Object.keys(RANGES) as Range[]).map((item) => <FilterChip key={item} active={range === item} onClick={() => setRange(item)}>{item}</FilterChip>)}</div>} />

    <Panel title="Analysis parameters" description="Date ranges end on 17 November 2024; satellite observations remain a separate composite period.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[240px_240px_minmax(0,1fr)]">
        <label className="control-label">CPCB pollutant<select value={pollutant} onChange={(event) => setPollutant(event.target.value)} className="control-input w-full"><option>PM2.5</option><option>PM10</option><option>NO2</option><option>CO</option></select></label>
        <label className="control-label">Sentinel-5P pollutant<select value={satellitePollutant} onChange={(event) => setSatellitePollutant(event.target.value)} className="control-input w-full"><option value="NO2">NO₂</option><option value="HCHO">HCHO</option></select></label>
        <div className="flex items-center gap-2 rounded-md border bg-surface/50 px-3 py-2 text-xs text-muted-foreground"><CalendarRange className="h-4 w-4 shrink-0 text-primary" /><span>Available daily period<br /><strong className="font-mono font-medium text-foreground">09–17 November 2024</strong></span></div>
      </div>
      {error && <StatusNotice tone="error" title="Analytics data unavailable" className="mt-4">{error}</StatusNotice>}
    </Panel>

    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <StatCard label="CPCB Station-Days" value={stationDays.toLocaleString("en-IN")} delta="Station records across selected dates" icon={<Activity className="h-4 w-4" />} accent="primary" loading={loading} />
      <StatCard label="Hourly Samples" value={observations.toLocaleString("en-IN")} delta="Combined station observations" icon={<Database className="h-4 w-4" />} accent="success" loading={loading} />
      <StatCard label="VIIRS Detections" value={fireDetections.toLocaleString("en-IN")} delta="Satellite detection records" icon={<Flame className="h-4 w-4" />} accent="fire" loading={loading} />
      <StatCard label="CPCB Data Coverage" value={`${daysWithData}/${visibleData.length || RANGES[range]}`} delta="Dates with station records" icon={<BarChart3 className="h-4 w-4" />} accent="primary" loading={loading} />
      <StatCard label="Weighted Mean" value={overallMean === null ? "—" : overallMean.toFixed(1)} delta={`${pollutant} · ${unit || "dataset unit"}`} icon={<Activity className="h-4 w-4" />} accent="primary" loading={loading} />
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <Panel title={`Daily CPCB ${pollutant} concentration`} description={`Observation-count weighted average of available station means · ${unit || "dataset unit"}`}>
        {hasMeasurements ? <div className="h-80"><ResponsiveContainer><LineChart data={visibleData} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>{grid}<XAxis dataKey="label" {...axis} /><YAxis {...axis} width={52} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(2)} ${unit}`, "Weighted mean"]} labelStyle={{ color: "var(--foreground)", marginBottom: 6 }} /><Line type="monotone" dataKey="weightedMean" name="Weighted mean" stroke="var(--chart-1)" strokeWidth={2.2} connectNulls={false} dot={{ r: 3, fill: "var(--panel)", strokeWidth: 2 }} activeDot={{ r: 5, fill: "var(--primary)" }} /></LineChart></ResponsiveContainer></div> : <EmptyState title="No concentration trend" description={loading ? "Loading daily station measurements…" : "No station measurements are available for this selection."} className="h-80" />}
        <p className="border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">Gaps represent unavailable measurements. Missing records do not establish an absence of pollution.</p>
      </Panel>

      <Panel title="Daily VIIRS fire detections" description="Returned satellite detection records per day · not unique confirmed fires">
        <div className="h-80"><ResponsiveContainer><BarChart data={visibleData} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>{grid}<XAxis dataKey="label" {...axis} /><YAxis {...axis} width={52} allowDecimals={false} /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)", opacity: 0.3 }} formatter={(value) => [Number(value).toLocaleString("en-IN"), "VIIRS detections"]} /><Bar dataKey="fires" name="VIIRS detections" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={42} /></BarChart></ResponsiveContainer></div>
        <p className="border-t pt-3 text-[11px] text-muted-foreground">{peakFireDay ? `Highest returned count: ${peakFireDay.fires} detections on ${peakFireDay.label}.` : loading ? "Loading daily fire detections…" : "No fire detections were returned for this range."}</p>
      </Panel>

      <Panel title="CPCB reporting coverage" description={`Monitoring stations returning ${pollutant} data each day`}>
        <div className="h-72"><ResponsiveContainer><BarChart data={visibleData} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>{grid}<XAxis dataKey="label" {...axis} /><YAxis {...axis} width={52} allowDecimals={false} /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)", opacity: 0.3 }} /><Legend wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} /><Bar dataKey="stations" name="Reporting stations" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={42} /></BarChart></ResponsiveContainer></div>
      </Panel>

      <Panel title="Sentinel-5P composite coverage" description={`${satellitePollutant} grid observations · 12–18 November 2024, end exclusive`} action={<DatasetBadge dataset="Sentinel-5P" />}>
        <div className="flex h-72 flex-col justify-center">
          <div className="grid grid-cols-2 gap-3"><div className="rounded-lg border border-satellite/20 bg-satellite/[0.05] p-4"><Satellite className="h-4 w-4 text-satellite" /><div className="mt-4 font-display text-3xl font-semibold">{loading ? "—" : satellitePoints.length}</div><div className="mt-1 text-xs text-muted-foreground">Grid observations</div></div><div className="rounded-lg border bg-surface/50 p-4"><Database className="h-4 w-4 text-primary" /><div className="mt-4 font-display text-3xl font-semibold">{loading ? "—" : scoredPoints}</div><div className="mt-1 text-xs text-muted-foreground">Available anomaly scores</div></div></div>
          <div className="mt-5"><div className="mb-2 flex justify-between text-[11px]"><span className="text-muted-foreground">Scored observation share</span><span className="font-mono">{loading ? "—" : `${scoredShare.toFixed(1)}%`}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-satellite transition-[width]" style={{ width: `${scoredShare}%` }} /></div></div>
          <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">Composite-period atmospheric column observations, not daily readings or direct ground-level exposure measurements.</p>
        </div>
      </Panel>
    </div>

    <Panel title="Daily data coverage" description="Returned records for each date in the selected range" className="mt-4" contentClassName="p-0 sm:p-0">
      <div className="overflow-x-auto"><table className="data-table min-w-[680px]"><thead><tr><th>Date</th><th>CPCB stations</th><th>Hourly observations</th><th>VIIRS detections</th><th>Coverage</th></tr></thead><tbody>{[...visibleData].reverse().map((day) => <tr key={day.date}><td className="font-mono text-xs">{day.date}</td><td className="font-mono text-xs">{day.stations}</td><td className="font-mono text-xs">{day.observations.toLocaleString("en-IN")}</td><td className="font-mono text-xs">{day.fires.toLocaleString("en-IN")}</td><td><span className={day.stations > 0 ? "text-success" : "text-muted-foreground"}>{day.stations > 0 ? "CPCB records returned" : "No records returned"}</span></td></tr>)}</tbody></table></div>
      {!loading && visibleData.length === 0 && <EmptyState title="No daily coverage records" description="Try another pollutant or reload the data service." />}
    </Panel>
    <StatusNotice className="mt-4" title="Analytics methodology">The weighted mean uses reported station means multiplied by hourly observation counts. Sentinel-5P measurements are composite-period atmospheric columns. VIIRS detections are not necessarily unique confirmed fires. These historical summaries do not establish causation, exposure or future risk.</StatusNotice>
  </>;
}
