
import { lazy, Suspense, type ReactNode } from "react";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Compass,
  Database,
  Flame,
  Layers3,
  MapPinned,
  Satellite,
} from "lucide-react";

const RealDataMap = lazy(() => import("@/components/strata/RealDataMap"));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Environmental Intelligence Map — STRATA" },
      {
        name: "description",
        content:
          "Historical environmental intelligence map with CPCB, Sentinel-5P and VIIRS datasets.",
      },
    ],
  }),
  component: MapPage,
});

function MapLoading() {
  return (
    <div className="flex min-h-[550px] flex-col items-center justify-center gap-5 rounded-xl border border-white/[0.06] bg-[#050505] text-zinc-500">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.05]">
        <MapPinned className="h-7 w-7 text-primary" />
        <span className="absolute inset-0 animate-ping rounded-2xl border border-primary/20" />
      </div>

      <div className="text-center">
        <div className="text-sm font-medium text-zinc-200">
          Initialising geospatial workspace
        </div>
        <div className="mt-1.5 text-xs text-zinc-600">
          Preparing environmental data layers...
        </div>
      </div>
    </div>
  );
}

function SourceIndicator({
  icon,
  name,
  description,
  category,
  accent,
}: {
  icon: ReactNode;
  name: string;
  description: string;
  category: string;
  accent: "teal" | "cyan" | "orange";
}) {
  const styles = {
    teal: {
      icon: "bg-primary/[0.08] text-primary",
      hover: "hover:border-primary/30",
      label: "text-primary/70",
    },
    cyan: {
      icon: "bg-cyan-400/[0.08] text-cyan-300",
      hover: "hover:border-cyan-400/30",
      label: "text-cyan-300/70",
    },
    orange: {
      icon: "bg-orange-400/[0.08] text-orange-300",
      hover: "hover:border-orange-400/30",
      label: "text-orange-300/70",
    },
  };

  const style = styles[accent];

  return (
    <div
      className={`group rounded-2xl border border-white/[0.075] bg-[#070707] p-4 transition-all duration-300 ${style.hover} hover:bg-[#0A0A0A]`}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.icon} transition-transform duration-300 group-hover:scale-105`}
        >
          {icon}
        </div>

        <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
          {category}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-zinc-200">
          {name}
        </h3>

        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-1.5 border-t border-white/[0.06] pt-3">
        <span className={`h-1.5 w-1.5 rounded-full ${style.label.replace("text-", "bg-").replace("/70", "")}`} />
        <span className="text-[9px] text-zinc-600">
          Integrated dataset
        </span>
      </div>
    </div>
  );
}

function MapPage() {
  return (
    <div className="space-y-5 pb-10">
      {/* GEOSPATIAL HERO */}
      <section className="relative isolate overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#050505] p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-36 h-[420px] w-[420px] rounded-full bg-teal-400/[0.075] blur-[110px]" />

        <div className="pointer-events-none absolute -bottom-48 left-[30%] h-[380px] w-[380px] rounded-full bg-cyan-500/[0.045] blur-[110px]" />

        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.07] text-primary">
                <Compass className="h-4 w-4" />
              </div>

              <div>
                <div className="text-[10px] font-bold tracking-[0.2em] text-white">
                  STRATA
                </div>
                <div className="text-[8px] uppercase tracking-[0.15em] text-zinc-600">
                  Geospatial intelligence
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                Historical map workspace
              </span>
            </div>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-4 text-[10px] font-medium uppercase tracking-[0.24em] text-primary/80">
                Explore. Locate. Understand.
              </div>

              <h1 className="text-3xl font-semibold leading-[1.15] tracking-[-0.045em] text-white sm:text-4xl lg:text-[52px]">
                See the bigger
                <br />
                <span className="text-zinc-500">environmental</span>{" "}
                <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-400 bg-clip-text text-transparent">
                  picture.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400">
                Explore historical ground observations, atmospheric
                satellite measurements and thermal detections
                through one unified geospatial workspace.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#map-workspace"
                  className="group inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
                >
                  Explore map workspace
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>

                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.025] px-4 py-3 text-xs font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Browse observations
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.09] bg-[#0A0A0A]/90 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Geospatial workspace
                </div>

                <Layers3 className="h-4 w-4 text-primary" />
              </div>

              <div className="mt-5">
                <div className="text-[10px] text-zinc-600">
                  Visualization mode
                </div>

                <div className="mt-1.5 text-xl font-semibold tracking-tight text-white">
                  Multi-source
                </div>

                <div className="mt-1 text-xs text-zinc-500">
                  Historical environmental observations
                </div>
              </div>

              <div className="mt-5 border-t border-white/[0.07] pt-4">
                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                  <span>Integrated datasets</span>
                  <span className="font-mono text-zinc-300">
                    03
                  </span>
                </div>

                <div className="mt-3 flex gap-1.5">
                  <span className="h-1 flex-1 rounded-full bg-primary" />
                  <span className="h-1 flex-1 rounded-full bg-cyan-400" />
                  <span className="h-1 flex-1 rounded-full bg-orange-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OBSERVATION NETWORKS */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-primary/80">
              Observation networks
            </div>

            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-white">
              Integrated data sources
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Different observation systems, brought into one workspace.
            </p>
          </div>

          <span className="rounded-lg border border-white/[0.07] bg-[#070707] px-3 py-2 text-[9px] uppercase tracking-[0.12em] text-zinc-500">
            03 datasets
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SourceIndicator
            icon={<Activity className="h-4 w-4" />}
            name="CPCB CAAQMS"
            description="Ground-level monitoring station observations."
            category="Ground network"
            accent="teal"
          />

          <SourceIndicator
            icon={<Satellite className="h-4 w-4" />}
            name="Sentinel-5P TROPOMI"
            description="Atmospheric satellite column measurements."
            category="Satellite"
            accent="cyan"
          />

          <SourceIndicator
            icon={<Flame className="h-4 w-4" />}
            name="NASA FIRMS VIIRS"
            description="Satellite thermal fire-detection records."
            category="Satellite"
            accent="orange"
          />
        </div>
      </section>

      {/* MAIN MAP WORKSPACE */}
      <section
        id="map-workspace"
        className="scroll-mt-6 overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#070707]"
      >
        <div className="relative overflow-hidden border-b border-white/[0.07] px-4 py-4 sm:px-6">
          <div className="pointer-events-none absolute -right-12 -top-20 h-40 w-40 rounded-full bg-primary/[0.06] blur-3xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary">
                <MapPinned className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-white sm:text-base">
                  Environmental intelligence map
                </h2>

                <p className="mt-1 text-[10px] text-zinc-500">
                  Interactive multi-dataset geospatial visualization
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-[#050505] px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />

              <span className="text-[9px] font-medium uppercase tracking-[0.13em] text-zinc-400">
                Interactive workspace
              </span>
            </div>
          </div>
        </div>

        <div className="p-2.5 sm:p-4">
          <div className="relative min-h-[550px] overflow-hidden rounded-xl border border-white/[0.07] bg-black">
            <ClientOnly fallback={<MapLoading />}>
              <Suspense fallback={<MapLoading />}>
                <RealDataMap />
              </Suspense>
            </ClientOnly>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
            <Layers3 className="h-3.5 w-3.5 text-primary" />
            Explore available map layers and observations.
          </div>

          <Link
            to="/events"
            className="group inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary transition-colors hover:text-cyan-300"
          >
            Inspect individual observations
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>

      {/* DATA INTERPRETATION */}
      <div className="rounded-xl border border-white/[0.07] bg-[#070707] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.06] text-primary">
            <Database className="h-4 w-4" />
          </div>

          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Understanding the map
            </div>

            <p className="mt-1.5 text-[11px] leading-6 text-zinc-500">
              Map observations represent historical datasets. CPCB
              provides ground-level station measurements, Sentinel-5P
              provides atmospheric column measurements, and VIIRS
              provides satellite fire detections. These sources
              represent different measurement types and should not
              be interpreted as directly equivalent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
