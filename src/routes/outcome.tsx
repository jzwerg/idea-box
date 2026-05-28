import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, List, LayoutGrid, RotateCcw } from "lucide-react";
import {
  MOCK_REQUESTS,
  type RequestRecord,
  type Status,
} from "@/lib/mock-requests";
import { SignalShell } from "@/components/signal/SignalShell";
import { OutcomeBoard } from "@/components/signal/OutcomeBoard";
import { DetailDrawer } from "@/components/signal/DetailDrawer";
import { SourceBadge } from "@/components/signal/SourceBadge";

export const Route = createFileRoute("/outcome")({
  head: () => ({
    meta: [
      { title: "Outcome — Signal" },
      {
        name: "description",
        content: "Pushed tickets and dismissed requests — the after-triage record.",
      },
    ],
  }),
  component: OutcomePage,
});

type SubTab = "pushed" | "dismissed" | "all";
type Layout = "list" | "board";

function OutcomePage() {
  const [requests, setRequests] = useState<RequestRecord[]>(MOCK_REQUESTS);
  const [sub, setSub] = useState<SubTab>("pushed");
  const [layout, setLayout] = useState<Layout>("list");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<RequestRecord>) =>
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const reopen = (id: string) => {
    update(id, { status: "new", jiraKey: undefined });
    toast.success("Moved back to staging");
  };

  const filtered = useMemo(() => {
    let list = requests.filter((r) => r.status === "pushed" || r.status === "dismissed");
    if (sub !== "all") list = list.filter((r) => r.status === sub);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }, [requests, sub, query]);

  const counts = useMemo(() => {
    return {
      pushed: requests.filter((r) => r.status === "pushed").length,
      dismissed: requests.filter((r) => r.status === "dismissed").length,
    };
  }, [requests]);

  const openRequest = requests.find((r) => r.id === openId) ?? null;

  return (
    <SignalShell
      rightSlot={
        <>
          <Stat label="Pushed" value={counts.pushed.toString()} />
          <Stat label="Dismissed" value={counts.dismissed.toString()} />
        </>
      }
    >
      {/* Layout toggle + sub-tabs */}
      <div className="border-b bg-card/20 px-6 py-1.5 flex items-center gap-1">
        {layout === "list" && (
          <>
            <SubTabBtn active={sub === "pushed"} onClick={() => setSub("pushed")}>
              Pushed
              {counts.pushed > 0 && (
                <span className="ml-2 font-mono text-[10px] text-primary">{counts.pushed}</span>
              )}
            </SubTabBtn>
            <SubTabBtn active={sub === "dismissed"} onClick={() => setSub("dismissed")}>
              Dismissed
              {counts.dismissed > 0 && (
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                  {counts.dismissed}
                </span>
              )}
            </SubTabBtn>
            <SubTabBtn active={sub === "all"} onClick={() => setSub("all")}>All</SubTabBtn>
          </>
        )}

        <div className="ml-auto inline-flex items-center gap-0.5 rounded-md border bg-background p-0.5">
          <button
            onClick={() => setLayout("list")}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${
              layout === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3 w-3" /> List
          </button>
          <button
            onClick={() => setLayout("board")}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${
              layout === "board" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3 w-3" /> Board
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b bg-background/40 px-6 py-2 flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search outcomes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 w-72 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {layout === "board"
            ? "Drag a card back to Staging to reopen it."
            : "Read-only history. Click any row for full detail."}
        </span>
      </div>

      {layout === "list" ? (
        <OutcomeList
          requests={filtered}
          onOpen={setOpenId}
          onReopen={reopen}
        />
      ) : (
        <OutcomeBoard
          requests={requests.filter((r) =>
            ["new", "pushed", "dismissed"].includes(r.status as Status),
          )}
          onMove={(id, to) => {
            if (to === "new") reopen(id);
            else update(id, { status: to });
          }}
          onOpen={setOpenId}
        />
      )}

      <DetailDrawer
        request={openRequest}
        onClose={() => setOpenId(null)}
        onUpdate={update}
        onDismiss={(id) => {
          update(id, { status: "dismissed" });
          setOpenId(null);
        }}
        onPush={() => {}}
      />
    </SignalShell>
  );
}

function OutcomeList({
  requests,
  onOpen,
  onReopen,
}: {
  requests: RequestRecord[];
  onOpen: (id: string) => void;
  onReopen: (id: string) => void;
}) {
  if (requests.length === 0) {
    return (
      <div className="px-6 py-20 text-center text-sm text-muted-foreground">
        Nothing here yet. Push or dismiss from{" "}
        <Link to="/staging" className="text-primary hover:underline">Staging</Link>.
      </div>
    );
  }
  return (
    <div>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">Request</th>
            <th className="px-2 py-2.5 text-left font-medium w-40">Area</th>
            <th className="px-2 py-2.5 text-left font-medium w-28">Sources</th>
            <th className="px-2 py-2.5 text-left font-medium w-32">Outcome</th>
            <th className="px-2 py-2.5 text-left font-medium w-28">Ref</th>
            <th className="px-4 py-2.5 text-right w-10"></th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const sources = Array.from(new Set(r.mentions.map((m) => m.source)));
            return (
              <tr
                key={r.id}
                onClick={() => onOpen(r.id)}
                className="border-b cursor-pointer hover:bg-accent/40"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate max-w-xl">
                    {r.description}
                  </div>
                </td>
                <td className="px-2 py-3 text-muted-foreground text-xs">{r.productArea}</td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-1">
                    {sources.map((s) => (
                      <SourceBadge key={s} source={s} withLabel={false} />
                    ))}
                  </div>
                </td>
                <td className="px-2 py-3">
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase tracking-wider ${
                      r.status === "pushed"
                        ? "border-chart-2/40 text-chart-2"
                        : "border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {r.status}
                  </Badge>
                </td>
                <td className="px-2 py-3 font-mono text-[11px] text-muted-foreground">
                  {r.jiraKey ?? "—"}
                </td>
                <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => onReopen(r.id)}
                    title="Move back to staging"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubTabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-md transition-colors ${
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
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
