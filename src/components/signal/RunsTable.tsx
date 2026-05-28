import { Fragment, useState } from "react";
import { ChevronRight, Loader2, AlertCircle, CheckCircle2, CircleDashed } from "lucide-react";
import {
  formatDuration,
  formatRelative,
  type IngestionRun,
  type RunStatus,
} from "@/lib/mock-sources";

const STATUS_META: Record<RunStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  success: { label: "Success", cls: "text-chart-2", icon: CheckCircle2 },
  partial: { label: "Partial", cls: "text-chart-4", icon: CircleDashed },
  failed: { label: "Failed", cls: "text-destructive", icon: AlertCircle },
  running: { label: "Running", cls: "text-primary", icon: Loader2 },
};

export function RunsTable({ runs }: { runs: IngestionRun[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (runs.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-sm text-muted-foreground">
        No runs yet. Trigger one to see what flows in.
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b">
        <tr>
          <th className="w-8 px-3 py-2.5" />
          <th className="px-2 py-2.5 text-left font-medium w-32">Started</th>
          <th className="px-2 py-2.5 text-right font-medium w-20">Duration</th>
          <th className="px-2 py-2.5 text-right font-medium w-24">Scanned</th>
          <th className="px-2 py-2.5 text-right font-medium w-24">Signals</th>
          <th className="px-2 py-2.5 text-right font-medium w-24">Pushed</th>
          <th className="px-2 py-2.5 text-left font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((r) => {
          const meta = STATUS_META[r.status];
          const Icon = meta.icon;
          const open = openId === r.id;
          return (
            <Fragment key={r.id}>
              <tr
                className="border-b cursor-pointer hover:bg-accent/40"
                onClick={() => setOpenId(open ? null : r.id)}
              >
                <td className="px-3 py-3">
                  <ChevronRight
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                      open ? "rotate-90" : ""
                    }`}
                  />
                </td>
                <td className="px-2 py-3 text-muted-foreground">{formatRelative(r.startedAt)}</td>
                <td className="px-2 py-3 text-right font-mono tabular-nums text-muted-foreground">
                  {formatDuration(r.durationMs)}
                </td>
                <td className="px-2 py-3 text-right font-mono tabular-nums">{r.itemsScanned}</td>
                <td className="px-2 py-3 text-right font-mono tabular-nums">{r.signalsExtracted}</td>
                <td className="px-2 py-3 text-right font-mono tabular-nums text-primary">
                  {r.pushedToStaging}
                </td>
                <td className="px-2 py-3">
                  <span className={`inline-flex items-center gap-1.5 ${meta.cls}`}>
                    <Icon className={`h-3.5 w-3.5 ${r.status === "running" ? "animate-spin" : ""}`} />
                    {meta.label}
                  </span>
                  {r.notes && (
                    <span className="ml-2 text-xs text-muted-foreground">— {r.notes}</span>
                  )}
                </td>
              </tr>
              {open && (
                <tr className="border-b bg-muted/20">
                  <td />
                  <td colSpan={6} className="px-2 py-4">
                    {r.items.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic">
                        No item-level breakdown captured for this run.
                      </div>
                    ) : (
                      <ul className="space-y-1.5">
                        {r.items.map((it, i) => (
                          <li key={i} className="flex items-center gap-3 text-xs">
                            <OutcomeChip outcome={it.outcome} />
                            <span className="flex-1 truncate">{it.title}</span>
                            {it.reason && (
                              <span className="text-muted-foreground italic">{it.reason}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              )}
            </>
          );
        })}
      </tbody>
    </table>
  );
}

function OutcomeChip({ outcome }: { outcome: "signal" | "filtered" | "duplicate" }) {
  const meta = {
    signal: { label: "signal", cls: "bg-primary/15 text-primary" },
    filtered: { label: "filtered", cls: "bg-muted text-muted-foreground" },
    duplicate: { label: "duplicate", cls: "bg-chart-4/15 text-chart-4" },
  }[outcome];
  return (
    <span
      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}
