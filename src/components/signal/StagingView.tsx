import { useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
  Layers,
  Mail,
  MessagesSquare,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Source } from "@/lib/mock-requests";

interface StagedItem {
  id: string;
  title: string;
  source: Source;
  client: string;
  excerpt: string;
  group: string;
}

interface StagedBatch {
  id: string;
  pulledAt: string;
  pullLabel: string;
  items: StagedItem[];
  suggestions: { group: string; count: number; tone: string }[];
}

const SOURCE_ICON: Record<Source, typeof Mail> = {
  Email: Mail,
  Teams: MessagesSquare,
  "Read.AI": Mic,
};

const MOCK_BATCHES: StagedBatch[] = [
  {
    id: "batch_today",
    pulledAt: "Today, 9:14 AM",
    pullLabel: "Morning pull",
    suggestions: [
      { group: "Bulk actions", count: 3, tone: "text-[oklch(0.6_0.14_250)]" },
      { group: "Export & reporting", count: 2, tone: "text-[oklch(0.66_0.13_155)]" },
      { group: "Other", count: 1, tone: "text-muted-foreground" },
    ],
    items: [
      {
        id: "s1",
        title: "Bulk-approve KYC reviews from the queue",
        source: "Teams",
        client: "NordBank AS",
        excerpt: "Approving one-by-one is killing throughput — let us select & approve in batch.",
        group: "Bulk actions",
      },
      {
        id: "s2",
        title: "Multi-select dismiss for false-positive alerts",
        source: "Email",
        client: "Helvetia Trust",
        excerpt: "We get 200+ false positives a week. Need a way to clear them en masse.",
        group: "Bulk actions",
      },
      {
        id: "s3",
        title: "Group dismiss with shared reason code",
        source: "Teams",
        client: "FinSquare",
        excerpt: "Bulk dismiss but force a single reason — for audit trail.",
        group: "Bulk actions",
      },
      {
        id: "s4",
        title: "Schedule weekly CSV export of risk register",
        source: "Email",
        client: "MeridianPay",
        excerpt: "Can we get this exported every Monday morning automatically?",
        group: "Export & reporting",
      },
      {
        id: "s5",
        title: "Add PDF export with firm-branded header",
        source: "Read.AI",
        client: "Allegra Capital",
        excerpt: "Compliance committee wants branded PDFs, not raw CSV.",
        group: "Export & reporting",
      },
      {
        id: "s6",
        title: "Dark mode for the client portal",
        source: "Teams",
        client: "FinSquare",
        excerpt: "Analysts working night-shift asked for a dark theme.",
        group: "Other",
      },
    ],
  },
  {
    id: "batch_yesterday",
    pulledAt: "Yesterday, 6:00 PM",
    pullLabel: "End-of-day pull",
    suggestions: [
      { group: "SSO & access", count: 2, tone: "text-[oklch(0.58_0.16_295)]" },
      { group: "Onboarding flow", count: 2, tone: "text-[oklch(0.74_0.13_75)]" },
    ],
    items: [
      {
        id: "s7",
        title: "Okta SSO for enterprise tenants",
        source: "Email",
        client: "NordBank AS",
        excerpt: "Procurement is blocking renewal until we support Okta SAML.",
        group: "SSO & access",
      },
      {
        id: "s8",
        title: "Azure AD group sync for role assignment",
        source: "Read.AI",
        client: "Helvetia Trust",
        excerpt: "Want AD groups to map to portal roles automatically.",
        group: "SSO & access",
      },
      {
        id: "s9",
        title: "Save & resume on KYC onboarding form",
        source: "Teams",
        client: "MeridianPay",
        excerpt: "Form is 40 fields long — analysts lose work if they switch tabs.",
        group: "Onboarding flow",
      },
      {
        id: "s10",
        title: "Pre-fill onboarding from existing client record",
        source: "Email",
        client: "FinSquare",
        excerpt: "We already have most of this data. Don't make us re-type it.",
        group: "Onboarding flow",
      },
    ],
  },
];

export function StagingView() {
  const [batches, setBatches] = useState<StagedBatch[]>(MOCK_BATCHES);

  const acceptBatch = (id: string) => {
    const b = batches.find((x) => x.id === id);
    setBatches((bs) => bs.filter((x) => x.id !== id));
    toast.success(
      `${b?.items.length ?? 0} ideas pushed to Shape`,
      { description: b ? `Grouped into ${b.suggestions.length} clusters` : undefined },
    );
  };

  const pushIndividually = (id: string) => {
    const b = batches.find((x) => x.id === id);
    setBatches((bs) => bs.filter((x) => x.id !== id));
    toast.success(`${b?.items.length ?? 0} ideas pushed individually`);
  };

  if (batches.length === 0) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        <Layers className="h-6 w-6 mx-auto mb-2 opacity-50" strokeWidth={2} />
        Spark is empty. New pulls will land here for review.
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      {batches.map((batch) => {
        const groups = Array.from(new Set(batch.items.map((i) => i.group)));
        return (
          <section
            key={batch.id}
            className="rounded-xl border border-border bg-background/60"
          >
            <header className="flex items-center justify-between px-4 py-3 border-b border-border/70">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-card border border-border flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.25} />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-medium font-display">{batch.pullLabel}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {batch.pulledAt} · {batch.items.length} new items
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full text-xs gap-1.5"
                  onClick={() => pushIndividually(batch.id)}
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={2.25} /> Push individually
                </Button>
                <Button
                  size="sm"
                  className="h-8 rounded-full text-xs gap-1.5"
                  onClick={() => acceptBatch(batch.id)}
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
                  Accept grouping
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
                </Button>
              </div>
            </header>

            <div className="px-4 py-3 border-b border-border/70 bg-card/40">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" strokeWidth={2.25} /> Suggested grouping
                </span>
                {batch.suggestions.map((s) => (
                  <span
                    key={s.group}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-xs"
                  >
                    <span className={`font-medium ${s.tone}`}>{s.group}</span>
                    <span className="font-mono tabular-nums text-[10px] text-muted-foreground">
                      {s.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="divide-y divide-border/60">
              {groups.map((g) => {
                const items = batch.items.filter((i) => i.group === g);
                return (
                  <div key={g} className="px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-mono">
                      {g} · {items.length}
                    </div>
                    <ul className="space-y-2">
                      {items.map((item) => {
                        const Icon = SOURCE_ICON[item.source];
                        return (
                          <li
                            key={item.id}
                            className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-accent/40 transition-colors"
                          >
                            <Icon
                              className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0"
                              strokeWidth={2.25}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{item.title}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                <span className="font-medium text-foreground/70">{item.client}</span>{" "}
                                · {item.excerpt}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
