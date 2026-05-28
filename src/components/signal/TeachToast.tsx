import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Brain, X, Plus } from "lucide-react";
import { useAgent, type Proposal } from "@/lib/agent-context";

/**
 * Listens for "agent:proposal" events and renders a sonner custom toast
 * with an editable preview before the rule is appended to Learned rules.
 */
export function TeachToast() {
  const { acceptProposal, dismissProposal } = useAgent();

  useEffect(() => {
    const onProposal = (e: Event) => {
      const proposal = (e as CustomEvent<Proposal>).detail;
      toast.custom(
        (t) => (
          <ProposalCard
            proposal={proposal}
            onAccept={(rule) => {
              acceptProposal(proposal.id, rule);
              toast.dismiss(t);
              toast.success("Rule added to the agent", {
                description: "Visible & editable on the Agent page.",
              });
            }}
            onSkip={() => {
              dismissProposal(proposal.id);
              toast.dismiss(t);
            }}
          />
        ),
        { duration: 14000, position: "bottom-right" },
      );
    };
    window.addEventListener("agent:proposal", onProposal);
    return () => window.removeEventListener("agent:proposal", onProposal);
  }, [acceptProposal, dismissProposal]);

  return null;
}

function ProposalCard({
  proposal,
  onAccept,
  onSkip,
}: {
  proposal: Proposal;
  onAccept: (rule: string) => void;
  onSkip: () => void;
}) {
  const [rule, setRule] = useState(proposal.rule);
  return (
    <div className="w-[380px] rounded-lg border bg-popover text-popover-foreground shadow-lg p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Brain className="h-3.5 w-3.5 text-primary" />
          Teach the agent?
        </div>
        <button
          onClick={onSkip}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Skip"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Appends to <span className="text-foreground">Agent → Learned rules</span> ·{" "}
        from <span className="text-foreground">{proposal.sourceAction}</span>
        {proposal.sourceTitle && (
          <>
            {" "}· on <span className="text-foreground italic">"{proposal.sourceTitle}"</span>
          </>
        )}
      </div>
      <Textarea
        value={rule}
        onChange={(e) => setRule(e.target.value)}
        rows={3}
        className="text-xs font-mono leading-relaxed"
      />
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onSkip}>
          Skip
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => onAccept(rule)}
        >
          <Plus className="h-3 w-3" /> Add rule
        </Button>
      </div>
    </div>
  );
}
