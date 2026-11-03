import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { EVENTS, REPORTS, WARNINGS, fmtTime, getEvent } from "@/lib/demo-data";
import { PageHeader, Panel, SeverityBadge, SimulatedTag } from "@/components/strata/ui";
import { EventMap } from "@/components/strata/EventMap";
import { tooltipStyle } from "@/components/strata/ui";

export const Route = createFileRoute("/events")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => ({ id: typeof s.id === "string" ? s.id : undefined }),
  head: () => ({
    meta: [
      { title: "Event Intelligence — STRATA" },
      { name: "description", content: "Deep-dive intelligence on individual pollution events: readings, attribution and impact." },
      { property: "og:title", content: "Event Intelligence — STRATA" },
      { property: "og:description", content: "Deep-dive intelligence on individual pollution events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/events" });
  const [q, setQ] = useState("");
  const ev = getEvent(id ?? "") ?? EVENTS[0];
  const list = EVENTS.filter((e) => `${e.title} ${e.location} ${e.pollutant}`.toLowerCase().includes(q.toLowerCase()));
  const trend = ev.trend.map((v, i) => ({ t: `T-${(7 - i) * 3}h`, v }));
  const related = WARNINGS.filter((w) => w.eventId === ev.id);
  const reports = REPORTS.filter((r) => r.eventIds.includes(ev.id));
  const ratio = ev.reading / ev.threshold;

  return (
    <>
      <PageHeader title="Event Intelligence" subtitle="Select an event to inspect readings, attribution and impact" />
      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <Panel title="Events">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="mb-3 h-8 w-full rounded-md border bg-surface px-2 text-sm outline-none focus:border-primary" />
          <ul className="space-y-1">
            {list.map((e) => (
              <li key={e.id}>
                <button onClick={() => navigate({ search: { id: e.id } })} className={`w-full rounded-md border px-2.5 py-2 text-left ${e.id === ev.id ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent"}`}>
                  <div className="flex items-center justify-between"><span className="font-mono text-[10px] text-muted-foreground">{e.id}</span><SeverityBadge severity={e.severity} /></div>
                  <div className="mt-1 text-sm leading-snug">{e.title}</div>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="space-y-4">
          <div className="rounded-lg border bg-panel p-5">
            <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{ev.id}</span><SeverityBadge severity={ev.severity} /><span className="rounded-sm border px-1.5 py-0.5 text-[10px] uppercase">{ev.status}</span><SimulatedTag /></div>
            <h2 className="mt-2 text-xl font-semibold">{ev.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{ev.location}, {ev.state} · detected {fmtTime(ev.detected)}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[["Reading", `${ev.reading} ${ev.unit}`], ["Exceedance", `${ratio.toFixed(1)}× limit`], ["Exposed pop.", ev.affectedPop.toLocaleString()], ["Attribution conf.", `${Math.round(ev.confidence * 100)}%`]].map(([k, v]) => (
                <div key={k}><div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div><div className="mt-1 font-mono text-lg">{v}</div></div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={`${ev.pollutant} trend · 24h`}>
              <div className="h-56">
                <ResponsiveContainer>
                  <LineChart data={trend}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="t" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <ReferenceLine y={ev.threshold} stroke="var(--critical)" strokeDasharray="4 4" label={{ value: "Limit", fill: "var(--critical)", fontSize: 10 }} />
                    <Line dataKey="v" name={ev.pollutant} stroke="var(--primary)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Location">
              <div className="h-56"><EventMap events={[ev]} selectedId={ev.id} compact /></div>
            </Panel>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Attribution & assessment">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Probable source</div>
              <div className="mt-1 text-sm">{ev.source}</div>
              <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Analyst summary</div>
              <p className="mt-1 text-sm leading-relaxed">{ev.summary}</p>
              <p className="mt-3 text-[11px] text-muted-foreground">Attribution is placeholder text. Source-apportionment model not yet connected.</p>
            </Panel>
            <Panel title="Linked items">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Warnings</div>
              {related.length ? related.map((w) => <Link key={w.id} to="/warnings" className="mt-1 block text-sm text-primary hover:underline">{w.id} · {w.title}</Link>) : <div className="mt-1 text-sm text-muted-foreground">None</div>}
              <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Reports</div>
              {reports.length ? reports.map((r) => <Link key={r.id} to="/reports" search={{ id: r.id }} className="mt-1 block text-sm text-primary hover:underline">{r.id} · {r.title}</Link>) : <div className="mt-1 text-sm text-muted-foreground">None</div>}
              <button onClick={() => toast.success(`Draft report queued for ${ev.id}`, { description: "Simulated — report generation is not connected yet." })} className="mt-4 inline-flex items-center gap-2 rounded-md border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary/10"><FileText className="h-4 w-4" /> Generate brief</button>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
