import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  MOCK_SOURCES,
  type IngestionRun,
  type ScopeItem,
  type SourceConfig,
  type SourceId,
} from "./mock-sources";

interface SourcesCtx {
  sources: SourceConfig[];
  get: (id: SourceId) => SourceConfig | undefined;
  setConnected: (id: SourceId, connected: boolean) => void;
  toggleScope: (id: SourceId, scopeId: string) => void;
  addScope: (id: SourceId, label: string) => void;
  removeScope: (id: SourceId, scopeId: string) => void;
  triggerRun: (id: SourceId) => void;
}

const Ctx = createContext<SourcesCtx | null>(null);

export function SourcesProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<SourceConfig[]>(MOCK_SOURCES);

  const patch = (id: SourceId, fn: (s: SourceConfig) => SourceConfig) =>
    setSources((arr) => arr.map((s) => (s.id === id ? fn(s) : s)));

  const setConnected = useCallback((id: SourceId, connected: boolean) => {
    patch(id, (s) => ({
      ...s,
      connected,
      scope:
        connected && s.scope.length === 0 && s.scopePickerOptions.length > 0
          ? s.scopePickerOptions.slice(0, 2).map((label, i) => ({
              id: `seed-${i}`,
              label,
              enabled: true,
            }))
          : s.scope,
    }));
  }, []);

  const toggleScope = useCallback((id: SourceId, scopeId: string) => {
    patch(id, (s) => ({
      ...s,
      scope: s.scope.map((sc) => (sc.id === scopeId ? { ...sc, enabled: !sc.enabled } : sc)),
    }));
  }, []);

  const addScope = useCallback((id: SourceId, label: string) => {
    patch(id, (s) => {
      if (s.scope.some((sc) => sc.label === label)) return s;
      const next: ScopeItem = { id: `sc-${Date.now()}`, label, enabled: true };
      return { ...s, scope: [...s.scope, next] };
    });
  }, []);

  const removeScope = useCallback((id: SourceId, scopeId: string) => {
    patch(id, (s) => ({ ...s, scope: s.scope.filter((sc) => sc.id !== scopeId) }));
  }, []);

  const triggerRun = useCallback((id: SourceId) => {
    const running: IngestionRun = {
      id: `run-${Date.now()}`,
      startedAt: new Date().toISOString(),
      durationMs: 0,
      itemsScanned: 0,
      signalsExtracted: 0,
      pushedToStaging: 0,
      status: "running",
      items: [],
    };
    patch(id, (s) => ({ ...s, runs: [running, ...s.runs] }));
    setTimeout(() => {
      const scanned = 40 + Math.floor(Math.random() * 120);
      const signals = Math.floor(scanned / 30);
      const pushed = Math.max(0, signals - Math.floor(Math.random() * 2));
      patch(id, (s) => ({
        ...s,
        runs: s.runs.map((r) =>
          r.id === running.id
            ? {
                ...r,
                durationMs: 1800 + Math.floor(Math.random() * 3000),
                itemsScanned: scanned,
                signalsExtracted: signals,
                pushedToStaging: pushed,
                status: "success",
                items: [
                  { title: "Ad-hoc run captured fresh feedback", outcome: "signal" },
                ],
              }
            : r,
        ),
      }));
    }, 2000);
  }, []);

  return (
    <Ctx.Provider
      value={{
        sources,
        get: (id) => sources.find((s) => s.id === id),
        setConnected,
        toggleScope,
        addScope,
        removeScope,
        triggerRun,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSources() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSources must be used inside SourcesProvider");
  return v;
}
