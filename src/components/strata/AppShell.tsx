
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
  { to: "/map", label: "Event Map", icon: Map },
  { to: "/events", label: "Event Intelligence", icon: Crosshair },
  { to: "/reports", label: "AI Reports", icon: FileText },
  { to: "/warnings", label: "Early Warning", icon: AlertTriangle },
  { to: "/analytics", label: "Historical Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0">
        <rect width="32" height="32" rx="6" fill="var(--primary)" />
        <path
          d="M6 11h20M6 16h14M6 21h20"
          stroke="var(--primary-foreground)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      {!collapsed && (
        <div className="leading-tight">
          <div className="font-display text-lg font-bold tracking-[0.2em]">
            STRATA
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Pollution Intelligence
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

  // Load actual observation records from all three APIs.
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

        // CPCB search results
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

        // Sentinel-5P search results
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

        // VIIRS search results.
        // The key format matches the Events page exactly.
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

  // Search across all indexed observations.
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
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

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
        className="h-9 w-full rounded-md border bg-surface pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
      />

      {open && q.trim() && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">

          {loading && (
            <div className="p-3 text-sm text-muted-foreground">
              Loading environmental observations...
            </div>
          )}

          {!loading && error && (
            <div className="p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">
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
              className="flex w-full items-center justify-between gap-3 border-b px-3 py-2.5 text-left last:border-0 hover:bg-accent"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {result.title}
                </span>

                <span className="block truncate text-xs text-muted-foreground">
                  {result.subtitle}
                </span>

                <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                  {result.detail}
                </span>
              </span>

              <span className="shrink-0 rounded-sm border px-1.5 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                {result.dataset}
              </span>
            </button>
          ))}

          {!loading && !error && results.length > 0 && (
            <div className="border-t px-3 py-2 text-[10px] text-muted-foreground">
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
          className="relative flex h-9 w-9 items-center justify-center rounded-md border bg-surface hover:border-primary"
        >
          <Bell className="h-4 w-4" />

          <span
            className={cn(
              "absolute right-1.5 top-1.5 h-2 w-2 rounded-full",
              status === "online" && "bg-emerald-500",
              status === "offline" && "bg-red-500",
              status === "checking" && "bg-muted-foreground"
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">

        <div className="border-b px-3 py-3">
          <div className="text-sm font-semibold">
            Data & Source Status
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            Backend service connectivity
          </div>
        </div>

        <div className="p-3">

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">
              Environmental API
            </span>

            <span
              className={cn(
                "rounded-sm border px-2 py-1 text-[10px] font-medium",
                status === "online" &&
                  "border-emerald-500/40 text-emerald-600",
                status === "offline" &&
                  "border-red-500/40 text-red-500",
                status === "checking" &&
                  "text-muted-foreground"
              )}
            >
              {statusLabel}
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {status === "online"
              ? message
              : status === "offline"
                ? message
                : "Checking the backend health endpoint..."}
          </p>

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Historical CPCB, Sentinel-5P and VIIRS observations are
            available through their respective modules. Each module
            loads its dataset independently.
          </p>

        </div>

        <div className="grid grid-cols-3 border-t">

          <Link
            to="/events"
            className="border-r px-2 py-2.5 text-center text-xs text-primary hover:bg-accent"
          >
            Events
          </Link>

          <Link
            to="/analytics"
            className="border-r px-2 py-2.5 text-center text-xs text-primary hover:bg-accent"
          >
            Analytics
          </Link>

          <Link
            to="/warnings"
            className="px-2 py-2.5 text-center text-xs text-primary hover:bg-accent"
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
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-sidebar transition-[width]",
          collapsed ? "w-16" : "w-60"
        )}
      >

        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Logo collapsed={collapsed} />
        </div>

        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              title={label}
              className="flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60"
              activeProps={{
                className:
                  "!border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground font-medium",
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">

          {!collapsed && (
            <div className="mb-3 rounded-md bg-sidebar-accent/50 p-2.5 text-[11px] text-muted-foreground">

              <div className="flex items-center gap-1.5 text-sidebar-foreground">
                <Activity className="h-3 w-3 text-primary" />
                Historical observation environment
              </div>

              CPCB, Sentinel-5P and VIIRS datasets are connected.
              Predictive model integration is pending.

            </div>
          )}

          <button
            onClick={() => setCollapsed((current) => !current)}
            className="flex w-full items-center justify-center gap-2 rounded-md py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent/60"
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                Collapse
              </>
            )}
          </button>

        </div>
      </aside>

      <div
        className={cn(
          "transition-[padding]",
          collapsed ? "pl-16" : "pl-60"
        )}
      >

        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/90 px-6 backdrop-blur">

          <GlobalSearch />

          <div className="flex items-center gap-3">

            <span className="hidden items-center gap-1.5 font-mono text-xs text-muted-foreground md:flex">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Historical datasets
            </span>

            <Notifications />

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold">
              UP
            </div>

          </div>

        </header>

        <main className="p-6">
          {children}
        </main>

      </div>

    </div>
  );
}