
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Flame,
  Satellite,
  Search,
  MapPinned,
} from "lucide-react";
import type { Station } from "@/components/strata/LiveDashboardMap";
import {
  FilterChip,
  PageHeader,
  Panel,
  StatCard,
} from "@/components/strata/ui";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

type Dataset = "CPCB" | "Sentinel-5P" | "VIIRS";

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

type ObservationRecord = Station | SatellitePoint | Fire;

type ObservationRow = {
  key: string;
  title: string;
  subtitle: string;
  value: string;
  meta: string;
  record: ObservationRecord;
};

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Environmental Observations — STRATA" },
      {
        name: "description",
        content:
          "Explore CPCB, Sentinel-5P and VIIRS environmental observations.",
      },
      {
        property: "og:title",
        content: "Environmental Observations — STRATA",
      },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const [dataset, setDataset] = useState<Dataset>("CPCB");
  const [date, setDate] = useState("2024-11-17");
  const [pollutant, setPollutant] = useState("PM2.5");
  const [satellitePollutant, setSatellitePollutant] =
    useState("NO2");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const [stations, setStations] = useState<Station[]>([]);
  const [satellitePoints, setSatellitePoints] =
    useState<SatellitePoint[]>([]);
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
          throw new Error("One or more environmental data requests failed.");
        }

        const cpcbData = (await responses[0].json()) as {
          stations?: Station[];
        };

        const satelliteData = (await responses[1].json()) as {
          points?: SatellitePoint[];
        };

        const fireData = (await responses[2].json()) as {
          detections?: Fire[];
        };

        setStations(cpcbData.stations ?? []);
        setSatellitePoints(satelliteData.points ?? []);
        setFires(fireData.detections ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load environmental observations."
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

  const allRows = useMemo<ObservationRow[]>(() => {
    if (dataset === "CPCB") {
      return stations.map((station) => ({
        key: station.station_id,
        title: station.station_name,
        subtitle: `${station.city_name}, ${station.state_name}`,
        value: `${station.mean.toFixed(2)} ${station.unit}`,
        meta: `${station.n} hourly observations · ${station.coverage_flag.replaceAll("_", " ")}`,
        record: station,
      }));
    }

    if (dataset === "Sentinel-5P") {
      return satellitePoints.map((point) => ({
        key: point.point_id,
        title: point.point_id,
        subtitle: `${point.grid_lat.toFixed(4)}, ${point.grid_lon.toFixed(4)}`,
        value:
          point.anomaly_z_score === null
            ? "Score unavailable"
            : `Z-score: ${point.anomaly_z_score.toFixed(3)}`,
        meta: `${point.pollutant} · ${point.anomaly_direction ?? "Direction unavailable"}`,
        record: point,
      }));
    }

    return fires.map((fire, index) => ({
      key: `${index}-${fire.date}-${fire.acq_time}-${fire.latitude}-${fire.longitude}`,
      title: `VIIRS detection ${index + 1}`,
      subtitle: `${fire.latitude.toFixed(4)}, ${fire.longitude.toFixed(4)}`,
      value: `${fire.frp.toFixed(2)} MW`,
      meta: `${fire.date} · ${fire.acq_time} UTC · ${fire.confidence} confidence`,
      record: fire,
    }));
  }, [dataset, stations, satellitePoints, fires]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return allRows;

    return allRows.filter((row) =>
      `${row.title} ${row.subtitle} ${row.value} ${row.meta}`
        .toLowerCase()
        .includes(search)
    );
  }, [allRows, query]);

  const selectedRow =
    filteredRows.find((row) => row.key === selectedId) ??
    filteredRows[0];

  const displayedRows = filteredRows.slice(0, 100);

  const selectedTotal =
    dataset === "CPCB"
      ? stations.length
      : dataset === "Sentinel-5P"
        ? satellitePoints.length
        : fires.length;

  const scoredPoints = satellitePoints.filter(
    (point) => point.score_available
  ).length;

  return (
    <>
      <PageHeader
        title="Environmental Observation Intelligence"
        subtitle="Explore individual measurements, satellite anomalies and fire detections"
        actions={
          <Link
            to="/map"
            className="rounded-md border px-3 py-2 text-xs text-primary hover:bg-primary/10"
          >
            Open multi-source map →
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="CPCB Stations"
          value={String(stations.length)}
          delta={`${pollutant} · ${date}`}
          icon={<Activity className="h-4 w-4" />}
        />

        <StatCard
          label="Satellite Grid Points"
          value={String(satellitePoints.length)}
          delta={`${satellitePollutant} · composite observations`}
          icon={<Satellite className="h-4 w-4" />}
        />

        <StatCard
          label="VIIRS Detections"
          value={String(fires.length)}
          delta={`Satellite records · ${date}`}
          icon={<Flame className="h-4 w-4" />}
        />
      </div>

      <Panel
        title="Observation filters"
        simulated={false}
        className="mt-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(["CPCB", "Sentinel-5P", "VIIRS"] as Dataset[]).map(
              (item) => (
                <FilterChip
                  key={item}
                  active={dataset === item}
                  onClick={() => {
                    setDataset(item);
                    setQuery("");
                    setSelectedId("");
                  }}
                >
                  {item}
                </FilterChip>
              )
            )}
          </div>

          {(dataset === "CPCB" || dataset === "VIIRS") && (
            <label className="grid gap-1 text-xs text-muted-foreground">
              Observation date
              <input
                type="date"
                value={date}
                min="2024-11-09"
                max="2024-11-17"
                onChange={(event) => setDate(event.target.value)}
                className="h-9 rounded-md border bg-surface px-2 text-foreground"
              />
            </label>
          )}

          {dataset === "CPCB" && (
            <label className="grid gap-1 text-xs text-muted-foreground">
              Pollutant
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
          )}

          {dataset === "Sentinel-5P" && (
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
          )}

          {loading && (
            <span className="text-xs text-muted-foreground">
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

      <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Panel
          title={`${dataset} observations`}
          simulated={false}
        >
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search observations..."
              className="h-9 w-full rounded-md border bg-surface pl-8 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="mb-3 text-xs text-muted-foreground">
            Showing {displayedRows.length} of {filteredRows.length} matching records
            {filteredRows.length > 100 && " · First 100 shown"}
          </div>

          <div className="max-h-[650px] space-y-1 overflow-y-auto">
            {displayedRows.map((row) => (
              <button
                key={row.key}
                onClick={() => setSelectedId(row.key)}
                className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                  selectedRow?.key === row.key
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:bg-accent"
                }`}
              >
                <div className="text-sm font-medium leading-snug">
                  {row.title}
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  {row.subtitle}
                </div>

                <div className="mt-2 font-mono text-xs text-primary">
                  {row.value}
                </div>

                <div className="mt-1 text-[10px] text-muted-foreground">
                  {row.meta}
                </div>
              </button>
            ))}

            {!loading && filteredRows.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No matching observations found.
              </div>
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Selected observation"
            simulated={false}
          >
            {!selectedRow ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {loading
                  ? "Loading observation records..."
                  : "Select an observation to inspect its details."}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm border px-2 py-1 text-[10px] uppercase tracking-wider">
                    {dataset}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {selectedRow.key}
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-semibold">
                  {selectedRow.title}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedRow.subtitle}
                </p>

                {dataset === "CPCB" &&
                  "station_id" in selectedRow.record && (
                    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Reported mean
                        </div>
                        <div className="mt-1 font-mono text-lg">
                          {selectedRow.record.mean.toFixed(2)}{" "}
                          {selectedRow.record.unit}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Pollutant
                        </div>
                        <div className="mt-1 font-mono text-lg">
                          {selectedRow.record.parameter_name}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Hourly observations
                        </div>
                        <div className="mt-1 font-mono text-lg">
                          {selectedRow.record.n}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Station ID
                        </div>
                        <div className="mt-1 text-sm">
                          {selectedRow.record.station_id}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          City / State
                        </div>
                        <div className="mt-1 text-sm">
                          {selectedRow.record.city_name},{" "}
                          {selectedRow.record.state_name}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Coverage flag
                        </div>
                        <div className="mt-1 text-sm">
                          {selectedRow.record.coverage_flag.replaceAll(
                            "_",
                            " "
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                {dataset === "Sentinel-5P" &&
                  "point_id" in selectedRow.record && (
                    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Pollutant
                        </div>
                        <div className="mt-1 text-lg">
                          {selectedRow.record.pollutant}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Anomaly Z-score
                        </div>
                        <div className="mt-1 font-mono text-lg">
                          {selectedRow.record.anomaly_z_score === null
                            ? "Unavailable"
                            : selectedRow.record.anomaly_z_score.toFixed(3)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Anomaly difference
                        </div>
                        <div className="mt-1 font-mono text-lg">
                          {selectedRow.record.anomaly_difference ?? "Unavailable"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Direction
                        </div>
                        <div className="mt-1 text-sm">
                          {selectedRow.record.anomaly_direction ?? "Unavailable"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Score available
                        </div>
                        <div className="mt-1 text-sm">
                          {selectedRow.record.score_available ? "Yes" : "No"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Negative retrieval
                        </div>
                        <div className="mt-1 text-sm">
                          {selectedRow.record.negative_retrieval ? "Yes" : "No"}
                        </div>
                      </div>

                      <div className="col-span-2 md:col-span-3">
                        <div className="text-xs text-muted-foreground">
                          Composite period
                        </div>
                        <div className="mt-1 text-sm">
                          {selectedRow.record.window_start} to{" "}
                          {selectedRow.record.window_end_exclusive}
                          {" "}(end date exclusive)
                        </div>
                      </div>
                    </div>
                  )}

                {dataset === "VIIRS" &&
                  "frp" in selectedRow.record && (
                    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Detection date
                        </div>
                        <div className="mt-1 text-sm">
                          {selectedRow.record.date}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Acquisition time
                        </div>
                        <div className="mt-1 text-sm">
                          {selectedRow.record.acq_time} UTC
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Fire Radiative Power
                        </div>
                        <div className="mt-1 font-mono text-lg">
                          {selectedRow.record.frp.toFixed(2)} MW
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Satellite
                        </div>
                        <div className="mt-1 text-sm">
                          {selectedRow.record.satellite}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Confidence
                        </div>
                        <div className="mt-1 text-sm">
                          {selectedRow.record.confidence}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Day / night
                        </div>
                        <div className="mt-1 text-sm">
                          {selectedRow.record.daynight}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Detection type
                        </div>
                        <div className="mt-1 text-sm">
                          {selectedRow.record.type}
                        </div>
                      </div>
                    </div>
                  )}

                <div className="mt-5 rounded-md border bg-surface p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPinned className="h-3.5 w-3.5" />
                    Geographic coordinates
                  </div>

                  <div className="mt-2 font-mono text-sm">
                    {"station_id" in selectedRow.record
                      ? `${selectedRow.record.latitude}, ${selectedRow.record.longitude}`
                      : "point_id" in selectedRow.record
                        ? `${selectedRow.record.grid_lat}, ${selectedRow.record.grid_lon}`
                        : `${selectedRow.record.latitude}, ${selectedRow.record.longitude}`}
                  </div>

                  <Link
                    to="/map"
                    className="mt-2 inline-block text-xs text-primary hover:underline"
                  >
                    Open full environmental map →
                  </Link>
                </div>
              </>
            )}
          </Panel>

          <Panel
            title="Predictive assessment"
            simulated={false}
          >
            <p className="text-sm text-muted-foreground">
              XGBoost risk classification, future predictions and SHAP
              explanations are not connected to this observation yet.
              This section can be populated when the predictive model
              integration is available.
            </p>
          </Panel>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        CPCB records represent reported station-level means. Sentinel-5P
        records represent composite-period grid observations. VIIRS records
        are satellite detections, not necessarily unique confirmed fires.
        An observation alone does not establish a confirmed pollution
        incident, its cause or its impact on population.
      </p>
    </>
  );
}
