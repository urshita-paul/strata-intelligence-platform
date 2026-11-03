import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { WARNINGS, SEVERITY_ORDER, fmtTime, type Severity } from "@/lib/demo-data";
import { FilterChip, PageHeader, Panel, SeverityBadge, StatCard, SimulatedTag } from "@/components/strata/ui";
import { useAppState } from "@/components/strata/AppState";

export const Route = createFileRoute("/warnings")({
  head: () => ({
    meta: [
      { title: "Early Warning Centre — STRATA" },
      { name: "description", content: "Forecast-based pollution early warnings with probability and recommended actions." },
      { property: "og:title", content: "Early Warning Centre — STRATA" },
      { property: "og:description", content: "Forecast-based pollution early warnings with recommended actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WarningsPage,
});

function WarningsPage() {
  const { acknowledged, acknowledge } = useAppState();
  const [filter, setFilter] = useState<Severity | "all">("all");
  const list = WARNINGS.filter((w) => filter === "all" || w.severity === filter);
  const open = WARNINGS.filter((w) => !acknowledged.has(w.id));

  return (
    <>
      <PageHeader title="Early Warning Centre" subtitle="Forecast-driven alerts requiring analyst review" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open warnings" value={String(open.length)} />
        <StatCard label="Critical" value={String(WARNINGS.filter((w) => w.severity === "critical").length)} tone="critical" />
        <StatCard label="Acknowledged" value={String(acknowledged.size)} />
        <StatCard label="Forecast horizon" value="72h" delta="Placeholder forecast" />
      </div>
      <div className="my-4 flex items-center gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
        {SEVERITY_ORDER.map((s) => <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>{s}</FilterChip>)}
        <SimulatedTag className="ml-auto" />
      </div>
      <div className="space-y-3">
        {list.map((w) => {
          const ack = acknowledged.has(w.id);
          return (
            <div key={w.id} className={`grid gap-4 rounded-lg border bg-panel p-4 md:grid-cols-[1fr_180px_160px] ${ack ? "opacity-60" : ""}`}>
              <div>
                <div className="flex items-center gap-2"><SeverityBadge severity={w.severity} /><span className="font-mono text-xs text-muted-foreground">{w.id} · issued {fmtTime(w.issued)}</span></div>
                <h3 className="mt-2 font-semibold">{w.title}</h3>
                <div className="text-sm text-muted-foreground">{w.region} · {w.window}</div>
                <p className="mt-2 text-sm"><span className="text-muted-foreground">Recommended: </span>{w.recommended}</p>
                {w.eventId && <Link to="/events" search={{ id: w.eventId }} className="mt-1 inline-block text-xs text-primary hover:underline">Linked event {w.eventId} →</Link>}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Probability</div>
                <div className="mt-1 font-mono text-2xl">{Math.round(w.probability * 100)}%</div>
                <div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${w.probability * 100}%` }} /></div>
              </div>
              <div className="flex items-center md:justify-end">
                <button disabled={ack} onClick={() => { acknowledge(w.id); toast.success(`${w.id} acknowledged`); }} className="inline-flex items-center gap-2 rounded-md border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary/10 disabled:border-border disabled:text-muted-foreground">
                  <Check className="h-4 w-4" /> {ack ? "Acknowledged" : "Acknowledge"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <Panel title="About forecasts" className="mt-4" simulated={false}>
        <p className="text-sm text-muted-foreground">Probabilities are demonstration values. The forecasting model will be connected in a later phase.</p>
      </Panel>
    </>
  );
}
