import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { SignalShell } from "@/components/signal/SignalShell";
import { SourceCard } from "@/components/signal/SourceCard";
import { ConnectDialog } from "@/components/signal/ConnectDialog";
import { useSources } from "@/lib/sources-context";
import type { SourceConfig } from "@/lib/mock-sources";

export const Route = createFileRoute("/ingestion/")({
  head: () => ({
    meta: [
      { title: "Ingestion — Signal" },
      {
        name: "description",
        content: "Connect Signal to the places your customer feedback lives.",
      },
    ],
  }),
  component: IngestionPage,
});

function IngestionPage() {
  const { sources, setConnected } = useSources();
  const [pending, setPending] = useState<SourceConfig | null>(null);

  const connected = sources.filter((s) => s.connected);
  const available = sources.filter((s) => !s.connected);

  return (
    <SignalShell
      rightSlot={
        <>
          <Stat label="Connected" value={`${connected.length} / ${sources.length}`} />
          <Stat
            label="In scope"
            value={String(
              connected.reduce((sum, s) => sum + s.scope.filter((sc) => sc.enabled).length, 0),
            )}
          />
        </>
      }
    >
      <div className="px-6 py-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Ingestion sources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each source feeds Signal's pre-triage funnel. Configure what's in scope before items reach staging.
          </p>
        </div>

        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Connected</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

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
    </SignalShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums text-foreground">{value}</span>
    </div>
  );
}
