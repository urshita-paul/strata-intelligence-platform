import { lazy, Suspense, useMemo, useState } from "react";
import { ClientOnly, createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Activity, AlertTriangle, BellRing, Clock3, FileText, MapPinned } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  DEMO_LAST_UPDATED,
  EVENTS,
  GEOGRAPHIC_REGIONS,
  REPORTS,
  SEVERITY_ORDER,
  WARNINGS,
  eventInRegion,
  fmtTime,
  getPollutionTrends,
  getRiskScore,
  type GeographicRegion,
  type Severity,
  type TrendPeriod,
} from "@/lib/demo-data";
import { FilterChip, PageHeader, Panel, SeverityBadge, SimulatedTag, StatCard, sevVar, tooltipStyle } from "@/components/strata/ui";
import { useAppState } from "@/components/strata/AppState";

const DashboardMap = lazy(() => import("@/components/strata/DashboardMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "STRATA Command Centre — Environmental Intelligence" },
      { name: "description", content: "Environmental monitoring command centre with an interactive India event map, pollution trends, alerts and recent event intelligence." },
      { property: "og:title", content: "STRATA Command Centre — Environmental Intelligence" },
      { property: "og:description", content: "Monitor simulated pollution events, environmental trends and high-risk alerts across India." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommandCentre,
});

const PERIODS: { id: TrendPeriod; label: string }[] = [
  { id: "24h", label: "24 hours" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];
const POLLUTANTS = [
  { id: "pm25", label: "PM2.5", colour: "var(--chart-1)" },
  { id: "pm10", label: "PM10", colour: "var(--chart-2)" },
  { id: "no2", label: "NO₂", colour: "var(--chart-4)" },
] as const;
type PollutantId = (typeof POLLUTANTS)[number]["id"];

function MapLoading() {
  return <div className="flex h-full min-h-[390px] items-center justify-center rounded-md bg-surface text-sm text-muted-foreground">Loading map…</div>;
}

function CommandCentre() {
  const navigate = useNavigate();
  const { acknowledged, acknowledge } = useAppState();
  const [region, setRegion] = useState<GeographicRegion>("All India");
  const [risk, setRisk] = useState<"all" | Severity>("all");
  const [period, setPeriod] = useState<TrendPeriod>("24h");
  const [visiblePollutants, setVisiblePollutants] = useState<Record<PollutantId, boolean>>({ pm25: true, pm10: true, no2: true });

  const filteredEvents = useMemo(
    () => EVENTS.filter((event) => eventInRegion(event, region) && (risk === "all" || event.severity === risk)),
    [region, risk],
  );
  const trends = useMemo(() => getPollutionTrends(period), [period]);
  const activeEvents = EVENTS.filter((event) => event.status === "Active");
  const highRiskEvents = EVENTS.filter((event) => event.severity === "critical" || event.severity === "high");
  const activeAlerts = WARNINGS.filter((warning) => !acknowledged.has(warning.id));
  const highRiskAlerts = WARNINGS.filter((warning) => warning.severity === "critical" || warning.severity === "high");
  const recentEvents = [...EVENTS].sort((a, b) => b.detected.localeCompare(a.detected)).slice(0, 8);

  return (
    <>
      <PageHeader
        title="STRATA Command Centre"
        subtitle="Environmental Monitoring & Intelligence"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <SimulatedTag>Demonstration mode – simulated data</SimulatedTag>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" /> Last updated {fmtTime(DEMO_LAST_UPDATED)}
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Active Pollution Events" value={String(activeEvents.length)} delta={`${EVENTS.length} events monitored`} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="High-Risk Events" value={String(highRiskEvents.length)} tone="high" delta="Critical and high severity" icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Regions Monitored" value={String(new Set(EVENTS.map((event) => event.state)).size)} delta="States and territories" icon={<MapPinned className="h-4 w-4" />} />
        <StatCard label="AI Reports Generated" value={String(REPORTS.length)} delta="Demonstration report library" icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Active Alerts" value={String(activeAlerts.length)} tone="critical" delta={`${acknowledged.size} acknowledged`} icon={<BellRing className="h-4 w-4" />} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Panel
          title="India · Pollution Event Map"
          action={<Link to="/map" className="text-xs text-primary hover:underline">Open full map →</Link>}
          className="min-w-0"
        >
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Geographic region
              <select
                aria-label="Filter map by geographic region"
                value={region}
                onChange={(event) => setRegion(event.target.value as GeographicRegion)}
                className="h-8 min-w-36 rounded-md border bg-surface px-2 text-xs normal-case tracking-normal text-foreground outline-none focus:border-primary"
              >
                {GEOGRAPHIC_REGIONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Risk level
              <select
                aria-label="Filter map by risk level"
                value={risk}
                onChange={(event) => setRisk(event.target.value as "all" | Severity)}
                className="h-8 min-w-32 rounded-md border bg-surface px-2 text-xs normal-case tracking-normal text-foreground outline-none focus:border-primary"
              >
                <option value="all">All risk levels</option>
                {SEVERITY_ORDER.map((item) => <option key={item} value={item}>{item[0]!.toUpperCase() + item.slice(1)}</option>)}
              </select>
            </label>
            <span className="ml-auto pb-2 font-mono text-[11px] text-muted-foreground">{filteredEvents.length} of {EVENTS.length} events</span>
          </div>
          <div className="h-[430px] overflow-hidden rounded-md border bg-surface">
            <ClientOnly fallback={<MapLoading />}>
              <Suspense fallback={<MapLoading />}>
                <DashboardMap events={filteredEvents} onView={(id) => navigate({ to: "/events", search: { id } })} />
              </Suspense>
            </ClientOnly>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Map risk legend">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk legend</span>
            {SEVERITY_ORDER.map((severity) => (
              <span key={severity} className="inline-flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: sevVar[severity] }} /> {severity}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="High-Risk Alert Panel" action={<Link to="/warnings" className="text-xs text-primary hover:underline">Warning centre →</Link>}>
          <ul className="space-y-3">
            {highRiskAlerts.map((warning) => {
              const isAcknowledged = acknowledged.has(warning.id);
              return (
                <li key={warning.id} className="rounded-md border bg-surface p-3">
                  <div className="flex items-center justify-between gap-2">
                    <SeverityBadge severity={warning.severity} />
                    <span className={`font-mono text-[10px] uppercase tracking-wider ${isAcknowledged ? "text-low" : "text-critical"}`}>
                      {isAcknowledged ? "Acknowledged" : "Active alert"}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-medium leading-snug">{warning.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{warning.region}</div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">{warning.window}</div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {warning.eventId ? (
                      <Link to="/events" search={{ id: warning.eventId }} className="text-xs text-primary hover:underline">View event</Link>
                    ) : <span />}
                    <button
                      onClick={() => acknowledge(warning.id)}
                      disabled={isAcknowledged}
                      className="rounded-sm border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary disabled:cursor-default disabled:opacity-50"
                    >
                      {isAcknowledged ? "Acknowledged" : "Acknowledge"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <Panel
        title="Pollution Trends · Delhi NCR"
        className="mt-4"
        action={
          <div className="flex gap-1.5">
            {PERIODS.map((item) => (
              <FilterChip key={item.id} active={period === item.id} onClick={() => setPeriod(item.id)}>{item.label}</FilterChip>
            ))}
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">Pollutants</span>
          {POLLUTANTS.map((pollutant) => (
            <FilterChip
              key={pollutant.id}
              active={visiblePollutants[pollutant.id]}
              onClick={() => setVisiblePollutants((current) => ({ ...current, [pollutant.id]: !current[pollutant.id] }))}
            >
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: pollutant.colour }} />
              {pollutant.label}
            </FilterChip>
          ))}
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">µg/m³ · simulated measurements</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={trends} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} interval={period === "24h" ? 3 : period === "30d" ? 4 : 0} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              {POLLUTANTS.map((pollutant) => visiblePollutants[pollutant.id] && (
                <Line
                  key={`${period}-${pollutant.id}`}
                  type="monotone"
                  dataKey={pollutant.id}
                  name={pollutant.label}
                  stroke={pollutant.colour}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Recent Pollution Events" className="mt-4" action={<Link to="/events" className="text-xs text-primary hover:underline">Event intelligence →</Link>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Event ID</th>
                <th className="pb-2 pr-4 font-medium">Region</th>
                <th className="pb-2 pr-4 font-medium">Pollutant</th>
                <th className="pb-2 pr-4 font-medium">Risk score</th>
                <th className="pb-2 pr-4 font-medium">Risk level</th>
                <th className="pb-2 pr-4 font-medium">Timestamp</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentEvents.map((event) => (
                <tr
                  key={event.id}
                  tabIndex={0}
                  role="link"
                  aria-label={`Open ${event.id} event details`}
                  onClick={() => navigate({ to: "/events", search: { id: event.id } })}
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                      keyEvent.preventDefault();
                      navigate({ to: "/events", search: { id: event.id } });
                    }
                  }}
                  className="cursor-pointer transition-colors hover:bg-accent/40 focus:bg-accent/40 focus:outline-none"
                >
                  <td className="py-2.5 pr-4 font-mono text-xs text-primary">{event.id}</td>
                  <td className="py-2.5 pr-4"><div>{event.location}</div><div className="text-[11px] text-muted-foreground">{event.state}</div></td>
                  <td className="py-2.5 pr-4 font-mono text-xs">{event.pollutant}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs">{getRiskScore(event)}<span className="text-muted-foreground">/100</span></td>
                  <td className="py-2.5 pr-4"><SeverityBadge severity={event.severity} /></td>
                  <td className="py-2.5 pr-4 font-mono text-[11px] text-muted-foreground">{fmtTime(event.detected)}</td>
                  <td className="py-2.5"><span className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">{event.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
