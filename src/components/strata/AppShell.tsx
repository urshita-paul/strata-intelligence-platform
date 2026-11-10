import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Check,
  ChevronRight,
  CircleUserRound,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Map,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Crosshair,
  X,
} from "lucide-react";
import { NexusMark } from "@/components/strata/NexusMark";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatasetBadge, DatasetIcon, type Dataset } from "@/components/strata/ui";
import { useAppState } from "@/components/strata/AppState";
import { cn } from "@/lib/utils";

const API = import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000";

type SearchResult = {
  key: string;
  dataset: Dataset;
  title: string;
  subtitle: string;
  detail: string;
  searchText: string;
};
type CpcbSearchRecord = { station_id: string; station_name: string; city_name: string; state_name: string; parameter_name: string; mean: number; unit: string; n: number; coverage_flag: string };
type SatelliteSearchRecord = { point_id: string; grid_lat: number; grid_lon: number; pollutant: string; anomaly_direction: string | null; anomaly_z_score: number | null; negative_retrieval: boolean };
type FireSearchRecord = { latitude: number; longitude: number; date: string; acq_time: string; satellite: string; confidence: string; frp: number };
type ApiStatus = "checking" | "online" | "offline";

const NAV = [
  { to: "/", label: "Overview", description: "Command centre", icon: LayoutDashboard },
  { to: "/map", label: "Environmental Map", description: "Geospatial intelligence", icon: Map },
  { to: "/events", label: "Event Intelligence", description: "Observation explorer", icon: Crosshair },
  { to: "/warnings", label: "Watch Centre", description: "Baseline monitoring", icon: AlertTriangle },
  { to: "/analytics", label: "Historical Analytics", description: "Trends and coverage", icon: BarChart3 },
  { to: "/reports", label: "Reports", description: "Export intelligence", icon: FileText },
  { to: "/settings", label: "Settings", description: "Workspace and sources", icon: Settings },
] as const;

function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="STRATA NEXUS overview">
    <NexusMark className="h-10 w-10 text-mint" />
    {!collapsed && <span className="min-w-0 leading-tight"><span className="block font-display text-[15px] font-semibold text-foreground">STRATA <span className="font-normal text-mint">NEXUS</span></span><span className="mt-1 block font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Environmental intelligence</span></span>}
  </Link>;
}

function useApiStatus() {
  const [status, setStatus] = useState<ApiStatus>("checking");
  const [message, setMessage] = useState("Checking the environmental data service…");
  useEffect(() => {
    const controller = new AbortController();
    async function checkApi() {
      try {
        const response = await fetch(`${API}/`, { signal: controller.signal });
        if (!response.ok) throw new Error("API health check failed.");
        const data = (await response.json()) as { message?: string };
        setStatus("online");
        setMessage(data.message ?? "The environmental data service is responding.");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setStatus("offline");
        setMessage("The environmental data service could not be reached.");
      }
    }
    void checkApi();
    return () => controller.abort();
  }, []);
  return { status, message };
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [searchData, setSearchData] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    async function loadSearchIndex() {
      setLoading(true);
      setError("");
      try {
        const responses = await Promise.all([
          fetch(`${API}/api/cpcb?date=2024-11-17&pollutant=PM2.5`, { signal: controller.signal }),
          fetch(`${API}/api/satellite?pollutant=NO2&window_id=11-12`, { signal: controller.signal }),
          fetch(`${API}/api/fires?date=2024-11-17`, { signal: controller.signal }),
        ]);
        if (responses.some((response) => !response.ok)) throw new Error("One or more observation sources could not be indexed.");
        const cpcbData = (await responses[0].json()) as { stations?: CpcbSearchRecord[] };
        const satelliteData = (await responses[1].json()) as { points?: SatelliteSearchRecord[] };
        const fireData = (await responses[2].json()) as { detections?: FireSearchRecord[] };
        const cpcbResults: SearchResult[] = (cpcbData.stations ?? []).map((station) => ({
          key: station.station_id,
          dataset: "CPCB",
          title: station.station_name,
          subtitle: `${station.city_name}, ${station.state_name}`,
          detail: `${station.mean.toFixed(2)} ${station.unit} · ${station.parameter_name}`,
          searchText: [station.station_id, station.station_name, station.city_name, station.state_name, station.parameter_name, station.mean, station.unit].join(" "),
        }));
        const satelliteResults: SearchResult[] = (satelliteData.points ?? []).map((point) => ({
          key: point.point_id,
          dataset: "Sentinel-5P",
          title: point.point_id,
          subtitle: `${point.grid_lat.toFixed(4)}, ${point.grid_lon.toFixed(4)}`,
          detail: `${point.pollutant} · ${point.negative_retrieval ? "Negative retrieval flagged" : point.anomaly_direction?.replaceAll("_", " ") ?? "Direction unavailable"}`,
          searchText: [point.point_id, point.grid_lat, point.grid_lon, point.pollutant, point.anomaly_direction, point.anomaly_z_score, point.negative_retrieval ? "negative retrieval" : ""].join(" "),
        }));
        const fireResults: SearchResult[] = (fireData.detections ?? []).map((fire, index) => ({
          key: `${index}-${fire.date}-${fire.acq_time}-${fire.latitude}-${fire.longitude}`,
          dataset: "VIIRS",
          title: `VIIRS detection ${index + 1}`,
          subtitle: `${fire.latitude.toFixed(4)}, ${fire.longitude.toFixed(4)}`,
          detail: `${fire.frp.toFixed(2)} MW · ${fire.confidence} confidence`,
          searchText: [fire.date, fire.acq_time, fire.satellite, fire.confidence, fire.frp, fire.latitude, fire.longitude, `VIIRS detection ${index + 1}`].join(" "),
        }));
        if (!controller.signal.aborted) setSearchData([...cpcbResults, ...satelliteResults, ...fireResults]);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unable to load the observation search index.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadSearchIndex();
    return () => controller.abort();
  }, []);

  const results = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return [];
    const matching = searchData.filter((item) => item.searchText.toLowerCase().includes(search));
    return (["CPCB", "Sentinel-5P", "VIIRS"] as Dataset[]).flatMap((dataset) => matching.filter((item) => item.dataset === dataset).slice(0, 4));
  }, [q, searchData]);

  useEffect(() => setActiveIndex(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-search-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function openResult(result: SearchResult) {
    void navigate({ to: "/events", search: { dataset: result.dataset, q: "", id: result.key } });
    setQ("");
    setOpen(false);
  }

  let resultIndex = -1;
  return (
    <div className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(event) => { setQ(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" && results.length > 0) { event.preventDefault(); setOpen(true); setActiveIndex((index) => (index + 1) % results.length); }
          if (event.key === "ArrowUp" && results.length > 0) { event.preventDefault(); setActiveIndex((index) => (index - 1 + results.length) % results.length); }
          if (event.key === "Enter" && results[activeIndex]) { event.preventDefault(); openResult(results[activeIndex]); }
        }}
        placeholder="Search environmental observations…"
        aria-label="Search environmental observations"
        role="combobox"
        aria-expanded={open && Boolean(q.trim())}
        aria-controls="global-search-results"
        aria-activedescendant={open && results[activeIndex] ? `global-search-option-${activeIndex}` : undefined}
        aria-autocomplete="list"
        className="control-input h-10 w-full border-transparent bg-surface/60 pl-9 pr-4 focus:border-primary/40"
      />

      {open && q.trim() && (
        <div id="global-search-results" ref={listRef} role="listbox" aria-label="Environmental search results" className="dropdown-enter absolute left-0 right-0 z-50 mt-2 max-h-[min(560px,70vh)] overflow-y-auto rounded-lg border bg-popover shadow-[var(--shadow-float)]">
          <div className="flex items-center justify-between border-b px-3 py-2.5"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Historical observation search</span><span className="font-mono text-[9px] text-muted-foreground">3 sources</span></div>
          {loading && <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Indexing live observation sources…</div>}
          {!loading && error && <div className="p-4 text-xs leading-relaxed text-critical">{error}</div>}
          {!loading && !error && results.length === 0 && <div className="p-5 text-center"><div className="text-sm font-medium">No matching observations</div><p className="mt-1 text-xs text-muted-foreground">Try a station, city, coordinate, pollutant or record ID.</p></div>}
          {!loading && !error && (["CPCB", "Sentinel-5P", "VIIRS"] as Dataset[]).map((dataset) => {
            const group = results.filter((result) => result.dataset === dataset);
            if (group.length === 0) return null;
            return <div key={dataset}>
              <div className="flex items-center gap-2 border-b border-border/60 bg-surface/45 px-3 py-2"><DatasetIcon dataset={dataset} className="h-3.5 w-3.5" /><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{dataset}</span><span className="ml-auto font-mono text-[9px] text-muted-foreground">{group.length}</span></div>
              {group.map((result) => {
                resultIndex += 1;
                const index = resultIndex;
                return <Button
                  id={`global-search-option-${index}`}
                  data-search-index={index}
                  role="option"
                  aria-selected={activeIndex === index}
                  key={`${result.dataset}-${result.key}`}
                  onMouseDown={(event) => { event.preventDefault(); openResult(result); }}
                  onMouseEnter={() => setActiveIndex(index)}
                  variant="ghost" className={cn("h-auto justify-start whitespace-normal rounded-none flex w-full items-center gap-3 border-b border-border/50 px-3 py-3 text-left transition-colors last:border-0", activeIndex === index ? "bg-accent" : "hover:bg-accent/60")}
                >
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{result.title}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{result.subtitle}</span><span className="mt-1 block truncate font-mono text-[10px] text-muted-foreground">{result.detail}</span></span>
                  <DatasetBadge dataset={result.dataset} />
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Button>;
              })}
            </div>;
          })}
          {!loading && !error && results.length > 0 && <div className="sticky bottom-0 border-t bg-popover px-3 py-2 text-[10px] text-muted-foreground">Up to four matches per source · Enter opens the highlighted observation</div>}
        </div>
      )}
    </div>
  );
}

function Notifications({ status, message }: { status: ApiStatus; message: string }) {
  const statusLabel = status === "online" ? "Connected" : status === "offline" ? "Unavailable" : "Checking";
  return (
    <Popover>
      <PopoverTrigger asChild><Button aria-label="Data and source status" title="Data and source status" variant="ghost" size="icon" className="icon-button relative border-transparent bg-transparent"><Bell className="h-4 w-4" /><span className={cn("absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full", status === "online" && "bg-success", status === "offline" && "bg-critical", status === "checking" && "bg-caution")} /></Button></PopoverTrigger>
      <PopoverContent align="end" className="dropdown-enter w-84 p-0">
        <div className="border-b px-4 py-3.5"><div className="text-sm font-semibold">Data & source status</div><div className="mt-1 text-xs text-muted-foreground">Live service connectivity, not a notification feed</div></div>
        <div className="p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Environmental API</span><span className={cn("inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[10px] font-medium", status === "online" && "border-success/35 bg-success/10 text-success", status === "offline" && "border-critical/35 bg-critical/10 text-critical", status === "checking" && "border-caution/35 text-caution")}>{status === "online" && <Check className="h-3 w-3" />}{statusLabel}</span></div><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{message}</p><p className="mt-3 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">CPCB, Sentinel-5P and VIIRS modules load their datasets independently. Endpoint availability does not certify data completeness.</p></div>
        <div className="grid grid-cols-3 border-t"><Link to="/events" search={{ dataset: "CPCB", q: "", id: "" }} className="border-r px-2 py-3 text-center text-[11px] text-primary hover:bg-accent">Observations</Link><Link to="/analytics" className="border-r px-2 py-3 text-center text-[11px] text-primary hover:bg-accent">Analytics</Link><Link to="/warnings" className="px-2 py-3 text-center text-[11px] text-primary hover:bg-accent">Watch Centre</Link></div>
      </PopoverContent>
    </Popover>
  );
}

function ProfileMenu() {
  const { settings } = useAppState();
  return <Popover><PopoverTrigger asChild><Button variant="ghost" className="flex h-10 items-center gap-2 rounded-md border border-transparent px-1.5 text-left transition-colors hover:border-border hover:bg-surface" aria-label="Open workspace profile"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-primary"><CircleUserRound className="h-4 w-4" /></span><span className="hidden xl:block"><span className="block text-xs font-medium">Analyst workspace</span><span className="block max-w-32 truncate text-[10px] text-muted-foreground">{settings.org}</span></span></Button></PopoverTrigger><PopoverContent align="end" className="dropdown-enter w-72 p-0"><div className="border-b p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/12 text-primary"><Building2 className="h-5 w-5" /></span><div className="min-w-0"><div className="truncate text-sm font-semibold">{settings.org}</div><div className="truncate text-xs text-muted-foreground">{settings.email}</div></div></div></div><div className="p-2"><Link to="/settings" className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-accent"><Settings className="h-4 w-4 text-muted-foreground" />Workspace settings<ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" /></Link></div><div className="border-t px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">Session-only workspace. Account authentication is not connected.</div></PopoverContent></Popover>;
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return <>
    <div className={cn("flex h-[72px] shrink-0 items-center border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-5")}><Logo collapsed={collapsed} /></div>
    <div className={cn("py-4", collapsed ? "px-2" : "px-3")}>
      {!collapsed && <div className="mb-3 px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Intelligence modules</div>}
      <nav className="nexus-navigation space-y-1.5" aria-label="Main navigation">{NAV.map(({ to, label, description, icon: Icon }) => <Link key={to} to={to} search={to === "/events" ? { dataset: "CPCB", q: "", id: "" } : {}} activeOptions={{ exact: to === "/" }} onClick={onNavigate} title={collapsed ? label : undefined} className={cn("group relative flex items-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground", collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3")} activeProps={{ className: "active text-sidebar-accent-foreground" }}>
        <span className="nav-indicator absolute bottom-2 left-0 top-2 w-0.5 origin-center scale-y-0 rounded-full bg-sidebar-primary transition-transform group-[.active]:scale-y-100" />
        <Icon className="h-[17px] w-[17px] shrink-0" />
        {!collapsed && <span className="min-w-0"><span className="block text-[13px] font-medium">{label}</span><span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{description}</span></span>}
      </Link>)}</nav>
    </div>
    <div className="mt-auto p-5">{!collapsed && <><div className="mb-4 h-px bg-sidebar-border" /><p className="font-display text-sm leading-relaxed text-foreground/80">Understand the signals<br />shaping our environment.</p><div className="mt-5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"><span className="h-1.5 w-1.5 bg-lime" />Historical archive</div><p className="mt-2 text-[10px] text-muted-foreground">Predictive model · pending</p></>}</div>
  </>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { status, message } = useApiStatus();
  useEffect(() => setMobileOpen(false), [location.pathname]);
  return (
    <div className="nexus-shell min-h-screen w-full">
      <aside className={cn("nexus-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex", collapsed ? "w-[76px]" : "w-64")}><SidebarContent collapsed={collapsed} /><div className="border-t border-sidebar-border p-3"><Button variant="ghost" onClick={() => setCollapsed((current) => !current)} className={cn("flex w-full items-center rounded-md py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground", collapsed ? "justify-center" : "justify-center gap-2")} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button></div></aside>
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><Button variant="ghost" className="absolute inset-0 h-full w-full rounded-none bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" /><aside className="dropdown-enter absolute inset-y-0 left-0 flex w-[min(86vw,300px)] flex-col border-r border-sidebar-border bg-sidebar shadow-[var(--shadow-float)]"><Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="icon-button absolute right-3 top-4 z-10" aria-label="Close navigation"><X className="h-4 w-4" /></Button><SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} /></aside></div>}
      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        <header className="sticky top-0 z-30 flex min-h-[72px] items-center gap-3 border-b bg-background/88 px-3 backdrop-blur-xl sm:px-5 lg:px-6">
          <Button variant="ghost" size="icon" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-4 w-4" /></Button>
          <div className="min-w-0 flex-1"><GlobalSearch /></div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="mr-1 hidden items-center gap-2 border-l border-border pl-4 py-1.5 md:flex"><span className={cn("h-1.5 w-1.5 rounded-full", status === "online" ? "bg-success" : status === "offline" ? "bg-critical" : "bg-caution")} /><span className="text-[10px] font-medium text-muted-foreground">{status === "online" ? "Data service online" : status === "offline" ? "Data service unavailable" : "Checking data service"}</span></div>
            <Notifications status={status} message={message} />
            <ProfileMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9"><div key={location.pathname} className="page-enter">{children}</div></main>
      </div>
    </div>
  );
}
