import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ExternalLink, Send, User, ArrowUpRight } from "lucide-react";
import {
  compositeScore,
  WEIGHTS,
  getClient,
  getApp,
  getRevenuePotential,
  isCriticalDissatisfaction,
  type RequestRecord,
  type PriorityBreakdown,
} from "@/lib/mock-requests";
import { SourceBadge } from "./SourceBadge";

interface Props {
  request: RequestRecord | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<RequestRecord>) => void;
  onDismiss: (id: string) => void;
  onPush: (ids: string[]) => void;
}

const DIM_LABELS: Array<{ key: keyof PriorityBreakdown; label: string }> = [
  { key: "impact", label: "Impact" },
  { key: "reach", label: "Reach / frequency" },
  { key: "urgency", label: "Urgency" },
  { key: "effort", label: "Effort (higher = easier)" },
];

const REVENUE_TONE: Record<string, string> = {
  critical: "text-chart-5 border-chart-5/40 bg-chart-5/10",
  high: "text-chart-3 border-chart-3/40 bg-chart-3/10",
  medium: "text-chart-1 border-chart-1/40 bg-chart-1/10",
  low: "text-muted-foreground border-border bg-muted/40",
};

export function DetailDrawer({ request, onClose, onUpdate, onDismiss, onPush }: Props) {
  const [local, setLocal] = useState<RequestRecord | null>(request);

  useEffect(() => {
    setLocal(request);
  }, [request]);

  if (!local) return null;

  const updateDim = (key: keyof PriorityBreakdown, value: number) => {
    const next = {
      ...local,
      priority: {
        ...local.priority,
        [key]: { ...local.priority[key], value },
      },
    };
    setLocal(next);
    onUpdate(local.id, { priority: next.priority });
  };

  const score = compositeScore(local.priority);
  const client = getClient(local);
  const app = getApp(local);
  const revenue = getRevenuePotential(local);
  const critical = isCriticalDissatisfaction(local);

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl gap-0 p-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 space-y-2 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono flex-wrap">
            <span>{local.id}</span>
            <span>·</span>
            <span>{app}</span>
            <span>·</span>
            <span>{local.productArea}</span>
            <Badge variant="outline" className="gap-1 font-normal">
              <User className="h-3 w-3" strokeWidth={2.25} />
              {local.userType}
            </Badge>
            <Badge variant="outline" className="font-normal">{client}</Badge>
            <Badge variant="outline" className={`font-normal capitalize ${REVENUE_TONE[revenue]}`}>
              {revenue} revenue
            </Badge>
            {critical && (
              <Badge variant="outline" className="font-normal text-destructive border-destructive/40 bg-destructive/10">
                Critical dissatisfaction
              </Badge>
            )}
          </div>
          <Input
            value={local.title}
            onChange={(e) => {
              setLocal({ ...local, title: e.target.value });
              onUpdate(local.id, { title: e.target.value });
            }}
            className="text-lg font-semibold font-display h-auto py-1 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:bg-muted/30"
          />
          <DialogTitle className="sr-only">{local.title}</DialogTitle>
          <DialogDescription className="sr-only">Idea detail</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Composite */}
          <div className="rounded-md border border-border/60 bg-card p-4">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Composite priority
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {Math.round(WEIGHTS.impact * 100)}/{Math.round(WEIGHTS.reach * 100)}/
                {Math.round(WEIGHTS.urgency * 100)}/{Math.round(WEIGHTS.effort * 100)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-semibold text-primary tabular-nums">{score}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Description</h3>
            <p className="text-sm leading-relaxed">{local.description}</p>
          </section>

          <Separator />

          <section className="space-y-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Score breakdown</h3>
            {DIM_LABELS.map(({ key, label }) => {
              const d = local.priority[key];
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="font-mono text-sm tabular-nums">{d.value}</span>
                  </div>
                  <Slider value={[d.value]} min={0} max={100} step={1} onValueChange={(v) => updateDim(key, v[0])} />
                  <p className="text-xs text-muted-foreground leading-relaxed">{d.rationale}</p>
                </div>
              );
            })}
          </section>

          <Separator />

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
                Source mentions ({local.mentions.length})
              </h3>
              <Link
                to="/settings/sources"
                onClick={() => onClose()}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Manage sources <ArrowUpRight className="h-3 w-3" strokeWidth={2.25} />
              </Link>
            </div>
            <div className="space-y-3">
              {local.mentions.map((m) => (
                <div key={m.id} className="rounded-md border border-border/60 bg-card/50 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <SourceBadge source={m.source} />
                      <span className="text-xs text-muted-foreground">
                        {m.author} · {m.client}
                      </span>
                    </div>
                    <a
                      href={m.link}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => e.preventDefault()}
                    >
                      <ExternalLink className="h-3 w-3" strokeWidth={2.25} />
                    </a>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">"{m.excerpt}"</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="border-t border-border/60 bg-background/95 px-6 py-3 flex items-center justify-between gap-2 shrink-0">
          <Button variant="ghost" onClick={() => onDismiss(local.id)}>Dismiss</Button>
          <Button onClick={() => onPush([local.id])} className="gap-2">
            <Send className="h-4 w-4" strokeWidth={2.25} />
            Push to Jira
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
