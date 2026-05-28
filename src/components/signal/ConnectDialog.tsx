import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SourceConfig } from "@/lib/mock-sources";

type Phase = "idle" | "connecting" | "done";

export function ConnectDialog({
  source,
  open,
  onOpenChange,
  onConfirm,
}: {
  source: SourceConfig | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (!open) setPhase("idle");
  }, [open]);

  if (!source) return null;

  const start = () => {
    setPhase("connecting");
    setTimeout(() => setPhase("done"), 1500);
  };

  const finish = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {source.name}</DialogTitle>
          <DialogDescription>
            Sign in with your {source.vendor} workspace SSO to grant Signal read access.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-4 space-y-2 text-sm">
          <div className="font-medium">Signal will be able to:</div>
          <ul className="text-muted-foreground space-y-1 text-xs list-disc pl-5">
            <li>Read messages and content from {source.scopeNoun} you select</li>
            <li>Detect mentions of features, bugs, and compliance topics</li>
            <li>Cluster duplicate feedback across {source.name}</li>
          </ul>
          <div className="text-xs text-muted-foreground pt-1">
            Signal will <span className="text-foreground">never</span> send messages on your behalf.
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {phase === "idle" && <Button onClick={start}>Sign in with {source.vendor}</Button>}
          {phase === "connecting" && (
            <Button disabled className="gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Authorizing…
            </Button>
          )}
          {phase === "done" && (
            <Button onClick={finish} className="gap-2">
              <ShieldCheck className="h-4 w-4" /> Finish
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
