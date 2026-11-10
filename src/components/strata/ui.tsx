
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Flame,
  FlaskConical,
  Info,
  Satellite,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/demo-data";

export type Dataset = "CPCB" | "Sentinel-5P" | "VIIRS";

export function SimulatedTag({
  className,
  children = "Simulated",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-sim/30 bg-sim/10 px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-wider text-sim",
        className
      )}
    >
      <FlaskConical className="h-3 w-3" />
      {children}
    </span>
  );
}

const sevStyles: Record<Severity, string> = {
  critical: "bg-critical/10 text-critical border-critical/30",
  high: "bg-high/10 text-high border-high/30",
  moderate: "bg-moderate/10 text-moderate border-moderate/30",
  low: "bg-low/10 text-low border-low/30",
};

export const sevVar: Record<Severity, string> = {
  critical: "var(--critical)",
  high: "var(--high)",
  moderate: "var(--moderate)",
  low: "var(--low)",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider",
        sevStyles[severity]
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: sevVar[severity] }}
      />
      {severity}
    </span>
  );
}

export function DatasetBadge({
  dataset,
  className,
}: {
  dataset: Dataset;
  className?: string;
}) {
  const styles: Record<Dataset, string> = {
    CPCB: "border-primary/35 bg-primary/10 text-primary",
    "Sentinel-5P": "border-satellite/35 bg-satellite/10 text-satellite",
    VIIRS: "border-fire/35 bg-fire/10 text-fire",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm border px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.09em]",
        styles[dataset],
        className
      )}
    >
      {dataset}
    </span>
  );
}

export function DatasetIcon({
  dataset,
  className,
}: {
  dataset: Dataset;
  className?: string;
}) {
  const Icon =
    dataset === "CPCB"
      ? Activity
      : dataset === "Sentinel-5P"
        ? Satellite
        : Flame;

  const colour =
    dataset === "CPCB"
      ? "text-primary"
      : dataset === "Sentinel-5P"
        ? "text-satellite"
        : "text-fire";

  return (
    <Icon
      aria-hidden="true"
      className={cn("h-4 w-4", colour, className)}
    />
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  simulated = false,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  simulated?: boolean;
}) {
  return (
    <section
      className={cn(
        "group min-w-0 overflow-hidden rounded-xl border border-white/[0.07] bg-panel/80 shadow-[0_12px_35px_rgba(0,0,0,0.16)] backdrop-blur-xl transition-all duration-300 hover:border-primary/20",
        className
      )}
    >
      {(title || action) && (
        <header className="flex min-h-[54px] items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.015] px-5 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              {title && (
                <>
                  <span className="h-4 w-[3px] shrink-0 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
                  <h2 className="truncate font-display text-xs font-semibold uppercase tracking-[0.12em] text-foreground/85">
                    {title}
                  </h2>
                </>
              )}
              {simulated && <SimulatedTag />}
            </div>

            {description && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}

      <div className={cn("p-5", contentClassName)}>{children}</div>
    </section>
  );
}

type StatDestination =
  | "/"
  | "/map"
  | "/analytics"
  | "/warnings"
  | "/reports"
  | "/settings";

type StatAccent =
  | "primary"
  | "success"
  | "satellite"
  | "fire"
  | "caution"
  | "default";

export function StatCard({
  label,
  value,
  delta,
  tone = "default",
  accent = "default",
  icon,
  to,
  loading = false,
  className,
}: {
  label: string;
  value: string;
  delta?: ReactNode;
  tone?: "default" | Severity;
  accent?: StatAccent;
  icon?: ReactNode;
  to?: StatDestination;
  loading?: boolean;
  className?: string;
}) {
  const accents: Record<StatAccent, string> = {
    default: "text-muted-foreground",
    primary: "text-primary",
    success: "text-success",
    satellite: "text-satellite",
    fire: "text-fire",
    caution: "text-caution",
  };

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>

        {icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-current/[0.05]",
              accents[accent]
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-4 h-8 w-24 animate-pulse rounded bg-muted/70" />
      ) : (
        <div
          className="mt-3 font-display text-3xl font-semibold tracking-tight"
          style={
            tone !== "default"
              ? { color: sevVar[tone] }
              : undefined
          }
        >
          {value}
        </div>
      )}

      {delta && (
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <ArrowUpRight className="h-3 w-3 shrink-0 text-primary" />
          {delta}
        </div>
      )}

      {to && (
        <div className="mt-4 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          Explore module <span aria-hidden="true">→</span>
        </div>
      )}
    </>
  );

  const classes = cn(
    "group relative overflow-hidden rounded-xl border border-white/[0.07] bg-panel/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.14)] backdrop-blur-lg transition-all duration-300",
    "hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_14px_35px_rgba(0,0,0,0.24)]",
    className
  );

  const card = (
    <>
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
      {content}
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-24 w-24 rounded-full bg-primary/[0.035] blur-2xl transition-all duration-500 group-hover:bg-primary/[0.09]" />
    </>
  );

  return to ? (
    <Link
      to={to}
      className={classes}
      aria-label={`${label}: ${value}. Open module`}
    >
      {card}
    </Link>
  ) : (
    <div className={classes}>{card}</div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow = "Environmental intelligence",
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-primary">
          <span className="h-px w-5 bg-primary/70" />
          {eyebrow}
        </div>

        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-[30px]">
          {title}
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        active
          ? "border-primary/40 bg-primary/10 text-primary shadow-[0_0_14px_rgba(45,212,191,0.08)]"
          : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-primary/25 hover:bg-primary/[0.05] hover:text-foreground"
      )}
    >
      {children}

      {count !== undefined && (
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 font-mono text-[9px]",
            active ? "bg-primary/15" : "bg-muted"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function StatusNotice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "error" | "warning";
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-primary/25 bg-primary/[0.06] text-muted-foreground",
    error: "border-critical/35 bg-critical/[0.07] text-critical",
    warning: "border-caution/30 bg-caution/[0.06] text-muted-foreground",
  };

  const Icon = tone === "error" ? AlertCircle : Info;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-xs leading-relaxed",
        styles[tone],
        className
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-3.5 w-3.5 shrink-0",
          tone === "warning" && "text-caution"
        )}
      />

      <div>
        {title && (
          <div
            className={cn(
              "mb-1 font-semibold",
              tone === "error" ? "text-critical" : "text-foreground"
            )}
          >
            {title}
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center",
        className
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-muted-foreground">
        {icon ?? <Info className="h-5 w-5" />}
      </div>

      <h3 className="text-sm font-semibold">{title}</h3>

      <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function LoadingRows({ count = 5 }: { count?: number }) {
  return (
    <div
      className="space-y-2"
      aria-label="Loading observations"
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="rounded-md border border-white/[0.07] bg-panel/60 p-3"
        >
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-2.5 w-full animate-pulse rounded bg-muted/70" />
          <div className="mt-2 h-2.5 w-1/3 animate-pulse rounded bg-muted/60" />
        </div>
      ))}
    </div>
  );
}

export function DetailItem({
  label,
  children,
  className,
  mono = false,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-md border border-white/[0.07] bg-panel/60 px-3 py-3",
        className
      )}
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        {label}
      </div>

      <div
        className={cn(
          "mt-2 break-words text-sm leading-relaxed text-foreground",
          mono && "font-mono"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--foreground)",
  boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
};
