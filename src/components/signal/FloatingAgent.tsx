import { useCallback, useEffect, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MOCK_REQUESTS, type RequestRecord } from "@/lib/mock-requests";
import { BrainstormPanel } from "./BrainstormSheet";
import { DetailDrawer } from "./DetailDrawer";

/**
 * Brainstorm — centered modal. Press B to toggle, Esc to close.
 * If dirty (typed prompt or visible results), Esc/backdrop prompt a confirm.
 */
export function FloatingAgent() {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [idea, setIdea] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const requests: RequestRecord[] = MOCK_REQUESTS;

  const isDirty = idea.trim().length > 0 || submitted.trim().length > 0;
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;
  const openRef = useRef(open);
  openRef.current = open;

  const reset = useCallback(() => {
    setIdea("");
    setSubmitted("");
  }, []);

  const tryClose = useCallback(() => {
    if (dirtyRef.current) {
      setConfirmOpen(true);
    } else {
      setOpen(false);
    }
  }, []);

  // Global shortcut: B toggles. Dirty-close goes through confirm.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "b" && e.key !== "B") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      if (t?.isContentEditable) return;
      e.preventDefault();
      if (openRef.current) tryClose();
      else setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryClose]);

  // Radix Dialog onOpenChange fires for Esc + backdrop + close button.
  const handleOpenChange = (next: boolean) => {
    if (next) setOpen(true);
    else tryClose();
  };

  const discardAndClose = () => {
    reset();
    setConfirmOpen(false);
    setOpen(false);
  };

  const openRequest = requests.find((r) => r.id === openId) ?? null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Brainstorm (B)"
        title="Brainstorm — press B"
        className="fixed bottom-5 right-5 z-30 h-11 pl-3.5 pr-4 rounded-full bg-card border border-border shadow-md hover:shadow-lg hover:border-foreground/30 hover:bg-accent transition-all flex items-center justify-center gap-2 group"
      >
        <Lightbulb className="h-[18px] w-[18px] text-foreground/80 group-hover:text-foreground transition-colors" />
        <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">Brainstorm</span>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl gap-3">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-display">
              <Lightbulb className="h-4 w-4 text-chart-3" />
              Brainstorm
              <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">B</kbd>
                toggle
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 ml-1">Esc</kbd>
                close
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Describe an idea, problem, or theme — we'll surface related items from the box.
            </DialogDescription>
          </DialogHeader>

          <BrainstormPanel
            requests={requests}
            onOpenRequest={(id) => {
              setOpenId(id);
              reset();
              setOpen(false);
            }}
            idea={idea}
            setIdea={setIdea}
            submitted={submitted}
            setSubmitted={setSubmitted}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard brainstorm?</AlertDialogTitle>
            <AlertDialogDescription>
              Your draft and any results will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <AlertDialogAction onClick={discardAndClose}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DetailDrawer
        request={openRequest}
        onClose={() => setOpenId(null)}
        onUpdate={() => {}}
        onDismiss={() => setOpenId(null)}
        onDelete={() => setOpenId(null)}
        onPush={() => {}}
      />
    </>
  );
}
