```


import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Database,
  FileCheck2,
  FileText,
  Flame,
  Printer,
  Satellite,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { Station } from "@/components/strata/LiveDashboardMap";
import {
  DatasetBadge,
  EmptyState,
  PageHeader,
  Panel,
  StatCard,
  StatusNotice,
} from "@/components/strata/ui";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

type ReportKind =
  | "Multi-source Summary"
  | "CPCB Station Summary"
  | "Sentinel-5P Anomaly Summary"
  | "VIIRS Detection Summary";

type SatellitePoint = {
  point_id: string;
  pollutant: string;
  anomaly_difference: number | null;
  anomaly_z_score: number | null;
  anomaly_direction: string | null;
  score_available: boolean;
  window_start: string;
  window_end_exclusive: string;
};

type Fire = {
  latitude: number;
  longitude: number;
  date: string;
  acq_time: string;
  satellite: string;
  confidence: string;
  frp: number;
  daynight: string;
  type: number;
};

type GeneratedReport = {
  id: string;
  title: string;
  kind: ReportKind;
  date: string;
  created: string;
  html: string;
};

type ReportSnapshot = {
  stations: Station[];
  satellitePoints: SatellitePoint[];
  fires: Fire[];
  observationDate: string;
  pollutant: string;
  kind: ReportKind;
  id: string;
  created: string;
};

const REPORT_TYPES: ReportKind[] = [
  "Multi-source Summary",
  "CPCB Station Summary",
  "Sentinel-5P Anomaly Summary",
  "VIIRS Detection Summary",
];

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return replacements[character] ?? character;
  });
}

function numberFormat(value: number, decimals = 0): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function dateFormat(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function confidenceLabel(value: string): string {
  const code = value.trim().toLowerCase();

  if (code === "l" || code === "low") return "Low";
  if (code === "n" || code === "nominal") return "Nominal";
  if (code === "h" || code === "high") return "High";

  return "Unclassified";
}

function createReportHtml(snapshot: ReportSnapshot): string {
  const {
    stations,
    satellitePoints,
    fires,
    observationDate,
    pollutant,
    kind,
    id,
    created,
  } = snapshot;

  const includeCpcb =
    kind === "Multi-source Summary" ||
    kind === "CPCB Station Summary";

  const includeSatellite =
    kind === "Multi-source Summary" ||
    kind === "Sentinel-5P Anomaly Summary";

  const observations = stations.reduce(
    (total, station) => total + station.n,
    0
  );

  const weightedTotal = stations.reduce(
    (total, station) => total + station.mean * station.n,
    0
  );

  const weightedMean =
    observations > 0 ? weightedTotal / observations : null;

  const unit = stations[0]?.unit ?? "";

  const lowCoverage = stations.filter((station) =>
    station.coverage_flag?.startsWith("low_coverage")
  ).length;

  const topStations = [...stations]
    .sort((a, b) => b.mean - a.mean)
    .slice(0, 8);

  const scoredPoints = satellitePoints.filter(
    (point) => point.score_available
  );

  const aboveBaseline = scoredPoints.filter(
    (point) => point.anomaly_direction === "above_baseline"
  ).length;

  const belowBaseline = scoredPoints.filter(
    (point) => point.anomaly_direction === "below_baseline"
  ).length;

  const otherDirection =
    scoredPoints.length - aboveBaseline - belowBaseline;

  const averageFrp =
    fires.length > 0
      ? fires.reduce((total, fire) => total + fire.frp, 0) / fires.length
      : null;

  const maxFrp =
    fires.length > 0
      ? Math.max(...fires.map((fire) => fire.frp))
      : null;

  const confidenceCounts = fires.reduce<Record<string, number>>(
    (counts, fire) => {
      const label = confidenceLabel(fire.confidence);
      counts[label] = (counts[label] ?? 0) + 1;
      return counts;
    },
    {}
  );

  const confidenceOrder = [
    "High",
    "Nominal",
    "Low",
    "Unclassified",
  ];

  const executiveSummary =
    kind === "Multi-source Summary"
      ? `For ${dateFormat(observationDate)}, the CPCB archive returned ${numberFormat(stations.length)} monitoring stations for ${pollutant}, covering ${numberFormat(observations)} hourly observations. Their observation-count weighted mean was ${weightedMean === null ? "unavailable" : `${numberFormat(weightedMean, 2)} ${unit}`}. The Sentinel-5P composite contains ${numberFormat(satellitePoints.length)} satellite grid observations, while the VIIRS archive returned ${numberFormat(fires.length)} fire-detection records for the selected date.`
      : kind === "CPCB Station Summary"
        ? `For ${dateFormat(observationDate)}, the CPCB archive returned ${numberFormat(stations.length)} monitoring stations for ${pollutant}, with ${numberFormat(observations)} hourly observations. The observation-count weighted mean was ${weightedMean === null ? "unavailable" : `${numberFormat(weightedMean, 2)} ${unit}`}.`
        : kind === "Sentinel-5P Anomaly Summary"
          ? `The Sentinel-5P ${satellitePoints[0]?.pollutant ?? "satellite"} composite for 12–18 November 2024 returned ${numberFormat(satellitePoints.length)} grid observations. ${numberFormat(scoredPoints.length)} points have available anomaly scores, including ${numberFormat(aboveBaseline)} above-baseline and ${numberFormat(belowBaseline)} below-baseline observations.`
          : `The VIIRS archive returned ${numberFormat(fires.length)} satellite fire-detection records for ${dateFormat(observationDate)}. Average fire radiative power was ${averageFrp === null ? "unavailable" : `${numberFormat(averageFrp, 2)} MW`}, and the maximum recorded value was ${maxFrp === null ? "unavailable" : `${numberFormat(maxFrp, 2)} MW`}.`;

  const kpis =
    kind === "Multi-source Summary"
      ? [
          ["CPCB STATIONS", numberFormat(stations.length)],
          ["WEIGHTED MEAN", weightedMean === null ? "—" : numberFormat(weightedMean, 1), unit],
          ["SENTINEL GRID", numberFormat(satellitePoints.length)],
          ["VIIRS RECORDS", numberFormat(fires.length)],
        ]
      : kind === "CPCB Station Summary"
        ? [
            ["CPCB STATIONS", numberFormat(stations.length)],
            ["HOURLY SAMPLES", numberFormat(observations)],
            ["WEIGHTED MEAN", weightedMean === null ? "—" : numberFormat(weightedMean, 1), unit],
            ["LOW COVERAGE", numberFormat(lowCoverage)],
          ]
        : kind === "Sentinel-5P Anomaly Summary"
          ? [
              ["GRID POINTS", numberFormat(satellitePoints.length)],
              ["SCORED POINTS", numberFormat(scoredPoints.length)],
              ["ABOVE BASELINE", numberFormat(aboveBaseline)],
              ["BELOW BASELINE", numberFormat(belowBaseline)],
            ]
          : [
              ["VIIRS RECORDS", numberFormat(fires.length)],
              ["AVERAGE FRP", averageFrp === null ? "—" : numberFormat(averageFrp, 2), "MW"],
              ["MAXIMUM FRP", maxFrp === null ? "—" : numberFormat(maxFrp, 2), "MW"],
              ["HIGH CONFIDENCE", numberFormat(confidenceCounts.High ?? 0)],
            ];

  const cpcbSection = `
    <section class="section">
      <div class="section-heading">
        <span class="section-number">01</span>
        <div>
          <h2>CPCB ground-station observations</h2>
          <p>Reported ${escapeHtml(pollutant)} station means · ${escapeHtml(dateFormat(observationDate))}</p>
        </div>
      </div>

      <div class="section-stat-row">
        <div><span>Stations returned</span><strong>${numberFormat(stations.length)}</strong></div>
        <div><span>Hourly observations</span><strong>${numberFormat(observations)}</strong></div>
        <div><span>Low-coverage stations</span><strong>${numberFormat(lowCoverage)}</strong></div>
      </div>

      <h3>Highest reported station means</h3>

      ${
        topStations.length > 0
          ? `<table>
              <thead>
                <tr>
                  <th>Monitoring station</th>
                  <th>Reported mean</th>
                  <th>Samples</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                ${topStations
                  .map(
                    (station, index) => `
                      <tr>
                        <td>
                          <strong>${index + 1}. ${escapeHtml(station.station_name)}</strong>
                          <span class="subcell">${escapeHtml(station.city_name)}, ${escapeHtml(station.state_name)}</span>
                        </td>
                        <td class="numeric">${numberFormat(station.mean, 2)}<span class="subcell">${escapeHtml(station.unit)}</span></td>
                        <td class="numeric">${numberFormat(station.n)}</td>
                        <td>${escapeHtml(station.coverage_flag.replaceAll("_", " "))}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>`
          : `<p class="muted">No CPCB station records were returned for this selection.</p>`
      }

      <p class="footnote">
        The weighted mean uses each station's reported mean multiplied by its hourly observation count.
        Stations with fewer observations are identified separately; coverage can vary between stations.
      </p>
    </section>
  `;

  const directionBar = (
    label: string,
    value: number,
    color: string
  ) => {
    const percentage =
      scoredPoints.length > 0
        ? (value / scoredPoints.length) * 100
        : 0;

    return `
      <div class="bar-row">
        <div class="bar-label"><span>${escapeHtml(label)}</span><strong>${numberFormat(value)}</strong></div>
        <div class="bar-track"><div class="bar-fill" style="width:${percentage.toFixed(1)}%;background:${color}"></div></div>
      </div>
    `;
  };

  const satelliteSection = `
    <section class="section">
      <div class="section-heading">
        <span class="section-number">02</span>
        <div>
          <h2>Sentinel-5P satellite analysis</h2>
          <p>${escapeHtml(satellitePoints[0]?.pollutant ?? "Satellite")} composite · 12–18 November 2024</p>
        </div>
      </div>

      <div class="section-stat-row">
        <div><span>Grid observations</span><strong>${numberFormat(satellitePoints.length)}</strong></div>
        <div><span>Scored points</span><strong>${numberFormat(scoredPoints.length)}</strong></div>
        <div><span>Unscored points</span><strong>${numberFormat(satellitePoints.length - scoredPoints.length)}</strong></div>
      </div>

      <h3>Anomaly direction among scored points</h3>
      <p class="muted small">Counts are based on the returned anomaly-direction field.</p>

      ${
        scoredPoints.length > 0
          ? `
            ${directionBar("Above baseline", aboveBaseline, "#D97706")}
            ${directionBar("Below baseline", belowBaseline, "#0F766E")}
            ${directionBar("Other / unavailable direction", otherDirection, "#94A3B8")}
          `
          : `<p class="muted">No scored anomaly directions were returned.</p>`
      }

      <div class="note">
        <strong>Composite-period qualification</strong>
        <p>The composite window starts on 12 November 2024 and ends on 18 November 2024, with the end date exclusive. These are composite-period satellite observations, not daily ground-level measurements.</p>
      </div>
    </section>
  `;

  const confidenceColors: Record<string, string> = {
    High: "#0F766E",
    Nominal: "#D97706",
    Low: "#DC8C43",
    Unclassified: "#94A3B8",
  };

  const confidenceSection = confidenceOrder
    .filter((label) => (confidenceCounts[label] ?? 0) > 0)
    .map((label) => {
      const count = confidenceCounts[label] ?? 0;
      const percentage =
        fires.length > 0 ? (count / fires.length) * 100 : 0;

      return `
        <div class="bar-row">
          <div class="bar-label"><span>${label}</span><strong>${numberFormat(count)}</strong></div>
          <div class="bar-track"><div class="bar-fill" style="width:${percentage.toFixed(1)}%;background:${confidenceColors[label] ?? "#94A3B8"}"></div></div>
        </div>
      `;
    })
    .join("");

  const fireSection = `
    <section class="section">
      <div class="section-heading">
        <span class="section-number">03</span>
        <div>
          <h2>NASA FIRMS · VIIRS detections</h2>
          <p>Satellite detection records · ${escapeHtml(dateFormat(observationDate))}</p>
        </div>
      </div>

      <div class="section-stat-row">
        <div><span>Detection records</span><strong>${numberFormat(fires.length)}</strong></div>
        <div><span>Average FRP</span><strong>${averageFrp === null ? "—" : `${numberFormat(averageFrp, 2)} MW`}</strong></div>
        <div><span>Maximum FRP</span><strong>${maxFrp === null ? "—" : `${numberFormat(maxFrp, 2)} MW`}</strong></div>
      </div>

      <h3>Detection confidence categories</h3>
      ${
        confidenceSection ||
        `<p class="muted">No confidence categories were returned.</p>`
      }

      <p class="footnote">
        Low, nominal and high are FIRMS detection-confidence categories.
        They are not statistical probabilities or direct measures of fire intensity.
      </p>
    </section>
  `;

  const sourceNotes = `
    <section class="methodology">
      <h2>Methodology & limitations</h2>
      <ul>
        <li>CPCB values are reported station-level means. The weighted mean accounts for each station's number of hourly observations.</li>
        <li>Sentinel-5P values are satellite composite-period grid observations. Anomaly directions describe comparison with the available baseline; they do not by themselves establish ground-level exposure.</li>
        <li>VIIRS records are satellite detections, not necessarily unique confirmed fires. Detection confidence categories describe algorithmic confidence, not probabilities.</li>
        <li>These datasets alone do not establish pollution causation, population exposure, health impacts or future risk.</li>
        <li>This document is a rule-based summary of historical records. It is not an AI-generated assessment or an official regulatory advisory.</li>
      </ul>
    </section>
  `;

  const createdLabel = new Date(created).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const title =
    kind === "Multi-source Summary"
      ? "Environmental Intelligence Report"
      : kind;

  const titleHtml = `
    <div class="brand-row">
      <div class="brand">
        <div class="brand-mark">S</div>
        <div><strong>STRATA</strong><span>ENVIRONMENTAL INTELLIGENCE</span></div>
      </div>
      <span class="document-tag">HISTORICAL DATA REPORT</span>
    </div>

    <div class="report-meta">
      <span>REPORT ID · ${escapeHtml(id)}</span>
      <span>OBSERVATION DATE · ${escapeHtml(dateFormat(observationDate))}</span>
    </div>

    <div class="hero">
      <div class="eyebrow">ENVIRONMENTAL OBSERVATION SERIES</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(kind)} · ${escapeHtml(pollutant)} · Historical archive</p>
    </div>

    <section class="executive">
      <div class="eyebrow">EXECUTIVE SUMMARY</div>
      <p>${escapeHtml(executiveSummary)}</p>
    </section>

    <div class="kpi-grid">
      ${kpis
        .map(
          ([label, value, suffix]) => `
            <div class="kpi">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
              ${suffix ? `<small>${escapeHtml(suffix)}</small>` : ""}
            </div>
          `
        )
        .join("")}
    </div>
  `;

  const firstPageContent =
    includeCpcb
      ? cpcbSection
      : includeSatellite
        ? satelliteSection
        : fireSection;

  const totalPages = kind === "Multi-source Summary" ? 2 : 1;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — STRATA</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: #e8eef0;
    color: #233738;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
  }
  .page {
    position: relative;
    width: 210mm;
    min-height: 297mm;
    margin: 22px auto;
    padding: 16mm 17mm 19mm;
    background: #fff;
    box-shadow: 0 4px 24px rgba(15, 50, 50, .12);
  }
  .brand-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 15px;
    border-bottom: 2px solid #0f766e;
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-mark {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border-radius: 7px;
    background: #0f766e;
    color: white;
    font-size: 21px;
    font-weight: 800;
  }
  .brand strong {
    display: block;
    color: #123b3b;
    font-size: 18px;
    letter-spacing: 3px;
  }
  .brand span {
    display: block;
    color: #6d8583;
    font-size: 7px;
    letter-spacing: 1.3px;
  }
  .document-tag {
    border: 1px solid #b7d5d0;
    border-radius: 3px;
    padding: 5px 8px;
    color: #0f766e;
    font-size: 7px;
    font-weight: 700;
    letter-spacing: 1px;
  }
  .report-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px;
    margin-top: 18px;
    color: #718482;
    font-size: 7.5px;
    letter-spacing: .5px;
  }
  .hero { margin: 25px 0 18px; }
  .eyebrow {
    color: #0f766e;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 1.4px;
  }
  h1 {
    margin: 7px 0 5px;
    color: #153d3d;
    font-family: Georgia, serif;
    font-size: 28px;
    line-height: 1.2;
  }
  .hero p { margin: 0; color: #718482; font-size: 9px; }
  .executive {
    margin: 20px 0;
    padding: 15px 17px;
    border-left: 3px solid #0f766e;
    background: #f0f7f6;
  }
  .executive p { margin: 7px 0 0; color: #365453; font-size: 10px; line-height: 1.65; }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 9px;
    margin: 19px 0 24px;
  }
  .kpi {
    min-height: 76px;
    padding: 10px;
    border: 1px solid #dce8e6;
    border-radius: 5px;
    background: #fbfdfd;
  }
  .kpi span { display: block; color: #6b817f; font-size: 7px; font-weight: 700; letter-spacing: .6px; }
  .kpi strong { display: block; margin-top: 7px; color: #123f3d; font-size: 19px; line-height: 1.1; }
  .kpi small { display: block; margin-top: 3px; color: #728582; font-size: 7px; }
  .section { margin-top: 23px; }
  .section-heading {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 15px;
    padding-bottom: 9px;
    border-bottom: 1px solid #dce7e5;
  }
  .section-number {
    display: grid;
    width: 25px;
    height: 25px;
    flex: 0 0 25px;
    place-items: center;
    border-radius: 4px;
    background: #e7f2f0;
    color: #0f766e;
    font-size: 9px;
    font-weight: 700;
  }
  h2 { margin: 0; color: #183e3d; font-family: Georgia, serif; font-size: 16px; }
  .section-heading p { margin: 2px 0 0; color: #718482; font-size: 8px; }
  h3 { margin: 17px 0 9px; color: #315452; font-size: 9px; letter-spacing: .3px; }
  .section-stat-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 12px 0 15px;
  }
  .section-stat-row > div { padding: 9px 10px; background: #f4f8f7; border-radius: 4px; }
  .section-stat-row span { display: block; color: #758784; font-size: 7px; }
  .section-stat-row strong { display: block; margin-top: 3px; color: #174b47; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 8px; }
  th { padding: 8px 6px; background: #edf4f3; color: #496361; text-align: left; font-size: 7px; letter-spacing: .4px; text-transform: uppercase; }
  td { padding: 8px 6px; border-bottom: 1px solid #e5ecea; color: #314847; vertical-align: top; }
  td strong { display: block; font-weight: 600; }
  .subcell { display: block; margin-top: 2px; color: #7a8d89; font-size: 7px; }
  .numeric { white-space: nowrap; font-variant-numeric: tabular-nums; }
  .footnote { margin-top: 10px; color: #788985; font-size: 7.5px; line-height: 1.5; }
  .muted { color: #778985; font-size: 9px; }
  .small { font-size: 8px; }
  .bar-row { margin: 12px 0; }
  .bar-label { display: flex; justify-content: space-between; margin-bottom: 5px; color: #455f5d; font-size: 8px; }
  .bar-track { height: 9px; overflow: hidden; border-radius: 6px; background: #edf1f0; }
  .bar-fill { height: 100%; border-radius: 6px; }
  .note {
    margin-top: 17px;
    padding: 12px 14px;
    border: 1px solid #dce8e6;
    border-radius: 4px;
    background: #f6f9f8;
  }
  .note strong { color: #28514e; font-size: 8px; }
  .note p { margin: 4px 0 0; color: #647a76; font-size: 8px; }
  .methodology { margin-top: 22px; padding-top: 13px; border-top: 1px solid #dce7e5; }
  .methodology h2 { font-size: 14px; }
  .methodology ul { margin: 9px 0 0; padding-left: 17px; color: #607572; font-size: 8px; }
  .methodology li { margin: 6px 0; padding-left: 2px; }
  .footer {
    position: absolute;
    right: 17mm;
    bottom: 10mm;
    left: 17mm;
    display: flex;
    justify-content: space-between;
    padding-top: 7px;
    border-top: 1px solid #dce7e5;
    color: #8a9996;
    font-size: 7px;
  }
  @media screen {
    .page { max-width: 100%; }
  }
  @media print {
    @page { size: A4; margin: 0; }
    html, body { width: 210mm; margin: 0; background: #fff; }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      box-shadow: none;
      break-after: page;
      page-break-after: always;
    }
    .page:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>
  <main class="page">
    ${titleHtml}
    ${firstPageContent}
    ${kind !== "Multi-source Summary" ? sourceNotes : ""}
    <div class="footer">
      <span>STRATA · ENVIRONMENTAL INTELLIGENCE</span>
      <span>Page 1 of ${totalPages}</span>
    </div>
  </main>

  ${
    kind === "Multi-source Summary"
      ? `
        <main class="page">
          <div class="brand-row">
            <div class="brand">
              <div class="brand-mark">S</div>
              <div><strong>STRATA</strong><span>ENVIRONMENTAL INTELLIGENCE</span></div>
            </div>
            <span class="document-tag">OBSERVATION DETAILS</span>
          </div>

          <div class="report-meta">
            <span>REPORT ID · ${escapeHtml(id)}</span>
            <span>OBSERVATION DATE · ${escapeHtml(dateFormat(observationDate))}</span>
          </div>

          ${satelliteSection}
          ${fireSection}
          ${sourceNotes}

          <div class="footer">
            <span>STRATA · HISTORICAL DATA REPORT · Generated ${escapeHtml(createdLabel)}</span>
            <span>Page 2 of 2</span>
          </div>
        </main>
      `
      : ""
  }
</body>
</html>`;
}

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Environmental Reports — STRATA" },
      {
        name: "description",
        content:
          "Professionally formatted environmental reports based on CPCB, Sentinel-5P and VIIRS observations.",
      },
      { property: "og:title", content: "Environmental Reports — STRATA" },
      {
        property: "og:description",
        content:
          "Generate polished standalone HTML reports and print-ready PDFs from historical environmental observations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});



type NugenStation = {
  station_id: string;
  station_name: string;
  ground_PM2.5_mean: number;
  predicted_PM25?: number;
  absolute_error: number;
};

type NugenReport = {
  executive_summary: string;
  hotspot_analysis: {
    top_3_observed_stations: NugenStation[];
    top_3_prediction_errors: NugenStation[];
  };
  model_reliability_analysis: { R2: number; RMSE: number; MAE: number; bias: number };
  environmental_interpretation: string;
  monitoring_recommendations: string[];
  uncertainty_and_limitations: string[];
};

function NugenIntelligencePanel() {
  const [report, setReport] = useState<NugenReport | null>(null);
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/ml-data/strata_nugen_report.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Report unavailable (HTTP ${response.status})`);
        return response.json() as Promise<NugenReport>;
      })
      .then((data) => { if (!controller.signal.aborted) setReport(data); })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setFailure(err instanceof Error ? err.message : "Could not load report");
      })
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, []);

  return (
    <section className="rounded-2xl border border-teal-400/25 bg-[#080B0A] p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-400">NUGEN-powered intelligence</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Historical PM2.5 Event Assessment</h2>
          <p className="mt-1 text-xs text-zinc-400">8–14 November 2024 · XGBoost prior-only forecast evaluation · Historical, not live</p>
        </div>
        <span className="rounded-full border border-teal-400/25 px-3 py-1 text-xs text-teal-300">AI-assisted analysis</span>
      </div>
      {pending && <p className="text-sm text-zinc-400">Loading NUGEN report…</p>}
      {failure && <p className="text-sm text-red-400">{failure}. Check public/ml-data and deployment.</p>}
      {report && (
        <div className="space-y-5">
          <p className="text-sm leading-7 text-zinc-300">{report.executive_summary}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              ["MAE", report.model_reliability_analysis.MAE.toFixed(2), "µg/m³"],
              ["RMSE", report.model_reliability_analysis.RMSE.toFixed(2), "µg/m³"],
              ["R²", report.model_reliability_analysis.R2.toFixed(3), "variance explained"],
              ["Bias", report.model_reliability_analysis.bias.toFixed(2), "µg/m³"],
            ] as const).map(([label, value, unit]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-zinc-400">{label}</p>
                <p className="mt-1 text-xl font-semibold text-teal-300">{value}</p>
                <p className="text-[10px] text-zinc-500">{unit}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500">Metrics evaluate 91 stations. The station rankings below cover only the 10 supplied evidence stations. R² is not an accuracy percentage.</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Highest observed PM2.5 · supplied sample</h3>
              <div className="space-y-3">
                {report.hotspot_analysis.top_3_observed_stations.map((station) => (
                  <div key={station.station_id} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-zinc-300">{station.station_name}</span>
                    <span className="shrink-0 font-semibold text-teal-300">{station.ground_PM2.5_mean.toFixed(2)} µg/m³</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Largest prediction errors · supplied sample</h3>
              <div className="space-y-3">
                {report.hotspot_analysis.top_3_prediction_errors.map((station) => (
                  <div key={station.station_id} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-zinc-300">{station.station_name}</span>
                    <span className="shrink-0 font-semibold text-amber-300">{station.absolute_error.toFixed(2)} µg/m³</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-white">Environmental interpretation</h3>
              <p className="text-xs leading-6 text-zinc-400">{report.environmental_interpretation}</p>
              <h3 className="mb-2 mt-4 text-sm font-semibold text-white">Recommendations</h3>
              <ul className="list-disc space-y-2 pl-5 text-xs leading-6 text-zinc-300">
                {report.monitoring_recommendations.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-white">Evidence limitations</h3>
              <ul className="list-disc space-y-2 pl-5 text-xs leading-6 text-zinc-400">
                {report.uncertainty_and_limitations.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>
          </div>
          <p className="border-t border-white/10 pt-3 text-[11px] text-zinc-500">This is a saved NUGEN-generated interpretation of historical model outputs, not live NUGEN inference or an official air-quality advisory.</p>
        </div>
      )}
    </section>
  );
}

function ReportsPage() {
  const [date, setDate] = useState("2024-11-17");
  const [pollutant, setPollutant] = useState("PM2.5");
  const [kind, setKind] = useState<ReportKind>("Multi-source Summary");

  const [stations, setStations] = useState<Station[]>([]);
  const [satellitePoints, setSatellitePoints] = useState<SatellitePoint[]>([]);
  const [fires, setFires] = useState<Fire[]>([]);

  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [selectedId, setSelectedId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const responses = await Promise.all([
          fetch(
            `${API}/api/cpcb?date=${date}&pollutant=${encodeURIComponent(pollutant)}`,
            { signal: controller.signal }
          ),
          fetch(
            `${API}/api/satellite?pollutant=NO2&window_id=11-12`,
            { signal: controller.signal }
          ),
          fetch(`${API}/api/fires?date=${date}`, {
            signal: controller.signal,
          }),
        ]);

        if (responses.some((response) => !response.ok)) {
          throw new Error("One or more dataset requests failed.");
        }

        const cpcbData = (await responses[0].json()) as {
          stations?: Station[];
        };

        const satelliteData = (await responses[1].json()) as {
          points?: SatellitePoint[];
        };

        const fireData = (await responses[2].json()) as {
          detections?: Fire[];
        };

        setStations(cpcbData.stations ?? []);
        setSatellitePoints(satelliteData.points ?? []);
        setFires(fireData.detections ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setStations([]);
        setSatellitePoints([]);
        setFires([]);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load report source data."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => controller.abort();
  }, [date, pollutant]);

  const generateReport = () => {
    if (loading || error) {
      toast.error("Wait until all source datasets are ready.");
      return;
    }

    const created = new Date().toISOString();
    const id = `STR-${date.replaceAll("-", "")}-${Date.now()
      .toString()
      .slice(-5)}`;

    const snapshot: ReportSnapshot = {
      stations,
      satellitePoints,
      fires,
      observationDate: date,
      pollutant,
      kind,
      id,
      created,
    };

    const report: GeneratedReport = {
      id,
      title: `${kind} — ${date}`,
      kind,
      date,
      created,
      html: createReportHtml(snapshot),
    };

    setReports((current) => [report, ...current]);
    setSelectedId(report.id);
    toast.success("Environmental report generated");
  };

  const current = reports.find(
    (report) => report.id === selectedId
  );

  const printReport = () => {
    if (!current) return;

    const printWindow = window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );

    if (!printWindow) {
      toast.error("Please allow pop-ups to export the report.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(current.html);
    printWindow.document.close();
    printWindow.focus();

    window.setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        eyebrow="Environmental intelligence reporting"
        title="Reports & Export"
        subtitle="Turn actual historical observations into polished standalone HTML documents and print-ready PDF reports, with methodology and limitations included."
        actions={
          <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-400">
            <FileCheck2 className="h-4 w-4 text-primary" />
            A4 · Standalone document
          </span>
        }
      />

      <NugenIntelligencePanel />

      <section className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#080B0A] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-teal-400/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-48 w-48 rounded-full bg-cyan-500/[0.05] blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <FileText className="h-3.5 w-3.5" />
              Intelligence reporting workspace
            </div>

            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              From observations to clear evidence.
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
              Build structured environmental reports using the CPCB,
              Sentinel-5P and VIIRS historical datasets. Preview your
              document and export it for further use.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              Reporting mode
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Historical data
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="CPCB Stations"
          value={String(stations.length)}
          delta={`${pollutant} · ${date}`}
          icon={<Activity className="h-4 w-4" />}
          accent="primary"
          loading={loading}
        />

        <StatCard
          label="Sentinel-5P Grid"
          value={String(satellitePoints.length)}
          delta="Composite-period observations"
          icon={<Satellite className="h-4 w-4" />}
          accent="satellite"
          loading={loading}
        />

        <StatCard
          label="VIIRS Detections"
          value={String(fires.length)}
          delta={`Historical records · ${date}`}
          icon={<Flame className="h-4 w-4" />}
          accent="fire"
          loading={loading}
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.75fr)]">
        <div className="min-w-0 space-y-4">
          <Panel
            title="Report configuration"
            description="Configure your historical observation report."
            className="border-white/[0.08] bg-[#080808]"
          >
            <div className="mb-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Document settings
              </div>
              <p className="text-xs leading-relaxed text-zinc-500">
                Select the report format and historical observation
                parameters.
              </p>
            </div>

            <label
              htmlFor="report-kind"
              className="mb-2 block text-xs font-medium text-zinc-400"
            >
              Report type
            </label>
            <select
              id="report-kind"
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as ReportKind)
              }
              className="mb-4 h-11 w-full rounded-lg border border-white/10 bg-[#101010] px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
            >
              {REPORT_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <label
              htmlFor="report-date"
              className="mb-2 block text-xs font-medium text-zinc-400"
            >
              Observation date
            </label>
            <input
              id="report-date"
              type="date"
              value={date}
              min="2024-11-09"
              max="2024-11-17"
              onChange={(event) => setDate(event.target.value)}
              className="mb-4 h-11 w-full rounded-lg border border-white/10 bg-[#101010] px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
            />

            <label
              htmlFor="report-pollutant"
              className="mb-2 block text-xs font-medium text-zinc-400"
            >
              CPCB pollutant
            </label>
            <select
              id="report-pollutant"
              value={pollutant}
              onChange={(event) => setPollutant(event.target.value)}
              className="h-11 w-full rounded-lg border border-white/10 bg-[#101010] px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-primary/60"
            >
              <option>PM2.5</option>
              <option>PM10</option>
              <option>NO2</option>
              <option>CO</option>
            </select>

            <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Available source records
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    loading
                      ? "animate-pulse bg-amber-400"
                      : error
                        ? "bg-red-400"
                        : "bg-primary"
                  }`}
                />
              </div>

              <div className="space-y-2.5">
                {(
                  [
                    ["CPCB", stations.length],
                    ["Sentinel-5P", satellitePoints.length],
                    ["VIIRS", fires.length],
                  ] as const
                ).map(([source, count]) => (
                  <div
                    key={source}
                    className="flex items-center justify-between gap-2"
                  >
                    <DatasetBadge
                      dataset={source as "CPCB" | "Sentinel-5P" | "VIIRS"}
                    />

                    {loading ? (
                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <Clock3 className="h-3 w-3" />
                        Loading
                      </span>
                    ) : error ? (
                      <span className="text-[10px] text-red-400">
                        Unavailable
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {count.toLocaleString()} records
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {loading && (
                <p className="mt-3 text-[11px] text-zinc-500">
                  Loading source datasets...
                </p>
              )}

              {error && (
                <StatusNotice
                  tone="error"
                  title="Source data unavailable"
                  className="mt-3"
                >
                  {error}
                </StatusNotice>
              )}
            </div>

            <button
              onClick={generateReport}
              disabled={loading || Boolean(error)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_rgba(0,229,204,0.09)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" />
              Generate report
            </button>

            <p className="mt-3 text-center text-[10px] leading-relaxed text-zinc-500">
              Reports use returned dataset records. Unsupported
              predictions and causal conclusions are not added.
            </p>
          </Panel>

          <Panel
            title="Report library"
            description={`${reports.length} document${reports.length === 1 ? "" : "s"} generated in this session`}
            className="border-white/[0.08] bg-[#080808]"
            contentClassName="p-3 sm:p-3"
          >
            {reports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 py-9 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-500">
                  <FileText className="h-5 w-5" />
                </div>

                <p className="mt-3 text-sm font-medium text-zinc-300">
                  Your library is empty
                </p>
                <p className="mx-auto mt-1 max-w-[220px] text-xs leading-relaxed text-zinc-500">
                  Generated reports will appear here for quick access
                  during this browser session.
                </p>
              </div>
            ) : (
              <ul className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                {reports.map((report) => (
                  <li key={report.id}>
                    <button
                      onClick={() => setSelectedId(report.id)}
                      aria-pressed={report.id === selectedId}
                      className={`w-full rounded-xl border p-3 text-left transition-all ${
                        report.id === selectedId
                          ? "border-primary/35 bg-primary/[0.07]"
                          : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.13] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] text-zinc-500">
                          {report.id}
                        </span>
                        {report.id === selectedId && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                            Selected
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-sm font-semibold leading-snug text-zinc-200">
                        {report.title}
                      </div>

                      <div className="mt-1 text-[11px] text-zinc-500">
                        {report.kind}
                      </div>

                      <div className="mt-2 text-[10px] text-zinc-600">
                        {new Date(report.created).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 border-t border-white/[0.07] pt-3 text-[10px] leading-relaxed text-zinc-500">
              Reports are stored in the current browser session.
              Persistent storage is not connected.
            </div>
          </Panel>
        </div>

        <Panel
          title="Document preview"
          description={
            current
              ? `${current.id} · ${current.kind}`
              : "Your generated A4 report will appear here."
          }
          className="min-w-0 border-white/[0.08] bg-[#080808]"
          contentClassName="p-3 sm:p-3"
          action={
            current ? (
              <button
                onClick={printReport}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/[0.07] px-3 py-2 text-xs font-semibold text-primary transition-all hover:border-primary/50 hover:bg-primary/[0.13]"
              >
                <Printer className="h-4 w-4" />
                Export PDF / Print
              </button>
            ) : undefined
          }
        >
          {!current ? (
            <div className="flex min-h-[650px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.06] text-primary">
                <FileText className="h-7 w-7" />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-zinc-200">
                Your report preview awaits
              </h2>

              <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
                Configure your report and select Generate report.
                Your formatted environmental document will appear
                here, ready to inspect and export.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[
                  "Structured summaries",
                  "Source-specific analysis",
                  "PDF export",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[10px] text-zinc-400"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-200">
                    {current.title}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-zinc-500">
                    {current.id}
                  </div>
                </div>

                <span className="rounded-md border border-primary/20 bg-primary/[0.06] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-primary">
                  Ready to export
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#050505] p-1.5 sm:p-2">
                <iframe
                  key={current.id}
                  srcDoc={current.html}
                  title={`Preview of ${current.title}`}
                  className="h-[1100px] w-full rounded-lg bg-white"
                />
              </div>

              <p className="text-center text-[10px] text-zinc-500">
                Preview of the formatted report · Use Export PDF / Print
                to save or print the document.
              </p>
            </div>
          )}
        </Panel>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
          <Database className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
            Reporting transparency
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
            Reports are generated from historical source records and
            include methodology notes and dataset limitations. The
            document generator is rule-based; it does not imply that
            predictive modelling or AI-generated analysis is connected.
          </p>
        </div>
      </div>
    </div>
  );
}
```
