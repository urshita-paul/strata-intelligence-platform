import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowDownRight, ArrowUpRight, Flame, MapPinned, Satellite, Search, ShieldAlert, TrendingUp, X } from "lucide-react";
import type { Station } from "@/components/strata/LiveDashboardMap";
import { DatasetBadge, DatasetIcon, DetailItem, EmptyState, FilterChip, LoadingRows, PageHeader, Panel, StatCard, StatusNotice, type Dataset } from "@/components/strata/ui";

const API = import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000";
export type SatellitePoint = { point_id: string; grid_lat: number; grid_lon: number; pollutant: string; unit: string; window_start: string; window_end_exclusive: string; baseline_n: number | null; baseline_mean: number | null; anomaly_difference: number | null; anomaly_z_score: number | null; anomaly_direction: string | null; baseline_status: string | null; score_available: boolean; negative_retrieval: boolean };
type Fire = { latitude: number; longitude: number; date: string; acq_time: string; satellite: string; confidence: string; frp: number; daynight: string; type: number };

export const getPercentageDeviation = (point: SatellitePoint): number | null => {
  if (point.negative_retrieval) return null;
  const baselineMean = point.baseline_mean;
  const difference = point.anomaly_difference;
  if (typeof baselineMean !== "number" || !Number.isFinite(baselineMean) || baselineMean <= 0 || typeof difference !== "number" || !Number.isFinite(difference)) return null;
  return (difference / baselineMean) * 100;
};
export const formatPercentageDeviation = (point: SatellitePoint): string => {
  if (point.negative_retrieval) return "Not calculated — negative retrieval";
  const deviation = getPercentageDeviation(point);
  if (deviation === null) return "Unavailable";
  return `${deviation > 0 ? "+" : ""}${deviation.toFixed(2)}%`;
};

type CPCBItem = { dataset: "CPCB"; key: string; title: string; location: string; value: string; context: string; record: Station };
type SatelliteItem = { dataset: "Sentinel-5P"; key: string; title: string; location: string; value: string; context: string; record: SatellitePoint };
type FireItem = { dataset: "VIIRS"; key: string; title: string; location: string; value: string; context: string; record: Fire };
type ObservationItem = CPCBItem | SatelliteItem | FireItem;
const confidenceLabel = (value: string) => { const code = value.trim().toLowerCase(); if (code === "l" || code === "low") return "Low"; if (code === "n" || code === "nominal") return "Nominal"; if (code === "h" || code === "high") return "High"; return "Unclassified"; };

export const Route = createFileRoute("/warnings")({
  head: () => ({
    meta: [
      { title: "Environmental Watch Centre — STRATA" },
      { name: "description", content: "Review observation-based environmental signals with explicit baseline direction, retrieval quality and source limitations." },
      { property: "og:title", content: "Environmental Watch Centre — STRATA" },
      { property: "og:description", content: "A scientific monitoring workspace for historical CPCB, Sentinel-5P and VIIRS observations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WarningsPage,
});

function WarningsPage() {
  const [dataset, setDataset] = useState<Dataset>("Sentinel-5P");
  const [date, setDate] = useState("2024-11-17");
  const [pollutant, setPollutant] = useState("PM2.5");
  const [satellitePollutant, setSatellitePollutant] = useState("NO2");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [stations, setStations] = useState<Station[]>([]);
  const [satellitePoints, setSatellitePoints] = useState<SatellitePoint[]>([]);
  const [fires, setFires] = useState<Fire[]>([]);
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

  const aboveBaseline = satellitePoints.filter((point) => point.score_available && !point.negative_retrieval && point.anomaly_direction === "above_baseline").length;
  const belowBaseline = satellitePoints.filter((point) => point.score_available && !point.negative_retrieval && point.anomaly_direction === "below_baseline").length;
  const scoredPoints = satellitePoints.filter((point) => point.score_available && !point.negative_retrieval).length;
  const negativeRetrievals = satellitePoints.filter((point) => point.negative_retrieval).length;
  const unscoredPoints = satellitePoints.filter((point) => !point.score_available && !point.negative_retrieval).length;
  const lowCoverage = stations.filter((station) => station.coverage_flag?.startsWith("low_coverage")).length;
  const maxFrp = fires.length > 0 ? Math.max(...fires.map((fire) => fire.frp)) : null;

  const items = useMemo<ObservationItem[]>(() => {
    if (dataset === "CPCB") return [...stations].sort((a, b) => b.mean - a.mean).map((station) => ({ dataset: "CPCB", key: station.station_id, title: station.station_name, location: `${station.city_name}, ${station.state_name}`, value: `${station.mean.toFixed(2)} ${station.unit}`, context: `${station.n} hourly observations`, record: station }));
    if (dataset === "Sentinel-5P") return [...satellitePoints].sort((a, b) => {
      const deviationA = getPercentageDeviation(a);
      const deviationB = getPercentageDeviation(b);
      if (deviationA === null && deviationB === null) return 0;
      if (deviationA === null) return 1;
      if (deviationB === null) return -1;
      return Math.abs(deviationB) - Math.abs(deviationA);
    }).map((point) => {
      const deviation = getPercentageDeviation(point);
      return { dataset: "Sentinel-5P", key: point.point_id, title: point.point_id, location: `${point.grid_lat.toFixed(4)}, ${point.grid_lon.toFixed(4)}`, value: point.negative_retrieval ? "Negative retrieval · % not calculated" : deviation === null ? "Percentage deviation unavailable" : `${deviation > 0 ? "+" : ""}${deviation.toFixed(2)}% vs baseline`, context: `${point.anomaly_direction ? point.anomaly_direction.replaceAll("_", " ") : "Direction unavailable"}${point.negative_retrieval ? " · negative retrieval flagged" : ""}`, record: point };
    });
    return [...fires].sort((a, b) => b.frp - a.frp).map((fire, index) => ({ dataset: "VIIRS", key: `${fire.date}-${fire.acq_time}-${fire.latitude}-${fire.longitude}-${index}`, title: `VIIRS detection ${index + 1}`, location: `${fire.latitude.toFixed(4)}, ${fire.longitude.toFixed(4)}`, value: `${fire.frp.toFixed(2)} MW`, context: `${confidenceLabel(fire.confidence)} confidence`, record: fire }));
  }, [dataset, stations, satellitePoints, fires]);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return items;
    return items.filter((item) => `${item.title} ${item.location} ${item.value} ${item.context}`.toLowerCase().includes(search));
  }, [items, query]);
  const selected = filteredItems.find((item) => item.key === selectedKey) ?? filteredItems[0];
  const counts: Record<Dataset, number> = { CPCB: stations.length, "Sentinel-5P": satellitePoints.length, VIIRS: fires.length };

  return <>
    <PageHeader eyebrow="Observation-based monitoring" title="Environmental Watch Centre" subtitle="Review environmental signals against their historical context, with explicit data-quality flags and no unvalidated pollution-risk scoring." actions={<Link to="/map" className="secondary-button">Open environmental map<ArrowUpRight className="h-3.5 w-3.5" /></Link>} />

    <Panel title="Monitoring parameters" description="Observations remain historical records; this workspace does not issue forecasts or official advisories.">
      <div className="grid gap-3 sm:grid-cols-3"><label className="control-label">CPCB / VIIRS date<input type="date" value={date} min="2024-11-09" max="2024-11-17" onChange={(event) => setDate(event.target.value)} className="control-input w-full" /></label><label className="control-label">CPCB pollutant<select value={pollutant} onChange={(event) => setPollutant(event.target.value)} className="control-input w-full"><option>PM2.5</option><option>PM10</option><option>NO2</option><option>CO</option></select></label><label className="control-label">Sentinel-5P pollutant<select value={satellitePollutant} onChange={(event) => setSatellitePollutant(event.target.value)} className="control-input w-full"><option value="NO2">NO₂</option><option value="HCHO">HCHO</option></select></label></div>
      {error && <StatusNotice tone="error" title="Monitoring data unavailable" className="mt-4">{error}</StatusNotice>}
    </Panel>

    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <StatCard label="CPCB Stations" value={String(stations.length)} delta={`${lowCoverage} with low coverage`} icon={<Activity className="h-4 w-4" />} accent="primary" loading={loading} />
      <StatCard label="Above Baseline" value={String(aboveBaseline)} delta="Valid non-negative scored observations" icon={<TrendingUp className="h-4 w-4" />} accent="fire" loading={loading} />
      <StatCard label="Below Baseline" value={String(belowBaseline)} delta={`${scoredPoints} valid scored points in total`} icon={<ArrowDownRight className="h-4 w-4" />} accent="satellite" loading={loading} />
      <StatCard label="Negative Retrievals" value={String(negativeRetrievals)} delta={`${unscoredPoints} additional unscored points`} icon={<ShieldAlert className="h-4 w-4" />} accent="caution" loading={loading} />
      <StatCard label="VIIRS Detections" value={String(fires.length)} delta={maxFrp === null ? "No detections returned" : `Maximum FRP ${maxFrp.toFixed(2)} MW`} icon={<Flame className="h-4 w-4" />} accent="fire" loading={loading} />
    </div>

    <div className="mt-4 rounded-lg border border-satellite/20 bg-satellite/[0.045] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Satellite className="h-4 w-4 text-satellite" /><span className="text-xs font-semibold">Sentinel-5P baseline support</span></div><span className="font-mono text-[10px] text-muted-foreground">12–18 Nov 2024 · end exclusive</span></div><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Directional comparisons use a limited three-year historical baseline. Above- and below-baseline categories describe relative atmospheric column observations, not ground-level exposure or risk.</p></div>

    <div className="mt-4 flex flex-wrap gap-2 border-b pb-4" aria-label="Watch observation source">{(["CPCB", "Sentinel-5P", "VIIRS"] as Dataset[]).map((item) => <FilterChip key={item} active={dataset === item} count={counts[item]} onClick={() => { setDataset(item); setQuery(""); setSelectedKey(""); }}><span className="flex items-center gap-2"><DatasetIcon dataset={item} className="h-3.5 w-3.5" />{item}</span></FilterChip>)}</div>

    <div className="mt-4 grid items-start gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Panel title={`${dataset} observation review`} description={`${filteredItems.length} matching observations${filteredItems.length > 100 ? " · first 100 shown" : ""}`} contentClassName="p-3 sm:p-3">
        <div className="relative mb-3"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search observations…" aria-label={`Search Watch Centre ${dataset} observations`} className="control-input w-full pl-9 pr-9" />{query && <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Clear Watch Centre search"><X className="h-3.5 w-3.5" /></button>}</div>
        {loading ? <LoadingRows count={6} /> : <div className="max-h-[700px] space-y-1.5 overflow-y-auto pr-0.5">{filteredItems.slice(0, 100).map((item) => {
          const direction = item.dataset === "Sentinel-5P" ? item.record.anomaly_direction : null;
          return <button key={item.key} onClick={() => setSelectedKey(item.key)} aria-pressed={selected?.key === item.key} className={`w-full rounded-md border px-3 py-3 text-left transition-all ${selected?.key === item.key ? "border-primary/55 bg-primary/[0.08] shadow-[inset_2px_0_0_var(--primary)]" : "border-border/55 bg-surface/35 hover:border-primary/30 hover:bg-accent/55"}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-sm font-medium">{item.title}</div><div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{item.location}</div></div>{direction === "above_baseline" && <ArrowUpRight className="h-4 w-4 shrink-0 text-fire" />}{direction === "below_baseline" && <ArrowDownRight className="h-4 w-4 shrink-0 text-satellite" />}</div><div className={`mt-2.5 font-mono text-xs font-medium ${direction === "below_baseline" ? "text-satellite" : direction === "above_baseline" ? "text-fire" : "text-primary"}`}>{item.value}</div><div className="mt-1.5 text-[10px] capitalize leading-relaxed text-muted-foreground">{item.context}</div></button>;
        })}{filteredItems.length === 0 && <EmptyState icon={<Search className="h-5 w-5" />} title="No matching observations" description="Try another source or adjust the search and monitoring parameters." />}</div>}
      </Panel>

      <div className="space-y-4">
        <Panel title="Selected observation" description="Baseline, measurement and retrieval-quality context">
          {!selected ? <EmptyState title={loading ? "Loading observations" : "Select an observation"} description={loading ? "The monitoring records are being retrieved." : "Choose an observation from the review list to inspect it."} /> : <>
            <div className="rounded-lg border bg-surface/55 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><DatasetBadge dataset={selected.dataset} /><span className="break-all font-mono text-[10px] text-muted-foreground">{selected.key}</span></div><h2 className="mt-4 text-xl font-semibold sm:text-2xl">{selected.title}</h2><p className="mt-2 font-mono text-xs text-muted-foreground">{selected.location}</p><div className="mt-5 border-t pt-4"><div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Observation summary</div><div className="mt-2 font-mono text-lg text-primary">{selected.value}</div></div></div>

            {selected.dataset === "CPCB" && <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3"><DetailItem label="Reported mean" mono>{selected.record.mean.toFixed(2)} {selected.record.unit}</DetailItem><DetailItem label="Pollutant">{selected.record.parameter_name}</DetailItem><DetailItem label="Hourly observations" mono>{selected.record.n}</DetailItem><DetailItem label="Coverage">{selected.record.coverage_flag.replaceAll("_", " ")}</DetailItem><DetailItem label="Station ID" mono>{selected.record.station_id}</DetailItem><DetailItem label="State">{selected.record.state_name}</DetailItem></div>}
            {selected.dataset === "Sentinel-5P" && <><div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3"><DetailItem label="Pollutant">{selected.record.pollutant}</DetailItem><DetailItem label="Relative deviation" mono className={selected.record.anomaly_direction === "above_baseline" ? "border-fire/30" : selected.record.anomaly_direction === "below_baseline" ? "border-satellite/30" : ""}>{formatPercentageDeviation(selected.record)}</DetailItem><DetailItem label="Direction">{selected.record.anomaly_direction?.replaceAll("_", " ") ?? "Unavailable"}</DetailItem><DetailItem label="Historical baseline mean" mono>{typeof selected.record.baseline_mean === "number" && Number.isFinite(selected.record.baseline_mean) ? selected.record.baseline_mean.toExponential(4) : "Unavailable"} {selected.record.unit}</DetailItem><DetailItem label="Historical baseline samples" mono>{selected.record.baseline_n ?? "Unavailable"}</DetailItem><DetailItem label="Anomaly difference" mono>{typeof selected.record.anomaly_difference === "number" ? selected.record.anomaly_difference.toExponential(4) : "Unavailable"} {selected.record.unit}</DetailItem><DetailItem label="Diagnostic Z-score" mono>{typeof selected.record.anomaly_z_score === "number" ? selected.record.anomaly_z_score.toFixed(3) : "Unavailable"}</DetailItem><DetailItem label="Baseline status">{selected.record.baseline_status?.replaceAll("_", " ") ?? "Unavailable"}</DetailItem><DetailItem label="Score available">{selected.record.score_available ? "Yes" : "No"}</DetailItem><DetailItem label="Negative retrieval">{selected.record.negative_retrieval ? "Yes" : "No"}</DetailItem><DetailItem label="Composite period" className="col-span-2 md:col-span-3">{selected.record.window_start} to {selected.record.window_end_exclusive} (end date exclusive)</DetailItem></div><StatusNotice tone={selected.record.negative_retrieval ? "warning" : "info"} className="mt-3" title={selected.record.negative_retrieval ? "Negative retrieval excluded from calculations" : "Baseline interpretation"}>Percentage deviation compares the atmospheric column measurement with its limited three-year historical baseline. Negative retrievals remain visible for inspection but are excluded from percentages and ranking. Z-scores are secondary diagnostics, not pollution-risk scores.</StatusNotice></>}
            {selected.dataset === "VIIRS" && <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3"><DetailItem label="Detection date">{selected.record.date}</DetailItem><DetailItem label="Acquisition time" mono>{selected.record.acq_time} UTC</DetailItem><DetailItem label="Fire radiative power" mono>{selected.record.frp.toFixed(2)} MW</DetailItem><DetailItem label="Confidence category">{confidenceLabel(selected.record.confidence)}</DetailItem><DetailItem label="Satellite">{selected.record.satellite}</DetailItem><DetailItem label="Day / night">{selected.record.daynight}</DetailItem></div>}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-surface/55 p-4"><div className="flex items-start gap-3"><MapPinned className="mt-0.5 h-4 w-4 text-primary" /><div><div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Geographic coordinates</div><div className="mt-1.5 font-mono text-sm">{selected.dataset === "CPCB" ? `${selected.record.latitude}, ${selected.record.longitude}` : selected.dataset === "Sentinel-5P" ? `${selected.record.grid_lat}, ${selected.record.grid_lon}` : `${selected.record.latitude}, ${selected.record.longitude}`}</div></div></div><Link to="/map" className="secondary-button min-h-8 text-[11px]">Open map<ArrowUpRight className="h-3 w-3" /></Link></div>
          </>}
        </Panel>
        <Panel title="Predictive model integration" description="Integration status"><div className="flex items-start gap-3 rounded-md border border-dashed bg-surface/35 p-4"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-caution" /><div><div className="text-sm font-semibold">Pending integration and validation</div><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">XGBoost risk classifications, future predictions and SHAP explanations will appear only after the predictive model is connected and validated.</p></div></div></Panel>
      </div>
    </div>

    <Panel title="Interpretation guide" description="How to read the three observation sources" className="mt-4"><div className="grid gap-3 md:grid-cols-3"><div className="rounded-md border border-primary/20 bg-primary/[0.04] p-4"><DatasetBadge dataset="CPCB" /><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Station-level reported means. Higher measurements appear first; this ordering is not an official risk classification.</p></div><div className="rounded-md border border-satellite/20 bg-satellite/[0.04] p-4"><DatasetBadge dataset="Sentinel-5P" /><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Valid non-negative records are ordered by absolute percentage deviation. Both directions remain visible. Negative retrievals are excluded from percentages and ranking. This is a relative atmospheric-column comparison, not exposure or risk.</p></div><div className="rounded-md border border-fire/20 bg-fire/[0.04] p-4"><DatasetBadge dataset="VIIRS" /><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Satellite fire detections are observations, not necessarily unique confirmed fires. FRP is reported in megawatts.</p></div></div></Panel>
  </>;
}
