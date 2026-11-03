import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Activity, AlertTriangle, Users, Gauge } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AQI_24H, EVENTS, WARNINGS, fmtTime } from "@/lib/demo-data";
import { PageHeader, Panel, SeverityBadge, StatCard, tooltipStyle } from "@/components/strata/ui";
import { EventMap } from "@/components/strata/EventMap";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview Dashboard — STRATA" },
      { name: "description", content: "Real-time overview of pollution events, early warnings and AQI trends." },
      { property: "og:title", content: "Overview Dashboard — STRATA" },
      { property: "og:description", content: "Real-time overview of pollution events, early warnings and AQI trends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});



function Overview() {
  const navigate = useNavigate();
  const active = EVENTS.filter((e) => e.status === "Active");
  const critical = EVENTS.filter((e) => e.severity === "critical");
  const pop = active.reduce((a, e) => a + e.affectedPop, 0);
  return (
    <>
      <PageHeader title="Overview Dashboard" subtitle="National pollution situational awareness · last updated 03 Nov 2026, 11:00 UTC" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active events" value={String(active.length)} delta={`${EVENTS.length} tracked in 7 days`} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Critical" value={String(critical.length)} tone="critical" delta="+1 vs yesterday" icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Population exposed" value={`${(pop / 1e6).toFixed(1)}M`} delta="Within 5 km of active events" icon={<Users className="h-4 w-4" />} />
        <StatCard label="Avg. model confidence" value={`${Math.round((EVENTS.reduce((a, e) => a + e.confidence, 0) / EVENTS.length) * 100)}%`} delta="Placeholder · no model connected" icon={<Gauge className="h-4 w-4" />} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Event map" className="xl:col-span-2" action={<Link to="/map" className="text-xs text-primary hover:underline">Open full map →</Link>}>
          <div className="h-[420px]"><EventMap events={EVENTS} onSelect={(id) => navigate({ to: "/events", search: { id } })} /></div>
        </Panel>
        <Panel title="Early warnings" action={<Link to="/warnings" className="text-xs text-primary hover:underline">View all →</Link>}>
          <ul className="space-y-3">
            {WARNINGS.slice(0, 4).map((w) => (
              <li key={w.id} className="rounded-md border bg-surface p-3">
                <div className="flex items-center justify-between"><SeverityBadge severity={w.severity} /><span className="font-mono text-xs text-primary">{Math.round(w.probability * 100)}%</span></div>
                <div className="mt-1.5 text-sm font-medium">{w.title}</div>
                <div className="text-xs text-muted-foreground">{w.region} · {w.window}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="AQI · last 24h" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={AQI_24H}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={11} interval={3} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area dataKey="delhi" name="Delhi" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.15} />
                <Area dataKey="kolkata" name="Kolkata" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.15} />
                <Area dataKey="mumbai" name="Mumbai" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Latest events">
          <ul className="divide-y">
            {EVENTS.slice(0, 6).map((e) => (
              <li key={e.id}>
                <Link to="/events" search={{ id: e.id }} className="flex items-center justify-between gap-2 py-2 hover:text-primary">
                  <div className="min-w-0">
                    <div className="truncate text-sm">{e.title}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{fmtTime(e.detected)}</div>
                  </div>
                  <SeverityBadge severity={e.severity} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
