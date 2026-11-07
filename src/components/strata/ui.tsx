import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/demo-data";

export function SimulatedTag({ className, children = "Simulated" }: { className?: string; children?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm border border-sim/40 bg-sim/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sim", className)}>
      <FlaskConical className="h-3 w-3" /> {children}
    </span>
  );
}

const sevStyles: Record<Severity, string> = {
  critical: "bg-critical/15 text-critical border-critical/40",
  high: "bg-high/15 text-high border-high/40",
  moderate: "bg-moderate/15 text-moderate border-moderate/40",
  low: "bg-low/15 text-low border-low/40",
};
export const sevVar: Record<Severity, string> = {
  critical: "var(--critical)", high: "var(--high)", moderate: "var(--moderate)", low: "var(--low)",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider", sevStyles[severity])}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: sevVar[severity] }} />
      {severity}
    </span>
  );
}

export function Panel({ title, action, children, className, simulated = true }: { title?: string; action?: ReactNode; children: ReactNode; className?: string; simulated?: boolean }) {
  return (
    <section className={cn("rounded-lg border bg-panel", className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
            {simulated && <SimulatedTag />}
          </div>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, delta, tone = "default", icon }: { label: string; value: string; delta?: string; tone?: "default" | Severity; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border bg-panel p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        {label}
        <span className="text-primary">{icon}</span>
      </div>
      <div className="mt-2 font-display text-3xl font-semibold" style={tone !== "default" ? { color: sevVar[tone] } : undefined}>{value}</div>
      {delta && <div className="mt-1 font-mono text-xs text-muted-foreground">{delta}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={cn("rounded-sm border px-2.5 py-1 text-xs transition-colors", active ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
      {children}
    </button>
  );
}
export const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 };
