import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Panel } from "@/components/strata/ui";
import { useAppState } from "@/components/strata/AppState";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — STRATA" },
      { name: "description", content: "Configure organisation, alert thresholds, notifications and data sources." },
      { property: "og:title", content: "Settings — STRATA" },
      { property: "og:description", content: "Configure organisation, alert thresholds and notifications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const SOURCES = [
  { name: "CPCB CAAQMS stations", status: "Simulated" },
  { name: "Sentinel-5P TROPOMI", status: "Simulated" },
  { name: "River water quality sensors", status: "Simulated" },
  { name: "IMD meteorological feed", status: "Simulated" },
];

function SettingsPage() {
  const { settings, updateSettings } = useAppState();
  const [draft, setDraft] = useState(settings);
  const input = "mt-1 h-9 w-full rounded-md border bg-surface px-2 text-sm outline-none focus:border-primary";
  const Row = ({ label, desc, k }: { label: string; desc: string; k: "notifyCritical" | "notifyHigh" | "dailyDigest" }) => (
    <div className="flex items-center justify-between py-3">
      <div><div className="text-sm">{label}</div><div className="text-xs text-muted-foreground">{desc}</div></div>
      <Switch checked={draft[k]} onCheckedChange={(v) => setDraft({ ...draft, [k]: v })} />
    </div>
  );
  return (
    <>
      <PageHeader title="Settings" subtitle="Workspace configuration" actions={<button onClick={() => { updateSettings(draft); toast.success("Settings saved for this session"); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Save changes</button>} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Organisation" simulated={false}>
          <label className="text-xs text-muted-foreground">Organisation name</label>
          <input className={input} value={draft.org} onChange={(e) => setDraft({ ...draft, org: e.target.value })} />
          <label className="mt-3 block text-xs text-muted-foreground">Contact email</label>
          <input className={input} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <label className="mt-3 block text-xs text-muted-foreground">Default region</label>
          <select className={input} value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })}>{["All India", "North", "East", "West", "South", "Central"].map((r) => <option key={r}>{r}</option>)}</select>
        </Panel>
        <Panel title="Alert thresholds" simulated={false}>
          <label className="text-xs text-muted-foreground">AQI alert threshold: <span className="font-mono text-foreground">{draft.aqiThreshold}</span></label>
          <input type="range" min={100} max={500} step={10} value={draft.aqiThreshold} onChange={(e) => setDraft({ ...draft, aqiThreshold: Number(e.target.value) })} className="mt-2 w-full accent-primary" />
          <label className="mt-4 block text-xs text-muted-foreground">Units</label>
          <select className={input} value={draft.units} onChange={(e) => setDraft({ ...draft, units: e.target.value as "metric" | "imperial" })}><option value="metric">Metric (µg/m³, mg/L)</option><option value="imperial">Imperial</option></select>
        </Panel>
        <Panel title="Notifications" simulated={false}>
          <div className="divide-y">
            <Row label="Critical alerts" desc="Immediate notification for critical events" k="notifyCritical" />
            <Row label="High severity alerts" desc="Notify for high severity events" k="notifyHigh" />
            <Row label="Daily digest" desc="Morning summary email at 06:00 local" k="dailyDigest" />
          </div>
        </Panel>
        <Panel title="Data sources">
          <ul className="divide-y">
            {SOURCES.map((s) => (
              <li key={s.name} className="flex items-center justify-between py-2.5 text-sm">{s.name}<span className="font-mono text-xs text-sim">{s.status}</span></li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Live integrations and ML models will be connected in a later phase.</p>
        </Panel>
      </div>
    </>
  );
}
