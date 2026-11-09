
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  FilterChip,
  PageHeader,
  Panel,
  StatCard,
  tooltipStyle,
} from "@/components/strata/ui";

const API =
  import.meta.env.VITE_API_BASE_URL ||
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
          "Historical CPCB measurements, station coverage and VIIRS satellite fire detections.",
      },
      { property: "og:title", content: "Historical Analytics — STRATA" },
    ],
  }),
  component: AnalyticsPage,
});

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

          // Only two requests run concurrently for each date.
          const [cpcbResponse, fireResponse] = await Promise.all([
            fetch(
              `${API}/api/cpcb?date=${date}&pollutant=${encodeURIComponent(pollutant)}`,
              { signal: controller.signal }
            ),
            fetch(
              `${API}/api/fires?date=${date}`,
              { signal: controller.signal }
            ),
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

        // Fetch the Sentinel-5P composite after the daily requests.
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

    loadAnalytics();

    return () => controller.abort();
  }, [pollutant, satellitePollutant]);

  const visibleData = useMemo(
    () => dailyData.slice(-RANGES[range]),
    [dailyData, range]
  );

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

  const axis = {
    stroke: "var(--muted-foreground)",
    fontSize: 11,
  };

  return (
    <>
      <PageHeader
        title="Historical Analytics"
        subtitle="Measured pollution observations and satellite detection coverage"
        actions={
          <div className="flex gap-1.5">
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

      <Panel title="Dataset filters" simulated={false}>
        <div className="flex flex-wrap items-center gap-4">
          <label className="grid gap-1 text-xs text-muted-foreground">
            CPCB pollutant
            <select
              value={pollutant}
              onChange={(event) => setPollutant(event.target.value)}
              className="h-9 rounded-md border bg-surface px-3 text-foreground"
            >
              <option>PM2.5</option>
              <option>PM10</option>
              <option>NO2</option>
              <option>CO</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs text-muted-foreground">
            Satellite pollutant
            <select
              value={satellitePollutant}
              onChange={(event) =>
                setSatellitePollutant(event.target.value)
              }
              className="h-9 rounded-md border bg-surface px-3 text-foreground"
            >
              <option value="NO2">NO2</option>
              <option value="HCHO">HCHO</option>
            </select>
          </label>

          <div className="text-xs text-muted-foreground">
            Available historical period: 9–17 November 2024
          </div>

          {loading && (
            <span className="text-xs text-muted-foreground">
              Loading datasets...
            </span>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-red-500/40 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </Panel>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="CPCB Station-Days"
          value={String(stationDays)}
          delta="Station records across selected dates"
        />

        <StatCard
          label="Hourly Observations"
          value={String(observations)}
          delta="Combined station samples"
        />

        <StatCard
          label="VIIRS Detections"
          value={String(fireDetections)}
          delta="Satellite detection records"
        />

        <StatCard
          label="Days with CPCB Data"
          value={`${daysWithData}/${visibleData.length}`}
          delta="Dates with station records"
        />

        <StatCard
          label="Weighted Mean"
          value={
            overallMean === null
              ? "—"
              : overallMean.toFixed(1)
          }
          delta={unit || "No measurements"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel
          title={`Daily CPCB ${pollutant} Concentration`}
          simulated={false}
        >
          <p className="mb-3 text-xs text-muted-foreground">
            Observation-count weighted average of available station
            means. Unit: {unit || "dataset unit"}
          </p>

          <div className="h-72">
            {visibleData.some(
              (day) => day.weightedMean !== null
            ) ? (
              <ResponsiveContainer>
                <LineChart data={visibleData}>
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                  />
                  <XAxis dataKey="label" {...axis} />
                  <YAxis {...axis} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    dataKey="weightedMean"
                    name="Weighted mean"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    connectNulls={false}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {loading
                  ? "Loading measurements..."
                  : "No measurements available"}
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Daily VIIRS Fire Detections"
          simulated={false}
        >
          <p className="mb-3 text-xs text-muted-foreground">
            Number of satellite detection records returned for each day.
          </p>

          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={visibleData}>
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="fires"
                  name="VIIRS detections"
                  fill="var(--chart-3)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {peakFireDay && (
            <p className="mt-2 text-xs text-muted-foreground">
              Highest returned count: {peakFireDay.fires} detections on{" "}
              {peakFireDay.label}.
            </p>
          )}
        </Panel>

        <Panel
          title="CPCB Station Reporting Coverage"
          simulated={false}
        >
          <p className="mb-3 text-xs text-muted-foreground">
            Number of monitoring stations returning {pollutant} data each day.
          </p>

          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={visibleData}>
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="stations"
                  name="Reporting stations"
                  fill="var(--chart-1)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Sentinel-5P Composite Coverage"
          simulated={false}
        >
          <div className="flex h-64 flex-col justify-center gap-4">
            <div>
              <div className="text-3xl font-semibold">
                {loading ? "..." : satellitePoints.length}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {satellitePollutant} satellite grid observations
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-2xl font-semibold">
                {loading ? "..." : scoredPoints}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Grid points with available anomaly scores
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Composite period: 12–18 November 2024.
              The end date is exclusive. These observations are
              composite-period measurements, not daily readings.
            </p>
          </div>
        </Panel>
      </div>

      <Panel
        title="Daily Data Coverage"
        simulated={false}
        className="mt-4"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 pr-4 font-medium">CPCB stations</th>
                <th className="pb-2 pr-4 font-medium">Hourly observations</th>
                <th className="pb-2 pr-4 font-medium">VIIRS detections</th>
                <th className="pb-2 font-medium">Coverage</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {[...visibleData].reverse().map((day) => (
                <tr key={day.date}>
                  <td className="py-2.5 pr-4 font-mono text-xs">
                    {day.date}
                  </td>

                  <td className="py-2.5 pr-4 font-mono text-xs">
                    {day.stations}
                  </td>

                  <td className="py-2.5 pr-4 font-mono text-xs">
                    {day.observations}
                  </td>

                  <td className="py-2.5 pr-4 font-mono text-xs">
                    {day.fires}
                  </td>

                  <td className="py-2.5 text-xs text-muted-foreground">
                    {day.stations > 0
                      ? "CPCB records returned"
                      : "No records returned"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="mt-3 text-xs text-muted-foreground">
        Source: historical CPCB ground-station archive, Sentinel-5P
        satellite composite and NASA FIRMS VIIRS detections. The weighted
        mean is calculated from reported station means and their hourly
        observation counts. VIIRS detections are not necessarily unique
        confirmed fires. Missing records do not establish an absence of
        pollution or fire activity.
      </p>
    </>
  );
}
