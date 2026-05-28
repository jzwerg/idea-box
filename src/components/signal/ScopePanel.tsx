import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SourceConfig } from "@/lib/mock-sources";
import { useSources } from "@/lib/sources-context";

export function ScopePanel({ source }: { source: SourceConfig }) {
  const { toggleScope, addScope, removeScope } = useSources();
  const [pickerOpen, setPickerOpen] = useState(false);

  const available = source.scopePickerOptions.filter(
    (o) => !source.scope.some((s) => s.label === o),
  );

  return (
    <section className="rounded-lg border bg-card">
      <header className="px-5 py-3 border-b flex items-center justify-between">
        <div>
          <h2 className="font-medium text-sm">Scope</h2>
          <p className="text-xs text-muted-foreground">
            What Signal is allowed to read from {source.name}.
          </p>
        </div>
        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add {source.scopeNoun.replace(/s$/, "")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add to scope</DialogTitle>
            </DialogHeader>
            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Everything available is already in scope.
              </p>
            ) : (
              <div className="space-y-1">
                {available.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      addScope(source.id, opt);
                      setPickerOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent font-mono"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </header>

      {source.scope.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          No {source.scopeNoun} in scope yet.
        </div>
      ) : (
        <ul className="divide-y">
          {source.scope.map((sc) => (
            <li key={sc.id} className="px-5 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm truncate">{sc.label}</div>
                {sc.sublabel && (
                  <div className="text-xs text-muted-foreground">{sc.sublabel}</div>
                )}
              </div>
              <Switch
                checked={sc.enabled}
                onCheckedChange={() => toggleScope(source.id, sc.id)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeScope(source.id, sc.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
