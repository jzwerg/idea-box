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
  Lightbulb,
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
} from "@/lib/mock-requests";
import { DetailDrawer } from "@/components/signal/DetailDrawer";
import { PushJiraDialog } from "@/components/signal/PushJiraDialog";
import { SignalShell } from "@/components/signal/SignalShell";
import { StagingRow } from "@/components/signal/StagingRow";
import { ViewsBar } from "@/components/signal/ViewsBar";
import { BrainstormSheet } from "@/components/signal/BrainstormSheet";
import { ParkedBadge } from "@/components/signal/ParkedBadge";
import { compositeWith, useAgent } from "@/lib/agent-context";
import { useStaging, matchesView } from "@/lib/staging-context";
import { buildProposedRule } from "@/lib/teach";

export const Route = createFileRoute("/staging")({
  head: () => ({
    meta: [
      { title: "Staging — Signal" },
      {
        name: "description",
        content: "The triage surface: prioritized incoming requests, ready to push or dismiss.",
      },
    ],
  }),
  component: StagingPage,
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

type SubTab = "all" | "parked";

function StagingPage() {
  const [requests, setRequests] = useState<RequestRecord[]>(MOCK_REQUESTS);
  const [sub, setSub] = useState<SubTab>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushTargets, setPushTargets] = useState<string[]>([]);
  const [brainstormOpen, setBrainstormOpen] = useState(false);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "b" && e.key !== "B") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      if (t?.isContentEditable) return;
      e.preventDefault();
      setBrainstormOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    toast.success("Request dismissed");
    if (r) {
      const p = buildProposedRule("dismiss", r);
      if (p) proposeRule(p);
    }
  };

  const bulkDismiss = () => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => update(id, { status: "dismissed" }));
    setSelectedIds(new Set());
    toast.success(`${ids.length} requests dismissed`);
    const r = requests.find((x) => x.id === ids[0]);
    if (r) {
      const p = buildProposedRule("dismiss", r);
      if (p) proposeRule(p);
    }
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
    toast.success(`${ids.length} moved back to staging`);
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
    toast.success(`Merged ${ids.length} requests`);
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
    toast.success(`${pushTargets.length} ticket${pushTargets.length === 1 ? "" : "s"} created`);
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

  const parkedCount = useMemo(
    () => requests.filter((r) => r.status === "new" && parked[r.id]).length,
    [requests, parked],
  );

  const visible = useMemo(() => {
    let list = requests.filter((r) => r.status === "new");
    list = sub === "parked" ? list.filter((r) => parked[r.id]) : list.filter((r) => !parked[r.id]);
    if (areaFilter !== "all") list = list.filter((r) => r.productArea === areaFilter);
    if (userTypeFilter !== "all") list = list.filter((r) => r.userType === userTypeFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
      );
    }
    if (activeView && sub === "all") {
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
    return list;
  }, [
    requests,
    sub,
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
  ]);

  const newCount = requests.filter((r) => r.status === "new" && !parked[r.id]).length;
  const avgConf =
    requests.filter((r) => r.status === "new").reduce((s, r) => s + r.confidence, 0) /
    Math.max(1, requests.filter((r) => r.status === "new").length);

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
  const isParkedTab = sub === "parked";

  return (
    <SignalShell
      rightSlot={
        <>
          <Stat label="In staging" value={newCount.toString()} />
          <Stat label="Avg confidence" value={`${Math.round(avgConf * 100)}%`} />
        </>
      }
    >
      {/* Staging sub-tabs */}
      <div className="border-b bg-card/20 px-6 py-1.5 flex items-center gap-1">
        <button
          onClick={() => { setSub("all"); setSelectedIds(new Set()); }}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            sub === "all" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All
          {newCount > 0 && <span className="ml-2 font-mono text-[10px] text-primary">{newCount}</span>}
        </button>
        <button
          onClick={() => { setSub("parked"); setSelectedIds(new Set()); }}
          className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
            sub === "parked" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MoonStar className="h-3 w-3" />
          Parked
          {parkedCount > 0 && <span className="font-mono text-[10px] text-muted-foreground">{parkedCount}</span>}
        </button>
        <div className="ml-auto text-[10px] text-muted-foreground">
          {isParkedTab ? "Off-stage. Reasons: low-confidence or snoozed." : "Triage queue · drag to reorder, pin to keep on top."}
        </div>
      </div>

      {/* Views + brainstorm (only on All) */}
      {sub === "all" && (
        <div className="border-b bg-background/60 px-6 py-2.5 flex items-center gap-3 flex-wrap">
          <ViewsBar />
          <button
            onClick={() => setBrainstormOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500/40 px-2.5 py-1 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            title="Brainstorm (B)"
          >
            <Lightbulb className="h-3 w-3" /> Brainstorm
          </button>
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
      <div className="border-b bg-background/40 px-6 py-2 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 w-56 text-sm"
          />
        </div>
        <Select value={areaFilter} onValueChange={(v) => setAreaFilter(v as ProductArea | "all")}>
          <SelectTrigger className="h-8 w-44 text-sm">
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
          <SelectTrigger className="h-8 w-48 text-sm">
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
        <div className="border-b bg-primary/5 px-6 py-2 flex items-center justify-between">
          <span className="text-sm">
            <span className="font-mono font-semibold text-primary">{selectedIds.size}</span>
            <span className="text-muted-foreground ml-1.5">selected</span>
          </span>
          <div className="flex items-center gap-2">
            {!isParkedTab && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={selectedIds.size < 2} onClick={merge}>
                <GitMerge className="h-3.5 w-3.5" /> Merge
              </Button>
            )}
            {isParkedTab ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={bulkUnpark}>
                <ArchiveRestore className="h-3.5 w-3.5" /> Move to staging
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={bulkPark}>
                <MoonStar className="h-3.5 w-3.5" /> Park
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={bulkDismiss}>
              <Trash2 className="h-3.5 w-3.5" /> Dismiss
            </Button>
            {!isParkedTab && (
              <Button size="sm" className="h-8 gap-1.5" onClick={() => openPush(Array.from(selectedIds))}>
                <SendIcon className="h-3.5 w-3.5" /> Push to Jira
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b">
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
                <th className="px-4 py-2.5 text-right font-medium w-28">
                  {isParkedTab ? "Parked" : "Status"}
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-muted-foreground text-sm">
                    {isParkedTab
                      ? "Nothing parked. Snooze items here to keep them off staging."
                      : "No requests match this view."}
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
                    draggable={!isParkedTab}
                    parkedBadge={
                      isParkedTab && parked[r.id] ? (
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
      <BrainstormSheet
        open={brainstormOpen}
        onOpenChange={setBrainstormOpen}
        requests={requests}
        onOpenRequest={setOpenId}
      />
    </SignalShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums font-semibold text-foreground">{value}</span>
    </div>
  );
}
