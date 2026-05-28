import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  GraduationCap,
  Inbox,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { SignalShell } from "@/components/signal/SignalShell";
import { useAgent, type Weights } from "@/lib/agent-context";

export const Route = createFileRoute("/agent")({
  head: () => ({
    meta: [
      { title: "Prioritization agent — Signal" },
      {
        name: "description",
        content:
          "Tune the prioritization agent's weights and instructions, then trigger runs manually or watch auto-runs after each batch.",
      },
    ],
  }),
  component: AgentPage,
});

const DIMS: Array<{ key: keyof Weights; label: string; hint: string }> = [
  { key: "impact", label: "Impact", hint: "Revenue, retention, regulatory blockers" },
  { key: "reach", label: "Reach", hint: "How many clients & users feel it" },
  { key: "urgency", label: "Urgency", hint: "Deadlines, escalations, churn risk" },
  { key: "effort", label: "Effort (inverse)", hint: "Higher = easier to ship" },
];

function AgentPage() {
  const {
    weights,
    setWeights,
    resetWeights,
    instructions,
    setInstructions,
    runs,
    status,
    runAgent,
    learnedRules,
    pendingProposals,
    acceptProposal,
    dismissProposal,
    toggleLearnedRule,
    removeLearnedRule,
  } = useAgent();
  const [runInstr, setRunInstr] = useState("");


  const total =
    weights.impact + weights.reach + weights.urgency + weights.effort || 1;

  const handleRun = () => {
    runAgent({ trigger: "manual", instructions: runInstr.trim() || undefined });
    toast.success("Agent run started", {
      description: runInstr ? "Using one-off instructions for this run." : undefined,
    });
    setRunInstr("");
  };

  return (
    <SignalShell
      rightSlot={
        <div className="flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">Agent</span>
          <span className="font-mono ml-1 text-foreground">
            {status === "running" ? "running" : "idle"}
          </span>
        </div>
      }
    >
      <div className="border-b bg-card/20 px-6 py-2 flex items-center gap-3">
        <Link
          to="/"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Back to staging
        </Link>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Prioritization agent
        </span>
      </div>

      <div className="px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6 max-w-[1400px]">
        {/* Left: tuning */}
        <div className="space-y-6">
          <section className="rounded-lg border bg-card/40 p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Scoring weights</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={resetWeights}
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              How heavily the agent weighs each dimension when computing composite priority.
              Applied on the next run.
            </p>
            <div className="space-y-4">
              {DIMS.map(({ key, label, hint }) => {
                const v = weights[key];
                const pct = Math.round((v / total) * 100);
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{hint}</span>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {v.toFixed(2)} · {pct}%
                      </span>
                    </div>
                    <Slider
                      value={[v * 100]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={(arr) =>
                        setWeights({ ...weights, [key]: arr[0] / 100 })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border bg-card/40 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Standing instructions</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              The agent re-reads this every run. Keep it short and concrete — name segments,
              keywords, or thresholds you want it to favour.
            </p>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={6}
              className="text-sm font-mono leading-relaxed"
            />
          </section>
        </div>

        {/* Right: manual run + history */}
        <div className="space-y-6">
          <section className="rounded-lg border bg-card/40 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Manual run</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Triggers immediately. The agent also runs automatically every time an ingestion
              batch lands in staging.
            </p>
            <Textarea
              value={runInstr}
              onChange={(e) => setRunInstr(e.target.value)}
              rows={3}
              placeholder="One-off instructions for this run (optional). e.g. 'Focus on FIDO2 and SSO — procurement asked today.'"
              className="text-sm mb-3"
            />
            <Button
              onClick={handleRun}
              disabled={status === "running"}
              className="w-full gap-2"
            >
              {status === "running" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Running…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Run prioritization now
                </>
              )}
            </Button>
          </section>

          <section className="rounded-lg border bg-card/40">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold">Run history</h2>
              <span className="text-xs text-muted-foreground font-mono">
                {runs.length} total
              </span>
            </div>
            {runs.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No runs yet. Trigger one manually or wait for the next ingestion batch.
              </div>
            ) : (
              <div className="divide-y">
                {runs.map((r) => (
                  <div key={r.id} className="px-5 py-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {r.status === "running" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />
                        )}
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-normal h-4"
                        >
                          {r.trigger}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {new Date(r.startedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {r.status === "running"
                          ? "…"
                          : `${(r.durationMs / 1000).toFixed(1)}s`}
                      </span>
                    </div>
                    {r.status !== "running" && (
                      <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                        <span>
                          rescored <span className="font-mono text-foreground">{r.rescored}</span>
                        </span>
                        {r.topMover && (
                          <>
                            <Separator orientation="vertical" className="h-3" />
                            <span>
                              top mover:{" "}
                              <span className="text-foreground">{r.topMover.title}</span>{" "}
                              <span
                                className={`font-mono ${
                                  r.topMover.delta >= 0 ? "text-chart-2" : "text-destructive"
                                }`}
                              >
                                {r.topMover.delta >= 0 ? "+" : ""}
                                {r.topMover.delta}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    {r.instructions && (
                      <p className="mt-1.5 text-xs italic text-muted-foreground border-l-2 border-primary/40 pl-2">
                        "{r.instructions}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <LearnedRulesSection
        learnedRules={learnedRules}
        pendingProposals={pendingProposals}
        onAccept={acceptProposal}
        onDismiss={dismissProposal}
        onToggle={toggleLearnedRule}
        onRemove={removeLearnedRule}
      />
    </SignalShell>
  );
}

function LearnedRulesSection({
  learnedRules,
  pendingProposals,
  onAccept,
  onDismiss,
  onToggle,
  onRemove,
}: {
  learnedRules: ReturnType<typeof useAgent>["learnedRules"];
  pendingProposals: ReturnType<typeof useAgent>["pendingProposals"];
  onAccept: (id: string, rule?: string) => void;
  onDismiss: (id: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="px-6 pb-10 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6 max-w-[1400px]">
      <section className="rounded-lg border bg-card/40">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Pending teachings</h2>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] h-5">
            {pendingProposals.length}
          </Badge>
        </div>
        {pendingProposals.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nothing pending. Actions on staging will propose rules here.
          </div>
        ) : (
          <div className="divide-y">
            {pendingProposals.map((p) => (
              <div key={p.id} className="px-5 py-3 space-y-2">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Badge variant="outline" className="h-4 text-[10px]">
                    {p.sourceAction}
                  </Badge>
                  {p.sourceTitle && (
                    <span className="italic text-muted-foreground/80 truncate">
                      from "{p.sourceTitle}"
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono leading-relaxed">{p.rule}</p>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onDismiss(p.id)}
                  >
                    <X className="h-3 w-3 mr-1" /> Skip
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => onAccept(p.id)}
                  >
                    <Plus className="h-3 w-3" /> Add rule
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card/40">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Learned rules</h2>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] h-5">
            {learnedRules.filter((r) => r.enabled).length}/{learnedRules.length} active
          </Badge>
        </div>
        {learnedRules.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No learned rules yet. The agent grows smarter as you act on staging.
          </div>
        ) : (
          <div className="divide-y">
            {learnedRules.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-start gap-3">
                <Switch
                  checked={r.enabled}
                  onCheckedChange={() => onToggle(r.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs leading-relaxed ${
                      r.enabled ? "text-foreground" : "text-muted-foreground line-through"
                    }`}
                  >
                    {r.rule}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="h-4 text-[10px]">
                      {r.sourceAction}
                    </Badge>
                    <span>{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => onRemove(r.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete rule"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


