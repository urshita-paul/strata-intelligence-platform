// ALL DATA IN THIS FILE IS SIMULATED FOR DEMONSTRATION PURPOSES.
export type Severity = "critical" | "high" | "moderate" | "low";
export type EventType = "Air" | "Water" | "Soil" | "Industrial";
export type EventStatus = "Active" | "Monitoring" | "Contained" | "Resolved";

export interface PollutionEvent {
  id: string;
  title: string;
  type: EventType;
  pollutant: string;
  severity: Severity;
  status: EventStatus;
  location: string;
  state: string;
  lat: number;
  lon: number;
  detected: string;
  reading: number;
  unit: string;
  threshold: number;
  confidence: number;
  source: string;
  affectedPop: number;
  summary: string;
  trend: number[];
}

export const EVENTS: PollutionEvent[] = [
  { id: "EVT-2611-014", title: "PM2.5 surge – Anand Vihar corridor", type: "Air", pollutant: "PM2.5", severity: "critical", status: "Active", location: "Delhi NCR", state: "Delhi", lat: 28.65, lon: 77.31, detected: "2026-11-03T06:40:00Z", reading: 412, unit: "µg/m³", threshold: 60, confidence: 0.94, source: "Stubble burning plume + traffic inversion", affectedPop: 2100000, summary: "Sustained PM2.5 exceedance driven by regional biomass burning and low mixing height. Inversion expected to persist for 36h.", trend: [180, 210, 240, 290, 330, 360, 395, 412] },
  { id: "EVT-2611-013", title: "Effluent discharge – Hooghly at Howrah", type: "Water", pollutant: "COD", severity: "high", status: "Active", location: "Howrah", state: "West Bengal", lat: 22.59, lon: 88.31, detected: "2026-11-03T03:15:00Z", reading: 318, unit: "mg/L", threshold: 250, confidence: 0.87, source: "Suspected tannery outfall, Banthala cluster", affectedPop: 640000, summary: "Chemical oxygen demand spike downstream of industrial outfall. Dissolved oxygen falling at two stations.", trend: [140, 150, 170, 210, 260, 290, 305, 318] },
  { id: "EVT-2611-012", title: "SO₂ release – Chembur refinery belt", type: "Industrial", pollutant: "SO₂", severity: "high", status: "Monitoring", location: "Mumbai", state: "Maharashtra", lat: 19.05, lon: 72.9, detected: "2026-11-02T22:05:00Z", reading: 142, unit: "µg/m³", threshold: 80, confidence: 0.81, source: "Flare stack anomaly, Unit 4", affectedPop: 380000, summary: "Short-duration SO₂ exceedance correlated with flaring event. Levels stabilising.", trend: [60, 75, 120, 160, 150, 145, 140, 142] },
  { id: "EVT-2611-011", title: "Ammonia froth – Yamuna at Okhla", type: "Water", pollutant: "NH₃-N", severity: "moderate", status: "Monitoring", location: "Delhi NCR", state: "Delhi", lat: 28.54, lon: 77.29, detected: "2026-11-02T14:30:00Z", reading: 2.6, unit: "mg/L", threshold: 1.5, confidence: 0.78, source: "Untreated sewage & detergent surfactants", affectedPop: 900000, summary: "Ammonia and surfactant loading producing visible froth near barrage.", trend: [1.2, 1.4, 1.8, 2.1, 2.4, 2.5, 2.6, 2.6] },
  { id: "EVT-2611-010", title: "NO₂ hotspot – Peenya industrial area", type: "Air", pollutant: "NO₂", severity: "moderate", status: "Active", location: "Bengaluru", state: "Karnataka", lat: 13.03, lon: 77.52, detected: "2026-11-02T09:10:00Z", reading: 118, unit: "µg/m³", threshold: 80, confidence: 0.83, source: "Diesel generator cluster + freight traffic", affectedPop: 520000, summary: "Localised NO₂ elevation during peak operating hours.", trend: [70, 80, 95, 110, 120, 115, 118, 118] },
  { id: "EVT-2611-009", title: "Chromium in groundwater – Kanpur", type: "Soil", pollutant: "Cr(VI)", severity: "critical", status: "Active", location: "Kanpur", state: "Uttar Pradesh", lat: 26.45, lon: 80.33, detected: "2026-11-01T11:00:00Z", reading: 0.21, unit: "mg/L", threshold: 0.05, confidence: 0.91, source: "Legacy chromite dump leachate", affectedPop: 150000, summary: "Hexavalent chromium detected at 4× permissible limit in hand pumps near Rania.", trend: [0.08, 0.1, 0.12, 0.15, 0.17, 0.19, 0.2, 0.21] },
  { id: "EVT-2611-008", title: "Oil sheen – Ennore creek", type: "Water", pollutant: "Hydrocarbons", severity: "high", status: "Contained", location: "Chennai", state: "Tamil Nadu", lat: 13.23, lon: 80.32, detected: "2026-10-31T17:45:00Z", reading: 9.4, unit: "mg/L", threshold: 5, confidence: 0.88, source: "Pipeline flange leak", affectedPop: 85000, summary: "Booms deployed; sheen contained within 1.2 km reach.", trend: [3, 7, 12, 11, 10, 9.8, 9.5, 9.4] },
  { id: "EVT-2611-007", title: "Ozone episode – Ahmedabad east", type: "Air", pollutant: "O₃", severity: "low", status: "Resolved", location: "Ahmedabad", state: "Gujarat", lat: 23.03, lon: 72.62, detected: "2026-10-30T10:20:00Z", reading: 104, unit: "µg/m³", threshold: 100, confidence: 0.72, source: "Photochemical formation", affectedPop: 300000, summary: "Marginal 8-hr O₃ exceedance, resolved after cloud cover.", trend: [90, 98, 104, 102, 96, 88, 80, 76] },
  { id: "EVT-2611-006", title: "Fly ash runoff – Singrauli", type: "Soil", pollutant: "TSS", severity: "moderate", status: "Monitoring", location: "Singrauli", state: "Madhya Pradesh", lat: 24.2, lon: 82.67, detected: "2026-10-29T08:00:00Z", reading: 640, unit: "mg/L", threshold: 100, confidence: 0.8, source: "Ash pond breach (minor)", affectedPop: 42000, summary: "Suspended solids elevated in Rihand tributary following ash dyke seepage.", trend: [300, 450, 620, 700, 680, 660, 650, 640] },
  { id: "EVT-2611-005", title: "PM10 dust – Jharia coalfield", type: "Air", pollutant: "PM10", severity: "high", status: "Active", location: "Dhanbad", state: "Jharkhand", lat: 23.75, lon: 86.42, detected: "2026-11-03T01:30:00Z", reading: 286, unit: "µg/m³", threshold: 100, confidence: 0.86, source: "Open-cast mining & coal fires", affectedPop: 410000, summary: "Fugitive dust elevated under dry northwesterly winds.", trend: [150, 170, 200, 230, 255, 270, 280, 286] },
];

export const DEMO_LAST_UPDATED = "2026-11-03T11:00:00Z";

export const RISK_SCORES: Record<string, number> = {
  "EVT-2611-014": 96,
  "EVT-2611-013": 84,
  "EVT-2611-012": 78,
  "EVT-2611-011": 61,
  "EVT-2611-010": 58,
  "EVT-2611-009": 93,
  "EVT-2611-008": 72,
  "EVT-2611-007": 35,
  "EVT-2611-006": 55,
  "EVT-2611-005": 76,
};
export const getRiskScore = (event: PollutionEvent) => RISK_SCORES[event.id] ?? 0;

export const GEOGRAPHIC_REGIONS = ["All India", "North", "South", "East", "West", "Central"] as const;
export type GeographicRegion = (typeof GEOGRAPHIC_REGIONS)[number];
const STATE_REGION: Record<string, Exclude<GeographicRegion, "All India">> = {
  Delhi: "North",
  "Uttar Pradesh": "North",
  Karnataka: "South",
  "Tamil Nadu": "South",
  "West Bengal": "East",
  Jharkhand: "East",
  Maharashtra: "West",
  Gujarat: "West",
  "Madhya Pradesh": "Central",
};
export const eventInRegion = (event: PollutionEvent, region: GeographicRegion) =>
  region === "All India" || STATE_REGION[event.state] === region;

export type TrendPeriod = "24h" | "7d" | "30d";
export interface PollutionTrendPoint {
  label: string;
  pm25: number;
  pm10: number;
  no2: number;
}

// Deterministic demonstration series for Delhi NCR; periods always render the same values.
export function getPollutionTrends(period: TrendPeriod): PollutionTrendPoint[] {
  const count = period === "24h" ? 24 : period === "7d" ? 7 : 30;
  const end = Date.UTC(2026, 10, 3, 11);
  const step = period === "24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return Array.from({ length: count }, (_, i) => {
    const time = end - (count - 1 - i) * step;
    const date = new Date(time);
    const daily = period !== "24h";
    const wave = Math.sin((i - (daily ? 1 : 4)) / (daily ? 1.7 : 4));
    const secondary = Math.cos(i / (daily ? 2.4 : 5));
    const slope = period === "24h" ? i * 7.2 : period === "7d" ? i * 9 : i * 2.2;
    const pm25 = Math.round((daily ? 142 : 192) + 48 * wave + 18 * secondary + slope);
    const pm10 = Math.round(pm25 * 1.42 + 24 + 12 * Math.cos(i / 3));
    const no2 = Math.round((daily ? 62 : 54) + 18 * Math.sin(i / (daily ? 2 : 4.5)) + (daily ? i * 1.4 : i * 1.1));
    return {
      label: period === "24h"
        ? `${String(date.getUTCHours()).padStart(2, "0")}:00`
        : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }),
      pm25,
      pm10,
      no2,
    };
  });
}

export interface Warning {
  id: string;
  title: string;
  region: string;
  severity: Severity;
  probability: number;
  window: string;
  issued: string;
  eventId?: string;
  recommended: string;
}

export const WARNINGS: Warning[] = [
  { id: "EW-0931", title: "Severe AQI forecast (>400) for 48h", region: "Delhi NCR", severity: "critical", probability: 0.89, window: "Nov 3 18:00 – Nov 5 18:00", issued: "2026-11-03T08:00:00Z", eventId: "EVT-2611-014", recommended: "Activate GRAP Stage IV; advise school closures; restrict construction." },
  { id: "EW-0930", title: "Dissolved oxygen collapse risk downstream", region: "Hooghly – Howrah to Uluberia", severity: "high", probability: 0.74, window: "Next 24h", issued: "2026-11-03T05:30:00Z", eventId: "EVT-2611-013", recommended: "Inspect Banthala outfalls; issue fishing advisory." },
  { id: "EW-0929", title: "Dust episode under forecast wind shift", region: "Dhanbad – Jharia", severity: "high", probability: 0.68, window: "Nov 4 06:00 – 20:00", issued: "2026-11-03T04:10:00Z", eventId: "EVT-2611-005", recommended: "Mandate water sprinkling on haul roads." },
  { id: "EW-0928", title: "Ozone formation potential elevated", region: "Ahmedabad – Vatva", severity: "moderate", probability: 0.52, window: "Nov 4 11:00 – 16:00", issued: "2026-11-02T20:00:00Z", recommended: "Notify industries to defer VOC-intensive operations." },
  { id: "EW-0927", title: "Groundwater advisory expansion", region: "Kanpur Dehat – Rania", severity: "moderate", probability: 0.61, window: "Ongoing", issued: "2026-11-02T12:00:00Z", eventId: "EVT-2611-009", recommended: "Tag affected hand pumps; supply tanker water." },
];

export interface Report {
  id: string;
  title: string;
  kind: "Incident Brief" | "Weekly Summary" | "Regulatory Filing" | "Risk Assessment";
  region: string;
  created: string;
  eventIds: string[];
  status: "Draft" | "Final";
  body: string[];
}

export const REPORTS: Report[] = [
  { id: "RPT-1104", title: "Delhi NCR air quality incident brief", kind: "Incident Brief", region: "Delhi NCR", created: "2026-11-03T09:00:00Z", eventIds: ["EVT-2611-014", "EVT-2611-011"], status: "Draft", body: ["PM2.5 concentrations at Anand Vihar reached 412 µg/m³, 6.9× the national standard, at 06:40 UTC.", "Back-trajectory analysis attributes approximately 38% of the load to biomass burning in Punjab and Haryana, with remaining contribution from vehicular and secondary aerosols.", "Meteorological outlook indicates boundary-layer height below 400 m for the next 36 hours, limiting dispersion.", "Recommended actions: escalate to GRAP Stage IV, enforce construction halt, deploy anti-smog guns at identified hotspots."] },
  { id: "RPT-1103", title: "Weekly pollution summary – Eastern region", kind: "Weekly Summary", region: "East", created: "2026-11-02T06:00:00Z", eventIds: ["EVT-2611-013", "EVT-2611-005"], status: "Final", body: ["Two high-severity events were recorded in the eastern region during the reporting week.", "Water quality along the Hooghly deteriorated following elevated COD readings near Howrah.", "Fugitive dust in the Jharia coalfield remained above PM10 limits on 5 of 7 days."] },
  { id: "RPT-1102", title: "Chromium contamination risk assessment", kind: "Risk Assessment", region: "Kanpur", created: "2026-11-01T15:20:00Z", eventIds: ["EVT-2611-009"], status: "Final", body: ["Hexavalent chromium levels of 0.21 mg/L were detected, 4.2× the permissible limit.", "An estimated 150,000 residents rely on affected aquifers for drinking water.", "Remediation of legacy dumps is recommended as a priority intervention."] },
  { id: "RPT-1101", title: "Ennore oil sheen – regulatory filing", kind: "Regulatory Filing", region: "Chennai", created: "2026-10-31T21:00:00Z", eventIds: ["EVT-2611-008"], status: "Final", body: ["Pipeline flange leak identified as source; operator notified under Water Act Section 33A.", "Containment achieved within 6 hours with 1.2 km affected reach."] },
];

export const MONTHLY = [
  { month: "Dec", air: 42, water: 18, soil: 6, industrial: 9 },
  { month: "Jan", air: 51, water: 15, soil: 5, industrial: 11 },
  { month: "Feb", air: 38, water: 17, soil: 7, industrial: 8 },
  { month: "Mar", air: 29, water: 21, soil: 6, industrial: 10 },
  { month: "Apr", air: 24, water: 24, soil: 8, industrial: 12 },
  { month: "May", air: 27, water: 26, soil: 9, industrial: 13 },
  { month: "Jun", air: 19, water: 31, soil: 7, industrial: 9 },
  { month: "Jul", air: 14, water: 35, soil: 10, industrial: 8 },
  { month: "Aug", air: 16, water: 33, soil: 9, industrial: 10 },
  { month: "Sep", air: 22, water: 27, soil: 8, industrial: 11 },
  { month: "Oct", air: 41, water: 22, soil: 7, industrial: 12 },
  { month: "Nov", air: 58, water: 19, soil: 8, industrial: 10 },
];

export const AQI_24H = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, "0")}:00`,
  delhi: Math.round(280 + 120 * Math.sin((i - 4) / 4) + i * 4),
  kolkata: Math.round(150 + 50 * Math.sin((i - 6) / 5)),
  mumbai: Math.round(110 + 30 * Math.sin(i / 3)),
}));

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "moderate", "low"];
export const getEvent = (id: string) => EVENTS.find((e) => e.id === id);
export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
