import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, Plug, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatRelative,
  type SourceConfig,
} from "@/lib/mock-sources";

export function SourceCard({
  source,
  onConnect,
  onDisconnect,
}: {
  source: SourceConfig;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const lastRun = source.runs[0];
  const scoped = source.scope.filter((s) => s.enabled).length;
  const items24h = source.runs
    .filter((r) => Date.now() - new Date(r.startedAt).getTime() < 24 * 3600_000)
    .reduce((sum, r) => sum + r.pushedToStaging, 0);

  return (
    <div
      className={`rounded-lg border bg-card p-5 flex flex-col gap-4 transition-colors ${
        source.connected ? "" : "opacity-80 border-dashed"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{source.name}</h3>
            {source.connected ? (
              <Badge
                variant="outline"
                className="gap-1 text-[10px] uppercase tracking-wider font-normal border-chart-2/40 text-chart-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-chart-2" />
                Connected
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wider font-normal text-muted-foreground"
              >
                Not connected
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">{source.description}</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          {source.vendor}
        </span>
      </div>

      {source.connected ? (
        <>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <Metric label={`Active ${source.scopeNoun}`} value={String(scoped)} />
            <Metric label="Last run" value={lastRun ? formatRelative(lastRun.startedAt) : "—"} />
            <Metric label="Pushed (24h)" value={String(items24h)} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {source.scope
              .filter((s) => s.enabled)
              .slice(0, 4)
              .map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-accent/60 text-foreground/80 font-mono"
                >
                  <Check className="h-3 w-3 text-chart-2" />
                  {s.label}
                </span>
              ))}
            {source.scope.filter((s) => s.enabled).length > 4 && (
              <span className="text-[11px] text-muted-foreground">
                +{source.scope.filter((s) => s.enabled).length - 4} more
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5">
              <Link to="/ingestion/$sourceId" params={{ sourceId: source.id }}>
                Configure <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={onDisconnect}>
              Disconnect
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">Connect to start ingesting</span>
          <Button size="sm" className="h-8 gap-1.5" onClick={onConnect}>
            <PlugZap className="h-3.5 w-3.5" /> Connect
          </Button>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums text-sm">{value}</span>
    </div>
  );
}

export const __icons = { Plug };
