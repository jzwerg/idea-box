import { useMemo } from "react";
import { useStaging } from "@/lib/staging-context";
import { useAgent } from "@/lib/agent-context";
import { Brain, TrendingDown } from "lucide-react";
import { Link } from "@tanstack/react-router";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export function TrustMeter() {
  const { trustHistory } = useStaging();
  const { learnedRules } = useAgent();

  const { thisWeek, prevWeek, autonomy, delta } = useMemo(() => {
    const now = Date.now();
    const thisWeek = trustHistory.filter(
      (e) => now - new Date(e.ts).getTime() < WEEK,
    ).length;
    const prevWeek = trustHistory.filter((e) => {
      const t = new Date(e.ts).getTime();
      return now - t >= WEEK && now - t < 2 * WEEK;
    }).length;
    // Baseline is max(prevWeek, 8) so first-week meter doesn't read 100%
    const baseline = Math.max(prevWeek, 8);
    const autonomy = Math.max(0, Math.min(1, 1 - thisWeek / baseline));
    const delta = prevWeek === 0 ? 0 : Math.round(((prevWeek - thisWeek) / prevWeek) * 100);
    return { thisWeek, prevWeek, autonomy, delta };
  }, [trustHistory]);

  const pct = Math.round(autonomy * 100);

  return (
    <div className="border-b bg-card/30 px-6 py-2 flex items-center gap-4 text-xs">
      <div className="flex items-center gap-2">
        <Brain className="h-3.5 w-3.5 text-primary" />
        <span className="text-muted-foreground">Agent autonomy</span>
        <span className="font-mono font-semibold text-foreground tabular-nums">{pct}%</span>
      </div>
      <div className="flex-1 max-w-xs h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>
          <span className="font-mono text-foreground">{thisWeek}</span> manual actions this week
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
            <span>vs last week</span>
          </span>
        )}
        <span>·</span>
        <Link to="/agent" className="text-primary hover:underline">
          {learnedRules.length} learned rule{learnedRules.length === 1 ? "" : "s"}
        </Link>
      </div>
    </div>
  );
}
