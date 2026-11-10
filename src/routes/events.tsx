
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Clock3,
  Database,
  Flame,
  Info,
  MapPinned,
  Search,
  Satellite,
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

const isDataset = (value: unknown): value is Dataset =>
  value === "CPCB" ||
  value === "Sentinel-5P" ||
  value === "VIIRS";

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
  validateSearch: (search: Record<string, unknown>) => ({
    dataset: isDataset(search.dataset) ? search.dataset : "CPCB",
    q: typeof search.q === "string" ? search.q : "",
    id: typeof search.id === "string" ? search.id : "",
  }),

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

  // Apply global search parameters when navigating from AppShell.
  useEffect(() => {
    setDataset(routeSearch.dataset);
    setQuery(routeSearch.q);
    setSelectedId(routeSearch.id);
  }, [routeSearch.dataset, routeSearch.q, routeSearch.id]);

  // Load observations from the production API.
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
          fetch(`${API}/api/fires?date=${date}`, {
            signal: controller.signal,
          }),
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

  // Build observation rows for the selected source.
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

  // Include record IDs so exact IDs from global search match.
  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return allRows;

    return allRows.filter((row) =>
      `${row.key} ${row.title} ${row.subtitle} ${row.value} ${row.meta}`
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
    <div className="space-y-5 pb-8">
      <PageHeader
        title="Observation Explorer"
        subtitle="Explore individual measurements, satellite anomalies and fire detections."
        actions={
          <Link
            to="/map"
            className="group inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary transition-all hover:border-primary/50 hover:bg-primary/15"
          >
            <MapPinned className="h-4 w-4" />
            Open multi-source map
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        }
      />

      {/* Page introduction */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#080B0A] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-teal-400/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-48 w-48 rounded-full bg-cyan-500/[0.05] blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Database className="h-3.5 w-3.5" />
              Multi-source observation intelligence
            </div>

            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Explore the evidence behind every signal.
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
              Inspect station-level readings, satellite grid observations
              and thermal detections in one unified workspace.
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 sm:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                Active data source
              </div>
              <div className="mt-0.5 text-sm font-semibold text-zinc-100">
                {dataset}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dataset overview */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      {/* Filters */}
      <Panel
        title="Data source & filters"
        simulated={false}
        className="border-white/[0.08] bg-[#080808]"
      >
        <div className="space-y-5">
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Select observation source
              </span>
              <span className="text-[10px] text-zinc-500">
                3 available datasets
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
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
                    {item === "CPCB" && (
                      <Activity className="mr-1.5 inline h-3.5 w-3.5" />
                    )}
                    {item === "Sentinel-5P" && (
                      <Satellite className="mr-1.5 inline h-3.5 w-3.5" />
                    )}
                    {item === "VIIRS" && (
                      <Flame className="mr-1.5 inline h-3.5 w-3.5" />
                    )}
                    {item}
                  </FilterChip>
                )
              )}
            </div>
          </div>

          <div className="h-px bg-white/[0.07]" />

          <div className="flex flex-wrap items-end gap-4">
            {(dataset === "CPCB" || dataset === "VIIRS") && (
              <label className="grid min-w-[170px] gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Observation date
                </span>
                <input
                  type="date"
                  value={date}
                  min="2024-11-09"
                  max="2024-11-17"
                  onChange={(event) => setDate(event.target.value)}
                  className="h-10 rounded-lg border border-white/10 bg-[#101010] px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
                />
              </label>
            )}

            {dataset === "CPCB" && (
              <label className="grid min-w-[150px] gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Ground pollutant
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
            )}

            {dataset === "Sentinel-5P" && (
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
                  <option value="NO2">NO2</option>
                  <option value="HCHO">HCHO</option>
                </select>
              </label>
            )}

            <div className="ml-auto flex min-h-10 items-center gap-2 text-xs text-zinc-500">
              {loading ? (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  Loading observations...
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {selectedTotal.toLocaleString()} records loaded
                </>
              )}
            </div>
          </div>

          {dataset === "Sentinel-5P" && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-xs text-zinc-400">
              <span>
                Composite window:{" "}
                <span className="font-medium text-zinc-200">
                  12–18 November 2024
                </span>
              </span>
              <span>
                Scores available:{" "}
                <span className="font-mono font-medium text-primary">
                  {scoredPoints.toLocaleString()}
                </span>
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] p-3 text-sm text-red-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </Panel>

      {/* Observation workspace */}
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(290px,0.85fr)_minmax(0,1.65fr)]">
        {/* Observation list */}
        <Panel
          title={`${dataset} observations`}
          simulated={false}
          className="min-w-0 border-white/[0.08] bg-[#080808]"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-zinc-500">
                Browse and select an individual record
              </p>
            </div>
            <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-[10px] text-zinc-400">
              {filteredRows.length.toLocaleString()} results
            </span>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by ID, location or value..."
              className="h-10 w-full rounded-lg border border-white/10 bg-[#101010] pl-9 pr-3 text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="mb-3 flex items-center justify-between text-[10px] text-zinc-500">
            <span>
              Showing {displayedRows.length} of{" "}
              {filteredRows.length.toLocaleString()} matching records
            </span>
            {filteredRows.length > 100 && (
              <span className="text-primary/80">First 100 shown</span>
            )}
          </div>

          <div className="max-h-[660px] space-y-1.5 overflow-y-auto pr-1">
            {displayedRows.map((row) => {
              const isSelected = selectedRow?.key === row.key;

              return (
                <button
                  key={row.key}
                  onClick={() => setSelectedId(row.key)}
                  aria-pressed={isSelected}
                  className={`group w-full rounded-xl border p-3 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-primary/40 bg-primary/[0.07] shadow-[inset_2px_0_0_0_var(--primary)]"
                      : "border-white/[0.05] bg-white/[0.015] hover:border-white/[0.12] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-200">
                        {row.title}
                      </div>
                      <div className="mt-1 truncate text-xs text-zinc-500">
                        {row.subtitle}
                      </div>
                    </div>

                    <ChevronRight
                      className={`mt-0.5 h-4 w-4 shrink-0 transition-all ${
                        isSelected
                          ? "translate-x-0 text-primary"
                          : "-translate-x-1 text-zinc-700 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                      }`}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-medium text-primary">
                      {row.value}
                    </span>
                    <span className="text-right text-[10px] text-zinc-500">
                      {row.meta}
                    </span>
                  </div>
                </button>
              );
            })}

            {!loading && filteredRows.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
                <Search className="mx-auto h-6 w-6 text-zinc-600" />
                <p className="mt-3 text-sm font-medium text-zinc-300">
                  No matching observations
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Try another search term or dataset.
                </p>
              </div>
            )}

            {loading && displayedRows.length === 0 && (
              <div className="py-12 text-center text-sm text-zinc-500">
                Loading observation records...
              </div>
            )}
          </div>
        </Panel>

        {/* Selected record details */}
        <div className="min-w-0 space-y-4">
          <Panel
            title="Observation details"
            simulated={false}
            className="min-w-0 border-white/[0.08] bg-[#080808]"
          >
            {!selectedRow ? (
              <div className="py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-500">
                  <Database className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-medium text-zinc-300">
                  No observation selected
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {loading
                    ? "Loading observation records..."
                    : "Select a record from the list to inspect its details."}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-primary/25 bg-primary/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {dataset}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500">
                      {selectedRow.key}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Selected record
                  </span>
                </div>

                <div className="mt-5 rounded-xl border border-white/[0.07] bg-gradient-to-br from-white/[0.045] to-transparent p-4 sm:p-5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Observation identifier
                  </div>
                  <h2 className="mt-2 break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    {selectedRow.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-zinc-400">
                    {selectedRow.subtitle}
                  </p>

                  <div className="mt-5 border-t border-white/[0.07] pt-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Primary reading
                    </div>
                    <div className="mt-1.5 break-words font-mono text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                      {selectedRow.value}
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">
                      {selectedRow.meta}
                    </div>
                  </div>
                </div>

                {dataset === "CPCB" &&
                  "station_id" in selectedRow.record && (
                    <div className="mt-5">
                      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        Ground station information
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        <DetailItem
                          label="Reported mean"
                          value={`${selectedRow.record.mean.toFixed(2)} ${selectedRow.record.unit}`}
                        />
                        <DetailItem
                          label="Pollutant"
                          value={selectedRow.record.parameter_name}
                        />
                        <DetailItem
                          label="Hourly observations"
                          value={String(selectedRow.record.n)}
                        />
                        <DetailItem
                          label="Station ID"
                          value={selectedRow.record.station_id}
                        />
                        <DetailItem
                          label="City / State"
                          value={`${selectedRow.record.city_name}, ${selectedRow.record.state_name}`}
                        />
                        <DetailItem
                          label="Coverage flag"
                          value={selectedRow.record.coverage_flag.replaceAll("_", " ")}
                        />
                      </div>
                    </div>
                  )}

                {dataset === "Sentinel-5P" &&
                  "point_id" in selectedRow.record && (
                    <div className="mt-5">
                      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        Satellite grid information
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        <DetailItem
                          label="Pollutant"
                          value={selectedRow.record.pollutant}
                        />
                        <DetailItem
                          label="Anomaly Z-score"
                          value={
                            selectedRow.record.anomaly_z_score === null
                              ? "Unavailable"
                              : selectedRow.record.anomaly_z_score.toFixed(3)
                          }
                          mono
                        />
                        <DetailItem
                          label="Anomaly difference"
                          value={
                            selectedRow.record.anomaly_difference === null
                              ? "Unavailable"
                              : String(selectedRow.record.anomaly_difference)
                          }
                          mono
                        />
                        <DetailItem
                          label="Direction"
                          value={
                            selectedRow.record.anomaly_direction ?? "Unavailable"
                          }
                        />
                        <DetailItem
                          label="Score available"
                          value={selectedRow.record.score_available ? "Yes" : "No"}
                        />
                        <DetailItem
                          label="Negative retrieval"
                          value={selectedRow.record.negative_retrieval ? "Yes" : "No"}
                        />

                        <div className="col-span-2 rounded-lg border border-white/[0.07] bg-white/[0.025] p-3 md:col-span-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Composite period
                          </div>
                          <div className="mt-1.5 text-sm text-zinc-200">
                            {selectedRow.record.window_start} to{" "}
                            {selectedRow.record.window_end_exclusive}
                          </div>
                          <div className="mt-1 text-[10px] text-zinc-500">
                            End date is exclusive.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {dataset === "VIIRS" &&
                  "frp" in selectedRow.record && (
                    <div className="mt-5">
                      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        Thermal detection information
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        <DetailItem
                          label="Detection date"
                          value={selectedRow.record.date}
                        />
                        <DetailItem
                          label="Acquisition time"
                          value={`${selectedRow.record.acq_time} UTC`}
                          mono
                        />
                        <DetailItem
                          label="Fire Radiative Power"
                          value={`${selectedRow.record.frp.toFixed(2)} MW`}
                          mono
                        />
                        <DetailItem
                          label="Satellite"
                          value={selectedRow.record.satellite}
                        />
                        <DetailItem
                          label="Confidence"
                          value={selectedRow.record.confidence}
                        />
                        <DetailItem
                          label="Day / night"
                          value={selectedRow.record.daynight}
                        />
                        <DetailItem
                          label="Detection type"
                          value={String(selectedRow.record.type)}
                        />
                      </div>
                    </div>
                  )}

                <div className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
                    <MapPinned className="h-3.5 w-3.5" />
                    Geographic coordinates
                  </div>

                  <div className="mt-2 font-mono text-base text-zinc-200">
                    {"station_id" in selectedRow.record
                      ? `${selectedRow.record.latitude}, ${selectedRow.record.longitude}`
                      : "point_id" in selectedRow.record
                        ? `${selectedRow.record.grid_lat}, ${selectedRow.record.grid_lon}`
                        : `${selectedRow.record.latitude}, ${selectedRow.record.longitude}`}
                  </div>

                  <Link
                    to="/map"
                    className="group mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-cyan-300"
                  >
                    View on environmental map
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </>
            )}
          </Panel>

          {/* Predictive integration status */}
          <Panel
            title="Predictive assessment"
            simulated={false}
            className="border-white/[0.08] bg-[#080808]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400">
                <Clock3 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-200">
                    Model integration pending
                  </span>
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">
                    Not connected
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  XGBoost risk classification, future predictions and SHAP
                  explanations are not connected to this observation yet.
                  This section can be populated when the predictive model
                  integration is available.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Data interpretation note */}
      <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
            Data interpretation
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
            CPCB records represent reported station-level means. Sentinel-5P
            records represent composite-period grid observations. VIIRS
            records are satellite detections, not necessarily unique
            confirmed fires. An observation alone does not establish a
            confirmed pollution incident, its cause or its impact on
            population.
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-white/[0.07] bg-white/[0.025] p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div
        className={`mt-1.5 break-words text-sm font-medium text-zinc-200 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
