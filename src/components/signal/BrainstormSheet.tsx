import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, Tag as TagIcon, Sparkles } from "lucide-react";
import type { RequestRecord } from "@/lib/mock-requests";
import { useStaging, scoreRequest } from "@/lib/staging-context";
import { useAgent } from "@/lib/agent-context";
import { buildProposedRule } from "@/lib/teach";

interface Ranked {
  request: RequestRecord;
  pct: number;
  hits: string[];
}

interface Props {
  requests: RequestRecord[];
  onOpenRequest: (id: string) => void;
  idea: string;
  setIdea: (v: string) => void;
  submitted: string;
  setSubmitted: (v: string) => void;
}

/**
 * Brainstorm panel — pure content, no chrome. Renders inside a Dialog.
 * Owns search/submit state via props so the parent can detect "dirty".
 */
export function BrainstormPanel({
  requests,
  onOpenRequest,
  idea,
  setIdea,
  submitted,
  setSubmitted,
}: Props) {
  const { tags, addView, addTag } = useStaging();
  const { proposeRule } = useAgent();

  const ranked = useMemo<Ranked[]>(() => {
    const q = submitted.trim();
    if (!q) return [];
    const scored = requests
      .filter((r) => r.status === "new")
      .map((r) => {
        const { score, hits } = scoreRequest(q, {
          title: r.title,
          description: r.description,
          tags: tags[r.id] ?? [],
          userType: r.userType,
          productArea: r.productArea,
        });
        return { request: r, score, hits };
      })
      .filter((x) => x.score > 0);
    const top = scored.reduce((m, x) => Math.max(m, x.score), 0) || 1;
    return scored
      .map((x) => ({ request: x.request, pct: Math.round((x.score / top) * 100), hits: x.hits }))
      .filter((x) => x.pct >= 20)
      .sort((a, b) => b.pct - a.pct);
  }, [submitted, requests, tags]);

  const find = () => setSubmitted(idea);
  const clear = () => {
    setIdea("");
    setSubmitted("");
  };

  const saveAsView = () => {
    const q = submitted.trim();
    if (!q) return;
    const name = q.split(/\s+/).slice(0, 4).join(" ");
    addView({ name, rule: q, groupBy: "none" });
    toast.success(`View "${name}" saved`);
  };

  const tagAll = () => {
    if (ranked.length === 0) return;
    const tag = window.prompt("Tag to apply to all results:")?.trim();
    if (!tag) return;
    ranked.forEach(({ request }) => addTag(request.id, tag));
    const rep = ranked[0].request;
    const p = buildProposedRule("tag", rep);
    if (p) proposeRule(p);
    toast.success(`Tagged ${ranked.length} requests as "${tag}"`);
  };

  return (
    <div className="flex flex-col max-h-[70vh]">
      <div className="px-1 pb-3 space-y-2">
        <Textarea
          autoFocus
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="e.g. give admins a way to bulk-approve onboarding KYC checks"
          rows={3}
          className="text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              find();
            }
          }}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={find} disabled={!idea.trim()} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Find related
          </Button>
          <Button size="sm" variant="ghost" onClick={clear} disabled={!idea && !submitted}>
            Clear
          </Button>
          <span className="text-[10px] text-muted-foreground ml-auto font-mono">⌘↵ search</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mx-6 px-6 border-t border-border/60">
        {!submitted && (
          <div className="py-10 text-center text-xs text-muted-foreground">
            Type an idea above and hit <span className="font-medium">Find related</span>.
          </div>
        )}
        {submitted && ranked.length === 0 && (
          <div className="py-10 text-center text-xs text-muted-foreground">
            No related requests found in the box.
          </div>
        )}
        {ranked.length > 0 && (
          <div>
            <div className="py-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
              <span>
                <span className="font-mono text-foreground">{ranked.length}</span> related
              </span>
              <span>relevance</span>
            </div>
            <ul className="divide-y divide-border/60">
              {ranked.map(({ request: r, pct, hits }) => (
                <li
                  key={r.id}
                  onClick={() => onOpenRequest(r.id)}
                  className="py-3 hover:bg-accent/40 cursor-pointer -mx-2 px-2 rounded-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-end gap-0.5 w-12 shrink-0">
                      <span className="font-mono text-sm tabular-nums text-primary">{pct}%</span>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {r.userType} · {r.productArea}
                      </div>
                      {hits.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1.5">
                          {hits.slice(0, 5).map((h) => (
                            <Badge
                              key={h}
                              variant="outline"
                              className="text-[10px] py-0 h-4 font-normal text-muted-foreground"
                            >
                              {h}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {ranked.length > 0 && (
        <div className="pt-3 mt-2 border-t border-border/60 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={saveAsView} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Save as view
          </Button>
          <Button size="sm" variant="outline" onClick={tagAll} className="gap-1.5">
            <TagIcon className="h-3.5 w-3.5" /> Tag all
          </Button>
        </div>
      )}
    </div>
  );
}
