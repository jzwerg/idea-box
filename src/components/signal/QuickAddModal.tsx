import { useEffect, useRef, useState } from "react";
import { Lightbulb, Rocket, Trash2, ArrowLeft, X } from "lucide-react";
import type { Status } from "@/lib/mock-requests";

type AddStage = "shape" | "launch" | "shelve";

const STAGE_OPTIONS: Array<{
  key: AddStage;
  label: string;
  status: Status;
  Icon: typeof Lightbulb;
  description: string;
}> = [
  { key: "shape", label: "Shape", status: "new", Icon: Lightbulb, description: "Needs review" },
  { key: "launch", label: "Launch", status: "launch", Icon: Rocket, description: "Ready to ship" },
  { key: "shelve", label: "Shelve", status: "shelve", Icon: Trash2, description: "Archive it" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (title: string, status: Status) => void;
}

export function QuickAddModal({ open, onClose, onAdd }: Props) {
  const [step, setStep] = useState<"text" | "stage">("text");
  const [title, setTitle] = useState("");
  const [stageIdx, setStageIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stageRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("text");
      setTitle("");
      setStageIdx(0);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  // Focus stage chip when entering stage step
  useEffect(() => {
    if (step === "stage") {
      stageRefs.current[stageIdx]?.focus();
    }
  }, [step, stageIdx]);

  if (!open) return null;

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (title.trim()) setStep("stage");
    }
  };

  const handleStageKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setStageIdx((i) => (i + 1) % STAGE_OPTIONS.length);
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setStageIdx((i) => (i - 1 + STAGE_OPTIONS.length) % STAGE_OPTIONS.length);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      confirm();
    }
    if (e.key === "Backspace") {
      setStep("text");
    }
  };

  const confirm = () => {
    const chosen = STAGE_OPTIONS[stageIdx];
    onAdd(title.trim(), chosen.status);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px]" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[480px] rounded-2xl border border-border bg-card shadow-lg">
        {step === "text" ? (
          <>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <span className="font-display font-semibold text-sm text-foreground">New idea</span>
              <button
                onClick={onClose}
                className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="px-5 pb-4">
              <textarea
                ref={textareaRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleTextKeyDown}
                placeholder="What's the idea?"
                rows={3}
                className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            <div className="flex items-center justify-between px-5 pb-5">
              <span className="text-xs text-muted-foreground">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd>
                {" "}next
                <span className="ml-2 opacity-60">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">⇧↵</kbd>
                  {" "}newline
                </span>
              </span>
              <button
                disabled={!title.trim()}
                onClick={() => { if (title.trim()) setStep("stage"); }}
                className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 transition-opacity"
              >
                Next →
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-5 pt-5 pb-3">
              <button
                onClick={() => setStep("text")}
                className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <span
                className="text-sm text-muted-foreground truncate"
                title={title}
              >
                {title}
              </span>
            </div>

            <div className="px-5 pb-3">
              <p className="font-display font-semibold text-sm text-foreground mb-4">
                Where should this go?
              </p>
              <div
                className="grid grid-cols-3 gap-2"
                onKeyDown={handleStageKeyDown}
              >
                {STAGE_OPTIONS.map((opt, i) => {
                  const selected = i === stageIdx;
                  return (
                    <button
                      key={opt.key}
                      ref={(el) => { stageRefs.current[i] = el; }}
                      onClick={() => { setStageIdx(i); confirm(); }}
                      onFocus={() => setStageIdx(i)}
                      className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm transition-all focus:outline-none ${
                        selected
                          ? "border-primary bg-primary/8 text-primary shadow-sm ring-2 ring-primary/20"
                          : "border-border bg-background text-muted-foreground hover:border-border/80 hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <opt.Icon className="h-5 w-5" strokeWidth={1.75} />
                      <span className="font-display font-semibold">{opt.label}</span>
                      <span className="text-[11px] opacity-70">{opt.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 pb-5 pt-1">
              <span className="text-xs text-muted-foreground">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">←→</kbd>
                {" "}navigate
                <span className="ml-2">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd>
                  {" "}add
                </span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
