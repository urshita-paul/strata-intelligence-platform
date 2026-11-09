
import { lazy, Suspense } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/strata/ui";

const RealDataMap = lazy(() => import("@/components/strata/RealDataMap"));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Environmental Intelligence Map — STRATA" },
      {
        name: "description",
        content: "Historical environmental intelligence map with CPCB, Sentinel-5P and VIIRS datasets.",
      },
    ],
  }),
  component: MapPage,
});

function MapLoading() {
  return (
    <div className="flex h-full min-h-[390px] items-center justify-center rounded-md bg-surface text-sm text-muted-foreground">
      Loading environmental intelligence map…
    </div>
  );
}

function MapPage() {
  return (
    <>
      <PageHeader
        title="Environmental Intelligence Map"
        subtitle="Historical pollution and fire observations across the study region"
      />

      <Panel title="Multi-source geospatial intelligence" simulated={false}>
        <ClientOnly fallback={<MapLoading />}>
          <Suspense fallback={<MapLoading />}>
            <RealDataMap />
          </Suspense>
        </ClientOnly>
      </Panel>
    </>
  );
}
