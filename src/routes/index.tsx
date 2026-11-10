import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ClientOnly,
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Clock3,
  Database,
  Flame,
  Layers,
  Map,
  MapPinned,
  Radio,
  RefreshCw,
  Satellite,
  SlidersHorizontal,
  Wind,
} from "lucide-react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Station } from "@/components/strata/LiveDashboardMap";
import {
  DatasetBadge,
  EmptyState,
  StatusNotice,
  tooltipStyle,
} from "@/components/strata/ui";
import { Button } from "@/components/ui/button";
import type { Dataset } from "@/components/strata/ui";
import { observationDisplay } from "@/lib/observation-display";

const LiveDashboardMap = lazy(
  () => import("@/components/strata/LiveDashboardMap")
);

const API =
  import.meta.env["VITE_API_BASE_URL"] ||
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
    <div className="flex min-h-[450px] flex-col items-center justify-center gap-4 rounded-xl border border-white/[0.05] bg-[#050505] text-sm text-zinc-500">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.05]">
        <Map className="h-6 w-6 text-primary" />
        <span className="absolute inset-0 animate-ping rounded-2xl border border-primary/20" />
      </div>

      <div className="text-center">
        <p className="font-medium text-zinc-300">
          Preparing environmental map
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Initialising the ground-station layer
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  index,
  loading,
  error,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  index: string;
  loading: boolean;
  error: string;
}) {
  const display = loading
    ? "—"
    : error
      ? "Unavailable"
      : value;

  return (
    <div className="group relative isolate overflow-hidden rounded-2xl border border-white/[0.075] bg-[#070707] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-[#0A0C0B] sm:p-5">
      <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-primary/[0.035] blur-3xl transition-all duration-300 group-hover:bg-primary/[0.10]" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.06] text-primary transition-all duration-300 group-hover:border-primary/30 group-hover:bg-primary/[0.12]">
          {icon}
        </div>

        <span className="font-mono text-[9px] tracking-[0.14em] text-zinc-700">
          {index}
        </span>
      </div>

      <div className="relative mt-5">
        <div className="break-words font-mono text-2xl font-semibold tracking-tight text-white sm:text-[30px]">
          {display}
        </div>

        <div className="mt-2 text-sm font-medium text-zinc-300">
          {label}
        </div>

        <div className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
          {detail}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full" />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-primary/80">
          {eyebrow}
        </div>

        <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
          {title}
        </h2>

        {description && (
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-zinc-500">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

function SourceCard({
  icon,
  source,
  category,
  value,
  description,
  note,
  accent = "teal",
  loading,
  error,
}: {
  icon: ReactNode;
  source: string;
  category: string;
  value: string;
  description: string;
  note: string;
  accent?: "teal" | "cyan" | "orange";
  loading: boolean;
  error: string;
}) {
  const accents = {
    teal: {
      icon: "bg-primary/[0.08] text-primary",
      hover: "hover:border-primary/25",
      label: "text-primary/80",
    },
    cyan: {
      icon: "bg-cyan-400/[0.08] text-cyan-300",
      hover: "hover:border-cyan-400/25",
      label: "text-cyan-300/80",
    },
    orange: {
      icon: "bg-orange-400/[0.08] text-orange-300",
      hover: "hover:border-orange-400/25",
      label: "text-orange-300/80",
    },
  };

  const style = accents[accent];

  return (
    <div
      className={`group rounded-2xl border border-white/[0.07] bg-[#070707] p-4 transition-all duration-300 ${style.hover} hover:bg-[#0A0A0A]`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.icon}`}>
          {icon}
        </div>

        <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
          {category}
        </span>
      </div>

      <div className="mt-5">
        <div className="text-xs font-semibold text-zinc-200">
          {source}
        </div>

        <div className="mt-2 font-mono text-3xl font-semibold tracking-tight text-white">
          {loading ? "—" : error ? "—" : value}
        </div>

        <div className="mt-1 text-[11px] text-zinc-500">
          {description}
        </div>
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <p className={`text-[10px] leading-relaxed ${style.label}`}>
          {note}
        </p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "STRATA NEXUS Overview — Environmental Intelligence",
      },
      {
        name: "description",
        content:
          "A unified command centre for historical CPCB ground measurements, Sentinel-5P atmospheric observations and VIIRS fire detections.",
      },
      {
        property: "og:title",
        content: "STRATA NEXUS Overview — Environmental Intelligence",
      },
      {
        property: "og:description",
        content:
          "Explore historical environmental measurements, satellite observations and fire detections in one intelligence workspace.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
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
  const [retry, setRetry] = useState(0);

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
          throw new Error("An environmental data request failed.");
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
          "Unable to load environmental data. Check the data service connection and try another selection."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => controller.abort();
  }, [date, pollutant, satellitePollutant, retry]);

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

  const chartStations = topStations.slice(0, 6);
  const unit = filteredStations[0]?.unit ?? "dataset unit";

  const unavailable = loading || Boolean(error);

  return (
    <div className="space-y-6 pb-10">
      {/* COMMAND CENTRE HERO */}
      <section className="relative isolate overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#050505] p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-36 h-[420px] w-[420px] rounded-full bg-teal-400/[0.07] blur-[110px]" />

        <div className="pointer-events-none absolute -bottom-48 left-[30%] h-[380px] w-[380px] rounded-full bg-cyan-500/[0.045] blur-[110px]" />

        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.08] text-primary">
                <Activity className="h-4 w-4" />
              </div>

              <div>
                <div className="text-[10px] font-bold tracking-[0.22em] text-white">
                  STRATA NEXUS
                </div>
                <div className="text-[8px] uppercase tracking-[0.16em] text-zinc-600">
                  Environmental intelligence
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  loading
                    ? "animate-pulse bg-amber-400"
                    : error
                      ? "bg-red-400"
                      : "bg-primary"
                }`}
              />

              <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                {loading
                  ? "Retrieving data"
                  : error
                    ? "Data unavailable"
                    : "Historical archive"}
              </span>
            </div>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-4 text-[10px] font-medium uppercase tracking-[0.24em] text-primary/80">
                Observe. Understand. Explore.
              </div>

              <h1 className="text-3xl font-semibold leading-[1.15] tracking-[-0.045em] text-white sm:text-4xl lg:text-[52px]">
                A clearer view of
                <br />
                <span className="text-zinc-500">
                  our changing
                </span>{" "}
                <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-400 bg-clip-text text-transparent">
                  environment.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400">
                Explore ground-level air quality observations,
                satellite measurements and fire detections
                through one unified environmental intelligence
                workspace.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/map"
                  className="group inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110"
                >
                  Explore environmental map
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>

                <Link
                  to="/events"
                  search={{ dataset: "CPCB", q: "", id: "" }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.025] px-4 py-3 text-xs font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Explore observations
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <Link
                  to="/reports"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.025] px-4 py-3 text-xs font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Build report
                  <BarChart3 className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.09] bg-[#0A0A0A]/90 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Observation snapshot
                </div>

                <CalendarDays className="h-4 w-4 text-primary" />
              </div>

              <div className="mt-5">
                <div className="text-[10px] text-zinc-600">
                  Selected archive date
                </div>

                <div className="mt-1.5 font-mono text-2xl font-semibold tracking-tight text-white">
                  {date}
                </div>
              </div>

              <div className="mt-5 border-t border-white/[0.07] pt-4">
                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                  <span>Available period</span>
                  <span className="font-mono text-zinc-300">
                    09–17 Nov 2024
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500">
                  <Clock3 className="h-3.5 w-3.5 text-primary/80" />
                  Historical dataset view
                </div>
              </div>
            </div>
          </div>

          {/* DATA SOURCE STRIP */}
          <div className="mt-9 grid grid-cols-1 gap-3 border-t border-white/[0.08] pt-5 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                <Activity className="h-4 w-4" />
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-zinc-600">
                  Ground monitoring
                </div>
                <div className="mt-0.5 text-xs font-semibold text-zinc-300">
                  CPCB CAAQMS
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/[0.08] text-cyan-300">
                <Satellite className="h-4 w-4" />
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-zinc-600">
                  Satellite observations
                </div>
                <div className="mt-0.5 text-xs font-semibold text-zinc-300">
                  Sentinel-5P TROPOMI
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/[0.08] text-orange-300">
                <Flame className="h-4 w-4" />
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-zinc-600">
                  Thermal detections
                </div>
                <div className="mt-0.5 text-xs font-semibold text-zinc-300">
                  NASA FIRMS VIIRS
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OBSERVATION CONTROLS */}
      <section className="rounded-2xl border border-white/[0.075] bg-[#070707] p-4 sm:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-white">
                Observation controls
              </h2>
              <p className="mt-0.5 text-[10px] text-zinc-600">
                Configure the datasets displayed across the dashboard
              </p>
            </div>
          </div>

          <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-600">
            Historical filters
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              CPCB observation date
            </span>

            <input
              type="date"
              value={date}
              min="2024-11-09"
              max="2024-11-17"
              onChange={(event) => setDate(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/[0.09] bg-[#0B0B0B] px-3 text-sm text-zinc-200 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Ground pollutant
            </span>

            <select
              value={pollutant}
              onChange={(event) => setPollutant(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/[0.09] bg-[#0B0B0B] px-3 text-sm text-zinc-200 outline-none transition focus:border-primary/50"
            >
              <option>PM2.5</option>
              <option>PM10</option>
              <option>NO2</option>
              <option>CO</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Satellite pollutant
            </span>

            <select
              value={satellitePollutant}
              onChange={(event) =>
                setSatellitePollutant(event.target.value)
              }
              className="h-11 w-full rounded-xl border border-white/[0.09] bg-[#0B0B0B] px-3 text-sm text-zinc-200 outline-none transition focus:border-primary/50"
            >
              <option value="NO2">NO2</option>
              <option value="HCHO">HCHO</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Geographic region
            </span>

            <select
              value={region}
              onChange={(event) =>
                setRegion(event.target.value as Region)
              }
              className="h-11 w-full rounded-xl border border-white/[0.09] bg-[#0B0B0B] px-3 text-sm text-zinc-200 outline-none transition focus:border-primary/50"
            >
              {REGIONS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                loading
                  ? "animate-pulse bg-amber-400"
                  : error
                    ? "bg-red-400"
                    : "bg-primary"
              }`}
            />

            {loading
              ? "Retrieving selected observations..."
              : error
                ? "Data retrieval issue"
                : "Dataset request completed"}
          </div>

          <span className="text-[10px] text-zinc-600">
            Region filter applies to CPCB map and station table
          </span>
        </div>

        {error && (
          <StatusNotice
            tone="error"
            title="Environmental data unavailable"
            className="mt-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setRetry((value) => value + 1)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry connection
              </Button>
            </div>
          </StatusNotice>
        )}
      </section>

      {/* KEY METRICS */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-primary/80">
              Overview
            </div>

            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-white">
              Environmental observations
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              A summary of records returned by the selected datasets.
            </p>
          </div>

          <span className="rounded-lg border border-white/[0.07] bg-[#070707] px-3 py-2 text-[9px] uppercase tracking-[0.12em] text-zinc-500">
            {region} · {date}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            index="01 / GROUND"
            label="CPCB Stations"
            value={stations.length.toLocaleString()}
            detail="Stations returned by API"
            icon={<Activity className="h-4 w-4" />}
            loading={loading}
            error={error}
          />

          <MetricCard
            index="02 / SPACE"
            label="Satellite Grid Points"
            value={satellitePoints.length.toLocaleString()}
            detail={`${satellitePollutant} observations`}
            icon={<Satellite className="h-4 w-4" />}
            loading={loading}
            error={error}
          />

          <MetricCard
            index="03 / FIRE"
            label="VIIRS Detections"
            value={fires.length.toLocaleString()}
            detail="Satellite fire-detection records"
            icon={<Flame className="h-4 w-4" />}
            loading={loading}
            error={error}
          />

          <MetricCard
            index="04 / REGION"
            label="States Represented"
            value={statesCount.toLocaleString()}
            detail="States with CPCB stations"
            icon={<MapPinned className="h-4 w-4" />}
            loading={loading}
            error={error}
          />

          <MetricCard
            index="05 / VOLUME"
            label="Hourly Observations"
            value={hourlyObservations.toLocaleString()}
            detail="Combined station observations"
            icon={<Database className="h-4 w-4" />}
            loading={loading}
            error={error}
          />
        </div>
      </section>

      {/* MAP AND DATASET OVERVIEW */}
      <section className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.8fr)]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.075] bg-[#070707] p-4 sm:p-5">
          <SectionHeading
            eyebrow="Geospatial intelligence"
            title="Ground station map"
            description="Explore CPCB monitoring stations and inspect their reported readings."
            action={
              <Link
                to="/map"
                className="group inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2 text-[10px] font-semibold text-primary transition-all hover:border-primary/40 hover:bg-primary/[0.12]"
              >
                Open full map
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            }
          />

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#050505] px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
                <Wind className="h-4 w-4" />
              </div>

              <div>
                <div className="text-xs font-semibold text-zinc-200">
                  {pollutant} ground observations
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-600">
                  {date}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="font-mono text-sm font-semibold text-white">
                {observationDisplay(
                  filteredStations.length,
                  loading,
                  error
                ) ?? "—"}
              </div>
              <div className="text-[9px] text-zinc-600">
                of {stations.length.toLocaleString()} stations
              </div>
            </div>
          </div>

          <div className="relative h-[450px] overflow-hidden rounded-xl border border-white/[0.08] bg-black sm:h-[510px]">
            {unavailable ? (
              loading ? (
                <MapLoading />
              ) : (
                <EmptyState
                  icon={<MapPinned className="h-5 w-5" />}
                  title="Station geography unavailable"
                  description="Retry the environmental connection to load station observations."
                  className="h-full"
                />
              )
            ) : (
              <ClientOnly fallback={<MapLoading />}>
                <Suspense fallback={<MapLoading />}>
                  <LiveDashboardMap stations={filteredStations} />
                </Suspense>
              </ClientOnly>
            )}

            <div className="pointer-events-none absolute left-4 right-4 top-4 z-[450] flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 border border-white/[0.10] bg-[#050505]/90 px-2.5 py-1.5 font-mono text-[9px] text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                CPCB / {pollutant}
              </span>

              <span className="bg-[#050505]/90 px-2.5 py-1.5 font-mono text-[9px] text-zinc-400">
                {loading
                  ? "CONNECTING"
                  : error
                    ? "UNAVAILABLE"
                    : `${filteredStations.length} STATIONS / ${region.toUpperCase()}`}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                CPCB monitoring station
              </span>

              <span className="text-zinc-700">•</span>

              <span>Select a marker to inspect its reading</span>
            </div>

            <div className="flex items-center gap-1.5 text-[9px] text-zinc-600">
              <Layers className="h-3.5 w-3.5" />
              Ground observation layer
            </div>
          </div>
        </div>

        {/* DATASET OVERVIEW */}
        <div className="min-w-0 rounded-2xl border border-white/[0.075] bg-[#070707] p-4 sm:p-5">
          <SectionHeading
            eyebrow="Source intelligence"
            title="Dataset overview"
            description="Observation summaries from each connected dataset."
          />

          <div className="space-y-3">
            <SourceCard
              source="CPCB Ground"
              category="Ground network"
              value={stations.length.toLocaleString()}
              description={`Monitoring stations · ${date}`}
              note={`${lowCoverageCount} stations with low-coverage flags`}
              icon={<Activity className="h-4 w-4" />}
              accent="teal"
              loading={loading}
              error={error}
            />

            <SourceCard
              source="Sentinel-5P"
              category="Satellite"
              value={satellitePoints.length.toLocaleString()}
              description={`${satellitePollutant} grid observations`}
              note="Composite: 12–18 November 2024 · End date exclusive"
              icon={<Satellite className="h-4 w-4" />}
              accent="cyan"
              loading={loading}
              error={error}
            />

            <SourceCard
              source="NASA FIRMS VIIRS"
              category="Satellite"
              value={fires.length.toLocaleString()}
              description={`Fire detections · ${date}`}
              note="Satellite detections, not unique confirmed fires"
              icon={<Flame className="h-4 w-4" />}
              accent="orange"
              loading={loading}
              error={error}
            />
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#050505] p-3.5">
            <div className="flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-primary" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                Current view
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[9px] text-zinc-600">
                  Selected region
                </div>
                <div className="mt-1 text-xs font-medium text-zinc-300">
                  {region}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-zinc-600">
                  Selected pollutant
                </div>
                <div className="mt-1 text-xs font-medium text-zinc-300">
                  {pollutant}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON AND STATION RECORDS */}
      <section className="grid min-w-0 gap-5 border-t border-white/[0.07] pt-7 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* STATION COMPARISON CHART */}
        <div className="min-w-0 rounded-2xl border border-white/[0.075] bg-[#070707] p-4 sm:p-5">
          <SectionHeading
            eyebrow="02 / Measurement comparison"
            title="Reported station means"
            description="Six highest returned means. This is not a risk ranking."
            action={<DatasetBadge dataset={"CPCB" as Dataset} />}
          />

          {loading ? (
            <div
              className="flex h-[285px] items-end gap-5 px-8 pb-8"
              aria-label="Loading station comparison"
            >
              {[45, 70, 55, 80, 60, 40].map((height, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-t bg-white/[0.07]"
                  style={{ height: `${height}%`, flex: 1 }}
                />
              ))}
            </div>
          ) : error || chartStations.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="h-5 w-5" />}
              title={
                error
                  ? "Measurements unavailable"
                  : "No station measurements"
              }
              description={
                error
                  ? "Retry the connection to view the comparison."
                  : "No CPCB records match this selection."
              }
            />
          ) : (
            <div className="h-[285px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={chartStations}
                  margin={{
                    top: 8,
                    right: 8,
                    left: -16,
                    bottom: 34,
                  }}
                >
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="2 6"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="city_name"
                    stroke="#71717a"
                    axisLine={false}
                    tickLine={false}
                    fontSize={10}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={64}
                  />

                  <YAxis
                    stroke="#71717a"
                    axisLine={false}
                    tickLine={false}
                    fontSize={10}
                  />

                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{
                      fill: "rgba(255,255,255,0.04)",
                    }}
                    formatter={(value) => [
                      `${Number(value).toFixed(2)} ${unit}`,
                      "Reported mean",
                    ]}
                  />

                  <Bar
                    dataKey="mean"
                    name="Reported mean"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          )}

          <p className="mt-2 text-[10px] text-zinc-600">
            {unavailable
              ? "Measurement unit available once observations load."
              : `Unit: ${unit}. Station-reported means for ${date}.`}
          </p>

          <Link
            to="/analytics"
            className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold text-primary transition-colors hover:text-cyan-300"
          >
            Explore historical trends
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {/* STATION LEDGER */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.075] bg-[#070707] p-4 sm:p-5">
          <SectionHeading
            eyebrow="03 / Observation ledger"
            title="Station records & coverage"
            description="Explore the highest reported station readings."
            action={
              <Link
                to="/events"
                search={{ dataset: "CPCB", q: "", id: "" }}
                aria-label="Open observation explorer"
                title="Open observation explorer"
                className="rounded-lg border border-primary/20 bg-primary/[0.06] p-2 text-primary transition hover:bg-primary/[0.12]"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            }
          />

          {loading ? (
            <div
              className="space-y-5 py-3"
              aria-label="Loading station records"
            >
              {[0, 1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="h-8 animate-pulse rounded bg-white/[0.06]"
                />
              ))}
            </div>
          ) : error || topStations.length === 0 ? (
            <EmptyState
              title={
                error
                  ? "Records unavailable"
                  : "No observations returned"
              }
              description={
                error
                  ? "Retry the connection to load station records."
                  : "Try another region, pollutant or date."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                    <th className="pb-4 pr-4 font-semibold">
                      Station / location
                    </th>
                    <th className="pb-4 pr-4 font-semibold">
                      Mean reading
                    </th>
                    <th className="pb-4 font-semibold">
                      Samples
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {topStations.slice(0, 6).map((station) => (
                    <tr
                      key={station.station_id}
                      className="border-b border-white/[0.045] transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="py-4 pr-4">
                        <Link
                          to="/events"
                          search={{
                            dataset: "CPCB",
                            q: "",
                            id: station.station_id,
                          }}
                          className="block max-w-64 truncate text-xs font-medium text-zinc-200 transition hover:text-primary"
                          title={station.station_name}
                        >
                          {station.station_name}
                        </Link>

                        <div className="mt-1 text-[10px] text-zinc-600">
                          {station.city_name}, {station.state_name}
                        </div>
                      </td>

                      <td className="whitespace-nowrap py-4 pr-4 font-mono text-xs text-primary">
                        {station.mean.toFixed(2)}
                        <span className="ml-1 text-[9px] text-zinc-600">
                          {station.unit}
                        </span>
                      </td>

                      <td className="py-4 font-mono text-xs text-zinc-400">
                        {station.n.toLocaleString()}

                        <div className="mt-1 max-w-28 font-sans text-[9px] text-zinc-600">
                          {(station.coverage_flag ?? "not reported").replaceAll(
                            "_",
                            " "
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <Link
              to="/events"
              search={{ dataset: "CPCB", q: "", id: "" }}
              className="inline-flex items-center gap-2 text-[10px] font-semibold text-primary transition hover:text-cyan-300"
            >
              Open complete observation ledger
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* DATA TRANSPARENCY */}
      <details className="group overflow-hidden rounded-2xl border border-white/[0.075] bg-[#070707]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 transition hover:bg-white/[0.02] sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.06] text-primary">
              <Database className="h-4 w-4" />
            </div>

            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-primary/80">
                Data transparency
              </div>
              <div className="mt-1 text-sm font-semibold text-zinc-200">
                Measurement methodology & source limitations
              </div>
            </div>
          </div>

          <span className="text-xs text-zinc-500 transition-transform group-open:rotate-180">
            ↓
          </span>
        </summary>

        <div className="border-t border-white/[0.06] px-4 pb-5 pt-4 sm:px-5">
          <p className="text-[11px] leading-6 text-zinc-500">
            CPCB values are station-level reported means.
            Sentinel-5P uses composite-period atmospheric column
            measurements (12–18 November 2024, end date exclusive),
            not direct ground-level exposure. VIIRS records are
            satellite fire detections and should not be interpreted
            as unique confirmed fires. Counts describe returned
            records, not environmental severity, causation or
            population exposure. Predictive model integration
            remains pending.
          </p>
        </div>
      </details>
    </div>
  );
}