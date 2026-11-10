
import type { ReactNode } from "react";
import { FlaskConical, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/demo-data";

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

export function SeverityBadge({
  severity,
}: {
  severity: Severity;
}) {
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

export function Panel({
  title,
  action,
  children,
  className,
  simulated = false,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  simulated?: boolean;
}) {
  return (
    <section
      className={cn(
        "group overflow-hidden rounded-xl border border-white/[0.07] bg-panel/80 shadow-[0_12px_35px_rgba(0,0,0,0.16)] backdrop-blur-xl transition-all duration-300 hover:border-primary/20",
        className
      )}
    >
      {title && (
        <header className="flex min-h-[54px] items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.015] px-5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="h-4 w-[3px] shrink-0 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />

            <h2 className="truncate font-display text-xs font-semibold uppercase tracking-[0.12em] text-foreground/85">
              {title}
            </h2>

            {simulated && <SimulatedTag />}
          </div>

          {action && (
            <div className="shrink-0">
              {action}
            </div>
          )}
        </header>
      )}

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  delta,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "default" | Severity;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-white/[0.07] bg-panel/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.14)] backdrop-blur-lg transition-all duration-300",
        "hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_14px_35px_rgba(0,0,0,0.24)]"
      )}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>

        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/[0.08] text-primary transition-all duration-300 group-hover:border-primary/30 group-hover:bg-primary/15">
            {icon}
          </div>
        )}
      </div>

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

      {delta && (
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <ArrowUpRight className="h-3 w-3 text-primary" />
          {delta}
        </div>
      )}

      <div className="pointer-events-none absolute -bottom-10 -right-10 h-24 w-24 rounded-full bg-primary/[0.035] blur-2xl transition-all duration-500 group-hover:bg-primary/[0.09]" />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-[30px]">
          {title}
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
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
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        active
          ? "border-primary/40 bg-primary/10 text-primary shadow-[0_0_14px_rgba(45,212,191,0.08)]"
          : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-primary/25 hover:bg-primary/[0.05] hover:text-foreground"
      )}
    >
      {children}
    </button>
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
