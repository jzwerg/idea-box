export function PriorityBar({ score }: { score: number }) {
  const intensity = Math.min(100, Math.max(0, score));
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm tabular-nums w-8 text-right">{intensity}</span>
      <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${intensity}%` }}
        />
      </div>
    </div>
  );
}
