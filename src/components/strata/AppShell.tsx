
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  FileText,
  LayoutDashboard,
  Map,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Crosshair,
  Satellite,
  ArrowUpRight,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

type SearchDataset = "CPCB" | "Sentinel-5P" | "VIIRS";

type SearchResult = {
  key: string;
  dataset: SearchDataset;
  title: string;
  subtitle: string;
  detail: string;
  searchText: string;
};

type CpcbSearchRecord = {
  station_id: string;
  station_name: string;
  city_name: string;
  state_name: string;
  parameter_name: string;
  mean: number;
  unit: string;
  n: number;
  coverage_flag: string;
};

type SatelliteSearchRecord = {
  point_id: string;
  grid_lat: number;
  grid_lon: number;
  pollutant: string;
  anomaly_direction: string | null;
  anomaly_z_score: number | null;
  negative_retrieval: boolean;
};

type FireSearchRecord = {
  latitude: number;
  longitude: number;
  date: string;
  acq_time: string;
  satellite: string;
  confidence: string;
  frp: number;
};

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/map", label: "Live Environmental Map", icon: Map },
  { to: "/events", label: "Event Intelligence", icon: Crosshair },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/warnings", label: "Watch Centre", icon: AlertTriangle },
  { to: "/analytics", label: "Historical Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/30 bg-primary/10 shadow-[0_0_22px_rgba(45,212,191,0.12)]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />

        <svg viewBox="0 0 32 32" className="relative h-7 w-7">
          <path
            d="M5 9h22M5 16h16M5 23h22"
            stroke="var(--primary)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="24" cy="16" r="2.4" fill="var(--primary)" />
        </svg>
      </div>

      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <div className="font-display text-lg font-bold tracking-[0.17em] text-foreground">
            STRATA<span className="text-primary">.</span>
          </div>

          <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.19em] text-muted-foreground">
            Environmental Intelligence
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------
// GLOBAL SEARCH
// --------------------------------------------------

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const [searchData, setSearchData] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    async function loadSearchIndex() {
      setLoading(true);
      setError("");

      try {
        const responses = await Promise.all([
          fetch(
            `${API}/api/cpcb?date=2024-11-17&pollutant=PM2.5`,
            { signal: controller.signal }
          ),

          fetch(
            `${API}/api/satellite?pollutant=NO2&window_id=11-12`,
            { signal: controller.signal }
          ),

          fetch(
            `${API}/api/fires?date=2024-11-17`,
            { signal: controller.signal }
          ),
        ]);

        if (responses.some((response) => !response.ok)) {
          throw new Error(
            "Unable to load one or more observation sources."
          );
        }

        const cpcbData = (await responses[0].json()) as {
          stations?: CpcbSearchRecord[];
        };

        const satelliteData = (await responses[1].json()) as {
          points?: SatelliteSearchRecord[];
        };

        const fireData = (await responses[2].json()) as {
          detections?: FireSearchRecord[];
        };

        const cpcbResults: SearchResult[] = (
          cpcbData.stations ?? []
        ).map((station) => ({
          key: station.station_id,
          dataset: "CPCB",
          title: station.station_name,
          subtitle: `${station.city_name}, ${station.state_name}`,
          detail: `${station.mean.toFixed(2)} ${station.unit} · PM2.5`,
          searchText: [
            station.station_id,
            station.station_name,
            station.city_name,
            station.state_name,
            station.parameter_name,
            station.mean,
            station.unit,
          ].join(" "),
        }));

        const satelliteResults: SearchResult[] = (
          satelliteData.points ?? []
        ).map((point) => ({
          key: point.point_id,
          dataset: "Sentinel-5P",
          title: point.point_id,
          subtitle: `${point.grid_lat.toFixed(4)}, ${point.grid_lon.toFixed(4)}`,
          detail: `${point.pollutant} · ${
            point.negative_retrieval
              ? "Negative retrieval flagged"
              : point.anomaly_direction ?? "Direction unavailable"
          }`,
          searchText: [
            point.point_id,
            point.grid_lat,
            point.grid_lon,
            point.pollutant,
            point.anomaly_direction,
            point.anomaly_z_score,
            point.negative_retrieval ? "negative retrieval" : "",
          ].join(" "),
        }));

        const fireResults: SearchResult[] = (
          fireData.detections ?? []
        ).map((fire, index) => ({
          key: `${index}-${fire.date}-${fire.acq_time}-${fire.latitude}-${fire.longitude}`,
          dataset: "VIIRS",
          title: `VIIRS detection ${index + 1}`,
          subtitle: `${fire.latitude.toFixed(4)}, ${fire.longitude.toFixed(4)}`,
          detail: `${fire.frp.toFixed(2)} MW · ${fire.confidence} confidence`,
          searchText: [
            fire.date,
            fire.acq_time,
            fire.satellite,
            fire.confidence,
            fire.frp,
            fire.latitude,
            fire.longitude,
            `VIIRS detection ${index + 1}`,
          ].join(" "),
        }));

        if (!controller.signal.aborted) {
          setSearchData([
            ...cpcbResults,
            ...satelliteResults,
            ...fireResults,
          ]);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the observation search index."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSearchIndex();

    return () => controller.abort();
  }, []);

  const results = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (!search) return [];

    return searchData
      .filter((item) =>
        item.searchText.toLowerCase().includes(search)
      )
      .slice(0, 8);
  }, [q, searchData]);

  function openResult(result: SearchResult) {
    navigate({
      to: "/events",
      search: {
        dataset: result.dataset,
        q: "",
        id: result.key,
      },
    });

    setQ("");
    setOpen(false);
  }

  return (
    <div className="relative w-full max-w-xl">
      <div className="group relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />

        <input
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }

            if (event.key === "Enter" && results.length > 0) {
              openResult(results[0]);
            }
          }}
          placeholder="Search stations, grid points, fire detections..."
          aria-label="Search environmental observations"
          className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] pl-10 pr-14 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/70 hover:border-white/[0.14] focus:border-primary/50 focus:bg-primary/[0.035] focus:shadow-[0_0_20px_rgba(45,212,191,0.07)]"
        />

        <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground sm:block">
          ENTER
        </span>
      </div>

      {open && q.trim() && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-popover shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Observation Search
            </span>

            <span className="font-mono text-[10px] text-muted-foreground">
              HISTORICAL INDEX
            </span>
          </div>

          {loading && (
            <div className="p-4 text-sm text-muted-foreground">
              Loading environmental observations...
            </div>
          )}

          {!loading && error && (
            <div className="p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              No matching observations in the indexed historical data.
            </div>
          )}

          {results.map((result) => (
            <button
              key={`${result.dataset}-${result.key}`}
              onMouseDown={(event) => {
                event.preventDefault();
                openResult(result);
              }}
              className="flex w-full items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-3 text-left transition-colors last:border-0 hover:bg-primary/[0.07]"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {result.title}
                </span>

                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {result.subtitle}
                </span>

                <span className="mt-1 block truncate font-mono text-[10px] text-muted-foreground/80">
                  {result.detail}
                </span>
              </span>

              <span className="shrink-0 rounded-md border border-primary/20 bg-primary/[0.07] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-primary">
                {result.dataset}
              </span>
            </button>
          ))}

          {!loading && !error && results.length > 0 && (
            <div className="border-t border-white/[0.07] px-4 py-2.5 text-[10px] text-muted-foreground">
              Showing up to 8 matching historical observations
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------
// DATA AND SOURCE STATUS
// --------------------------------------------------

type ApiStatus = "checking" | "online" | "offline";

function Notifications() {
  const [status, setStatus] = useState<ApiStatus>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function checkApi() {
      try {
        const response = await fetch(`${API}/`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("API health check failed.");
        }

        const data = (await response.json()) as {
          message?: string;
        };

        setStatus("online");
        setMessage(data.message ?? "Backend API is responding.");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setStatus("offline");
        setMessage("Backend API could not be reached.");
      }
    }

    checkApi();

    return () => controller.abort();
  }, []);

  const statusLabel =
    status === "online"
      ? "Connected"
      : status === "offline"
        ? "Unavailable"
        : "Checking";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Data and source status"
          title="Data and source status"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/[0.07] hover:text-primary"
        >
          <Bell className="h-4 w-4" />

          <span
            className={cn(
              "absolute right-2 top-2 h-2 w-2 rounded-full ring-2 ring-background",
              status === "online" && "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]",
              status === "offline" && "bg-red-400",
              status === "checking" && "bg-muted-foreground"
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 overflow-hidden rounded-xl border border-white/10 bg-popover p-0 shadow-2xl"
      >
        <div className="border-b border-white/[0.07] bg-white/[0.02] px-4 py-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <div className="text-sm font-semibold text-foreground">
              Data & Source Status
            </div>
          </div>

          <div className="mt-1 pl-6 text-[11px] text-muted-foreground">
            Backend service connectivity
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">
              Environmental API
            </span>

            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                status === "online" &&
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                status === "offline" &&
                  "border-red-500/30 bg-red-500/10 text-red-400",
                status === "checking" &&
                  "border-white/10 bg-white/[0.04] text-muted-foreground"
              )}
            >
              {statusLabel}
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {status === "online"
              ? message
              : status === "offline"
                ? message
                : "Checking the backend health endpoint..."}
          </p>

          <p className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.025] p-3 text-[11px] leading-relaxed text-muted-foreground">
            Historical CPCB, Sentinel-5P and VIIRS observations are
            available through their respective modules. Each module
            loads its dataset independently.
          </p>
        </div>

        <div className="grid grid-cols-3 border-t border-white/[0.07]">
          <Link
            to="/events"
            className="border-r border-white/[0.07] px-2 py-3 text-center text-xs text-muted-foreground transition-colors hover:bg-primary/[0.06] hover:text-primary"
          >
            Events
          </Link>

          <Link
            to="/analytics"
            className="border-r border-white/[0.07] px-2 py-3 text-center text-xs text-muted-foreground transition-colors hover:bg-primary/[0.06] hover:text-primary"
          >
            Analytics
          </Link>

          <Link
            to="/warnings"
            className="px-2 py-3 text-center text-xs text-muted-foreground transition-colors hover:bg-primary/[0.06] hover:text-primary"
          >
            Watch Centre
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// --------------------------------------------------
// MAIN APPLICATION SHELL
// --------------------------------------------------

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen w-full">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[0.07] bg-sidebar shadow-[12px_0_40px_rgba(0,0,0,0.12)] transition-[width] duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="relative flex h-[76px] items-center border-b border-sidebar-border px-4">
          <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <Logo collapsed={collapsed} />
        </div>

        {!collapsed && (
          <div className="px-5 pb-2 pt-6">
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
              Workspace
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              title={label}
              className={cn(
                "group relative flex min-h-11 items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-[13px] font-medium text-sidebar-foreground/75 transition-all duration-200",
                "hover:border-white/[0.06] hover:bg-white/[0.035] hover:text-foreground"
              )}
              activeProps={{
                className:
                  "!border-primary/15 !bg-primary/[0.10] !text-primary shadow-[inset_0_0_20px_rgba(45,212,191,0.035)]",
              }}
            >
              <Icon className="h-[17px] w-[17px] shrink-0 transition-transform duration-200 group-hover:scale-110" />

              {!collapsed && (
                <span className="truncate">
                  {label}
                </span>
              )}

              {!collapsed && (
                <ArrowUpRight className="ml-auto h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-40" />
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {!collapsed && (
            <div className="mb-4 overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.09] to-transparent p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Satellite className="h-3.5 w-3.5" />
                </div>

                <div className="text-[11px] font-semibold text-foreground">
                  Data Environment
                </div>
              </div>

              <div className="text-[10px] leading-relaxed text-muted-foreground">
                CPCB, Sentinel-5P and VIIRS datasets are connected.
                Predictive model integration is pending.
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-400">
                  Historical data
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => setCollapsed((current) => !current)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-transparent py-2 text-xs text-muted-foreground transition-all hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-foreground"
            aria-label="Toggle sidebar"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                Collapse sidebar
              </>
            )}
          </button>
        </div>
      </aside>

      <div
        className={cn(
          "min-h-screen transition-[padding] duration-300",
          collapsed ? "pl-16" : "pl-64"
        )}
      >
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-4 border-b border-white/[0.07] bg-background/80 px-5 backdrop-blur-2xl md:px-7">
          <GlobalSearch />

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2 lg:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-30" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>

              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Historical datasets
              </span>
            </div>

            <Notifications />

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/[0.04] font-display text-xs font-bold text-primary shadow-[0_0_18px_rgba(45,212,191,0.08)]">
              UP
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-76px)] p-4 md:p-6 lg:p-7">
          <div className="mx-auto w-full max-w-[1800px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
