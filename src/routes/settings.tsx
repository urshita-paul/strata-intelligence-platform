
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Panel } from "@/components/strata/ui";
import { useAppState } from "@/components/strata/AppState";

const API =
  import.meta.env.VITE_API_BASE_URL ||
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

const initialSources: SourceStatuses = {
  cpcb: {
    status: "checking",
    detail: "Checking CPCB API...",
  },
  satellite: {
    status: "checking",
    detail: "Checking Sentinel-5P API...",
  },
  viirs: {
    status: "checking",
    detail: "Checking VIIRS API...",
  },
};

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — STRATA" },
      {
        name: "description",
        content:
          "Manage workspace preferences and view environmental data-source connectivity.",
      },
      {
        property: "og:title",
        content: "Settings — STRATA",
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
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function SourceBadge({ status }: { status: SourceStatus }) {
  const styles: Record<SourceStatus, string> = {
    checking:
      "border-muted text-muted-foreground",
    connected:
      "border-emerald-500/40 text-emerald-600",
    unavailable:
      "border-red-500/40 text-red-500",
    "not-integrated":
      "border-muted text-muted-foreground",
    pending:
      "border-amber-500/40 text-amber-600",
  };

  const labels: Record<SourceStatus, string> = {
    checking: "Checking",
    connected: "Connected",
    unavailable: "Unavailable",
    "not-integrated": "Not integrated",
    pending: "Pending",
  };

  return (
    <span
      className={`shrink-0 rounded-sm border px-2 py-1 font-mono text-[10px] ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function SettingsPage() {
  const { settings, updateSettings } = useAppState();

  const [draft, setDraft] = useState(settings);

  const [sources, setSources] =
    useState<SourceStatuses>(initialSources);

  const input =
    "mt-1 h-9 w-full rounded-md border bg-surface px-2 text-sm outline-none focus:border-primary";

  // --------------------------------------------------
  // CHECK REAL DATA SOURCE CONNECTIVITY
  // --------------------------------------------------

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

      const cpcb = results[0];
      const satellite = results[1];
      const viirs = results[2];

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
                detail: "CPCB endpoint could not be reached.",
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
                detail: "Sentinel-5P endpoint could not be reached.",
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
                detail: "VIIRS endpoint could not be reached.",
              },
      });
    }

    checkSources();

    return () => controller.abort();
  }, []);

  // --------------------------------------------------
  // PREFERENCE ROW
  // --------------------------------------------------

  const Row = ({
    label,
    desc,
    k,
  }: {
    label: string;
    desc: string;
    k: "notifyCritical" | "notifyHigh" | "dailyDigest";
  }) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">
          {desc}
        </div>
      </div>

      <Switch
        checked={draft[k]}
        onCheckedChange={(value) =>
          setDraft((current) => ({
            ...current,
            [k]: value,
          }))
        }
      />
    </div>
  );

  // --------------------------------------------------
  // SAVE PREFERENCES
  // --------------------------------------------------

  function saveSettings() {
    updateSettings(draft);

    toast.success(
      "Preferences saved for this session only"
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Workspace preferences and data-source status"
        actions={
          <button
            onClick={saveSettings}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Save changes
          </button>
        }
      />

      <div className="mb-4 rounded-md border bg-surface p-3 text-xs leading-relaxed text-muted-foreground">
        These preferences are currently stored in application
        memory for the active session. They are not yet saved to
        a database or restored automatically after a page reload.
      </div>

      <div className="grid gap-4 xl:grid-cols-2">

        {/* WORKSPACE PROFILE */}

        <Panel
          title="Workspace profile"
          simulated={false}
        >
          <label className="text-xs text-muted-foreground">
            Organisation name
          </label>

          <input
            className={input}
            value={draft.org}
            onChange={(event) =>
              setDraft({
                ...draft,
                org: event.target.value,
              })
            }
          />

          <label className="mt-3 block text-xs text-muted-foreground">
            Contact email
          </label>

          <input
            type="email"
            className={input}
            value={draft.email}
            onChange={(event) =>
              setDraft({
                ...draft,
                email: event.target.value,
              })
            }
          />

          <label className="mt-3 block text-xs text-muted-foreground">
            Default region preference
          </label>

          <select
            className={input}
            value={draft.region}
            onChange={(event) =>
              setDraft({
                ...draft,
                region: event.target.value,
              })
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

          <p className="mt-3 text-xs text-muted-foreground">
            These are workspace profile preferences. They do not
            currently change the geographic filters in the
            individual dashboard modules.
          </p>
        </Panel>

        {/* ALERT THRESHOLDS */}

        <Panel
          title="Alert threshold preferences"
          simulated={false}
        >
          <label className="text-xs text-muted-foreground">
            AQI threshold preference:
            {" "}
            <span className="font-mono text-foreground">
              {draft.aqiThreshold}
            </span>
          </label>

          <input
            type="range"
            min={100}
            max={500}
            step={10}
            value={draft.aqiThreshold}
            onChange={(event) =>
              setDraft({
                ...draft,
                aqiThreshold: Number(event.target.value),
              })
            }
            className="mt-2 w-full accent-primary"
          />

          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>100</span>
            <span>300</span>
            <span>500</span>
          </div>

          <label className="mt-4 block text-xs text-muted-foreground">
            Unit preference
          </label>

          <select
            className={input}
            value={draft.units}
            onChange={(event) =>
              setDraft({
                ...draft,
                units: event.target.value as
                  | "metric"
                  | "imperial",
              })
            }
          >
            <option value="metric">
              Metric (µg/m³, mg/L)
            </option>
            <option value="imperial">
              Imperial
            </option>
          </select>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Threshold and unit selections are preferences only.
            An automated AQI alert engine is not currently
            connected, and changing the unit preference does not
            yet convert measurements displayed by the data modules.
          </p>
        </Panel>

        {/* NOTIFICATION PREFERENCES */}

        <Panel
          title="Notification preferences"
          simulated={false}
        >
          <div className="divide-y">

            <Row
              label="Critical alerts"
              desc="Preference for future critical-event notifications"
              k="notifyCritical"
            />

            <Row
              label="High severity alerts"
              desc="Preference for future high-severity notifications"
              k="notifyHigh"
            />

            <Row
              label="Daily digest"
              desc="Preference for a future daily summary"
              k="dailyDigest"
            />

          </div>

          <div className="mt-3 rounded-md border p-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              These switches currently store preference values
              only. Email delivery, push notifications and
              automated environmental alerts are not configured.
            </p>
          </div>
        </Panel>

        {/* DATA SOURCE STATUS */}

        <Panel
          title="Environmental data sources"
          simulated={false}
        >
          <ul className="divide-y">

            <li className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-medium">
                  CPCB CAAQMS
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {sources.cpcb.detail}
                </div>
              </div>

              <SourceBadge status={sources.cpcb.status} />
            </li>

            <li className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-medium">
                  Sentinel-5P TROPOMI
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {sources.satellite.detail}
                </div>
              </div>

              <SourceBadge status={sources.satellite.status} />
            </li>

            <li className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-medium">
                  VIIRS Fire Observations
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {sources.viirs.detail}
                </div>
              </div>

              <SourceBadge status={sources.viirs.status} />
            </li>

            <li className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-medium">
                  River water quality sensors
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  No connected data endpoint currently available.
                </div>
              </div>

              <SourceBadge status="not-integrated" />
            </li>

            <li className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-medium">
                  IMD meteorological feed
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  No connected data endpoint currently available.
                </div>
              </div>

              <SourceBadge status="not-integrated" />
            </li>

            <li className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-medium">
                  Predictive ML model
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Awaiting model integration and validation.
                </div>
              </div>

              <SourceBadge status="pending" />
            </li>

          </ul>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Connection status is checked against the configured
            API endpoints when this page loads. A successful
            response confirms endpoint availability, not the
            accuracy or completeness of its underlying data.
          </p>
        </Panel>

      </div>
    </>
  );
}
