import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { EVENTS, REPORTS, fmtTime, type Report } from "@/lib/demo-data";
import { PageHeader, Panel, SimulatedTag } from "@/components/strata/ui";

export const Route = createFileRoute("/reports")({
  validateSearch: (s: Record<string, unknown>): { id?: string | undefined } => ({ id: typeof s["id"] === "string" ? s["id"] : undefined }),
  head: () => ({
    meta: [
      { title: "AI-generated Reports — STRATA" },
      { name: "description", content: "Incident briefs, summaries and regulatory filings drafted from event intelligence." },
      { property: "og:title", content: "AI-generated Reports — STRATA" },
      { property: "og:description", content: "Incident briefs, summaries and regulatory filings drafted from event intelligence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const KINDS: Report["kind"][] = ["Incident Brief", "Weekly Summary", "Regulatory Filing", "Risk Assessment"];

function ReportsPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/reports" });
  const [reports, setReports] = useState<Report[]>(REPORTS);
  const [kind, setKind] = useState<Report["kind"]>("Incident Brief");
  const [eventId, setEventId] = useState(EVENTS[0]!.id);
  const current = reports.find((r) => r.id === id) ?? reports[0]!;

  const generate = () => {
    const ev = EVENTS.find((e) => e.id === eventId)!;
    const r: Report = {
      id: `RPT-${1105 + reports.length - REPORTS.length}`,
      title: `${ev.location} – ${kind.toLowerCase()}`,
      kind, region: ev.location, created: new Date().toISOString(), eventIds: [ev.id], status: "Draft",
      body: [`[Template draft] ${ev.title} was detected at ${fmtTime(ev.detected)} with ${ev.pollutant} at ${ev.reading} ${ev.unit} (limit ${ev.threshold}).`, `Probable source: ${ev.source}.`, ev.summary, "This draft was produced from a template. The language model is not yet connected."],
    };
    setReports([r, ...reports]);
    navigate({ search: { id: r.id } });
    toast.success("Draft report created", { description: "Simulated template output." });
  };

  return (
    <>
      <PageHeader title="AI-generated Reports" subtitle="Draft, review and export analyst-ready documents" />
      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <Panel title="Generate report" simulated={false}>
            <label className="text-xs text-muted-foreground">Report type</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as Report["kind"])} className="mb-3 mt-1 h-9 w-full rounded-md border bg-surface px-2 text-sm">{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
            <label className="text-xs text-muted-foreground">Source event</label>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-surface px-2 text-sm">{EVENTS.map((e) => <option key={e.id} value={e.id}>{e.id} · {e.location}</option>)}</select>
            <button onClick={generate} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90"><Sparkles className="h-4 w-4" /> Generate draft</button>
            <p className="mt-2 text-[11px] text-muted-foreground">Uses a template until the AI model is connected.</p>
          </Panel>
          <Panel title="Library">
            <ul className="space-y-1">
              {reports.map((r) => (
                <li key={r.id}>
                  <button onClick={() => navigate({ search: { id: r.id } })} className={`w-full rounded-md border px-2.5 py-2 text-left ${r.id === current.id ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent"}`}>
                    <div className="flex justify-between font-mono text-[10px] text-muted-foreground"><span>{r.id}</span><span>{r.status}</span></div>
                    <div className="text-sm">{r.title}</div>
                    <div className="text-[11px] text-muted-foreground">{r.kind}</div>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <article className="rounded-lg border bg-panel p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{current.id}</span><span className="rounded-sm border px-1.5 py-0.5 text-[10px] uppercase">{current.status}</span><SimulatedTag /></div>
            <button onClick={() => toast("Export prepared", { description: "PDF export is simulated in this demo." })} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:border-primary"><Download className="h-4 w-4" /> Export PDF</button>
          </div>
          <div className="mt-6 text-xs uppercase tracking-wider text-primary">{current.kind}</div>
          <h2 className="mt-1 text-2xl font-semibold">{current.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{current.region} · {fmtTime(current.created)}</p>
          <div className="mt-6 space-y-4 text-[15px] leading-relaxed">{current.body.map((p, i) => <p key={i}>{p}</p>)}</div>
          <div className="mt-8 border-t pt-4 text-xs text-muted-foreground">
            Referenced events: {current.eventIds.map((e) => <Link key={e} to="/events" search={{ id: e }} className="mr-2 font-mono text-primary hover:underline">{e}</Link>)}
          </div>
        </article>
      </div>
    </>
  );
}
