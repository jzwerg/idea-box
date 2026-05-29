import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  GitMerge,
  Trash2,
  Send as SendIcon,
  Users,
  RotateCcw,
  MoonStar,
  ArchiveRestore,
  Lightbulb,
  Flag,
  Rocket,
  Pin,
  StickyNote,
  Layers,
  type LucideIcon,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  MOCK_REQUESTS,
  getClient,
  getApp,
  getRevenuePotential,
  isCriticalDissatisfaction,
  REVENUE_ORDER,
  type RequestRecord,
  type ProductArea,
  type UserType,
  type Status,
} from "@/lib/mock-requests";
import { DetailDrawer } from "@/components/signal/DetailDrawer";
import { PushJiraDialog } from "@/components/signal/PushJiraDialog";
import { SignalShell } from "@/components/signal/SignalShell";
import { StagingRow } from "@/components/signal/StagingRow";
import { StagingView } from "@/components/signal/StagingView";
import { ViewsBar } from "@/components/signal/ViewsBar";
import { ParkedBadge } from "@/components/signal/ParkedBadge";
import { compositeWith, useAgent } from "@/lib/agent-context";
import { useStaging, matchesView, type GroupBy } from "@/lib/staging-context";
import { buildProposedRule } from "@/lib/teach";

export const Route = createFileRoute("/box")({
  head: () => ({
    meta: [
      { title: "Box — IdeaBox" },
      {
        name: "description",
        content: "Every idea in one box. Triage, ship, or archive — all in one playful surface.",
      },
    ],
  }),
  component: BoxPage,
});

const AREAS: ProductArea[] = [
  "Reporting",
  "KYC",
  "Transaction Monitoring",
  "Risk Engine",
  "Client Portal",
];

const USER_TYPES: UserType[] = [
  "Compliance Officer",
  "Risk Analyst",
  "KYC Analyst",
  "Operations Lead",
  "Client Admin",
  "Exec Sponsor",
];

type Stage = "spark" | "shape" | "launch" | "shelve";

const STAGE_TONE = {
  idle: "bg-chip text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent",
  active: "bg-card text-foreground border border-border shadow-sm",
};

const STAGES: Array<{
  key: Stage;
  label: string;
  Icon: LucideIcon;
  status: Status | null;
}> = [
  { key: "spark", label: "Spark", Icon: Layers, status: null },
  { key: "shape", label: "Shape", Icon: Lightbulb, status: "new" },
  { key: "launch", label: "Launch", Icon: Rocket, status: "launch" },
  { key: "shelve", label: "Shelve", Icon: Trash2, status: "shelve" },
];

function BoxPage() {
  const [requests, setRequests] = useState<RequestRecord[]>(MOCK_REQUESTS);
  const [stage, setStage] = useState<Stage>("shape");
  const [includeParked, setIncludeParked] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [hasNotesOnly, setHasNotesOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushTargets, setPushTargets] = useState<string[]>([]);

  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState<ProductArea | "all">("all");
  const [userTypeFilter, setUserTypeFilter] = useState<UserType | "all">("all");
  const [flagFilter, setFlagFilter] = useState<
    "all" | "critical" | "high" | "medium" | "low" | "dissatisfaction"
  >("all");

  const { weights, registerApply, proposeRule } = useAgent();
  const {
    views,
    activeViewId,
    pinned,
    manualRank,
    tags,
    notes,
    parked,
    setManualOrder,
    clearManualOrdering,
    hasManualOrdering,
    parkRequest,
    unparkRequest,
    setActiveView,
  } = useStaging();
  const activeView = views.find((v) => v.id === activeViewId) ?? views[0];

  // Scroll detection — when stage chips scroll out of the sticky header,
  // show a compact stage/view picker in the header itself.
  const chipsSentinelRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const el = chipsSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    registerApply(({ instructions, runInstructions }) => {
      const combined = `${instructions} ${runInstructions ?? ""}`.toLowerCase();
      const boosts: Array<{ re: RegExp; field: "impact" | "urgency" | "reach"; amt: number }> = [
        { re: /enterprise|procurement|sso|fido|okta|azure/i, field: "impact", amt: 8 },
        { re: /compliance|regulat|amld|deadline|audit/i, field: "urgency", amt: 8 },
        { re: /revenue|churn|retention|deal/i, field: "impact", amt: 6 },
        { re: /reach|broad|many clients|quality-of-life/i, field: "reach", amt: 5 },
      ];
      let rescored = 0;
      let topMover: { title: string; delta: number } | undefined;
      setRequests((rs) =>
        rs.map((r) => {
          if (r.status !== "new") return r;
          const before = compositeWith(r.priority, weights);
          const next = { ...r.priority };
          (Object.keys(next) as Array<keyof typeof next>).forEach((k) => {
            const jitter = Math.round((Math.random() - 0.5) * 6);
            next[k] = { ...next[k], value: Math.max(0, Math.min(100, next[k].value + jitter)) };
          });
          for (const b of boosts) {
            if (b.re.test(`${r.title} ${r.description} ${combined}`)) {
              next[b.field] = { ...next[b.field], value: Math.min(100, next[b.field].value + b.amt) };
            }
          }
          const after = compositeWith(next, weights);
          const delta = after - before;
          if (delta !== 0) rescored += 1;
          if (!topMover || Math.abs(delta) > Math.abs(topMover.delta)) {
            topMover = { title: r.title, delta };
          }
          return { ...r, priority: next };
        }),
      );
      return { rescored, topMover };
    });
    return () => registerApply(null);
  }, [registerApply, weights]);

  const update = (id: string, patch: Partial<RequestRecord>) => {
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const dismiss = (id: string) => {
    const r = requests.find((x) => x.id === id);
    update(id, { status: "shelve" });
    setOpenId(null);
    setSelectedIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    toast.success("Sent to Shelve");
    if (r) {
      const p = buildProposedRule("dismiss", r);
      if (p) proposeRule(p);
    }
  };

  const bulkDismiss = () => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => update(id, { status: "shelve" }));
    setSelectedIds(new Set());
    toast.success(`${ids.length} shelved`);
  };

  const bulkPark = () => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => parkRequest(id, "snoozed"));
    setSelectedIds(new Set());
    toast.success(`${ids.length} parked`);
  };

  const bulkUnpark = () => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => unparkRequest(id));
    setSelectedIds(new Set());
    toast.success(`${ids.length} unparked`);
  };

  const bulkReopen = () => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => update(id, { status: "new", jiraKey: undefined }));
    setSelectedIds(new Set());
    toast.success(`${ids.length} moved back to Shape`);
  };

  const merge = () => {
    const ids = Array.from(selectedIds);
    if (ids.length < 2) return;
    const items = requests.filter((r) => ids.includes(r.id));
    const [keeper, ...rest] = items;
    const mergedMentions = items.flatMap((r) => r.mentions);
    const mergedFreq = items.reduce((sum, r) => sum + r.frequency, 0);
    update(keeper.id, {
      mentions: mergedMentions,
      frequency: mergedFreq,
      description: keeper.description + "\n\nMerged from: " + rest.map((r) => r.title).join(", "),
    });
    setRequests((rs) =>
      rs.map((r) => (rest.some((x) => x.id === r.id) ? { ...r, status: "shelve" } : r)),
    );
    setSelectedIds(new Set([keeper.id]));
    toast.success(`Merged ${ids.length}`);
  };

  const openPush = (ids: string[]) => {
    setPushTargets(ids);
    setPushOpen(true);
  };

  const confirmPush = (project: string) => {
    pushTargets.forEach((id, idx) => {
      const key = `${project}-${1240 + idx}`;
      update(id, { status: "launch", jiraKey: key });
    });
    toast.success(`${pushTargets.length} shipped to Launch`);
    const r = requests.find((x) => x.id === pushTargets[0]);
    if (r) {
      const p = buildProposedRule("push", r);
      if (p) proposeRule(p);
    }
    setPushOpen(false);
    setSelectedIds(new Set());
    setOpenId(null);
    setPushTargets([]);
  };

  const counts = useMemo(
    () => ({
      spark: 10, // mock pull count — see StagingView
      shape: requests.filter((r) => r.status === "new" && !parked[r.id]).length,
      launch: requests.filter((r) => r.status === "launch").length,
      shelve: requests.filter((r) => r.status === "shelve").length,
      parked: requests.filter((r) => r.status === "new" && parked[r.id]).length,
    }),
    [requests, parked],
  );

  const isShape = stage === "shape";

  const visible = useMemo(() => {
    let list = requests.filter((r) => {
      if (stage === "shape") {
        if (r.status !== "new") return false;
        return includeParked ? true : !parked[r.id];
      }
      return r.status === STAGES.find((s) => s.key === stage)!.status;
    });
    if (areaFilter !== "all") list = list.filter((r) => r.productArea === areaFilter);
    if (userTypeFilter !== "all") list = list.filter((r) => r.userType === userTypeFilter);
    if (flagFilter !== "all") {
      list = list.filter((r) =>
        flagFilter === "dissatisfaction"
          ? isCriticalDissatisfaction(r)
          : getRevenuePotential(r) === flagFilter,
      );
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
      );
    }
    if (pinnedOnly) list = list.filter((r) => !!pinned[r.id]);
    if (hasNotesOnly) list = list.filter((r) => !!(notes[r.id] && notes[r.id].trim()));
    if (activeView && stage !== "spark") {
      list = list.filter((r) =>
        matchesView(activeView, {
          title: r.title,
          description: r.description,
          tags: tags[r.id] ?? [],
          userType: r.userType,
          productArea: r.productArea,
          pinned: !!pinned[r.id],
          hasNote: !!(notes[r.id] && notes[r.id].trim()),
          criticalDissatisfaction: isCriticalDissatisfaction(r),
        }),
      );
    }
    if (isShape) {
      list = [...list].sort((a, b) => {
        const pa = pinned[a.id] ? 1 : 0;
        const pb = pinned[b.id] ? 1 : 0;
        if (pa !== pb) return pb - pa;
        const ra = manualRank[a.id];
        const rb = manualRank[b.id];
        if (ra != null && rb != null) return ra - rb;
        if (ra != null) return -1;
        if (rb != null) return 1;
        return compositeWith(b.priority, weights) - compositeWith(a.priority, weights);
      });
    } else {
      list = [...list].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    }
    return list;
  }, [
    requests,
    stage,
    includeParked,
    areaFilter,
    userTypeFilter,
    query,
    weights,
    activeView,
    pinned,
    manualRank,
    tags,
    notes,
    parked,
    isShape,
    pinnedOnly,
    hasNotesOnly,
    flagFilter,
  ]);

  const groupKeyOf = (r: RequestRecord, gb: GroupBy): string => {
    switch (gb) {
      case "client": return getClient(r);
      case "app": return getApp(r);
      case "revenuePotential": return getRevenuePotential(r);
      case "userType": return r.userType;
      case "productArea": return r.productArea;
      case "tag": return (tags[r.id] ?? [])[0] ?? "—";
      default: return "";
    }
  };

  const grouped = useMemo(() => {
    if (!activeView || activeView.groupBy === "none" || !isShape) return null;
    const gb = activeView.groupBy;
    const map = new Map<string, RequestRecord[]>();
    for (const r of visible) {
      const k = groupKeyOf(r, gb);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    let keys = Array.from(map.keys());
    if (gb === "revenuePotential") {
      keys.sort((a, b) => (REVENUE_ORDER[a as keyof typeof REVENUE_ORDER] ?? 99) - (REVENUE_ORDER[b as keyof typeof REVENUE_ORDER] ?? 99));
    } else {
      keys.sort();
    }
    return keys.map((k) => ({ key: k, items: map.get(k)! }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, activeView, isShape, tags]);


  const allVisibleChecked = visible.length > 0 && visible.every((r) => selectedIds.has(r.id));

  const toggleAll = () => {
    setSelectedIds((s) => {
      const n = new Set(s);
      if (allVisibleChecked) visible.forEach((r) => n.delete(r.id));
      else visible.forEach((r) => n.add(r.id));
      return n;
    });
  };

  const openRequest = requests.find((r) => r.id === openId) ?? null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = visible.map((r) => r.id);
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(ids, oldIdx, newIdx);
    setManualOrder(next);
    const moved = requests.find((r) => r.id === active.id) ?? null;
    const p = buildProposedRule(newIdx < oldIdx ? "reorder-up" : "reorder-down", moved);
    if (p) proposeRule(p);
  };

  const visibleIds = visible.map((r) => r.id);

  const isSpark = stage === "spark";

  const currentStageInfo = STAGES.find((s) => s.key === stage)!;
  const visibleViews = views.filter(
    (v) => v.builtin || !v.stage || v.stage === stage,
  );

  return (
    <SignalShell
      headerInline={
        collapsed ? (
          <CompactPicker
            stage={stage}
            stageLabel={currentStageInfo.label}
            StageIcon={currentStageInfo.Icon}
            onStageChange={(k) => {
              setStage(k);
              setSelectedIds(new Set());
            }}
            viewName={isSpark ? undefined : activeView?.name ?? "All"}
            views={isSpark ? undefined : visibleViews.map((v) => ({ id: v.id, name: v.name }))}
            onViewChange={setActiveView}
          />
        ) : null
      }
    >
      {/* Stage chips — outside the box, on the page surface */}
      <div ref={chipsSentinelRef} className="px-6 pt-6 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {STAGES.map((s) => {
            const active = stage === s.key;
            const count = counts[s.key];
            return (
              <button
                key={s.key}
                onClick={() => {
                  setStage(s.key);
                  setSelectedIds(new Set());
                }}
                className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all flex items-center gap-2 ${
                  active ? STAGE_TONE.active : STAGE_TONE.idle
                }`}
              >
                <s.Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                <span className="font-display">{s.label}</span>
                <span
                  className={`font-mono tabular-nums text-xs rounded-full px-1.5 py-0.5 ${
                    active ? "bg-background/70 text-foreground" : "bg-card text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>


      {/* The Box — bordered surface that holds all stage content */}
      {/* The Box — bordered surface that holds all stage content */}
      <div className="px-6 pb-6">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">

          {isSpark ? (
            <StagingView />
          ) : (
            <>
              {/* Views — sub-filters within a stage */}
              <div className="px-5 py-2.5 flex items-center gap-3 flex-wrap border-b border-border/60 bg-chip/60">
                <ViewsBar currentStage={stage as "shape" | "launch" | "shelve"} />
                {isShape && (
                  <div className="ml-auto flex items-center gap-2">
                    {hasManualOrdering && (
                      <button
                        onClick={clearManualOrdering}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset to agent order
                      </button>
                    )}
                    {counts.parked > 0 && (
                      <button
                        onClick={() => setIncludeParked((v) => !v)}
                        className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-colors border ${
                          includeParked
                            ? "bg-accent text-foreground border-border"
                            : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:bg-accent/50"
                        }`}
                        title="Include parked items"
                      >
                        <MoonStar className="h-3 w-3" />
                        {includeParked ? "Hide parked" : "Show parked"}
                        <span className="font-mono tabular-nums">{counts.parked}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Filter bar */}
              <div className="border-b border-border/60 bg-chip/40 px-5 py-2.5 flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search the box…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9 h-9 w-64 text-sm rounded-full bg-card"
                  />
                </div>
                <Select value={areaFilter} onValueChange={(v) => setAreaFilter(v as ProductArea | "all")}>
                  <SelectTrigger className="h-9 w-44 text-sm rounded-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All product areas</SelectItem>
                    {AREAS.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={userTypeFilter} onValueChange={(v) => setUserTypeFilter(v as UserType | "all")}>
                  <SelectTrigger className="h-9 w-48 text-sm rounded-full bg-card">
                    <Users className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All user types</SelectItem>
                    {USER_TYPES.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={flagFilter} onValueChange={(v) => setFlagFilter(v as typeof flagFilter)}>
                  <SelectTrigger className="h-9 w-48 text-sm rounded-full bg-card">
                    <Flag className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All flags</SelectItem>
                    <SelectItem value="critical">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[oklch(0.66_0.17_25)]" />
                        Critical revenue
                      </span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[oklch(0.74_0.13_75)]" />
                        High revenue
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[oklch(0.6_0.14_250)]" />
                        Medium revenue
                      </span>
                    </SelectItem>
                    <SelectItem value="low">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[oklch(0.85_0.01_250)]" />
                        Low revenue
                      </span>
                    </SelectItem>
                    <SelectItem value="dissatisfaction">
                      <span className="inline-flex items-center gap-2 text-destructive">
                        <Flag className="h-3 w-3" strokeWidth={2.5} />
                        Critical dissatisfaction
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk action bar */}
              {selectedIds.size > 0 && (
                <div className="border-b border-border/60 bg-primary/[0.06] px-5 py-2 flex items-center justify-between">
                  <span className="text-sm">
                    <span className="font-mono font-semibold text-primary">{selectedIds.size}</span>
                    <span className="text-muted-foreground ml-1.5">selected</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {isShape && (
                      <>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full" disabled={selectedIds.size < 2} onClick={merge}>
                          <GitMerge className="h-3.5 w-3.5" /> Merge
                        </Button>
                        {!includeParked ? (
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full" onClick={bulkPark}>
                            <MoonStar className="h-3.5 w-3.5" /> Park
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full" onClick={bulkUnpark}>
                            <ArchiveRestore className="h-3.5 w-3.5" /> Unpark
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full" onClick={bulkDismiss}>
                          <Trash2 className="h-3.5 w-3.5" /> Dismiss
                        </Button>
                        <Button size="sm" className="h-8 gap-1.5 rounded-full" onClick={() => openPush(Array.from(selectedIds))}>
                          <SendIcon className="h-3.5 w-3.5" /> Push to Jira
                        </Button>
                      </>
                    )}
                    {!isShape && (
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full" onClick={bulkReopen}>
                        <RotateCcw className="h-3.5 w-3.5" /> Move to Shape
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Table */}
              <div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <table className="w-full text-sm">
                    <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60 sticky top-[49px] z-20 bg-card shadow-[0_1px_0_0_var(--border)]">


                      <tr>
                        <th className="w-8 px-2 py-2.5"></th>
                        <th className="w-8 px-1 py-2.5"></th>
                        <th className="w-8 px-2 py-2.5 text-left">
                          <Checkbox checked={allVisibleChecked} onCheckedChange={toggleAll} />
                        </th>
                        <th className="w-10 px-1 py-2.5 text-left font-mono">#</th>
                        <th className="px-2 py-2.5 text-left font-medium">Request</th>
                        <th className="px-2 py-2.5 text-left font-medium w-40">Area</th>
                        <th className="px-2 py-2.5 text-left font-medium w-28">Sources</th>
                        <th className="px-2 py-2.5 text-right font-medium w-16">Freq</th>
                        <th className="px-2 py-2.5 text-left font-medium w-40">Priority</th>
                        <th className="w-10 px-2 py-2.5"></th>
                        <th className="px-4 py-2.5 text-right font-medium w-28">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.length === 0 && (
                        <tr>
                          <td colSpan={11} className="text-center py-20 text-muted-foreground text-sm">
                            {stage === "shape" && "Box is empty here. Try toggling a view or showing parked items."}
                            {stage === "launch" && "Nothing launched yet. Ship something from Shape."}
                            {stage === "shelve" && "No shelved items."}
                          </td>
                        </tr>
                      )}
                      <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
                        {visible.map((r, idx) => (
                          <StagingRow
                            key={r.id}
                            request={r}
                            index={idx}
                            checked={selectedIds.has(r.id)}
                            onCheck={(c) =>
                              setSelectedIds((s) => {
                                const n = new Set(s);
                                if (c) n.add(r.id);
                                else n.delete(r.id);
                                return n;
                              })
                            }
                            onOpen={() => setOpenId(r.id)}
                            showCheckbox={true}
                            draggable={isShape && !includeParked}
                            parkedBadge={
                              isShape && parked[r.id] ? (
                                <ParkedBadge info={parked[r.id]} onUnpark={() => unparkRequest(r.id)} />
                              ) : null
                            }
                          />
                        ))}
                      </SortableContext>
                    </tbody>
                  </table>
                </DndContext>
              </div>
            </>
          )}
        </div>
      </div>

      <DetailDrawer
        request={openRequest}
        onClose={() => setOpenId(null)}
        onUpdate={update}
        onDismiss={dismiss}
        onPush={openPush}
      />
      <PushJiraDialog
        open={pushOpen}
        onOpenChange={setPushOpen}
        requests={requests.filter((r) => pushTargets.includes(r.id))}
        onConfirm={confirmPush}
      />
    </SignalShell>
  );
}

function CompactPicker({
  stage,
  stageLabel,
  StageIcon,
  onStageChange,
  viewName,
  views,
  onViewChange,
}: {
  stage: Stage;
  stageLabel: string;
  StageIcon: LucideIcon;
  onStageChange: (k: Stage) => void;
  viewName?: string;
  views?: Array<{ id: string; name: string }>;
  onViewChange?: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-200 min-w-0">
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium text-foreground bg-chip hover:bg-accent border border-border/60 transition-colors outline-none">
          <StageIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
          <span className="font-display">{stageLabel}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" strokeWidth={2.25} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6}>
          {STAGES.map((s) => (
            <DropdownMenuItem
              key={s.key}
              onSelect={() => onStageChange(s.key)}
              className={`gap-2 ${s.key === stage ? "font-medium" : ""}`}
            >
              <s.Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              <span>{s.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {views && views.length > 0 && viewName && (
        <>
          <span className="text-border/80 text-xs select-none">/</span>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium text-foreground bg-chip hover:bg-accent border border-border/60 transition-colors outline-none min-w-0">
              <LayoutGrid className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
              <span className="truncate">{viewName}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" strokeWidth={2.25} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={6}>
              {views.map((v) => (
                <DropdownMenuItem
                  key={v.id}
                  onSelect={() => onViewChange?.(v.id)}
                  className={v.name === viewName ? "font-medium" : ""}
                >
                  {v.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}

