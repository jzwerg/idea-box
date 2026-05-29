import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScopePanel } from "@/components/signal/ScopePanel";
import { RunsTable } from "@/components/signal/RunsTable";
import { useSources } from "@/lib/sources-context";
import type { SourceId } from "@/lib/mock-sources";

export const Route = createFileRoute("/settings/sources/$sourceId")({
  head: ({ params }) => ({
    meta: [{ title: `${params.sourceId} — Sources — IdeaBox` }],
  }),
  component: SourceDetailPage,
});

function SourceDetailPage() {
  const { sourceId } = Route.useParams();
  const { get, triggerRun, setConnected } = useSources();
  const source = get(sourceId as SourceId);

  if (!source) throw notFound();

  const totalScanned = source.runs.reduce((s, r) => s + r.itemsScanned, 0);
  const totalPushed = source.runs.reduce((s, r) => s + r.pushedToSpark, 0);

  return (
    <div className="px-6 py-6 max-w-4xl">
      <Link
        to="/settings/sources"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} /> All sources
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{source.name}</h1>
            {source.connected ? (
              <Badge
                variant="outline"
                className="gap-1 text-[10px] uppercase tracking-wider font-normal border-chart-2/40 text-chart-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-chart-2" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-normal">
                Not connected
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{source.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={!source.connected}
            onClick={() => {
              setConnected(source.id, false);
              toast.message(`${source.name} paused`);
            }}
          >
            <Pause className="h-3.5 w-3.5" strokeWidth={2.25} /> Pause
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            disabled={!source.connected}
            onClick={() => {
              triggerRun(source.id);
              toast.success("Run started");
            }}
          >
            <Play className="h-3.5 w-3.5" strokeWidth={2.25} /> Run now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Tile label="Active scope" value={`${source.scope.filter((s) => s.enabled).length}`} />
        <Tile label="Runs (lifetime)" value={String(source.runs.length)} />
        <Tile label="Items scanned" value={String(totalScanned)} />
        <Tile label="Pushed to box" value={String(totalPushed)} accent />
      </div>

      <div className="space-y-6">
        <ScopePanel source={source} />

        <section className="rounded-lg border bg-card">
          <header className="px-5 py-3 border-b">
            <h2 className="font-medium text-sm">Recent runs</h2>
            <p className="text-xs text-muted-foreground">
              What was scanned, what became a signal, and what got filtered.
            </p>
          </header>
          <RunsTable runs={source.runs} />
        </section>
      </div>
      <Toaster />
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono tabular-nums text-xl mt-0.5 ${accent ? "text-primary" : ""}`}>
        {value}
      </div>
    </div>
  );
}
