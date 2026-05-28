import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ShieldAlert, ExternalLink, Send, X } from "lucide-react";
import {
  compositeScore,
  WEIGHTS,
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

  return (
    <Sheet open={!!request} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span>{local.id}</span>
                <span>·</span>
                <span>{local.productArea}</span>
                {local.complianceFlag && (
                  <Badge variant="destructive" className="gap-1 font-normal">
                    <ShieldAlert className="h-3 w-3" />
                    Compliance
                  </Badge>
                )}
              </div>
              <Input
                value={local.title}
                onChange={(e) => {
                  setLocal({ ...local, title: e.target.value });
                  onUpdate(local.id, { title: e.target.value });
                }}
                className="text-lg font-semibold h-auto py-1 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:bg-muted/30"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetTitle className="sr-only">{local.title}</SheetTitle>
          <SheetDescription className="sr-only">Request detail</SheetDescription>
        </SheetHeader>

        <div className="px-6 py-5 space-y-6">
          {/* Composite */}
          <div className="rounded-md border bg-card p-4">
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
              <span className="font-mono text-4xl font-semibold text-primary tabular-nums">
                {score}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Description
            </h3>
            <p className="text-sm leading-relaxed">{local.description}</p>
          </section>

          <Separator />

          {/* Scoring */}
          <section className="space-y-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
              Score breakdown
            </h3>
            {DIM_LABELS.map(({ key, label }) => {
              const d = local.priority[key];
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="font-mono text-sm tabular-nums">{d.value}</span>
                  </div>
                  <Slider
                    value={[d.value]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v) => updateDim(key, v[0])}
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {d.rationale}
                  </p>
                </div>
              );
            })}
          </section>

          <Separator />

          {/* Mentions */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Source mentions ({local.mentions.length})
            </h3>
            <div className="space-y-3">
              {local.mentions.map((m) => (
                <div key={m.id} className="rounded-md border bg-card/50 p-3">
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
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    "{m.excerpt}"
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => onDismiss(local.id)}>
            Dismiss
          </Button>
          <Button onClick={() => onPush([local.id])} className="gap-2">
            <Send className="h-4 w-4" />
            Push to Jira
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
