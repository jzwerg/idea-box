import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { SourceCard } from "@/components/signal/SourceCard";
import { ConnectDialog } from "@/components/signal/ConnectDialog";
import { useSources } from "@/lib/sources-context";
import type { SourceConfig } from "@/lib/mock-sources";

export const Route = createFileRoute("/settings/sources")({
  head: () => ({
    meta: [
      { title: "Sources — Settings — IdeaBox" },
      { name: "description", content: "Connect IdeaBox to the places your customer feedback lives." },
    ],
  }),
  component: SourcesPage,
});

function SourcesPage() {
  const { sources, setConnected } = useSources();
  const [pending, setPending] = useState<SourceConfig | null>(null);

  const connected = sources.filter((s) => s.connected);
  const available = sources.filter((s) => !s.connected);

  return (
    <div className="px-6 py-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Sources</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Each source feeds the box. Configure what's in scope before items land in Ideation.
        </p>
      </div>

      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Connected</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {connected.map((s) => (
          <SourceCard
            key={s.id}
            source={s}
            onConnect={() => setPending(s)}
            onDisconnect={() => {
              setConnected(s.id, false);
              toast.success(`${s.name} disconnected`);
            }}
          />
        ))}
      </div>

      {available.length > 0 && (
        <>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Available</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {available.map((s) => (
              <SourceCard
                key={s.id}
                source={s}
                onConnect={() => setPending(s)}
                onDisconnect={() => setConnected(s.id, false)}
              />
            ))}
          </div>
        </>
      )}

      <ConnectDialog
        source={pending}
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          setConnected(pending.id, true);
          toast.success(`${pending.name} connected`, {
            description: "Default scope applied. Edit anytime under Configure.",
          });
        }}
      />
      <Toaster />
    </div>
  );
}
