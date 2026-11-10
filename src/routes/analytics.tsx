
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Database,
  Flame,
  Info,
  Satellite,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Station } from "@/components/strata/LiveDashboardMap";
import {
  DatasetBadge,
  EmptyState,
  FilterChip,
  PageHeader,
  Panel,
  StatCard,
  StatusNotice,
  tooltipStyle,
} from "@/components/strata/ui";

const API =
  import.meta.env["VITE_API_BASE_URL"] ||
  "http://127.0.0.1:8000";

const DATES = Array.from(
  { length: 9 },
  (_, i) => `2024-11-${String(i + 9).padStart(2, "0")}`
);

const RANGES = {
  "3D": 3,
  "7D": 7,
  "9D": 9,
} as const;

type Range = keyof typeof RANGES;

type SatellitePoint = {
  point_id: string;
  score_available?: boolean;
  anomaly_z_score?: number | null;
};

type DailyRecord = {
  date: string;
  label: string;
  stations: number;
  observations: number;
  fires: number;
  weightedMean: number | null;
  unit: string | null;
};

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Historical Analytics — STRATA" },
      {
        name: "description",
        content:
          "Analyse historical CPCB measurements, Sentinel-5P composite coverage and VIIRS satellite fire detections.",
      },
      {
        property: "og:title",
        content: "Historical Analytics — STRATA",
      },
      {
        property: "og:description",
        content:
          "Historical environmental trends, observation coverage and measurement methodology.",
      },
      { property: "og:type", content: "website" },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  }),
  component: AnalyticsPage,
});

const axis = {
  stroke: "var(--muted-foreground)",
  fontSize: 10,
  tickLine: false,
  axisLine: false,
} as const;

const grid = (
  <CartesianGrid
    stroke="var(--border)"
    strokeDasharray="3 3"
    vertical={false}
  />
);

function AnalyticsPage() {
  const [range, setRange] = useState<Range>("9D");
  const [pollutant, setPollutant] = useState("PM2.5");
  const [satellitePollutant, setSatellitePollutant] =
    useState("NO2");

  const [dailyData, setDailyData] = useState<DailyRecord[]>([]);
  const [satellitePoints, setSatellitePoints] =
    useState<SatellitePoint[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnalytics() {
      setLoading(true);
      setError("");

      try {
        const rows: DailyRecord[] = [];

        // Process one date at a time to avoid overwhelming the API.
        for (const date of DATES) {
          if (controller.signal.aborted) return;

          const [cpcbResponse, fireResponse] = await Promise.all([
            fetch(
              `${API}/api/cpcb?date=${date}&pollutant=${encodeURIComponent(pollutant)}`,
              { signal: controller.signal }
            ),
            fetch(`${API}/api/fires?date=${date}`, {
              signal: controller.signal,
            }),
          ]);

          if (!cpcbResponse.ok) {
            throw new Error(`CPCB request failed for ${date}.`);
          }

          if (!fireResponse.ok) {
            throw new Error(`VIIRS request failed for ${date}.`);
          }

          const cpcbData = (await cpcbResponse.json()) as {
            stations?: Station[];
          };

          const fireData = (await fireResponse.json()) as {
            detections?: unknown[];
          };

          const stations = cpcbData.stations ?? [];

          const observations = stations.reduce(
            (total, station) => total + station.n,
            0
          );

          const weightedTotal = stations.reduce(
            (total, station) =>
              total + station.mean * station.n,
            0
          );

          const weightedMean =
            observations > 0
              ? weightedTotal / observations
              : null;

          rows.push({
            date,
            label: `${date.slice(8, 10)} Nov`,
            stations: stations.length,
            observations,
            fires: (fireData.detections ?? []).length,
            weightedMean,
            unit: stations[0]?.unit ?? null,
          });
        }

        if (controller.signal.aborted) return;

        // Fetch the Sentinel-5P composite after daily requests.
        const satelliteResponse = await fetch(
          `${API}/api/satellite?pollutant=${satellitePollutant}&window_id=11-12`,
          { signal: controller.signal }
        );

        if (!satelliteResponse.ok) {
          throw new Error("Unable to load satellite observations.");
        }

        const satelliteData = (await satelliteResponse.json()) as {
          points?: SatellitePoint[];
        };

        setDailyData(rows);
        setSatellitePoints(satelliteData.points ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load historical analytics."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => controller.abort();
  }, [pollutant, satellitePollutant]);

  // Apply selected historical range.
  const visibleData = useMemo(
    () => dailyData.slice(-RANGES[range]),
    [dailyData, range]
  );

  // Summary calculations.
  const stationDays = visibleData.reduce(
    (total, day) => total + day.stations,
    0
  );

  const observations = visibleData.reduce(
    (total, day) => total + day.observations,
    0
  );

  const fireDetections = visibleData.reduce(
    (total, day) => total + day.fires,
    0
  );

  const daysWithData = visibleData.filter(
    (day) => day.stations > 0
  ).length;

  const weightedTotal = visibleData.reduce(
    (total, day) =>
      total +
      (day.weightedMean ?? 0) * day.observations,
    0
  );

  const overallMean =
    observations > 0 ? weightedTotal / observations : null;

  const unit =
    visibleData.find((day) => day.unit)?.unit ?? "";

  const scoredPoints = satellitePoints.filter(
    (point) => point.score_available
  ).length;

  const peakFireDay = [...visibleData]
    .filter((day) => day.fires > 0)
    .sort((a, b) => b.fires - a.fires)[0];

  const hasMeasurements = visibleData.some(
    (day) => day.weightedMean !== null
  );

  const scoredShare =
    satellitePoints.length > 0
      ? (scoredPoints / satellitePoints.length) * 100
      : 0;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        eyebrow="Historical measurement analysis"
        title="Historical Analytics"
        subtitle="Explore historical measurements, monitoring coverage and satellite detection patterns."
        actions={
          <div
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#080808] p-1"
            aria-label="Date range"
          >
            {(Object.keys(RANGES) as Range[]).map((item) => (
              <FilterChip
                key={item}
                active={range === item}
                onClick={() => setRange(item)}
              >
                {item}
              </FilterChip>
            ))}
          </div>
        }
      />

      {/* Analytics introduction */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#080B0A] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-teal-400/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-48 w-48 rounded-full bg-cyan-500/[0.05] blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <BarChart3 className="h-3.5 w-3.5" />
              Historical data intelligence
            </div>

            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Understand environmental patterns over time.
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
              Compare daily ground-station measurements, examine
              satellite detection coverage and explore historical
              observation patterns through interactive visualizations.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              Historical period
            </div>

            <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <CalendarDays className="h-4 w-4 text-primary" />
              09–17 November 2024
            </div>

            <div className="mt-1 text-[10px] text-zinc-500">
              {range} selected view
            </div>
          </div>
        </div>
      </section>

      {/* Dataset filters */}
      <Panel
        title="Dataset configuration"
        description="Choose the ground-station and satellite pollutants to inspect."
        simulated={false}
        className="border-white/[0.08] bg-[#080808]"
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid min-w-[150px] gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              CPCB pollutant
            </span>

            <select
              value={pollutant}
              onChange={(event) => setPollutant(event.target.value)}
              className="h-10 rounded-lg border border-white/10 bg-[#101010] px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-primary/60"
            >
              <option>PM2.5</option>
              <option>PM10</option>
              <option>NO2</option>
              <option>CO</option>
            </select>
          </label>

          <label className="grid min-w-[170px] gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Satellite pollutant
            </span>

            <select
              value={satellitePollutant}
              onChange={(event) =>
                setSatellitePollutant(event.target.value)
              }
              className="h-10 rounded-lg border border-white/10 bg-[#101010] px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-primary/60"
            >
              <option value="NO2">NO₂</option>
              <option value="HCHO">HCHO</option>
            </select>
          </label>

          <div className="ml-auto flex min-h-10 items-center gap-2 text-xs text-zinc-500">
            {loading ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Loading historical datasets...
              </>
            ) : error ? (
              <>
                <span className="h-2 w-2 rounded-full bg-red-400" />
                Data retrieval issue
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-primary" />
                Historical data loaded
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-3">
          <span className="text-[11px] text-zinc-500">
            Available historical period: 9–17 November 2024
          </span>

          <span className="text-[11px] text-zinc-500">
            Daily CPCB and VIIRS · Sentinel-5P composite
          </span>
        </div>

        {error && (
          <StatusNotice
            tone="error"
            title="Analytics data unavailable"
            className="mt-4"
          >
            {error}
          </StatusNotice>
        )}
      </Panel>

      {/* Key metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="CPCB Station-Days"
          value={stationDays.toLocaleString("en-IN")}
          delta="Station records across selected dates"
          icon={<Activity className="h-4 w-4" />}
          accent="primary"
          loading={loading}
        />

        <StatCard
          label="Hourly Observations"
          value={observations.toLocaleString("en-IN")}
          delta="Combined station samples"
          icon={<Database className="h-4 w-4" />}
          accent="success"
          loading={loading}
        />

        <StatCard
          label="VIIRS Detections"
          value={fireDetections.toLocaleString("en-IN")}
          delta="Satellite detection records"
          icon={<Flame className="h-4 w-4" />}
          accent="fire"
          loading={loading}
        />

        <StatCard
          label="Days with CPCB Data"
          value={`${daysWithData}/${visibleData.length || RANGES[range]}`}
          delta="Dates with station records"
          icon={<CalendarDays className="h-4 w-4" />}
          accent="primary"
          loading={loading}
        />

        <StatCard
          label="Weighted Mean"
          value={overallMean === null ? "—" : overallMean.toFixed(1)}
          delta={`${pollutant} · ${unit || "dataset unit"}`}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="primary"
          loading={loading}
        />
      </div>

      {/* Analytics chart workspace */}
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {/* CPCB concentration trend */}
        <Panel
          title={`Daily CPCB ${pollutant} Concentration`}
          description={`Observation-count weighted average of available station means · ${unit || "dataset unit"}`}
          simulated={false}
          className="min-w-0 border-white/[0.08] bg-[#080808]"
        >
          <div className="h-72 w-full">
            {hasMeasurements ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={visibleData}
                  margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                >
                  {grid}

                  <XAxis
                    dataKey="label"
                    {...axis}
                    tickMargin={10}
                  />

                  <YAxis
                    {...axis}
                    width={48}
                  />

                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{
                      stroke: "#00E5CC",
                      strokeDasharray: "3 3",
                    }}
                    formatter={(value) => [
                      `${Number(value).toFixed(2)} ${unit}`,
                      "Weighted mean",
                    ]}
                    labelStyle={{
                      color: "var(--foreground)",
                      marginBottom: 6,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="weightedMean"
                    name="Weighted mean"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    connectNulls={false}
                    dot={{
                      r: 3,
                      fill: "#00E5CC",
                      stroke: "#080808",
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 6,
                      fill: "#00E5CC",
                      stroke: "#ffffff",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No concentration trend"
                description={
                  loading
                    ? "Loading daily station measurements…"
                    : "No station measurements are available for this selection."
                }
                className="h-72"
              />
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-white/[0.07] pt-3 text-[10px] text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Daily observation-count weighted mean
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Gaps represent unavailable measurements. Missing records
            do not establish an absence of pollution.
          </p>
        </Panel>

        {/* VIIRS detections */}
        <Panel
          title="Daily VIIRS Fire Detections"
          description="Satellite detection records per day · not unique confirmed fires"
          simulated={false}
          className="min-w-0 border-white/[0.08] bg-[#080808]"
        >
          <div className="h-72 w-full">
            {visibleData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={visibleData}
                  margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                >
                  {grid}

                  <XAxis
                    dataKey="label"
                    {...axis}
                    tickMargin={10}
                  />

                  <YAxis
                    {...axis}
                    allowDecimals={false}
                    width={40}
                  />

                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{
                      fill: "var(--accent)",
                      opacity: 0.3,
                    }}
                    formatter={(value) => [
                      Number(value).toLocaleString("en-IN"),
                      "VIIRS detections",
                    ]}
                  />

                  <Bar
                    dataKey="fires"
                    name="VIIRS detections"
                    fill="var(--chart-2)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No VIIRS records"
                description={
                  loading
                    ? "Loading daily fire detections…"
                    : "No detection records are available for this range."
                }
                className="h-72"
              />
            )}
          </div>

          {peakFireDay ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
              <Flame className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />

              <p className="text-xs text-zinc-400">
                Highest returned count:{" "}
                <span className="font-semibold text-zinc-200">
                  {peakFireDay.fires} detections
                </span>{" "}
                on {peakFireDay.label}.
              </p>
            </div>
          ) : (
            <p className="mt-3 border-t border-white/[0.07] pt-3 text-[11px] text-muted-foreground">
              {loading
                ? "Loading daily fire detections…"
                : "No fire detections were returned for this range."}
            </p>
          )}
        </Panel>

        {/* CPCB station coverage */}
        <Panel
          title="CPCB Station Reporting Coverage"
          description={`Monitoring stations returning ${pollutant} data each day`}
          simulated={false}
          className="min-w-0 border-white/[0.08] bg-[#080808]"
        >
          <div className="h-64 w-full">
            {visibleData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={visibleData}
                  margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                >
                  {grid}

                  <XAxis
                    dataKey="label"
                    {...axis}
                    tickMargin={10}
                  />

                  <YAxis
                    {...axis}
                    allowDecimals={false}
                    width={40}
                  />

                  <Tooltip contentStyle={tooltipStyle} />

                  <Bar
                    dataKey="stations"
                    name="Reporting stations"
                    fill="var(--chart-1)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No station coverage"
                description={
                  loading
                    ? "Loading reporting station data…"
                    : "No station coverage records are available."
                }
                className="h-64"
              />
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-white/[0.07] pt-3 text-[10px] text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Reporting stations per day
          </div>
        </Panel>

        {/* Sentinel-5P composite coverage */}
        <Panel
          title="Sentinel-5P Composite Coverage"
          description={`${satellitePollutant} grid observations · 12–18 November 2024, end exclusive`}
          action={<DatasetBadge dataset="Sentinel-5P" />}
          simulated={false}
          className="min-w-0 border-white/[0.08] bg-[#080808]"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="rounded-md border border-primary/15 bg-primary/[0.06] px-2 py-1 text-[10px] font-semibold text-primary">
              {satellitePollutant}
            </span>

            <span className="text-[10px] text-zinc-500">
              Composite-period dataset
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-satellite/20 bg-satellite/[0.05] p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
                <Satellite className="h-4 w-4" />
              </div>

              <div className="mt-4 font-mono text-3xl font-semibold tracking-tight text-white">
                {loading
                  ? "..."
                  : satellitePoints.length.toLocaleString("en-IN")}
              </div>

              <div className="mt-1 text-xs text-zinc-500">
                Grid observations
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/[0.08] text-cyan-400">
                <Activity className="h-4 w-4" />
              </div>

              <div className="mt-4 font-mono text-3xl font-semibold tracking-tight text-white">
                {loading
                  ? "..."
                  : scoredPoints.toLocaleString("en-IN")}
              </div>

              <div className="mt-1 text-xs text-zinc-500">
                Points with available anomaly scores
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Scored observation share
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-500">
                Points with available scores
              </span>

              <span className="font-mono text-zinc-200">
                {loading ? "—" : `${scoredShare.toFixed(1)}%`}
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${scoredShare}%` }}
              />
            </div>

            <div className="mt-4 border-t border-white/[0.07] pt-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Composite period
              </div>

              <div className="mt-2 text-sm font-semibold text-zinc-200">
                12–18 November 2024
              </div>

              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                The end date is exclusive. These observations
                represent a composite-period atmospheric column
                dataset, not daily measurements or direct
                ground-level exposure.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      {/* Daily data coverage table */}
      <Panel
        title="Daily Data Coverage"
        description="Daily CPCB and VIIRS records for the selected range."
        simulated={false}
        className="border-white/[0.08] bg-[#080808]"
        contentClassName="p-0 sm:p-0"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
          <p className="text-xs text-zinc-500">
            Returned records for each date in the selected range.
          </p>

          <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] text-zinc-400">
            {range} view
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[680px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>CPCB stations</th>
                <th>Hourly observations</th>
                <th>VIIRS detections</th>
                <th>Coverage status</th>
              </tr>
            </thead>

            <tbody>
              {[...visibleData].reverse().map((day) => (
                <tr key={day.date}>
                  <td className="font-mono text-xs">
                    {day.date}
                  </td>

                  <td className="font-mono text-xs">
                    {day.stations.toLocaleString("en-IN")}
                  </td>

                  <td className="font-mono text-xs">
                    {day.observations.toLocaleString("en-IN")}
                  </td>

                  <td className="font-mono text-xs">
                    {day.fires.toLocaleString("en-IN")}
                  </td>

                  <td>
                    <span
                      className={
                        day.stations > 0
                          ? "text-success"
                          : "text-muted-foreground"
                      }
                    >
                      {day.stations > 0
                        ? "CPCB records returned"
                        : "No records returned"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && visibleData.length === 0 && (
          <EmptyState
            title="No daily coverage records"
            description="Try another pollutant or reload the data service."
          />
        )}
      </Panel>

      {/* Data interpretation */}
      <StatusNotice
        className="mt-4"
        title="Data interpretation and limitations"
      >
        The weighted mean uses reported station means multiplied by
        hourly observation counts. Sentinel-5P measurements are
        composite-period atmospheric columns, not direct ground-level
        exposure measurements. VIIRS detections are not necessarily
        unique confirmed fires. Missing records do not establish an
        absence of pollution or fire activity. These historical
        summaries do not establish causation, exposure or future risk.
      </StatusNotice>
    </div>
  );
}
