import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EVENTS, SEVERITY_ORDER, fmtTime, type EventType, type Severity } from "@/lib/demo-data";
import { FilterChip, PageHeader, Panel, SeverityBadge, SimulatedTag } from "@/components/strata/ui";
import { EventMap } from "@/components/strata/EventMap";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Pollution Event Map — STRATA" },
      { name: "description", content: "Geospatial view of detected pollution events with severity and type filters." },
      { property: "og:title", content: "Pollution Event Map — STRATA" },
      { property: "og:description", content: "Geospatial view of detected pollution events with severity and type filters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapPage,
});

const TYPES: EventType[] = ["Air", "Water", "Soil", "Industrial"];

function MapPage() {
  const [sev, setSev] = useState<Set<Severity>>(new Set(SEVERITY_ORDER));
  const [types, setTypes] = useState<Set<EventType>>(new Set(TYPES));
  const [selected, setSelected] = useState<string>(EVENTS[0].id);
  const toggle = <T,>(s: Set<T>, v: T) => { const n = new Set(s); n.has(v) ? n.delete(v) : n.add(v); return n; };
  const filtered = EVENTS.filter((e) => sev.has(e.severity) && types.has(e.type));
  const sel = EVENTS.find((e) => e.id === selected);

  return (
    <>
      <PageHeader title="Pollution Event Map" subtitle={`${filtered.length} of ${EVENTS.length} events shown`} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Severity</span>
        {SEVERITY_ORDER.map((s) => <FilterChip key={s} active={sev.has(s)} onClick={() => setSev(toggle(sev, s))}>{s}</FilterChip>)}
        <span className="ml-4 text-xs uppercase tracking-wider text-muted-foreground">Type</span>
        {TYPES.map((t) => <FilterChip key={t} active={types.has(t)} onClick={() => setTypes(toggle(types, t))}>{t}</FilterChip>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel title="Geospatial view">
          <div className="h-[640px]"><EventMap events={filtered} selectedId={selected} onSelect={setSelected} /></div>
        </Panel>
        <div className="space-y-4">
          {sel && (
            <Panel title="Selected event">
              <div className="flex items-center justify-between"><span className="font-mono text-xs text-muted-foreground">{sel.id}</span><SeverityBadge severity={sel.severity} /></div>
              <h3 className="mt-2 font-semibold">{sel.title}</h3>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <dt className="text-muted-foreground">Reading</dt><dd className="font-mono">{sel.reading} {sel.unit}</dd>
                <dt className="text-muted-foreground">Threshold</dt><dd className="font-mono">{sel.threshold} {sel.unit}</dd>
                <dt className="text-muted-foreground">Coordinates</dt><dd className="font-mono">{sel.lat.toFixed(2)}, {sel.lon.toFixed(2)}</dd>
                <dt className="text-muted-foreground">Status</dt><dd>{sel.status}</dd>
              </dl>
              <Link to="/events" search={{ id: sel.id }} className="mt-4 block rounded-md bg-primary py-2 text-center text-sm font-medium text-primary-foreground hover:opacity-90">Open intelligence</Link>
            </Panel>
          )}
          <Panel title="Events in view">
            <ul className="max-h-[380px] divide-y overflow-auto">
              {filtered.map((e) => (
                <li key={e.id}>
                  <button onClick={() => setSelected(e.id)} className={`w-full py-2 text-left ${e.id === selected ? "text-primary" : ""}`}>
                    <div className="flex items-center justify-between gap-2"><span className="truncate text-sm">{e.location} · {e.pollutant}</span><SeverityBadge severity={e.severity} /></div>
                    <div className="font-mono text-[11px] text-muted-foreground">{fmtTime(e.detected)}</div>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="py-4 text-sm text-muted-foreground">No events match filters.</li>}
            </ul>
          </Panel>
          <SimulatedTag />
        </div>
      </div>
    </>
  );
}
