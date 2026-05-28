import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftCircle, CheckCircle2, XCircle } from "lucide-react";
import { useMemo } from "react";
import type { RequestRecord, Status } from "@/lib/mock-requests";

const LANES: Array<{
  key: Status;
  title: string;
  icon: typeof CheckCircle2;
  tone: string;
}> = [
  { key: "new", title: "Staging", icon: ArrowLeftCircle, tone: "border-primary/40 bg-primary/[0.03]" },
  { key: "pushed", title: "Pushed", icon: CheckCircle2, tone: "border-chart-2/40 bg-chart-2/[0.04]" },
  { key: "dismissed", title: "Dismissed", icon: XCircle, tone: "border-muted-foreground/30 bg-muted/30" },
];

interface Props {
  requests: RequestRecord[];
  onMove: (id: string, to: Status) => void;
  onOpen: (id: string) => void;
}

export function OutcomeBoard({ requests, onMove, onOpen }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const byLane = useMemo(() => {
    const map: Record<Status, RequestRecord[]> = {
      new: [],
      reviewed: [],
      pushed: [],
      dismissed: [],
    };
    requests.forEach((r) => map[r.status]?.push(r));
    return map;
  }, [requests]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const to = String(over.id) as Status;
    const id = String(active.id);
    const current = requests.find((r) => r.id === id);
    if (!current || current.status === to) return;
    onMove(id, to);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex-1 grid grid-cols-3 gap-3 p-4 overflow-x-auto">
        {LANES.map((lane) => (
          <Lane
            key={lane.key}
            lane={lane}
            requests={byLane[lane.key] ?? []}
            onOpen={onOpen}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Lane({
  lane,
  requests,
  onOpen,
}: {
  lane: (typeof LANES)[number];
  requests: RequestRecord[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: lane.key });
  const Icon = lane.icon;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border ${lane.tone} flex flex-col min-h-[60vh] transition-shadow ${
        isOver ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <div className="px-3 py-2 border-b flex items-center gap-2 text-xs">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">{lane.title}</span>
        <span className="font-mono tabular-nums text-muted-foreground ml-auto">
          {requests.length}
        </span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {requests.length === 0 && (
          <div className="text-center text-[11px] text-muted-foreground py-10">
            Drop here
          </div>
        )}
        {requests.map((r) => (
          <Card key={r.id} request={r} onOpen={() => onOpen(r.id)} />
        ))}
      </div>
    </div>
  );
}

function Card({ request: r, onOpen }: { request: RequestRecord; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({ id: r.id });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className="rounded-md border bg-card p-2.5 text-xs cursor-grab active:cursor-grabbing hover:border-foreground/30 transition-colors"
    >
      <div className="font-medium text-sm leading-tight">{r.title}</div>
      <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{r.description}</div>
      <div className="flex items-center gap-1.5 mt-2">
        <Badge variant="outline" className="text-[10px] py-0 h-4 font-normal">
          {r.productArea}
        </Badge>
        {r.jiraKey && (
          <span className="font-mono text-[10px] text-muted-foreground">{r.jiraKey}</span>
        )}
      </div>
    </div>
  );
}
