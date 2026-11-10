
import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  BellRing,
  Building2,
  Check,
  CloudOff,
  Database,
  Gauge,
  Info,
  Mail,
  MapPin,
  MapPinned,
  Satellite,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  PageHeader,
  Panel,
  StatusNotice,
} from "@/components/strata/ui";
import { useAppState } from "@/components/strata/AppState";

const API =
  import.meta.env["VITE_API_BASE_URL"] ||
  "http://127.0.0.1:8000";

type SourceStatus =
  | "checking"
  | "connected"
  | "unavailable"
  | "not-integrated"
  | "pending";

type SourceInfo = {
  status: SourceStatus;
  detail: string;
};

type SourceStatuses = {
  cpcb: SourceInfo;
  satellite: SourceInfo;
  viirs: SourceInfo;
};

type CpcbResponse = {
  count?: number;
  stations?: unknown[];
};

type SatelliteResponse = {
  count?: number;
  points?: unknown[];
};

type FireResponse = {
  total_count?: number;
  returned_count?: number;
  detections?: unknown[];
};

type PreferenceKey =
  | "notifyCritical"
  | "notifyHigh"
  | "dailyDigest";

const initialSources: SourceStatuses = {
  cpcb: {
    status: "checking",
    detail: "Checking the CPCB endpoint...",
  },
  satellite: {
    status: "checking",
    detail: "Checking the Sentinel-5P endpoint...",
  },
  viirs: {
    status: "checking",
    detail: "Checking the VIIRS endpoint...",
  },
};

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Workspace Settings — STRATA" },
      {
        name: "description",
        content:
          "Manage session workspace preferences and inspect environmental data-source connectivity and integration status.",
      },
      {
        property: "og:title",
        content: "Workspace Settings — STRATA",
      },
      {
        property: "og:description",
        content:
          "Workspace preferences, data-source status and pending integrations for STRATA.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  }),
  component: SettingsPage,
});

async function fetchJson<T>(
  url: string,
  signal: AbortSignal
): Promise<T> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(
      `Request failed with status ${response.status}`
    );
  }

  return (await response.json()) as T;
}

function SourceBadge({
  status,
}: {
  status: SourceStatus;
}) {
  const styles: Record<SourceStatus, string> = {
    checking:
      "border-zinc-500/25 bg-zinc-500/[0.06] text-zinc-400",
    connected:
      "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-400",
    unavailable:
      "border-red-500/25 bg-red-500/[0.07] text-red-400",
    "not-integrated":
      "border-zinc-500/25 bg-zinc-500/[0.06] text-zinc-400",
    pending:
      "border-amber-500/25 bg-amber-500/[0.07] text-amber-300",
  };

  const labels: Record<SourceStatus, string> = {
    checking: "Checking",
    connected: "Connected",
    unavailable: "Unavailable",
    "not-integrated": "Not integrated",
    pending: "Pending",
  };

  const indicators: Record<SourceStatus, string> = {
    checking: "bg-zinc-400 animate-pulse",
    connected: "bg-emerald-400",
    unavailable: "bg-red-400",
    "not-integrated": "bg-zinc-500",
    pending: "bg-amber-400",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${styles[status]}`}
    >
      {status === "connected" ? (
        <Check className="h-3 w-3" />
      ) : (
        <span
          className={`h-1.5 w-1.5 rounded-full ${indicators[status]}`}
        />
      )}
      {labels[status]}
    </span>
  );
}

function SourceRow({
  icon,
  name,
  source,
  note,
}: {
  icon: ReactNode;
  name: string;
  source: SourceInfo;
  note?: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035] text-primary">
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium text-zinc-200">
            {name}
          </div>
          <SourceBadge status={source.status} />
        </div>

        <div className="mt-2 break-words text-[11px] leading-relaxed text-zinc-500">
          {source.detail}
        </div>

        {note && (
          <div className="mt-1 text-[10px] text-zinc-600">
            {note}
          </div>
        )}
      </div>
    </li>
  );
}

function PreferenceRow({
  label,
  desc,
  checked,
  onCheckedChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-200">
          {label}
        </div>
        <div className="mt-1 text-xs leading-relaxed text-zinc-500">
          {desc}
        </div>
      </div>

      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </div>
  );
}

function SettingsPage() {
  const { settings, updateSettings } = useAppState();

  const [draft, setDraft] = useState(settings);

  const [sources, setSources] =
    useState<SourceStatuses>(initialSources);

  const input =
    "mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#101010] px-3 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-primary/60 focus:ring-2 focus:ring-primary/10";

  useEffect(() => {
    const controller = new AbortController();

    async function checkSources() {
      const results = await Promise.allSettled([
        fetchJson<CpcbResponse>(
          `${API}/api/cpcb?date=2024-11-17&pollutant=PM2.5`,
          controller.signal
        ),
        fetchJson<SatelliteResponse>(
          `${API}/api/satellite?pollutant=NO2&window_id=11-12`,
          controller.signal
        ),
        fetchJson<FireResponse>(
          `${API}/api/fires?date=2024-11-17`,
          controller.signal
        ),
      ]);

      if (controller.signal.aborted) return;

      const [cpcb, satellite, viirs] = results;

      setSources({
        cpcb:
          cpcb.status === "fulfilled"
            ? {
                status: "connected",
                detail: `${
                  cpcb.value.count ??
                  cpcb.value.stations?.length ??
                  0
                } station records returned · PM2.5 · 17 Nov 2024`,
              }
            : {
                status: "unavailable",
                detail:
                  "The CPCB endpoint could not be reached.",
              },

        satellite:
          satellite.status === "fulfilled"
            ? {
                status: "connected",
                detail: `${
                  satellite.value.points?.length ??
                  satellite.value.count ??
                  0
                } grid records returned · NO2 · 12–18 Nov 2024 composite`,
              }
            : {
                status: "unavailable",
                detail:
                  "The Sentinel-5P endpoint could not be reached.",
              },

        viirs:
          viirs.status === "fulfilled"
            ? {
                status: "connected",
                detail: `${
                  viirs.value.returned_count ??
                  viirs.value.detections?.length ??
                  0
                } regional detections returned · 17 Nov 2024`,
              }
            : {
                status: "unavailable",
                detail:
                  "The VIIRS endpoint could not be reached.",
              },
      });
    }

    void checkSources();

    return () => controller.abort();
  }, []);

  function saveSettings() {
    updateSettings(draft);
    toast.success(
      "Preferences saved for this session only"
    );
  }

  const connectedCount = Object.values(sources).filter(
    (source) => source.status === "connected"
  ).length;

  const preferenceOptions: {
    key: PreferenceKey;
    label: string;
    desc: string;
  }[] = [
    {
      key: "notifyCritical",
      label: "Critical alerts",
      desc: "Preference for future critical-event notifications",
    },
    {
      key: "notifyHigh",
      label: "High severity alerts",
      desc: "Preference for future high-severity notifications",
    },
    {
      key: "dailyDigest",
      label: "Daily digest",
      desc: "Preference for a future daily summary",
    },
  ];

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        eyebrow="Workspace administration"
        title="Settings"
        subtitle="Manage workspace preferences and inspect the live status of environmental data sources and pending integrations."
        actions={
          <button
            onClick={saveSettings}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_rgba(0,229,204,0.09)] transition-all hover:brightness-110"
          >
            <Check className="h-4 w-4" />
            Save changes
          </button>
        }
      />

      {/* Workspace introduction */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#080B0A] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-teal-400/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-48 w-48 rounded-full bg-cyan-500/[0.05] blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Settings2 className="h-3.5 w-3.5" />
              Workspace control centre
            </div>

            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Configure your environmental intelligence workspace.
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
              Manage profile details, monitoring preferences and
              notification settings. Check which environmental
              data services are currently responding.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              Data source connectivity
            </div>

            <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Database className="h-4 w-4 text-primary" />
              {connectedCount}/3 connected
            </div>

            <div className="mt-1 text-[10px] text-zinc-500">
              Live API endpoint checks
            </div>
          </div>
        </div>
      </section>

      <StatusNotice
        tone="warning"
        title="Session-only preferences"
        className="mb-1"
      >
        These settings are stored in application memory for
        the active session. They are not saved to a database
        or restored automatically after a page reload.
      </StatusNotice>

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
        {/* Workspace profile */}
        <Panel
          title="Workspace profile"
          description="Identity and regional preferences for this analyst workspace"
          simulated={false}
          className="min-w-0 border-white/[0.08] bg-[#080808]"
          action={<Building2 className="h-4 w-4 text-primary" />}
        >
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary">
              <UserRound className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-200">
                {draft.org || "Unnamed workspace"}
              </div>

              <div className="mt-1 flex items-center gap-1.5 truncate text-xs text-zinc-500">
                <Mail className="h-3 w-3 shrink-0" />
                {draft.email || "No contact email"}
              </div>
            </div>
          </div>

          <label
            htmlFor="organisation"
            className="block text-xs font-medium text-zinc-400"
          >
            Organisation name
          </label>

          <input
            id="organisation"
            className={input}
            value={draft.org}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                org: event.target.value,
              }))
            }
          />

          <label
            htmlFor="contact-email"
            className="mt-4 block text-xs font-medium text-zinc-400"
          >
            Contact email
          </label>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

            <input
              id="contact-email"
              type="email"
              className={`${input} pl-10`}
              value={draft.email}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />
          </div>

          <label
            htmlFor="region"
            className="mt-4 block text-xs font-medium text-zinc-400"
          >
            Default region preference
          </label>

          <div className="relative">
            <MapPinned className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

            <select
              id="region"
              className={`${input} pl-10`}
              value={draft.region}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  region: event.target.value,
                }))
              }
            >
              {[
                "All India",
                "North",
                "East",
                "West",
                "South",
                "Central",
              ].map((region) => (
                <option key={region}>{region}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <p className="text-xs leading-relaxed text-zinc-500">
              These profile preferences do not currently change
              geographic filters in individual dashboard modules.
            </p>
          </div>
        </Panel>

        {/* Measurement preferences */}
        <Panel
          title="Measurement preferences"
          description="Threshold and display preferences for future workspace capabilities"
          simulated={false}
          className="min-w-0 border-white/[0.08] bg-[#080808]"
          action={<Gauge className="h-4 w-4 text-primary" />}
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary">
              <Gauge className="h-5 w-5" />
            </div>

            <div>
              <div className="text-sm font-semibold text-zinc-200">
                Monitoring thresholds
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                Set your preferred threshold and measurement units
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="aqi-threshold"
                className="text-xs font-medium text-zinc-400"
              >
                AQI threshold preference
              </label>

              <span className="rounded-lg border border-primary/20 bg-primary/[0.07] px-3 py-1.5 font-mono text-sm font-semibold text-primary">
                {draft.aqiThreshold}
              </span>
            </div>

            <input
              id="aqi-threshold"
              type="range"
              min={100}
              max={500}
              step={10}
              value={draft.aqiThreshold}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  aqiThreshold: Number(event.target.value),
                }))
              }
              className="mt-5 w-full cursor-pointer accent-primary"
            />

            <div className="mt-2 flex justify-between text-[10px] text-zinc-500">
              <span>100</span>
              <span>300</span>
              <span>500</span>
            </div>
          </div>

          <label
            htmlFor="units"
            className="mt-5 block text-xs font-medium text-zinc-400"
          >
            Unit preference
          </label>

          <select
            id="units"
            className={input}
            value={draft.units}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                units: event.target.value as "metric" | "imperial",
              }))
            }
          >
            <option value="metric">
              Metric (µg/m³, mg/L)
            </option>
            <option value="imperial">Imperial</option>
          </select>

          <StatusNotice tone="warning" className="mt-5">
            Threshold and unit selections are preferences only.
            No automated AQI alert engine is connected, and
            changing units does not yet convert module measurements.
          </StatusNotice>
        </Panel>

        {/* Notification preferences */}
        <Panel
          title="Notification preferences"
          description="Future delivery choices, not active notification services"
          simulated={false}
          className="min-w-0 border-white/[0.08] bg-[#080808]"
          action={<BellRing className="h-4 w-4 text-primary" />}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary">
              <Bell className="h-5 w-5" />
            </div>

            <div>
              <div className="text-sm font-semibold text-zinc-200">
                Alert preferences
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                Configure your preferred notification categories
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/[0.07]">
            {preferenceOptions.map((option) => (
              <PreferenceRow
                key={option.key}
                label={option.label}
                desc={option.desc}
                checked={draft[option.key]}
                onCheckedChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    [option.key]: value,
                  }))
                }
              />
            ))}
          </div>

          <StatusNotice
            tone="warning"
            className="mt-4"
            title="Delivery not configured"
          >
            These switches currently store preference values only.
            Email delivery, push notifications and automated
            environmental alerts are not operational.
          </StatusNotice>
        </Panel>

        {/* Integration overview */}
        <Panel
          title="Integration overview"
          description="What is connected, unavailable or still pending"
          simulated={false}
          className="min-w-0 border-white/[0.08] bg-[#080808]"
          action={<Database className="h-4 w-4 text-primary" />}
        >
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.045] p-3 text-center">
              <div className="font-mono text-2xl font-semibold text-emerald-400">
                {connectedCount}
              </div>
              <div className="mt-1 text-[10px] text-zinc-500">
                Connected
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-center">
              <div className="font-mono text-2xl font-semibold text-zinc-300">
                2
              </div>
              <div className="mt-1 text-[10px] text-zinc-500">
                Not integrated
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.045] p-3 text-center">
              <div className="font-mono text-2xl font-semibold text-amber-300">
                1
              </div>
              <div className="mt-1 text-[10px] text-zinc-500">
                Pending model
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-zinc-500">
            Connection checks run when this page loads. A successful
            response confirms endpoint availability, not the
            accuracy or completeness of its underlying data.
          </p>

          <div className="mt-4 rounded-xl border border-dashed border-white/[0.10] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
              <ShieldAlert className="h-4 w-4 text-zinc-500" />
              Integration security
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
              No API credentials are displayed or stored in this
              settings interface.
            </p>
          </div>
        </Panel>
      </div>

      {/* Environmental data sources */}
      <Panel
        title="Environmental data sources"
        description="Live endpoint checks and explicit integration states"
        simulated={false}
        className="border-white/[0.08] bg-[#080808]"
        action={<Database className="h-4 w-4 text-primary" />}
      >
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
          <div>
            <div className="text-xs font-semibold text-zinc-300">
              Available integrated sources
            </div>
            <div className="mt-1 text-[10px] text-zinc-500">
              Based on current API endpoint responses
            </div>
          </div>

          <div className="font-mono text-lg font-semibold text-primary">
            {connectedCount}/3
          </div>
        </div>

        <ul className="grid gap-2 lg:grid-cols-2">
          <SourceRow
            icon={<Activity className="h-4 w-4" />}
            name="CPCB CAAQMS"
            source={sources.cpcb}
            note="Ground-station reported observations"
          />

          <SourceRow
            icon={<Satellite className="h-4 w-4" />}
            name="Sentinel-5P TROPOMI"
            source={sources.satellite}
            note="Atmospheric column grid observations"
          />

          <SourceRow
            icon={<Database className="h-4 w-4" />}
            name="VIIRS Fire Observations"
            source={sources.viirs}
            note="NASA FIRMS satellite detection records"
          />

          <SourceRow
            icon={<CloudOff className="h-4 w-4" />}
            name="River water quality sensors"
            source={{
              status: "not-integrated",
              detail:
                "No connected data endpoint currently available.",
            }}
          />

          <SourceRow
            icon={<CloudOff className="h-4 w-4" />}
            name="IMD meteorological feed"
            source={{
              status: "not-integrated",
              detail:
                "No connected data endpoint currently available.",
            }}
          />

          <SourceRow
            icon={<ShieldAlert className="h-4 w-4" />}
            name="Predictive ML model"
            source={{
              status: "pending",
              detail:
                "Awaiting model integration and validation.",
            }}
            note="No predictions are currently issued"
          />
        </ul>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/[0.08] text-amber-300">
            <Info className="h-4 w-4" />
          </div>

          <p className="text-xs leading-relaxed text-zinc-500">
            Connection status is checked against the configured
            API endpoints when this page loads. A successful
            response confirms endpoint availability, not the
            accuracy or completeness of its underlying data.
          </p>
        </div>
      </Panel>

      {/* Save reminder */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
            <SlidersHorizontal className="h-4 w-4" />
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-200">
              Workspace preferences
            </div>
            <div className="mt-0.5 text-[10px] text-zinc-500">
              Save your changes for the current application session.
            </div>
          </div>
        </div>

        <button
          onClick={saveSettings}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/[0.07] px-3 py-2 text-xs font-semibold text-primary transition-all hover:border-primary/50 hover:bg-primary/[0.13]"
        >
          <Check className="h-3.5 w-3.5" />
          Save preferences
        </button>
      </div>
    </div>
  );
}
