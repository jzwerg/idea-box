import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Send,
  ArrowUpDown,
  Users,
} from "lucide-react";
import {
  MOCK_REQUESTS,
  compositeScore,
  type RequestRecord,
  type Status,
  type ProductArea,
  type UserType,
} from "@/lib/mock-requests";
import { SourceBadge } from "@/components/signal/SourceBadge";
import { PriorityBar } from "@/components/signal/PriorityBar";
import { DetailDrawer } from "@/components/signal/DetailDrawer";
import { PushJiraDialog } from "@/components/signal/PushJiraDialog";
import { SignalShell } from "@/components/signal/SignalShell";
import { Link } from "@tanstack/react-router";
import { Brain } from "lucide-react";
import { useAgent, compositeWith } from "@/lib/agent-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Signal — Feature request triage" },
      {
        name: "description",
        content:
          "An AI triage layer that turns scattered user feedback into a prioritized, push-ready request backlog.",
      },
      { property: "og:title", content: "Signal — Feature request triage" },
      {
        property: "og:description",
        content:
          "An AI triage layer that turns scattered user feedback into a prioritized, push-ready request backlog.",
      },
    ],
  }),
  component: SignalDashboard,
});

const TABS: Array<{ key: Status | "all"; label: string }> = [
  { key: "new", label: "Staging" },
  { key: "pushed", label: "Pushed" },
  { key: "dismissed", label: "Dismissed" },
];

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

const USER_TYPE_TONE: Record<UserType, string> = {
  "Compliance Officer": "border-destructive/40 text-destructive",
  "Risk Analyst": "border-chart-4/40 text-chart-4",
  "KYC Analyst": "border-chart-2/40 text-chart-2",
  "Operations Lead": "border-chart-3/40 text-chart-3",
  "Client Admin": "border-chart-5/40 text-chart-5",
  "Exec Sponsor": "border-primary/40 text-primary",
};


type SortKey = "priority" | "frequency" | "confidence" | "created";

function SignalDashboard() {
  const [requests, setRequests] = useState<RequestRecord[]>(MOCK_REQUESTS);
  const [tab, setTab] = useState<Status>("new");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushTargets, setPushTargets] = useState<string[]>([]);

  // filters
  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState<ProductArea | "all">("all");
  const [userTypeFilter, setUserTypeFilter] = useState<UserType | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const { weights, registerApply, runs: agentRuns, status: agentStatus } = useAgent();

  // Register the apply callback so the agent can rescore requests
  useEffect(() => {
    registerApply(({ instructions, runInstructions }) => {
      const combined = `${instructions} ${runInstructions ?? ""}`.toLowerCase();
      // Keyword nudges based on instructions
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
            // small jitter so the agent feels alive
            const jitter = Math.round((Math.random() - 0.5) * 6);
            next[k] = {
              ...next[k],
              value: Math.max(0, Math.min(100, next[k].value + jitter)),
            };
          });
          // apply keyword boosts
          for (const b of boosts) {
            if (b.re.test(`${r.title} ${r.description} ${combined}`)) {
              next[b.field] = {
                ...next[b.field],
                value: Math.min(100, next[b.field].value + b.amt),
              };
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
    update(id, { status: "dismissed" });
    setOpenId(null);
    setSelectedIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    toast.success("Request dismissed", { description: "Archived, not deleted." });
  };

  const bulkDismiss = () => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => update(id, { status: "dismissed" }));
    setSelectedIds(new Set());
    toast.success(`${ids.length} requests dismissed`);
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
      description:
        keeper.description +
        "\n\nMerged from: " +
        rest.map((r) => r.title).join(", "),
    });
    setRequests((rs) =>
      rs.map((r) =>
        rest.some((x) => x.id === r.id) ? { ...r, status: "dismissed" } : r,
      ),
    );
    setSelectedIds(new Set([keeper.id]));
    toast.success(`Merged ${ids.length} requests`, {
      description: `Frequency now ${mergedFreq}. Kept "${keeper.title}".`,
    });
  };

  const openPush = (ids: string[]) => {
    setPushTargets(ids);
    setPushOpen(true);
  };

  const confirmPush = (project: string, _issueType: string) => {
    pushTargets.forEach((id, idx) => {
      const key = `${project}-${1240 + idx}`;
      update(id, { status: "pushed", jiraKey: key });
    });
    toast.success(`${pushTargets.length} ticket${pushTargets.length === 1 ? "" : "s"} created`, {
      description: `Pushed to ${project}.`,
    });
    setPushOpen(false);
    setSelectedIds(new Set());
    setOpenId(null);
    setPushTargets([]);
  };

  const visible = useMemo(() => {
    let list = requests.filter((r) => r.status === tab);
    if (areaFilter !== "all") list = list.filter((r) => r.productArea === areaFilter);
    if (userTypeFilter !== "all") list = list.filter((r) => r.userType === userTypeFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      );
    }
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "frequency":
          return b.frequency - a.frequency;
        case "confidence":
          return b.confidence - a.confidence;
        case "created":
          return b.createdAt.localeCompare(a.createdAt);
        case "priority":
        default:
          return compositeWith(b.priority, weights) - compositeWith(a.priority, weights);
      }
    });
    return list;
  }, [requests, tab, areaFilter, userTypeFilter, query, sortKey]);

  const newCount = requests.filter((r) => r.status === "new").length;
  const topUserType = (() => {
    const counts = new Map<UserType, number>();
    requests
      .filter((r) => r.status === "new")
      .forEach((r) => counts.set(r.userType, (counts.get(r.userType) ?? 0) + 1));
    const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return entries[0] ? { type: entries[0][0], n: entries[0][1] } : null;
  })();
  const avgConf =
    requests.filter((r) => r.status === "new").reduce((s, r) => s + r.confidence, 0) /
    Math.max(1, newCount);

  const allVisibleChecked =
    visible.length > 0 && visible.every((r) => selectedIds.has(r.id));

  const toggleAll = () => {
    setSelectedIds((s) => {
      const n = new Set(s);
      if (allVisibleChecked) {
        visible.forEach((r) => n.delete(r.id));
      } else {
        visible.forEach((r) => n.add(r.id));
      }
      return n;
    });
  };

  const openRequest = requests.find((r) => r.id === openId) ?? null;
  const selectedRequests = requests.filter((r) => selectedIds.has(r.id));

  return (
    <SignalShell
      rightSlot={
        <>
          <Stat label="New this week" value={newCount.toString()} />
          <Stat label="Avg confidence" value={`${Math.round(avgConf * 100)}%`} />
          <Stat
            label="Top user type"
            value={topUserType ? `${topUserType.type} · ${topUserType.n}` : "—"}
          />
        </>
      }
      {/* Agent banner — visible at all times */}
      <div className="border-b bg-primary/[0.04] px-6 py-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Brain
            className={`h-3.5 w-3.5 ${
              agentStatus === "running" ? "text-primary animate-pulse" : "text-primary/70"
            }`}
          />
          <span>Prioritization agent</span>
          <span className="text-muted-foreground/60">·</span>
          {agentStatus === "running" ? (
            <span className="text-primary">Rescoring staging…</span>
          ) : agentRuns[0] ? (
            <span>
              Last run{" "}
              <span className="text-foreground">
                {new Date(agentRuns[0].startedAt).toLocaleTimeString()}
              </span>{" "}
              ({agentRuns[0].trigger}) — rescored{" "}
              <span className="font-mono text-foreground">{agentRuns[0].rescored}</span>
              {agentRuns[0].topMover && (
                <>
                  , top mover{" "}
                  <span className="text-foreground">{agentRuns[0].topMover.title}</span>{" "}
                  <span
                    className={`font-mono ${
                      agentRuns[0].topMover.delta >= 0 ? "text-chart-2" : "text-destructive"
                    }`}
                  >
                    {agentRuns[0].topMover.delta >= 0 ? "+" : ""}
                    {agentRuns[0].topMover.delta}
                  </span>
                </>
              )}
            </span>
          ) : (
            <span>Waiting for the first batch.</span>
          )}
        </div>
        <Link
          to="/agent"
          className="text-primary hover:underline font-medium flex items-center gap-1"
        >
          Tune & run →
        </Link>
      </div>

      {/* Status sub-tabs */}
      <div className="border-b bg-card/20 px-6 py-1.5 flex items-center gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key as Status);
              setSelectedIds(new Set());
            }}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              tab === t.key
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.key === "new" && newCount > 0 && (
              <span className="ml-2 font-mono text-[10px] text-primary">{newCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="border-b bg-background/60 px-6 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search requests…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 w-64 text-sm"
          />
        </div>
        <Select value={areaFilter} onValueChange={(v) => setAreaFilter(v as ProductArea | "all")}>
          <SelectTrigger className="h-8 w-48 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All product areas</SelectItem>
            {AREAS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={userTypeFilter}
          onValueChange={(v) => setUserTypeFilter(v as UserType | "all")}
        >
          <SelectTrigger className="h-8 w-52 text-sm">
            <Users className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All user types</SelectItem>
            {USER_TYPES.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority score</SelectItem>
              <SelectItem value="frequency">Frequency</SelectItem>
              <SelectItem value="confidence">AI confidence</SelectItem>
              <SelectItem value="created">Newest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && tab === "new" && (
        <div className="border-b bg-primary/5 px-6 py-2 flex items-center justify-between">
          <span className="text-sm">
            <span className="font-mono font-semibold text-primary">{selectedIds.size}</span>
            <span className="text-muted-foreground ml-1.5">selected</span>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={selectedIds.size < 2}
              onClick={merge}
            >
              <GitMerge className="h-3.5 w-3.5" /> Merge
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={bulkDismiss}>
              <Trash2 className="h-3.5 w-3.5" /> Dismiss
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => openPush(Array.from(selectedIds))}
            >
              <Send className="h-3.5 w-3.5" /> Push to Jira
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b">
            <tr>
              <th className="w-10 px-4 py-2.5 text-left">
                {tab === "new" && (
                  <Checkbox checked={allVisibleChecked} onCheckedChange={toggleAll} />
                )}
              </th>
              <th className="w-12 px-2 py-2.5 text-left font-mono">#</th>
              <th className="px-2 py-2.5 text-left font-medium">Request</th>
              <th className="px-2 py-2.5 text-left font-medium w-44">Area</th>
              <th className="px-2 py-2.5 text-left font-medium w-28">Sources</th>
              <th className="px-2 py-2.5 text-right font-medium w-16">Freq</th>
              <th className="px-2 py-2.5 text-right font-medium w-20">Conf</th>
              <th className="px-2 py-2.5 text-left font-medium w-40">Priority</th>
              <th className="px-4 py-2.5 text-right font-medium w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-16 text-muted-foreground text-sm">
                  No requests match your filters.
                </td>
              </tr>
            )}
            {visible.map((r, idx) => {
              const score = compositeWith(r.priority, weights);
              const checked = selectedIds.has(r.id);
              const uniqueSources = Array.from(new Set(r.mentions.map((m) => m.source)));
              return (
                <tr
                  key={r.id}
                  className={`border-b cursor-pointer transition-colors ${
                    checked ? "bg-primary/5" : "hover:bg-accent/40"
                  }`}
                  onClick={() => setOpenId(r.id)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {tab === "new" && (
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => {
                          setSelectedIds((s) => {
                            const n = new Set(s);
                            if (c) n.add(r.id);
                            else n.delete(r.id);
                            return n;
                          });
                        }}
                      />
                    )}
                  </td>
                  <td className="px-2 py-3 font-mono text-xs text-muted-foreground tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.title}</span>
                      <Badge
                        variant="outline"
                        className={`font-normal text-[10px] py-0 h-4 ${USER_TYPE_TONE[r.userType]}`}
                      >
                        {r.userType}
                      </Badge>
                      {r.jiraKey && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {r.jiraKey}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-muted-foreground text-xs">{r.productArea}</td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1.5">
                      {uniqueSources.map((s) => (
                        <SourceBadge key={s} source={s} withLabel={false} />
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums">{r.frequency}</td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums text-muted-foreground">
                    {Math.round(r.confidence * 100)}%
                  </td>
                  <td className="px-2 py-3">
                    <PriorityBar score={score} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-wider font-normal"
                    >
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
      <Toaster />
    </SignalShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={`font-mono tabular-nums font-semibold ${
          accent ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
