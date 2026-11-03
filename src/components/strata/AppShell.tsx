import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Activity, AlertTriangle, BarChart3, Bell, FileText, LayoutDashboard, Map, PanelLeftClose, PanelLeftOpen, Search, Settings, Crosshair } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EVENTS, WARNINGS, fmtTime } from "@/lib/demo-data";
import { SeverityBadge, SimulatedTag } from "./ui";
import { useAppState } from "./AppState";
import { cn } from "@/lib/utils";

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
        <path d="M6 11h20M6 16h14M6 21h20" stroke="var(--primary-foreground)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {!collapsed && (
        <div className="leading-tight">
          <div className="font-display text-lg font-bold tracking-[0.2em]">STRATA</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pollution Intelligence</div>
        </div>
      )}
    </div>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const results = q.trim()
    ? EVENTS.filter((e) => `${e.id} ${e.title} ${e.location} ${e.pollutant} ${e.state}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : [];
  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search events, locations, pollutants…"
        className="h-9 w-full rounded-md border bg-surface pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
      />
      {open && q && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          {results.length === 0 && <div className="p-3 text-sm text-muted-foreground">No matching events</div>}
          {results.map((e) => (
            <button key={e.id} onMouseDown={() => { navigate({ to: "/events", search: { id: e.id } }); setQ(""); }} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent">
              <span><span className="font-mono text-xs text-muted-foreground">{e.id}</span> · {e.title}</span>
              <SeverityBadge severity={e.severity} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const { readNotifs, markAllRead } = useAppState();
  const unread = WARNINGS.filter((w) => !readNotifs.has(w.id));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button aria-label="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-md border bg-surface hover:border-primary">
          <Bell className="h-4 w-4" />
          {unread.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 font-mono text-[10px] text-destructive-foreground">{unread.length}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Alerts</span>
          <button onClick={() => markAllRead(WARNINGS.map((w) => w.id))} className="text-xs text-primary hover:underline">Mark all read</button>
        </div>
        <div className="max-h-80 overflow-auto">
          {WARNINGS.map((w) => (
            <Link key={w.id} to="/warnings" className={cn("block border-b px-3 py-2.5 hover:bg-accent", readNotifs.has(w.id) && "opacity-60")}>
              <div className="flex items-center justify-between"><SeverityBadge severity={w.severity} /><span className="font-mono text-[10px] text-muted-foreground">{fmtTime(w.issued)}</span></div>
              <div className="mt-1 text-sm">{w.title}</div>
              <div className="text-xs text-muted-foreground">{w.region}</div>
            </Link>
          ))}
        </div>
        <div className="px-3 py-2"><SimulatedTag /></div>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="min-h-screen w-full">
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-sidebar transition-[width]", collapsed ? "w-16" : "w-60")}>
        <div className="flex h-16 items-center border-b border-sidebar-border px-4"><Logo collapsed={collapsed} /></div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              title={label}
              className="flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60"
              activeProps={{ className: "!border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          {!collapsed && (
            <div className="mb-3 rounded-md bg-sidebar-accent/50 p-2.5 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5 text-sidebar-foreground"><Activity className="h-3 w-3 text-primary" /> Demo environment</div>
              All data shown is simulated. ML models not connected.
            </div>
          )}
          <button onClick={() => setCollapsed((c) => !c)} className="flex w-full items-center justify-center gap-2 rounded-md py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent/60" aria-label="Toggle sidebar">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse</>}
          </button>
        </div>
      </aside>
      <div className={cn("transition-[padding]", collapsed ? "pl-16" : "pl-60")}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/90 px-6 backdrop-blur">
          <GlobalSearch />
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 font-mono text-xs text-muted-foreground md:flex"><span className="h-2 w-2 rounded-full bg-primary" /> Feeds nominal</span>
            <Notifications />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold">UP</div>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
