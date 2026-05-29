import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  type RequestRecord,
  type ProductArea,
  type UserType,
  type Status,
} from "@/lib/mock-requests";
import { DetailDrawer } from "@/components/signal/DetailDrawer";
import { PushJiraDialog } from "@/components/signal/PushJiraDialog";
import { SignalShell } from "@/components/signal/SignalShell";
import { StagingRow } from "@/components/signal/StagingRow";
import { ViewsBar } from "@/components/signal/ViewsBar";
import { ParkedBadge } from "@/components/signal/ParkedBadge";
import { compositeWith, useAgent } from "@/lib/agent-context";
import { useStaging, matchesView } from "@/lib/staging-context";
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

type Stage = "ideation" | "pushed" | "dismissed";

const STAGES: Array<{
  key: Stage;
  label: string;
  emoji: string;
  status: Status;
  tone: string;
  activeTone: string;
}> = [
  {
    key: "ideation",
    label: "Ideation",
    emoji: "💡",
    status: "new",
    tone: "text-muted-foreground hover:text-foreground hover:bg-accent/50",
    activeTone: "bg-gradient-to-br from-primary/15 to-chart-3/10 text-foreground shadow-sm border border-primary/30",
  },
  {
    key: "pushed",
    label: "Pushed",
    emoji: "🚀",
    status: "pushed",
    tone: "text-muted-foreground hover:text-foreground hover:bg-accent/50",
    activeTone: "bg-gradient-to-br from-chart-5/20 to-chart-2/10 text-foreground shadow-sm border border-chart-5/40",
  },
  {
    key: "dismissed",
    label: "Dismissed",
    emoji: "🗑️",
    status: "dismissed",
    tone: "text-muted-foreground hover:text-foreground hover:bg-accent/50",
    activeTone: "bg-muted text-foreground shadow-sm border border-border",
  },
];

function BoxPage() {
  const [requests, setRequests] = useState<RequestRecord[]>(MOCK_REQUESTS);
  const [stage, setStage] = useState<Stage>("ideation");
  const [includeParked, setIncludeParked] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushTargets, setPushTargets] = useState<string[]>([]);

  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState<ProductArea | "all">("all");
  const [userTypeFilter, setUserTypeFilter] = useState<UserType | "all">("all");

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
  } = useStaging();
  const activeView = views.find((v) => v.id === activeViewId) ?? views[0];

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
    update(id, { status: "dismissed" });
    setOpenId(null);
    setSelectedIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    toast.success("Sent to Dismissed");
    if (r) {
      const p = buildProposedRule("dismiss", r);
      if (p) proposeRule(p);
    }
  };

  const bulkDismiss = () => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => update(id, { status: "dismissed" }));
    setSelectedIds(new Set());
    toast.success(`${ids.length} dismissed`);
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
    toast.success(`${ids.length} moved back to Ideation`);
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
      rs.map((r) => (rest.some((x) => x.id === r.id) ? { ...r, status: "dismissed" } : r)),
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
      update(id, { status: "pushed", jiraKey: key });
    });
    toast.success(`${pushTargets.length} shipped to Pushed`);
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
      ideation: requests.filter((r) => r.status === "new" && !parked[r.id]).length,
      pushed: requests.filter((r) => r.status === "pushed").length,
      dismissed: requests.filter((r) => r.status === "dismissed").length,
      parked: requests.filter((r) => r.status === "new" && parked[r.id]).length,
    }),
    [requests, parked],
  );

  const isIdeation = stage === "ideation";

  const visible = useMemo(() => {
    let list = requests.filter((r) => {
      if (stage === "ideation") {
        if (r.status !== "new") return false;
        return includeParked ? true : !parked[r.id];
      }
      return r.status === STAGES.find((s) => s.key === stage)!.status;
    });
    if (areaFilter !== "all") list = list.filter((r) => r.productArea === areaFilter);
    if (userTypeFilter !== "all") list = list.filter((r) => r.userType === userTypeFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
      );
    }
    if (activeView && isIdeation) {
      list = list.filter((r) =>
        matchesView(activeView, {
          title: r.title,
          description: r.description,
          tags: tags[r.id] ?? [],
          userType: r.userType,
          productArea: r.productArea,
          pinned: !!pinned[r.id],
          hasNote: !!(notes[r.id] && notes[r.id].trim()),
        }),
      );
    }
    if (isIdeation) {
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
    isIdeation,
  ]);

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

  return (
    <SignalShell
      rightSlot={
        <>
          <Stat label="In box" value={(counts.ideation + counts.pushed + counts.dismissed).toString()} />
          <Stat label="Active" value={counts.ideation.toString()} accent />
        </>
      }
    >
      {/* Stage tabs — the box's three lanes */}
      <div className="px-6 pt-5 pb-3">
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
                  active ? s.activeTone : `bg-card/40 ${s.tone} border border-transparent`
                }`}
              >
                <span className="text-base leading-none">{s.emoji}</span>
                <span className="font-display">{s.label}</span>
                <span
                  className={`font-mono tabular-nums text-xs rounded-full px-1.5 py-0.5 ${
                    active ? "bg-background/70 text-foreground" : "bg-muted/60 text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {isIdeation && counts.parked > 0 && (
            <button
              onClick={() => setIncludeParked((v) => !v)}
              className={`ml-2 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-colors border ${
                includeParked
                  ? "bg-chart-4/15 text-foreground border-chart-4/40"
                  : "bg-card/40 text-muted-foreground border-border hover:text-foreground"
              }`}
              title="Include parked items"
            >
              <MoonStar className="h-3 w-3" />
              {includeParked ? "Hiding none" : "Show parked"}
              <span className="font-mono">{counts.parked}</span>
            </button>
          )}
        </div>
      </div>

      {/* Views — sub-filters within a stage */}
      {isIdeation && (
        <div className="px-6 py-2.5 flex items-center gap-3 flex-wrap border-y border-border/60 bg-card/30">
          <ViewsBar />
          {hasManualOrdering && (
            <button
              onClick={clearManualOrdering}
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" /> Reset to agent order
            </button>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="border-b border-border/60 bg-background/50 px-6 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search the box…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-9 w-64 text-sm rounded-full bg-card/60"
          />
        </div>
        <Select value={areaFilter} onValueChange={(v) => setAreaFilter(v as ProductArea | "all")}>
          <SelectTrigger className="h-9 w-44 text-sm rounded-full bg-card/60">
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
          <SelectTrigger className="h-9 w-48 text-sm rounded-full bg-card/60">
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
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="border-b border-border/60 bg-primary/[0.06] px-6 py-2 flex items-center justify-between">
          <span className="text-sm">
            <span className="font-mono font-semibold text-primary">{selectedIds.size}</span>
            <span className="text-muted-foreground ml-1.5">selected</span>
          </span>
          <div className="flex items-center gap-2">
            {isIdeation && (
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
            {!isIdeation && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full" onClick={bulkReopen}>
                <RotateCcw className="h-3.5 w-3.5" /> Move to Ideation
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
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
                    {stage === "ideation" && "Box is empty here. Try toggling a view or showing parked items."}
                    {stage === "pushed" && "Nothing pushed yet. Ship something from Ideation 🚀"}
                    {stage === "dismissed" && "No dismissed items."}
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
                    draggable={isIdeation && !includeParked}
                    parkedBadge={
                      isIdeation && parked[r.id] ? (
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono tabular-nums font-semibold ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
