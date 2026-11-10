import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, BellRing, Building2, Check, CloudOff, Database, Mail, MapPin, Satellite, Save, Settings2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Panel, StatusNotice } from "@/components/strata/ui";
import { useAppState } from "@/components/strata/AppState";
import { cn } from "@/lib/utils";

const API = import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000";
type SourceStatus = "checking" | "connected" | "unavailable" | "not-integrated" | "pending";
type SourceInfo = { status: SourceStatus; detail: string };
type SourceStatuses = { cpcb: SourceInfo; satellite: SourceInfo; viirs: SourceInfo };
type CpcbResponse = { count?: number; stations?: unknown[] };
type SatelliteResponse = { count?: number; points?: unknown[] };
type FireResponse = { total_count?: number; returned_count?: number; detections?: unknown[] };
const initialSources: SourceStatuses = { cpcb: { status: "checking", detail: "Checking the CPCB endpoint…" }, satellite: { status: "checking", detail: "Checking the Sentinel-5P endpoint…" }, viirs: { status: "checking", detail: "Checking the VIIRS endpoint…" } };

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Workspace Settings — STRATA" },
      { name: "description", content: "Manage session workspace preferences and inspect accurate environmental data-source connectivity and integration status." },
      { property: "og:title", content: "Workspace Settings — STRATA" },
      { property: "og:description", content: "Workspace preferences, data-source status and pending integrations for STRATA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return (await response.json()) as T;
}

function SourceBadge({ status }: { status: SourceStatus }) {
  const styles: Record<SourceStatus, string> = { checking: "border-caution/30 bg-caution/10 text-caution", connected: "border-success/35 bg-success/10 text-success", unavailable: "border-critical/35 bg-critical/10 text-critical", "not-integrated": "border-border bg-surface text-muted-foreground", pending: "border-caution/30 bg-caution/10 text-caution" };
  const labels: Record<SourceStatus, string> = { checking: "Checking", connected: "Connected", unavailable: "Unavailable", "not-integrated": "Not integrated", pending: "Pending" };
  return <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[9px] uppercase tracking-wider", styles[status])}>{status === "connected" && <Check className="h-3 w-3" />}{labels[status]}</span>;
}

function SourceRow({ icon, name, source, note }: { icon: ReactNode; name: string; source: SourceInfo; note?: string }) {
  return <li className="flex items-start gap-3 rounded-lg border bg-surface/45 p-3.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-panel text-primary">{icon}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-medium">{name}</div><SourceBadge status={source.status} /></div><div className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{source.detail}</div>{note && <div className="mt-1 text-[10px] text-muted-foreground">{note}</div>}</div></li>;
}

function SettingsPage() {
  const { settings, updateSettings } = useAppState();
  const [draft, setDraft] = useState(settings);
  const [sources, setSources] = useState<SourceStatuses>(initialSources);

  useEffect(() => {
    const controller = new AbortController();
    async function checkSources() {
      const results = await Promise.allSettled([
        fetchJson<CpcbResponse>(`${API}/api/cpcb?date=2024-11-17&pollutant=PM2.5`, controller.signal),
        fetchJson<SatelliteResponse>(`${API}/api/satellite?pollutant=NO2&window_id=11-12`, controller.signal),
        fetchJson<FireResponse>(`${API}/api/fires?date=2024-11-17`, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      const [cpcb, satellite, viirs] = results;
      setSources({
        cpcb: cpcb.status === "fulfilled" ? { status: "connected", detail: `${cpcb.value.count ?? cpcb.value.stations?.length ?? 0} station records returned · PM2.5 · 17 Nov 2024` } : { status: "unavailable", detail: "The CPCB endpoint could not be reached." },
        satellite: satellite.status === "fulfilled" ? { status: "connected", detail: `${satellite.value.points?.length ?? satellite.value.count ?? 0} grid records returned · NO2 · 12–18 Nov 2024 composite` } : { status: "unavailable", detail: "The Sentinel-5P endpoint could not be reached." },
        viirs: viirs.status === "fulfilled" ? { status: "connected", detail: `${viirs.value.returned_count ?? viirs.value.detections?.length ?? 0} regional detections returned · 17 Nov 2024` } : { status: "unavailable", detail: "The VIIRS endpoint could not be reached." },
      });
    }
    void checkSources();
    return () => controller.abort();
  }, []);

  const Row = ({ label, desc, k }: { label: string; desc: string; k: "notifyCritical" | "notifyHigh" | "dailyDigest" }) => <div className="flex items-center justify-between gap-4 rounded-md border bg-surface/45 px-3.5 py-3"><div><div className="text-sm font-medium">{label}</div><div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{desc}</div></div><Switch checked={draft[k]} onCheckedChange={(value) => setDraft((current) => ({ ...current, [k]: value }))} aria-label={label} /></div>;

  function saveSettings() {
    updateSettings(draft);
    toast.success("Preferences saved for this session only");
  }

  return <>
    <PageHeader eyebrow="Workspace administration" title="Settings" subtitle="Manage your session workspace preferences and inspect the live status of environmental data sources and pending integrations." actions={<button onClick={saveSettings} className="primary-button"><Save className="h-4 w-4" />Save session changes</button>} />
    <StatusNotice tone="warning" title="Session-only preferences" className="mb-4">These settings are stored in application memory for the active session. They are not saved to a database or restored after a page reload.</StatusNotice>

    <div className="grid items-start gap-4 xl:grid-cols-2">
      <Panel title="Workspace profile" description="Identity and regional preferences for this analyst workspace" action={<Building2 className="h-4 w-4 text-primary" />}>
        <div className="mb-4 flex items-center gap-3 rounded-lg border bg-surface/50 p-4"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/12 text-primary"><Building2 className="h-5 w-5" /></span><div className="min-w-0"><div className="truncate text-sm font-semibold">{draft.org || "Unnamed workspace"}</div><div className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground"><Mail className="h-3 w-3" />{draft.email || "No contact email"}</div></div></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="control-label sm:col-span-2">Organisation name<input className="control-input w-full" value={draft.org} onChange={(event) => setDraft({ ...draft, org: event.target.value })} /></label><label className="control-label">Contact email<input type="email" className="control-input w-full" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label><label className="control-label">Default region preference<select className="control-input w-full" value={draft.region} onChange={(event) => setDraft({ ...draft, region: event.target.value })}>{["All India", "North", "East", "West", "South", "Central"].map((region) => <option key={region}>{region}</option>)}</select></label></div>
        <p className="mt-4 flex items-start gap-2 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />These profile preferences do not currently change geographic filters in individual modules.</p>
      </Panel>

      <Panel title="Measurement preferences" description="Threshold and display preferences for future workspace capabilities" action={<Settings2 className="h-4 w-4 text-primary" />}>
        <div className="rounded-lg border bg-surface/45 p-4"><div className="flex items-center justify-between"><label htmlFor="aqi-threshold" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AQI threshold preference</label><span className="rounded-md border bg-panel px-3 py-1.5 font-mono text-lg text-primary">{draft.aqiThreshold}</span></div><input id="aqi-threshold" type="range" min={100} max={500} step={10} value={draft.aqiThreshold} onChange={(event) => setDraft({ ...draft, aqiThreshold: Number(event.target.value) })} className="mt-5 w-full accent-primary" /><div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground"><span>100</span><span>300</span><span>500</span></div></div>
        <label className="control-label mt-4">Unit preference<select className="control-input w-full" value={draft.units} onChange={(event) => setDraft({ ...draft, units: event.target.value as "metric" | "imperial" })}><option value="metric">Metric (µg/m³, mg/L)</option><option value="imperial">Imperial</option></select></label>
        <StatusNotice tone="warning" className="mt-4">Threshold and unit selections are preferences only. No automated AQI alert engine is connected, and changing units does not yet convert module measurements.</StatusNotice>
      </Panel>

      <Panel title="Notification preferences" description="Future delivery choices—not active notification services" action={<BellRing className="h-4 w-4 text-caution" />}>
        <div className="space-y-2"><Row label="Critical alerts" desc="Preference for future critical-event notifications" k="notifyCritical" /><Row label="High severity alerts" desc="Preference for future high-severity notifications" k="notifyHigh" /><Row label="Daily digest" desc="Preference for a future daily summary" k="dailyDigest" /></div>
        <StatusNotice tone="warning" className="mt-4" title="Delivery not configured">These switches store preference values only. Email delivery, push notifications and automated environmental alerts are not operational.</StatusNotice>
      </Panel>

      <Panel title="Integration overview" description="What is connected, unavailable or still pending" action={<Database className="h-4 w-4 text-primary" />}>
        <div className="grid grid-cols-3 gap-2"><div className="rounded-md border border-success/25 bg-success/[0.05] p-3 text-center"><div className="font-display text-2xl font-semibold text-success">{[sources.cpcb, sources.satellite, sources.viirs].filter((source) => source.status === "connected").length}</div><div className="mt-1 text-[10px] text-muted-foreground">Connected sources</div></div><div className="rounded-md border bg-surface/45 p-3 text-center"><div className="font-display text-2xl font-semibold">2</div><div className="mt-1 text-[10px] text-muted-foreground">Not integrated feeds</div></div><div className="rounded-md border border-caution/25 bg-caution/[0.05] p-3 text-center"><div className="font-display text-2xl font-semibold text-caution">1</div><div className="mt-1 text-[10px] text-muted-foreground">Pending model</div></div></div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Connection checks run when this page loads. A successful response confirms endpoint availability, not the accuracy or completeness of its underlying data.</p>
        <div className="mt-4 rounded-md border border-dashed p-3 text-[11px] leading-relaxed text-muted-foreground">No credentials are displayed or stored in this settings interface.</div>
      </Panel>
    </div>

    <Panel title="Environmental data sources" description="Live endpoint checks and explicit integration states" className="mt-4">
      <ul className="grid gap-2 lg:grid-cols-2"><SourceRow icon={<Activity className="h-4 w-4" />} name="CPCB CAAQMS" source={sources.cpcb} note="Ground-station reported observations" /><SourceRow icon={<Satellite className="h-4 w-4" />} name="Sentinel-5P TROPOMI" source={sources.satellite} note="Atmospheric column grid observations" /><SourceRow icon={<CloudOff className="h-4 w-4" />} name="River water quality sensors" source={{ status: "not-integrated", detail: "No connected data endpoint currently available." }} /><SourceRow icon={<CloudOff className="h-4 w-4" />} name="IMD meteorological feed" source={{ status: "not-integrated", detail: "No connected data endpoint currently available." }} /><SourceRow icon={<Database className="h-4 w-4" />} name="VIIRS Fire Observations" source={sources.viirs} note="NASA FIRMS satellite detection records" /><SourceRow icon={<ShieldAlert className="h-4 w-4" />} name="Predictive ML model" source={{ status: "pending", detail: "Awaiting model integration and validation." }} note="No predictions are currently issued" /></ul>
    </Panel>
  </>;
}
