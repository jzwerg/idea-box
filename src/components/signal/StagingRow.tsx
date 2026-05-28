import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical, Pin, PinOff } from "lucide-react";
import type { RequestRecord, UserType } from "@/lib/mock-requests";
import { useStaging } from "@/lib/staging-context";
import { useAgent, compositeWith } from "@/lib/agent-context";
import { SourceBadge } from "./SourceBadge";
import { PriorityBar } from "./PriorityBar";
import { TagChips, NotePopover } from "./TagEditor";
import { buildProposedRule } from "@/lib/teach";

const USER_TYPE_TONE: Record<UserType, string> = {
  "Compliance Officer": "border-destructive/40 text-destructive",
  "Risk Analyst": "border-chart-4/40 text-chart-4",
  "KYC Analyst": "border-chart-2/40 text-chart-2",
  "Operations Lead": "border-chart-3/40 text-chart-3",
  "Client Admin": "border-chart-5/40 text-chart-5",
  "Exec Sponsor": "border-primary/40 text-primary",
};

interface Props {
  request: RequestRecord;
  index: number;
  checked: boolean;
  onCheck: (c: boolean) => void;
  onOpen: () => void;
  showCheckbox: boolean;
  draggable: boolean;
}

export function StagingRow({
  request: r,
  index,
  checked,
  onCheck,
  onOpen,
  showCheckbox,
  draggable,
}: Props) {
  const { weights } = useAgent();
  const { pinned, togglePin } = useStaging();
  const { proposeRule } = useAgent();

  const sortable = useSortable({ id: r.id, disabled: !draggable });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const score = compositeWith(r.priority, weights);
  const uniqueSources = Array.from(new Set(r.mentions.map((m) => m.source)));
  const isPinned = !!pinned[r.id];

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasPinned = isPinned;
    togglePin(r.id);
    const p = buildProposedRule(wasPinned ? "unpin" : "pin", r);
    if (p) proposeRule(p);
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b cursor-pointer transition-colors ${
        checked ? "bg-primary/5" : isPinned ? "bg-amber-500/[0.04]" : "hover:bg-accent/40"
      }`}
      onClick={onOpen}
    >
      <td className="px-2 py-3 w-8" onClick={(e) => e.stopPropagation()}>
        {draggable ? (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : (
          <span className="block h-4 w-4" />
        )}
      </td>
      <td className="px-1 py-3 w-8" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handlePin}
          className={isPinned ? "text-amber-500" : "text-muted-foreground/50 hover:text-foreground"}
          aria-label={isPinned ? "Unpin" : "Pin"}
        >
          {isPinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <PinOff className="h-3.5 w-3.5" />}
        </button>
      </td>
      <td className="px-2 py-3 w-8" onClick={(e) => e.stopPropagation()}>
        {showCheckbox && <Checkbox checked={checked} onCheckedChange={(c) => onCheck(!!c)} />}
      </td>
      <td className="px-1 py-3 font-mono text-xs text-muted-foreground tabular-nums w-10">
        {String(index + 1).padStart(2, "0")}
      </td>
      <td className="px-2 py-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{r.title}</span>
            <Badge
              variant="outline"
              className={`font-normal text-[10px] py-0 h-4 ${USER_TYPE_TONE[r.userType]}`}
            >
              {r.userType}
            </Badge>
            {r.jiraKey && (
              <span className="font-mono text-[10px] text-muted-foreground">{r.jiraKey}</span>
            )}
          </div>
          <TagChips request={r} />
        </div>
      </td>
      <td className="px-2 py-3 text-muted-foreground text-xs">{r.productArea}</td>
      <td className="px-2 py-3">
        <div className="flex items-center gap-1.5">
          {uniqueSources.map((s) => (
            <SourceBadge key={s} source={s} withLabel={false} />
          ))}
        </div>
      </td>
      <td className="px-2 py-3 text-right font-mono tabular-nums">{r.frequency}</td>
      <td className="px-2 py-3">
        <PriorityBar score={score} />
      </td>
      <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
        <NotePopover request={r} />
      </td>
      <td className="px-4 py-3 text-right">
        <Badge
          variant="outline"
          className="text-[10px] uppercase tracking-wider font-normal"
        >
          {r.status}
        </Badge>
      </td>
    </tr>
  );
}
