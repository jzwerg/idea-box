import { useState } from "react";
import { useStaging, type GroupBy } from "@/lib/staging-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, LayoutGrid, Layers } from "lucide-react";

export function ViewsBar() {
  const { views, activeViewId, setActiveView, removeView, addView } = useStaging();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground mr-1" strokeWidth={2.25} />
      {views.map((v) => {
        const active = v.id === activeViewId;
        const isGrouping = !!v.builtin && v.groupBy !== "none";
        return (
          <div
            key={v.id}
            className={`group inline-flex items-center rounded-full border text-xs transition-colors ${
              active
                ? "bg-primary/10 border-primary/40 text-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            <button
              onClick={() => setActiveView(v.id)}
              className="pl-2.5 pr-2 py-1 inline-flex items-center gap-1"
              title={v.rule || "All requests"}
            >
              {isGrouping && <Layers className="h-3 w-3" strokeWidth={2.25} />}
              {v.name}
            </button>
            {!v.builtin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeView(v.id);
                }}
                className="pr-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${v.name}`}
              >
                <X className="h-3 w-3" strokeWidth={2.25} />
              </button>
            )}
          </div>
        );
      })}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40">
            <Plus className="h-3 w-3" strokeWidth={2.25} /> New view
          </button>
        </DialogTrigger>
        <NewViewDialog
          onSave={(v) => {
            addView(v);
            setOpen(false);
          }}
        />
      </Dialog>
    </div>
  );
}

function NewViewDialog({
  onSave,
}: {
  onSave: (v: { name: string; rule: string; groupBy: GroupBy }) => void;
}) {
  const [name, setName] = useState("");
  const [rule, setRule] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>New view</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q3 enterprise push"
            className="mt-1 h-8"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">
            Match rule (natural language)
          </label>
          <Textarea
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            rows={3}
            placeholder={`e.g. "SSO or single sign-on or okta", or "anything from Compliance Officer mentioning audit"`}
            className="mt-1 text-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Matched against title, description, tags, user type, and product area. Use
            commas / "or" to list alternatives.
          </p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Group by</label>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="mt-1 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No grouping</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="app">App</SelectItem>
              <SelectItem value="revenuePotential">Revenue potential</SelectItem>
              <SelectItem value="userType">User type</SelectItem>
              <SelectItem value="productArea">Product area</SelectItem>
              <SelectItem value="tag">Tag</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={!name.trim()}
          onClick={() => onSave({ name: name.trim(), rule, groupBy })}
        >
          Save view
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
