import { lazy, Suspense } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { MapPinned } from "lucide-react";
import { PageHeader } from "@/components/strata/ui";

const RealDataMap = lazy(() => import("@/components/strata/RealDataMap"));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Environmental Intelligence Map — STRATA" },
      { name: "description", content: "Explore CPCB stations, Sentinel-5P grid observations and VIIRS detections in an interactive historical intelligence map." },
      { property: "og:title", content: "Environmental Intelligence Map — STRATA" },
      { property: "og:description", content: "A multi-source geospatial workspace for historical environmental observations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapPage,
});

function MapLoading() {
  return <div className="panel-frame flex min-h-[620px] items-center justify-center rounded-lg text-sm text-muted-foreground"><div className="flex items-center gap-2"><MapPinned className="h-5 w-5 animate-pulse text-primary" />Loading geospatial workspace…</div></div>;
}

function MapPage() {
  return <>
    <PageHeader eyebrow="Multi-source geospatial intelligence" title="Environmental Intelligence Map" subtitle="Investigate historical ground measurements, atmospheric grid observations and satellite fire detections in their geographic context." />
    <ClientOnly fallback={<MapLoading />}><Suspense fallback={<MapLoading />}><RealDataMap /></Suspense></ClientOnly>
  </>;
}
