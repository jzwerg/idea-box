import { Link } from "@tanstack/react-router";
import { Brain, TrendingDown } from "lucide-react";
import { useMemo } from "react";
import { useAgent } from "@/lib/agent-context";
import { useStaging } from "@/lib/staging-context";

const WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Persistent agent indicator rendered by SignalShell on every route.
 * Combines the prior "agent banner" + TrustMeter into one strip.
 */
export function AgentStrip() {
  const { status, runs, learnedRules } = useAgent();
  const { trustHistory } = useStaging();

  const { thisWeek, prevWeek, autonomy, delta } = useMemo(() => {
    const now = Date.now();
    const tw = trustHistory.filter((e) => now - new Date(e.ts).getTime() < WEEK).length;
    const pw = trustHistory.filter((e) => {
      const t = new Date(e.ts).getTime();
      return now - t >= WEEK && now - t < 2 * WEEK;
    }).length;
    const baseline = Math.max(pw, 8);
    const aut = Math.max(0, Math.min(1, 1 - tw / baseline));
    const d = pw === 0 ? 0 : Math.round(((pw - tw) / pw) * 100);
    return { thisWeek: tw, prevWeek: pw, autonomy: aut, delta: d };
  }, [trustHistory]);

  const pct = Math.round(autonomy * 100);
  const lastRun = runs[0];

  return (
    <div className="border-b bg-primary/[0.03] px-6 py-2 flex items-center gap-4 text-xs">
      <div className="flex items-center gap-2 shrink-0">
        <Brain
          className={`h-3.5 w-3.5 ${status === "running" ? "text-primary animate-pulse" : "text-primary"}`}
        />
        <span className="text-muted-foreground">Agent</span>
        {status === "running" ? (
          <span className="text-primary">Rescoring…</span>
        ) : lastRun ? (
          <span className="text-muted-foreground">
            last run{" "}
            <span className="text-foreground">
              {new Date(lastRun.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {" "}· rescored{" "}
            <span className="font-mono text-foreground">{lastRun.rescored}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">idle</span>
        )}
      </div>

      <div className="h-3 w-px bg-border" />

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-muted-foreground">Autonomy</span>
        <span className="font-mono font-semibold text-foreground tabular-nums">{pct}%</span>
        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 text-muted-foreground min-w-0 truncate">
        <span>
          <span className="font-mono text-foreground">{thisWeek}</span> manual actions / wk
        </span>
        {prevWeek > 0 && (
          <span className="flex items-center gap-1">
            <TrendingDown
              className={`h-3 w-3 ${delta >= 0 ? "text-chart-2" : "text-destructive rotate-180"}`}
            />
            <span className={`font-mono ${delta >= 0 ? "text-chart-2" : "text-destructive"}`}>
              {delta >= 0 ? "−" : "+"}
              {Math.abs(delta)}%
            </span>
          </span>
        )}
      </div>

      <Link to="/agent" className="ml-auto text-primary hover:underline font-medium shrink-0">
        {learnedRules.length} learned rule{learnedRules.length === 1 ? "" : "s"} →
      </Link>
    </div>
  );
}
