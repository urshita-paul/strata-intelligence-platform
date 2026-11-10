import { cn } from "@/lib/utils";

export function NexusMark({ className, animated = false }: { className?: string; animated?: boolean }) {
  return <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("nexus-mark text-primary", animated && "nexus-mark-connecting", className)} fill="none">
    <path d="M20 4 35 12.5 20 21 5 12.5 20 4Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="m5 20 15 8.5L35 20M5 27.5 20 36l15-8.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M20 12v9m0 7.5V36" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="20" cy="12" r="2" fill="currentColor" />
  </svg>;
}