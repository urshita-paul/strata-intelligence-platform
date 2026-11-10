import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Flame,
  Satellite,
  Search,
  MapPinned,
  ShieldAlert,
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
  baseline_n: number | null;
  baseline_mean: number | null;
  anomaly_difference: number | null;
  anomaly_z_score: number | null;
  anomaly_direction: string | null;
  baseline_status: string | null;
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

// Calculate percentage deviation from the historical baseline.
// Negative retrievals are excluded from percentage calculations.
const getPercentageDeviation = (
  point: SatellitePoint
): number | null => {
  if (point.negative_retrieval) {
    return null;
  }

  const baselineMean = point.baseline_mean;
  const difference = point.anomaly_difference;

  if (
    typeof baselineMean !== "number" ||
    !Number.isFinite(baselineMean) ||
    baselineMean <= 0 ||
    typeof difference !== "number" ||
    !Number.isFinite(difference)
  ) {
    return null;
  }

  return (difference / baselineMean) * 100;
};

// Format percentage deviation for display.
const formatPercentageDeviation = (
  point: SatellitePoint
): string => {
  if (point.negative_retrieval) {
    return "Not calculated — negative retrieval";
  }

  const deviation = getPercentageDeviation(point);

  if (deviation === null) {
    return "Unavailable";
  }

  return `${deviation > 0 ? "+" : ""}${deviation.toFixed(2)}%`;
};

type CPCBItem = {
  dataset: "CPCB";
  key: string;
  title: string;
  location: string;
  value: string;
  context: string;
  record: Station;
};

type SatelliteItem = {
  dataset: "Sentinel-5P";
  key: string;
  title: string;
  location: string;
  value: string;
  context: string;
  record: SatellitePoint;
};

type FireItem = {
  dataset: "VIIRS";
  key: string;
  title: string;
  location: string;
  value: string;
  context: string;
  record: Fire;
};

type ObservationItem =
  | CPCBItem
  | SatelliteItem
  | FireItem;

const confidenceLabel = (value: string) => {
  const code = value.trim().toLowerCase();

  if (code === "l" || code === "low") return "Low";
  if (code === "n" || code === "nominal") return "Nominal";
  if (code === "h" || code === "high") return "High";

  return "Unclassified";
};

export const Route = createFileRoute("/warnings")({
  head: () => ({
    meta: [
      { title: "Environmental Watch Centre — STRATA" },
      {
        name: "description",
        content:
          "Observation-based environmental monitoring using CPCB, Sentinel-5P and VIIRS datasets.",
      },
      {
        property: "og:title",
        content: "Environmental Watch Centre — STRATA",
      },
    ],
  }),
  component: WarningsPage,
});

function WarningsPage() {
  const [dataset, setDataset] = useState<Dataset>("Sentinel-5P");
  const [date, setDate] = useState("2024-11-17");
  const [pollutant, setPollutant] = useState("PM2.5");

  const [satellitePollutant, setSatellitePollutant] =
    useState("NO2");

  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("");

  const [stations, setStations] = useState<Station[]>([]);

  const [satellitePoints, setSatellitePoints] =
    useState<SatellitePoint[]>([]);

  const [fires, setFires] = useState<Fire[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // LOAD ENVIRONMENTAL DATA
  // --------------------------------------------------

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
          throw new Error(
            "One or more environmental data requests failed."
          );
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

  // --------------------------------------------------
  // SUMMARY STATISTICS
  // --------------------------------------------------

  // Only valid, non-negative scored observations
  // contribute to the above/below baseline summaries.

  const aboveBaseline = satellitePoints.filter(
    (point) =>
      point.score_available &&
      !point.negative_retrieval &&
      point.anomaly_direction === "above_baseline"
  ).length;

  const belowBaseline = satellitePoints.filter(
    (point) =>
      point.score_available &&
      !point.negative_retrieval &&
      point.anomaly_direction === "below_baseline"
  ).length;

  const scoredPoints = satellitePoints.filter(
    (point) =>
      point.score_available &&
      !point.negative_retrieval
  ).length;

  const negativeRetrievals = satellitePoints.filter(
    (point) => point.negative_retrieval
  ).length;

  const unscoredPoints = satellitePoints.filter(
    (point) =>
      !point.score_available &&
      !point.negative_retrieval
  ).length;

  const lowCoverage = stations.filter((station) =>
    station.coverage_flag?.startsWith("low_coverage")
  ).length;

  const maxFrp =
    fires.length > 0
      ? Math.max(...fires.map((fire) => fire.frp))
      : null;

  // --------------------------------------------------
  // BUILD OBSERVATION LIST
  // --------------------------------------------------

  const items = useMemo<ObservationItem[]>(() => {

    // CPCB observations
    if (dataset === "CPCB") {
      return [...stations]
        .sort((a, b) => b.mean - a.mean)
        .map((station) => ({
          dataset: "CPCB",
          key: station.station_id,
          title: station.station_name,
          location: `${station.city_name}, ${station.state_name}`,
          value: `${station.mean.toFixed(2)} ${station.unit}`,
          context: `${station.n} hourly observations`,
          record: station,
        }));
    }

    // Sentinel-5P observations
    if (dataset === "Sentinel-5P") {
      return [...satellitePoints]

        // Valid percentage deviations appear first.
        // Negative retrievals and unavailable percentages
        // are placed at the bottom.
        .sort((a, b) => {
          const deviationA = getPercentageDeviation(a);
          const deviationB = getPercentageDeviation(b);

          if (
            deviationA === null &&
            deviationB === null
          ) {
            return 0;
          }

          if (deviationA === null) return 1;
          if (deviationB === null) return -1;

          return (
            Math.abs(deviationB) -
            Math.abs(deviationA)
          );
        })

        .map((point) => {
          const deviation = getPercentageDeviation(point);

          return {
            dataset: "Sentinel-5P",
            key: point.point_id,
            title: point.point_id,

            location: `${point.grid_lat.toFixed(4)}, ${point.grid_lon.toFixed(4)}`,

            value: point.negative_retrieval
              ? "Negative retrieval · % not calculated"
              : deviation === null
                ? "Percentage deviation unavailable"
                : `${deviation > 0 ? "+" : ""}${deviation.toFixed(2)}% vs baseline`,

            context: `${point.anomaly_direction
              ? point.anomaly_direction.replaceAll("_", " ")
              : "Direction unavailable"}${point.negative_retrieval
              ? " · negative retrieval flagged"
              : ""}`,

            record: point,
          };
        });
    }

    // VIIRS observations
    return [...fires]
      .sort((a, b) => b.frp - a.frp)
      .map((fire, index) => ({
        dataset: "VIIRS",
        key: `${fire.date}-${fire.acq_time}-${fire.latitude}-${fire.longitude}-${index}`,
        title: `VIIRS detection ${index + 1}`,
        location: `${fire.latitude.toFixed(4)}, ${fire.longitude.toFixed(4)}`,
        value: `${fire.frp.toFixed(2)} MW`,
        context: `${confidenceLabel(fire.confidence)} confidence`,
        record: fire,
      }));

  }, [dataset, stations, satellitePoints, fires]);

  // --------------------------------------------------
  // SEARCH FILTER
  // --------------------------------------------------

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return items;

    return items.filter((item) =>
      `${item.title} ${item.location} ${item.value} ${item.context}`
        .toLowerCase()
        .includes(search)
    );

  }, [items, query]);

  const selected =
    filteredItems.find((item) => item.key === selectedKey) ??
    filteredItems[0];

  // --------------------------------------------------
  // PAGE UI
  // --------------------------------------------------

  return (
    <>
      <PageHeader
        title="Environmental Watch Centre"
        subtitle="Observation-based environmental signals for analyst review"
        actions={
          <Link
            to="/map"
            className="rounded-md border px-3 py-2 text-xs text-primary hover:bg-primary/10"
          >
            Open environmental map →
          </Link>
        }
      />

      {/* MONITORING FILTERS */}

      <Panel title="Monitoring filters" simulated={false}>
        <div className="flex flex-wrap items-end gap-4">

          <label className="grid gap-1 text-xs text-muted-foreground">
            CPCB date / VIIRS date

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

      {/* SUMMARY CARDS */}

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">

        <StatCard
          label="CPCB Stations"
          value={String(stations.length)}
          delta={`${lowCoverage} with low coverage`}
          icon={<Activity className="h-4 w-4" />}
        />

        <StatCard
          label="Above-baseline points"
          value={String(aboveBaseline)}
          delta="Valid non-negative scored observations"
          icon={<Satellite className="h-4 w-4" />}
        />

        <StatCard
          label="Valid scored grid points"
          value={String(scoredPoints)}
          delta={`${belowBaseline} below · ${negativeRetrievals} negative flagged · ${unscoredPoints} unscored`}
          icon={<ShieldAlert className="h-4 w-4" />}
        />

        <StatCard
          label="VIIRS Detections"
          value={String(fires.length)}
          delta={
            maxFrp === null
              ? "No detections returned"
              : `Maximum FRP ${maxFrp.toFixed(2)} MW`
          }
          icon={<Flame className="h-4 w-4" />}
        />

      </div>

      {/* OBSERVATION SOURCE SELECTOR */}

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">

          <span className="mr-1 text-xs uppercase tracking-wider text-muted-foreground">
            Observation source
          </span>

          {(["CPCB", "Sentinel-5P", "VIIRS"] as Dataset[]).map(
            (item) => (
              <FilterChip
                key={item}
                active={dataset === item}
                onClick={() => {
                  setDataset(item);
                  setQuery("");
                  setSelectedKey("");
                }}
              >
                {item}
              </FilterChip>
            )
          )}

        </div>
      </div>

      {/* OBSERVATION LIST AND DETAILS */}

      <div className="mt-3 grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">

        {/* OBSERVATION LIST */}

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
            {filteredItems.length} matching observations
          </div>

          <div className="max-h-[650px] space-y-1 overflow-y-auto">

            {filteredItems.slice(0, 100).map((item) => (
              <button
                key={item.key}
                onClick={() => setSelectedKey(item.key)}
                className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                  selected?.key === item.key
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:bg-accent"
                }`}
              >

                <div className="text-sm font-medium leading-snug">
                  {item.title}
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  {item.location}
                </div>

                <div className="mt-2 font-mono text-xs text-primary">
                  {item.value}
                </div>

                <div className="mt-1 text-[10px] text-muted-foreground">
                  {item.context}
                </div>

              </button>
            ))}

            {filteredItems.length > 100 && (
              <p className="px-2 py-2 text-[11px] text-muted-foreground">
                Showing first 100 records. Use search to find other records.
              </p>
            )}

            {!loading && filteredItems.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No matching observations returned.
              </div>
            )}

          </div>
        </Panel>

        {/* SELECTED OBSERVATION */}

        <div className="space-y-4">

          <Panel
            title="Selected observation"
            simulated={false}
          >

            {!selected ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {loading
                  ? "Loading observation records..."
                  : "Select an observation to review its details."}
              </div>
            ) : (
              <>

                <div className="flex flex-wrap items-center gap-2">

                  <span className="rounded-sm border px-2 py-1 text-[10px] uppercase tracking-wider">
                    {selected.dataset}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {selected.key}
                  </span>

                </div>

                <h2 className="mt-3 text-xl font-semibold">
                  {selected.title}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {selected.location}
                </p>

                {/* CPCB DETAILS */}

                {selected.dataset === "CPCB" && (
                  <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Reported mean
                      </div>

                      <div className="mt-1 font-mono text-lg">
                        {selected.record.mean.toFixed(2)}{" "}
                        {selected.record.unit}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Pollutant
                      </div>

                      <div className="mt-1 text-lg">
                        {selected.record.parameter_name}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Hourly observations
                      </div>

                      <div className="mt-1 font-mono text-lg">
                        {selected.record.n}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Coverage
                      </div>

                      <div className="mt-1 text-sm">
                        {selected.record.coverage_flag.replaceAll(
                          "_",
                          " "
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Station ID
                      </div>

                      <div className="mt-1 text-sm">
                        {selected.record.station_id}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        State
                      </div>

                      <div className="mt-1 text-sm">
                        {selected.record.state_name}
                      </div>
                    </div>

                  </div>
                )}

                {/* SENTINEL-5P DETAILS */}

                {selected.dataset === "Sentinel-5P" && (
                  <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Pollutant
                      </div>

                      <div className="mt-1 text-lg">
                        {selected.record.pollutant}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Relative deviation
                      </div>

                      <div className="mt-1 font-mono text-lg">
                        {formatPercentageDeviation(selected.record)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Historical baseline mean
                      </div>

                      <div className="mt-1 font-mono text-sm">
                        {typeof selected.record.baseline_mean === "number" &&
                        Number.isFinite(selected.record.baseline_mean)
                          ? selected.record.baseline_mean.toExponential(4)
                          : "Unavailable"}

                        {" "}
                        {selected.record.unit}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Historical baseline samples
                      </div>

                      <div className="mt-1 text-lg">
                        {selected.record.baseline_n ?? "Unavailable"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Anomaly difference
                      </div>

                      <div className="mt-1 font-mono text-sm">
                        {typeof selected.record.anomaly_difference === "number"
                          ? selected.record.anomaly_difference.toExponential(4)
                          : "Unavailable"}

                        {" "}
                        {selected.record.unit}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Diagnostic Z-score
                      </div>

                      <div className="mt-1 font-mono text-lg">
                        {typeof selected.record.anomaly_z_score === "number"
                          ? selected.record.anomaly_z_score.toFixed(3)
                          : "Unavailable"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Direction
                      </div>

                      <div className="mt-1 text-sm">
                        {selected.record.anomaly_direction?.replaceAll(
                          "_",
                          " "
                        ) ?? "Unavailable"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Baseline status
                      </div>

                      <div className="mt-1 text-sm">
                        {selected.record.baseline_status?.replaceAll(
                          "_",
                          " "
                        ) ?? "Unavailable"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Score available
                      </div>

                      <div className="mt-1 text-sm">
                        {selected.record.score_available ? "Yes" : "No"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Negative retrieval
                      </div>

                      <div className="mt-1 text-sm">
                        {selected.record.negative_retrieval ? "Yes" : "No"}
                      </div>
                    </div>

                    <div className="col-span-2 md:col-span-3">
                      <div className="text-xs text-muted-foreground">
                        Composite period
                      </div>

                      <div className="mt-1 text-sm">
                        {selected.record.window_start} to{" "}
                        {selected.record.window_end_exclusive}
                        {" "}(end date exclusive)
                      </div>
                    </div>

                    <div className="col-span-2 rounded-lg bg-muted/40 p-3 md:col-span-3">

                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Percentage deviation compares the satellite
                        column measurement with its historical baseline.
                        Negative retrievals are retained for inspection
                        but excluded from percentage calculations and
                        ranking. The Z-score is a secondary diagnostic
                        with limited historical baseline support.
                        Sentinel-5P column measurements are not direct
                        ground-level pollution measurements.
                      </p>

                    </div>

                  </div>
                )}

                {/* VIIRS DETAILS */}

                {selected.dataset === "VIIRS" && (
                  <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Detection date
                      </div>

                      <div className="mt-1 text-sm">
                        {selected.record.date}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Acquisition time
                      </div>

                      <div className="mt-1 text-sm">
                        {selected.record.acq_time} UTC
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Fire Radiative Power
                      </div>

                      <div className="mt-1 font-mono text-lg">
                        {selected.record.frp.toFixed(2)} MW
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Confidence category
                      </div>

                      <div className="mt-1 text-sm">
                        {confidenceLabel(selected.record.confidence)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Satellite
                      </div>

                      <div className="mt-1 text-sm">
                        {selected.record.satellite}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Day / night
                      </div>

                      <div className="mt-1 text-sm">
                        {selected.record.daynight}
                      </div>
                    </div>

                  </div>
                )}

                {/* GEOGRAPHIC COORDINATES */}

                <div className="mt-5 rounded-md border bg-surface p-3">

                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPinned className="h-3.5 w-3.5" />
                    Geographic coordinates
                  </div>

                  <div className="mt-2 font-mono text-sm">
                    {selected.dataset === "CPCB"
                      ? `${selected.record.latitude}, ${selected.record.longitude}`
                      : selected.dataset === "Sentinel-5P"
                        ? `${selected.record.grid_lat}, ${selected.record.grid_lon}`
                        : `${selected.record.latitude}, ${selected.record.longitude}`}
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

          {/* PREDICTIVE MODEL PLACEHOLDER */}

          <Panel
            title="Predictive model integration"
            simulated={false}
          >

            <div className="flex items-start gap-3">

              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />

              <div>

                <div className="text-sm font-medium">
                  Predictive forecasts are not connected yet
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  XGBoost risk classifications, future predictions and
                  SHAP explanations will appear here once the predictive
                  model is integrated and validated.
                </p>

              </div>

            </div>

          </Panel>

        </div>

      </div>

      {/* INTERPRETATION NOTES */}

      <Panel
        title="How to interpret these observations"
        simulated={false}
        className="mt-4"
      >

        <div className="grid gap-4 md:grid-cols-3">

          <div>
            <div className="text-sm font-semibold">
              CPCB
            </div>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Station-level reported means. Higher measurements are
              listed first; their ranking is not an official risk
              classification.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold">
              Sentinel-5P
            </div>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Records are ordered by absolute percentage deviation
              among valid, non-negative retrievals. Negative retrievals
              are retained for review but excluded from percentage
              calculations and ranking. Above-baseline and
              below-baseline observations are both shown. This is
              a relative comparison, not a pollution-risk ranking.
              Satellite column measurements are not direct
              ground-level exposure measurements.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold">
              VIIRS
            </div>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Satellite fire detections are observations, not necessarily
              unique confirmed fires. FRP is reported in megawatts.
            </p>
          </div>

        </div>

      </Panel>

      <p className="mt-3 text-xs text-muted-foreground">
        Historical observation view · CPCB and VIIRS use the selected
        date. Sentinel-5P uses the 12–18 November 2024 composite
        window, with the end date exclusive. This page does not issue
        forecasts or official environmental advisories.
      </p>

    </>
  );
}