import { MessageSquare, Mail, Mic } from "lucide-react";
import type { Source } from "@/lib/mock-requests";

const META: Record<Source, { icon: typeof Mail; color: string }> = {
  Teams: { icon: MessageSquare, color: "text-chart-3" },
  Email: { icon: Mail, color: "text-chart-2" },
  "Read.AI": { icon: Mic, color: "text-chart-5" },
};

export function SourceBadge({ source, withLabel = true }: { source: Source; withLabel?: boolean }) {
  const { icon: Icon, color } = META[source];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      {withLabel && <span className="text-muted-foreground">{source}</span>}
    </span>
  );
}
