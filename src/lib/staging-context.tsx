import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type GroupBy = "none" | "userType" | "productArea" | "tag";

export interface SavedView {
  id: string;
  name: string;
  rule: string; // natural-language predicate; matched heuristically
  groupBy: GroupBy;
  builtin?: boolean;
}

export interface TrustEvent {
  ts: string;
  action:
    | "reorder"
    | "pin"
    | "unpin"
    | "tag"
    | "untag"
    | "note"
    | "dismiss"
    | "push"
    | "group";
  requestId?: string;
}

interface StagingState {
  pinned: Record<string, boolean>;
  manualRank: Record<string, number>;
  tags: Record<string, string[]>;
  notes: Record<string, string>;
  views: SavedView[];
  activeViewId: string;
  trustHistory: TrustEvent[];
}

const BUILTIN_VIEWS: SavedView[] = [
  { id: "all", name: "All", rule: "", groupBy: "none", builtin: true },
  { id: "pinned", name: "Pinned", rule: "__pinned__", groupBy: "none", builtin: true },
  { id: "notes", name: "Has notes", rule: "__has_notes__", groupBy: "none", builtin: true },
];

const STORAGE_KEY = "signal.staging.v1";

const initial: StagingState = {
  pinned: {},
  manualRank: {},
  tags: {},
  notes: {},
  views: BUILTIN_VIEWS,
  activeViewId: "all",
  trustHistory: [],
};

function loadState(): StagingState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as StagingState;
    // Ensure builtin views always present
    const ids = new Set(parsed.views.map((v) => v.id));
    const merged = [
      ...BUILTIN_VIEWS.filter((v) => !ids.has(v.id)),
      ...parsed.views,
    ];
    return { ...initial, ...parsed, views: merged };
  } catch {
    return initial;
  }
}

interface StagingCtx extends StagingState {
  togglePin: (id: string) => void;
  setManualOrder: (orderedIds: string[]) => void;
  clearManualOrdering: () => void;
  addTag: (id: string, tag: string) => void;
  removeTag: (id: string, tag: string) => void;
  setNote: (id: string, text: string) => void;
  addView: (v: Omit<SavedView, "id">) => void;
  removeView: (id: string) => void;
  setActiveView: (id: string) => void;
  recordAction: (e: Omit<TrustEvent, "ts">) => void;
  hasManualOrdering: boolean;
}

const Ctx = createContext<StagingCtx | null>(null);

export function StagingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StagingState>(initial);

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    setState(loadState());
  }, []);

  // Persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const togglePin = useCallback((id: string) => {
    setState((s) => {
      const now = !s.pinned[id];
      return {
        ...s,
        pinned: { ...s.pinned, [id]: now },
        trustHistory: [
          { ts: new Date().toISOString(), action: (now ? "pin" : "unpin") as TrustEvent["action"], requestId: id },
          ...s.trustHistory,
        ].slice(0, 200),
      };
    });
  }, []);

  const setManualOrder = useCallback((orderedIds: string[]) => {
    setState((s) => {
      const next: Record<string, number> = { ...s.manualRank };
      orderedIds.forEach((id, idx) => (next[id] = idx));
      return {
        ...s,
        manualRank: next,
        trustHistory: [
          { ts: new Date().toISOString(), action: "reorder" as const },
          ...s.trustHistory,
        ].slice(0, 200),
      };
    });
  }, []);

  const clearManualOrdering = useCallback(() => {
    setState((s) => ({ ...s, manualRank: {}, pinned: {} }));
  }, []);

  const addTag = useCallback((id: string, tag: string) => {
    const t = tag.trim().toLowerCase();
    if (!t) return;
    setState((s) => {
      const existing = s.tags[id] ?? [];
      if (existing.includes(t)) return s;
      return {
        ...s,
        tags: { ...s.tags, [id]: [...existing, t] },
        trustHistory: [
          { ts: new Date().toISOString(), action: "tag" as const, requestId: id },
          ...s.trustHistory,
        ].slice(0, 200),
      };
    });
  }, []);

  const removeTag = useCallback((id: string, tag: string) => {
    setState((s) => ({
      ...s,
      tags: { ...s.tags, [id]: (s.tags[id] ?? []).filter((t) => t !== tag) },
      trustHistory: [
        { ts: new Date().toISOString(), action: "untag" as const, requestId: id },
        ...s.trustHistory,
      ].slice(0, 200),
    }));
  }, []);

  const setNote = useCallback((id: string, text: string) => {
    setState((s) => ({
      ...s,
      notes: { ...s.notes, [id]: text },
      trustHistory: text.trim()
        ? [
            { ts: new Date().toISOString(), action: "note" as const, requestId: id },
            ...s.trustHistory,
          ].slice(0, 200)
        : s.trustHistory,
    }));
  }, []);

  const addView = useCallback((v: Omit<SavedView, "id">) => {
    setState((s) => {
      const id = `view-${Date.now()}`;
      return { ...s, views: [...s.views, { ...v, id }], activeViewId: id };
    });
  }, []);

  const removeView = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      views: s.views.filter((v) => v.id !== id || v.builtin),
      activeViewId: s.activeViewId === id ? "all" : s.activeViewId,
    }));
  }, []);

  const setActiveView = useCallback((id: string) => {
    setState((s) => ({ ...s, activeViewId: id }));
  }, []);

  const recordAction = useCallback((e: Omit<TrustEvent, "ts">) => {
    setState((s) => ({
      ...s,
      trustHistory: [
        { ts: new Date().toISOString(), ...e },
        ...s.trustHistory,
      ].slice(0, 200),
    }));
  }, []);

  const hasManualOrdering = useMemo(
    () => Object.keys(state.manualRank).length > 0 || Object.values(state.pinned).some(Boolean),
    [state.manualRank, state.pinned],
  );

  return (
    <Ctx.Provider
      value={{
        ...state,
        togglePin,
        setManualOrder,
        clearManualOrdering,
        addTag,
        removeTag,
        setNote,
        addView,
        removeView,
        setActiveView,
        recordAction,
        hasManualOrdering,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStaging() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStaging must be inside StagingProvider");
  return v;
}

/**
 * Heuristic NL matcher for view rules. Splits on commas/and/or, treats each
 * fragment as a keyword that must appear in the haystack (OR across fragments).
 * Special tokens: __pinned__, __has_notes__.
 */
export function matchesView(
  view: SavedView,
  ctx: {
    title: string;
    description: string;
    tags: string[];
    userType: string;
    productArea: string;
    pinned: boolean;
    hasNote: boolean;
  },
): boolean {
  const r = view.rule.trim();
  if (!r) return true;
  if (r === "__pinned__") return ctx.pinned;
  if (r === "__has_notes__") return ctx.hasNote;
  const haystack = [
    ctx.title,
    ctx.description,
    ctx.userType,
    ctx.productArea,
    ctx.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  // Split on common NL separators
  const tokens = r
    .toLowerCase()
    .split(/,| or | and |;|\n/)
    .map((s) => s.replace(/[^\w\s#-]/g, " ").trim())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.some((tok) => {
    const words = tok.split(/\s+/).filter((w) => w.length > 2);
    if (words.length === 0) return false;
    // Match if all meaningful words appear in haystack
    return words.every((w) => haystack.includes(w));
  });
}
