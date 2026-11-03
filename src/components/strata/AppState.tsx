import { createContext, useContext, useState, type ReactNode } from "react";

interface Settings { org: string; email: string; aqiThreshold: number; notifyCritical: boolean; notifyHigh: boolean; dailyDigest: boolean; units: "metric" | "imperial"; region: string }
interface Ctx {
  acknowledged: Set<string>;
  acknowledge: (id: string) => void;
  readNotifs: Set<string>;
  markAllRead: (ids: string[]) => void;
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
}
const AppCtx = createContext<Ctx | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [acknowledged, setAck] = useState<Set<string>>(new Set());
  const [readNotifs, setRead] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<Settings>({ org: "Central Pollution Monitoring Cell", email: "analyst@strata.example", aqiThreshold: 300, notifyCritical: true, notifyHigh: true, dailyDigest: false, units: "metric", region: "All India" });
  return (
    <AppCtx.Provider value={{
      acknowledged,
      acknowledge: (id) => setAck((s) => new Set(s).add(id)),
      readNotifs,
      markAllRead: (ids) => setRead((s) => new Set([...s, ...ids])),
      settings,
      updateSettings: (p) => setSettings((s) => ({ ...s, ...p })),
    }}>{children}</AppCtx.Provider>
  );
}
export const useAppState = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useAppState outside provider");
  return c;
};
