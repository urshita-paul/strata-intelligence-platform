import type { PollutionEvent } from "@/lib/demo-data";
import { sevVar } from "./ui";

// Schematic equirectangular projection over the Indian subcontinent bounding box.
const B = { minLon: 68, maxLon: 97, minLat: 7, maxLat: 36 };
const W = 580, H = 600;
const px = (lon: number) => ((lon - B.minLon) / (B.maxLon - B.minLon)) * W;
const py = (lat: number) => ((B.maxLat - lat) / (B.maxLat - B.minLat)) * H;

// Simplified, approximate outline (schematic only).
const OUTLINE: [number, number][] = [
  [74.5, 35], [77.8, 35.5], [79.5, 32.5], [81, 30.2], [84, 28.5], [88, 27.8], [88.2, 26.5], [92, 26.9], [95.5, 28.2], [97, 27.5], [95, 25.8], [94.5, 24], [93, 22.5], [92.3, 21], [91.8, 22.8], [89, 21.7], [87, 21.4], [86.8, 20.5], [85, 19.4], [82.3, 16.6], [80.3, 15.5], [80.2, 13.3], [79.8, 10.3], [78.3, 8.9], [77.5, 8.1], [76.5, 9.3], [75.2, 12.5], [74.2, 14.8], [73.4, 16.8], [72.8, 19], [72.7, 21.2], [70.2, 20.9], [68.7, 22.6], [70.5, 23.7], [71, 24.8], [70, 27.5], [71.2, 28], [74.3, 31.2], [73.8, 33.5],
];
const outlinePath = OUTLINE.map(([lon, lat], i) => `${i ? "L" : "M"}${px(lon).toFixed(1)},${py(lat).toFixed(1)}`).join(" ") + " Z";

export function EventMap({ events, selectedId, onSelect, compact }: { events: PollutionEvent[]; selectedId?: string; onSelect?: (id: string) => void; compact?: boolean }) {
  return (
    <div className="map-grid relative h-full w-full overflow-hidden rounded-md">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {[10, 15, 20, 25, 30, 35].map((lat) => (
          <g key={lat}>
            <line x1={0} x2={W} y1={py(lat)} y2={py(lat)} stroke="var(--border)" strokeDasharray="2 4" />
            {!compact && <text x={4} y={py(lat) - 3} fontSize="9" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">{lat}°N</text>}
          </g>
        ))}
        {[70, 75, 80, 85, 90, 95].map((lon) => (
          <g key={lon}>
            <line y1={0} y2={H} x1={px(lon)} x2={px(lon)} stroke="var(--border)" strokeDasharray="2 4" />
            {!compact && <text x={px(lon) + 3} y={H - 4} fontSize="9" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">{lon}°E</text>}
          </g>
        ))}
        <path d={outlinePath} fill="color-mix(in oklab, var(--primary) 7%, transparent)" stroke="color-mix(in oklab, var(--primary) 55%, transparent)" strokeWidth={1.2} />
        {events.map((e) => {
          const x = px(e.lon), y = py(e.lat);
          const c = sevVar[e.severity];
          const sel = e.id === selectedId;
          return (
            <g key={e.id} className="cursor-pointer" onClick={() => onSelect?.(e.id)}>
              <title>{`${e.title} (${e.reading} ${e.unit})`}</title>
              {e.status === "Active" && <circle cx={x} cy={y} r={6} fill={c} className="pulse-ring" />}
              <circle cx={x} cy={y} r={sel ? 9 : 6} fill={c} stroke={sel ? "var(--foreground)" : "var(--background)"} strokeWidth={2} />
              {!compact && sel && (
                <text x={x + 12} y={y + 4} fontSize="11" fill="var(--foreground)" fontFamily="var(--font-mono)">{e.location}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-2 right-2 rounded-sm bg-background/80 px-2 py-1 font-mono text-[10px] text-muted-foreground">Schematic projection · simulated events</div>
    </div>
  );
}
