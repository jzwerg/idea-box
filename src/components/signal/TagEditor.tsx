import { useState } from "react";
import { useStaging } from "@/lib/staging-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X, StickyNote } from "lucide-react";
import { useAgent } from "@/lib/agent-context";
import { buildProposedRule } from "@/lib/teach";
import type { RequestRecord } from "@/lib/mock-requests";

function hashHue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function TagChips({ request }: { request: RequestRecord }) {
  const { tags, addTag, removeTag } = useStaging();
  const { proposeRule } = useAgent();
  const list = tags[request.id] ?? [];
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  const commit = () => {
    const v = value.trim();
    if (v) {
      addTag(request.id, v);
      const p = buildProposedRule("tag", request, { tag: v.toLowerCase() });
      if (p) proposeRule(p);
    }
    setValue("");
    setAdding(false);
  };

  return (
    <div
      className="flex items-center gap-1 flex-wrap"
      onClick={(e) => e.stopPropagation()}
    >
      {list.map((t) => {
        const hue = hashHue(t);
        return (
          <span
            key={t}
            className="group inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `oklch(0.92 0.04 ${hue})`,
              color: `oklch(0.32 0.10 ${hue})`,
            }}
          >
            #{t}
            <button
              onClick={() => removeTag(request.id, t)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Remove ${t}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        );
      })}
      {adding ? (
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setValue("");
              setAdding(false);
            }
          }}
          onBlur={commit}
          placeholder="tag"
          className="h-5 px-1.5 text-[10px] w-20"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center rounded-full border border-dashed border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/40"
          aria-label="Add tag"
        >
          <Plus className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

export function NotePopover({ request }: { request: RequestRecord }) {
  const { notes, setNote } = useStaging();
  const { proposeRule } = useAgent();
  const existing = notes[request.id] ?? "";
  const [draft, setDraft] = useState(existing);
  const [open, setOpen] = useState(false);

  const save = () => {
    const next = draft.trim();
    setNote(request.id, next);
    if (next && next !== existing.trim()) {
      const p = buildProposedRule("note", request, { note: next });
      if (p) proposeRule(p);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(notes[request.id] ?? ""); }}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Notes"
        >
          <StickyNote className="h-3.5 w-3.5" />
          {existing.trim() && (
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 space-y-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Note
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Add context the agent should know about this request…"
          className="text-xs"
        />
        <div className="flex justify-end">
          <Button size="sm" className="h-7 text-xs" onClick={save}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
