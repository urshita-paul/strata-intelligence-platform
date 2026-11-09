import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Database, Flame, MapPinned, Satellite } from "lucide-react";
import type { Station } from "@/components/strata/LiveDashboardMap";
import { PageHeader, Panel, StatCard } from "@/components/strata/ui";

const LiveDashboardMap = lazy(
  () => import("@/components/strata/LiveDashboardMap")
);

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const REGIONS = [
  "All India",
  "North",
  "South",
  "East",
  "West",
  "Central",
] as const;

type Region = (typeof REGIONS)[number];

const STATE_REGION: Record<string, Region> = {
  Delhi: "North",
  Haryana: "North",
  Punjab: "North",
  Rajasthan: "North",
  "Uttar Pradesh": "North",
  Uttarakhand: "North",
  "Himachal Pradesh": "North",

  Karnataka: "South",
  "Tamil Nadu": "South",
  Kerala: "South",
  "Andhra Pradesh": "South",
  Telangana: "South",

  "West Bengal": "East",
  Bihar: "East",
  Jharkhand: "East",
  Odisha: "East",
  Assam: "East",

  Maharashtra: "West",
  Gujarat: "West",
  Goa: "West",

  "Madhya Pradesh": "Central",
  Chhattisgarh: "Central",
};

type SatellitePoint = {
  point_id: string;
};

function MapLoading() {
  return (
    <div className="flex min-h-[390px] items-center justify-center rounded-md bg-surface text-sm text-muted-foreground">
      Loading map...
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "STRATA Command Centre — Environmental Intelligence",
      },
      {
        name: "description",
        content:
          "Historical environmental observations from CPCB, Sentinel-5P and VIIRS.",
      },
    ],
  }),
  component: CommandCentre,
});

function CommandCentre() {
  const [date, setDate] = useState("2024-11-17");
  const [pollutant, setPollutant] = useState("PM2.5");
  const [satellitePollutant, setSatellitePollutant] =
    useState("NO2");
  const [region, setRegion] = useState<Region>("All India");

  const [stations, setStations] = useState<Station[]>([]);
  const [satellitePoints, setSatellitePoints] =
    useState<SatellitePoint[]>([]);
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

        if (responses.some((response) => !response.ok)) {
          throw new Error("An API request failed.");
        }

        const cpcbData = (await responses[0].json()) as {
          stations?: Station[];
        };

        const satelliteData = (await responses[1].json()) as {
          points?: SatellitePoint[];
        };

        const fireData = (await responses[2].json()) as {
          detections?: unknown[];
        };

        setStations(cpcbData.stations ?? []);
        setSatellitePoints(satelliteData.points ?? []);
        setFires(fireData.detections ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          "Unable to load environmental data. Please check the API connection."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, [date, pollutant, satellitePollutant]);

  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      return (
        region === "All India" ||
        STATE_REGION[station.state_name] === region
      );
    });
  }, [stations, region]);

  const statesCount = new Set(
    stations.map((station) => station.state_name)
  ).size;

  const hourlyObservations = stations.reduce(
    (total, station) => total + station.n,
    0
  );

  const lowCoverageCount = stations.filter((station) =>
    station.coverage_flag?.startsWith("low_coverage")
  ).length;

  const topStations = [...filteredStations]
    .sort((a, b) => b.mean - a.mean)
    .slice(0, 8);

  return (
    <>
      <PageHeader
        title="STRATA Command Centre"
        subtitle="Historical Environmental Monitoring & Intelligence"
        actions={
          <span className="rounded-md border px-3 py-1.5 font-mono text-xs text-muted-foreground">
            Historical data · {date}
          </span>
        }
      />

      <Panel title="Data selection" simulated={false}>
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-1 text-xs text-muted-foreground">
            CPCB observation date
            <input
              type="date"
              value={date}
              min="2024-11-09"
              max="2024-11-17"
              onChange={(event) => setDate(event.target.value)}
              className="h-9 rounded-md border bg-surface px-2 text-foreground"
            />
          </label>

          <label className="grid gap-1 text-xs text-muted-foreground">
            CPCB pollutant
            <select
              value={pollutant}
              onChange={(event) => setPollutant(event.target.value)}
              className="h-9 rounded-md border bg-surface px-2 text-foreground"
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
              className="h-9 rounded-md border bg-surface px-2 text-foreground"
            >
              <option value="NO2">NO2</option>
              <option value="HCHO">HCHO</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs text-muted-foreground">
            Geographic region
            <select
              value={region}
              onChange={(event) =>
                setRegion(event.target.value as Region)
              }
              className="h-9 rounded-md border bg-surface px-2 text-foreground"
            >
              {REGIONS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          {loading && (
            <span className="pb-2 text-xs text-muted-foreground">
              Loading observations...
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
          label="CPCB Stations"
          value={String(stations.length)}
          delta="Stations returned by API"
          icon={<Activity className="h-4 w-4" />}
        />

        <StatCard
          label="Satellite Grid Points"
          value={String(satellitePoints.length)}
          delta={`${satellitePollutant} observations`}
          icon={<Satellite className="h-4 w-4" />}
        />

        <StatCard
          label="VIIRS Detections"
          value={String(fires.length)}
          delta="Satellite fire detections"
          icon={<Flame className="h-4 w-4" />}
        />

        <StatCard
          label="States Represented"
          value={String(statesCount)}
          delta="States with CPCB stations"
          icon={<MapPinned className="h-4 w-4" />}
        />

        <StatCard
          label="Hourly Observations"
          value={String(hourlyObservations)}
          delta="Combined station observations"
          icon={<Database className="h-4 w-4" />}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Panel
          title="CPCB Ground Station Map"
          simulated={false}
          action={
            <Link
              to="/map"
              className="text-xs text-primary hover:underline"
            >
              Open full map →
            </Link>
          }
          className="min-w-0"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {pollutant} · {date}
            </span>

            <span className="font-mono text-xs text-muted-foreground">
              {filteredStations.length} of {stations.length} stations
            </span>
          </div>

          <div className="h-[430px] overflow-hidden rounded-md border bg-surface">
            <ClientOnly fallback={<MapLoading />}>
              <Suspense fallback={<MapLoading />}>
                <LiveDashboardMap stations={filteredStations} />
              </Suspense>
            </ClientOnly>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-3 w-3 rounded-full bg-teal-700" />
            CPCB monitoring station · Select a marker for its reading
          </div>
        </Panel>

        <Panel title="Dataset Overview" simulated={false}>
          <div className="space-y-4">
            <div className="rounded-md border bg-surface p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                CPCB ground observations
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {stations.length}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Monitoring stations for {date}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {lowCoverageCount} stations flagged with low coverage
              </div>
            </div>

            <div className="rounded-md border bg-surface p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sentinel-5P satellite
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {satellitePoints.length}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {satellitePollutant} grid observations
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Composite: 12–18 November 2024
                <br />
                End date exclusive
              </div>
            </div>

            <div className="rounded-md border bg-surface p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                NASA FIRMS VIIRS
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {fires.length}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Fire detections for {date}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Satellite detections, not unique confirmed fires
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title="Highest CPCB Station Mean Readings"
        simulated={false}
        className="mt-4"
      >
        <p className="mb-3 text-xs text-muted-foreground">
          Ranked by reported station mean for {pollutant} on {date}.
          These are measurements, not risk scores.
        </p>

        {topStations.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {loading
              ? "Loading station readings..."
              : "No station observations available for this selection."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Station</th>
                  <th className="pb-2 pr-4 font-medium">City / State</th>
                  <th className="pb-2 pr-4 font-medium">Mean reading</th>
                  <th className="pb-2 pr-4 font-medium">Observations</th>
                  <th className="pb-2 font-medium">Coverage</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {topStations.map((station) => (
                  <tr key={station.station_id}>
                    <td className="py-2.5 pr-4 text-sm">
                      {station.station_name}
                    </td>

                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {station.city_name}, {station.state_name}
                    </td>

                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {station.mean.toFixed(2)} {station.unit}
                    </td>

                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {station.n}
                    </td>

                    <td className="py-2.5 text-xs text-muted-foreground">
                      {station.coverage_flag.replaceAll("_", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="mt-3 text-xs text-muted-foreground">
        STRATA historical data view. CPCB values are station-level reported
        means. Sentinel-5P measurements use composite windows. VIIRS records
        represent satellite fire detections and should not be interpreted as
        unique confirmed fires.
      </p>
    </>
  );
}