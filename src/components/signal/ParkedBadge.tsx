import { ArchiveRestore, MoonStar, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ParkInfo } from "@/lib/staging-context";

const LABELS: Record<ParkInfo["reason"], { icon: typeof MoonStar; label: string; tone: string }> = {
  "low-confidence": {
    icon: HelpCircle,
    label: "Agent unsure",
    tone: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  },
  snoozed: {
    icon: MoonStar,
    label: "Snoozed",
    tone: "border-muted-foreground/30 text-muted-foreground",
  },
};

export function ParkedBadge({ info, onUnpark }: { info: ParkInfo; onUnpark?: () => void }) {
  const meta = LABELS[info.reason];
  const Icon = meta.icon;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] ${meta.tone}`}
          >
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs max-w-xs">
          <div className="space-y-1">
            <div className="font-medium">{meta.label}</div>
            {info.note && <div className="text-muted-foreground">{info.note}</div>}
            {onUnpark && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnpark();
                }}
                className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
              >
                <ArchiveRestore className="h-3 w-3" /> Move back to staging
              </button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
