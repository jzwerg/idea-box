import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type GroupBy =
  | "none"
  | "userType"
  | "productArea"
  | "tag"
  | "client"
  | "app"
  | "revenuePotential";
export type ViewScope = "staging" | "outcome" | "all";
export type ViewStage = "ideation" | "pushed" | "dismissed";
export type ParkReason = "low-confidence" | "snoozed";

export interface ParkInfo {
  reason: ParkReason;
  note?: string;
  at: string;
}

export interface SavedView {
  id: string;
  name: string;
  rule: string; // natural-language predicate; matched heuristically
  groupBy: GroupBy;
  scope?: ViewScope; // defaults to "staging" when missing
  stage?: ViewStage; // custom views are scoped to one stage; built-ins are shared
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
    | "group"
    | "park"
    | "unpark";
  requestId?: string;
}

interface StagingState {
  pinned: Record<string, boolean>;
  manualRank: Record<string, number>;
  tags: Record<string, string[]>;
  notes: Record<string, string>;
  parked: Record<string, ParkInfo>;
  views: SavedView[];
  activeViewId: string;
  trustHistory: TrustEvent[];
}

const BUILTIN_VIEWS: SavedView[] = [
  { id: "all", name: "All", rule: "", groupBy: "none", scope: "staging", builtin: true },
  { id: "by-client", name: "By client", rule: "", groupBy: "client", scope: "staging", builtin: true },
  { id: "by-app", name: "By app", rule: "", groupBy: "app", scope: "staging", builtin: true },
  { id: "by-revenue", name: "By revenue", rule: "", groupBy: "revenuePotential", scope: "staging", builtin: true },
  { id: "critical", name: "Critical dissatisfaction", rule: "__critical_dissatisfaction__", groupBy: "none", scope: "staging", builtin: true },
];

const STORAGE_KEY = "signal.staging.v3";


// Seed a few parked items for the demo — gives the Parked tab content on first run.
const SEED_PARKED: Record<string, ParkInfo> = {
  req_019: { reason: "low-confidence", at: new Date().toISOString(), note: "Agent unsure — review" },
  req_025: { reason: "low-confidence", at: new Date().toISOString(), note: "Agent unsure — review" },
  req_015: { reason: "snoozed", at: new Date().toISOString(), note: "Revisit after Q3" },
};

const initial: StagingState = {
  pinned: {},
  manualRank: {},
  tags: {},
  notes: {},
  parked: SEED_PARKED,
  views: BUILTIN_VIEWS,
  activeViewId: "all",
  trustHistory: [],
};

function loadState(): StagingState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<StagingState>;
    const ids = new Set((parsed.views ?? []).map((v) => v.id));
    const merged = [
      ...BUILTIN_VIEWS.filter((v) => !ids.has(v.id)),
      ...(parsed.views ?? []),
    ];
    return {
      ...initial,
      ...parsed,
      parked: parsed.parked ?? SEED_PARKED,
      views: merged,
    } as StagingState;
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
  parkRequest: (id: string, reason?: ParkReason, note?: string) => void;
  unparkRequest: (id: string) => void;
  addView: (v: Omit<SavedView, "id">) => void;
  removeView: (id: string) => void;
  setActiveView: (id: string) => void;
  recordAction: (e: Omit<TrustEvent, "ts">) => void;
  hasManualOrdering: boolean;
}

const Ctx = createContext<StagingCtx | null>(null);

export function StagingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StagingState>(initial);

  useEffect(() => {
    setState(loadState());
  }, []);

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

  const parkRequest = useCallback((id: string, reason: ParkReason = "snoozed", note?: string) => {
    setState((s) => ({
      ...s,
      parked: { ...s.parked, [id]: { reason, note, at: new Date().toISOString() } },
      trustHistory: [
        { ts: new Date().toISOString(), action: "park" as const, requestId: id },
        ...s.trustHistory,
      ].slice(0, 200),
    }));
  }, []);

  const unparkRequest = useCallback((id: string) => {
    setState((s) => {
      const next = { ...s.parked };
      delete next[id];
      return {
        ...s,
        parked: next,
        trustHistory: [
          { ts: new Date().toISOString(), action: "unpark" as const, requestId: id },
          ...s.trustHistory,
        ].slice(0, 200),
      };
    });
  }, []);

  const addView = useCallback((v: Omit<SavedView, "id">) => {
    setState((s) => {
      const id = `view-${Date.now()}`;
      return { ...s, views: [...s.views, { scope: "staging", ...v, id }], activeViewId: id };
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
        parkRequest,
        unparkRequest,
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
    criticalDissatisfaction?: boolean;
  },
): boolean {
  const r = view.rule.trim();
  if (!r) return true;
  if (r === "__pinned__") return ctx.pinned;
  if (r === "__has_notes__") return ctx.hasNote;
  if (r === "__critical_dissatisfaction__") return !!ctx.criticalDissatisfaction;
  const haystack = [
    ctx.title,
    ctx.description,
    ctx.userType,
    ctx.productArea,
    ctx.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  const tokens = r
    .toLowerCase()
    .split(/,| or | and |;|\n/)
    .map((s) => s.replace(/[^\w\s#-]/g, " ").trim())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.some((tok) => {
    const words = tok.split(/\s+/).filter((w) => w.length > 2);
    if (words.length === 0) return false;
    return words.every((w) => haystack.includes(w));
  });
}

const STOPWORDS = new Set([
  "a","an","the","for","to","with","of","and","or","on","in","is","are","be",
  "my","i","we","you","it","this","that","as","at","by","but","if","so","do",
  "can","should","would","could","will","just","need","want","add","make","new",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function scoreRequest(
  idea: string,
  ctx: {
    title: string;
    description: string;
    tags: string[];
    userType: string;
    productArea: string;
  },
): { score: number; hits: string[] } {
  const tokens = tokenize(idea);
  if (tokens.length === 0) return { score: 0, hits: [] };
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }

  const fields: Array<{ text: string; weight: number }> = [
    { text: ctx.title.toLowerCase(), weight: 3 },
    { text: ctx.tags.join(" ").toLowerCase(), weight: 2.5 },
    { text: ctx.productArea.toLowerCase(), weight: 2 },
    { text: ctx.userType.toLowerCase(), weight: 1.5 },
    { text: ctx.description.toLowerCase(), weight: 1 },
  ];

  let score = 0;
  const hits = new Set<string>();
  for (const tok of tokens) {
    for (const f of fields) {
      if (f.text.includes(tok)) {
        score += f.weight;
        hits.add(tok);
      }
    }
  }
  for (const bg of bigrams) {
    for (const f of fields) {
      if (f.text.includes(bg)) {
        score += f.weight * 1.5;
        hits.add(bg);
      }
    }
  }
  return { score, hits: Array.from(hits) };
}
