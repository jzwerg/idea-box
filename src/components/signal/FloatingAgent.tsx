import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { MOCK_REQUESTS } from "@/lib/mock-requests";
import { BrainstormSheet } from "./BrainstormSheet";
import { DetailDrawer } from "./DetailDrawer";
import type { RequestRecord } from "@/lib/mock-requests";

/**
 * Always-available "Brainstorm Agent" — sits in the bottom-right corner.
 * Press B or click to open the brainstorm sheet.
 */
export function FloatingAgent() {
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  // Local snapshot of requests so the agent works on any page.
  const requests: RequestRecord[] = MOCK_REQUESTS;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "b" && e.key !== "B") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      if (t?.isContentEditable) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openRequest = requests.find((r) => r.id === openId) ?? null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Brainstorm Agent"
        className="fixed bottom-5 right-5 z-30 group"
      >
        <span className="absolute inset-0 rounded-full bg-primary/30 blur-xl group-hover:bg-primary/50 transition-colors" aria-hidden />
        <span className="relative flex items-center gap-2 rounded-full pl-3 pr-4 py-3 bg-gradient-to-br from-primary via-chart-3 to-chart-4 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all animate-float">
          <span className="relative flex items-center justify-center h-6 w-6 rounded-full bg-white/20">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold">Ask Agent</span>
          <kbd className="ml-1 text-[10px] font-mono bg-white/20 rounded px-1.5 py-0.5">B</kbd>
        </span>
      </button>

      <BrainstormSheet
        open={open}
        onOpenChange={setOpen}
        requests={requests}
        onOpenRequest={(id) => {
          setOpenId(id);
          setOpen(false);
        }}
      />

      <DetailDrawer
        request={openRequest}
        onClose={() => setOpenId(null)}
        onUpdate={() => {}}
        onDismiss={() => setOpenId(null)}
        onPush={() => {}}
      />
    </>
  );
}
