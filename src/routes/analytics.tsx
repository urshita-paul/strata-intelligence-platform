import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EVENTS, MONTHLY } from "@/lib/demo-data";
import { FilterChip, PageHeader, Panel, StatCard } from "@/components/strata/ui";
import { sevVar } from "@/components/strata/ui";
import { tooltipStyle } from "@/components/strata/ui";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Historical Analytics — STRATA" },
      { name: "description", content: "Long-term trends of pollution events by type, region and severity." },
      { property: "og:title", content: "Historical Analytics — STRATA" },
      { property: "og:description", content: "Long-term trends of pollution events by type, region and severity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

const RANGES = { "3M": 3, "6M": 6, "12M": 12 } as const;

function AnalyticsPage() {
  const [range, setRange] = useState<keyof typeof RANGES>("12M");
  const data = MONTHLY.slice(-RANGES[range]);
  const total = data.reduce((a, m) => a + m.air + m.water + m.soil + m.industrial, 0);
  const sevData = (["critical", "high", "moderate", "low"] as const).map((s) => ({ name: s, value: EVENTS.filter((e) => e.severity === s).length }));
  const byState = Object.entries(EVENTS.reduce<Record<string, number>>((a, e) => ({ ...a, [e.state]: (a[e.state] ?? 0) + 1 }), {})).map(([state, n]) => ({ state, n })).sort((a, b) => b.n - a.n);
  const axis = { stroke: "var(--muted-foreground)", fontSize: 11 };

  return (
    <>
      <PageHeader title="Historical Analytics" subtitle="Trends across event types, severity and geography" actions={Object.keys(RANGES).map((r) => <FilterChip key={r} active={range === r} onClick={() => setRange(r as keyof typeof RANGES)}>{r}</FilterChip>)} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Events in period" value={String(total)} />
        <StatCard label="Monthly average" value={(total / data.length).toFixed(0)} />
        <StatCard label="Peak month" value={data.reduce((a, m) => (m.air + m.water + m.soil + m.industrial > a.air + a.water + a.soil + a.industrial ? m : a)).month} />
        <StatCard label="Mean time to contain" value="14.2h" delta="−2.1h vs prior period" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Events by type per month" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="month" {...axis} /><YAxis {...axis} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="air" stackId="a" fill="var(--chart-1)" name="Air" />
                <Bar dataKey="water" stackId="a" fill="var(--chart-3)" name="Water" />
                <Bar dataKey="soil" stackId="a" fill="var(--chart-2)" name="Soil" />
                <Bar dataKey="industrial" stackId="a" fill="var(--chart-5)" name="Industrial" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Severity distribution">
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={sevData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} stroke="var(--panel)">
                  {sevData.map((d) => <Cell key={d.name} fill={sevVar[d.name]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Air vs water trend">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="month" {...axis} /><YAxis {...axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line dataKey="air" stroke="var(--chart-1)" strokeWidth={2} name="Air" />
                <Line dataKey="water" stroke="var(--chart-3)" strokeWidth={2} name="Water" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Events by state (7 days)">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byState} layout="vertical">
                <XAxis type="number" {...axis} allowDecimals={false} />
                <YAxis type="category" dataKey="state" {...axis} width={110} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="n" name="Events" fill="var(--primary)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </>
  );
}
