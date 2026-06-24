import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getAgentConfig,
  saveAgentConfig,
  getAgentRuns,
  createAgentRun,
  completeAgentRun,
  getLearnedRules,
  upsertLearnedRule,
  deleteLearnedRule as deleteLearnedRuleFn,
} from "./api/agent.functions";
import type { TeachAction } from "./teach";

export interface LearnedRule {
  id: string;
  rule: string;
  sourceAction: TeachAction;
  sourceRequestId?: string;
  sourceTitle?: string;
  createdAt: string;
  enabled: boolean;
}

export interface Proposal {
  id: string;
  rule: string;
  sourceAction: TeachAction;
  sourceRequestId?: string;
  sourceTitle?: string;
  createdAt: string;
}


export type Weights = {
  impact: number;
  reach: number;
  urgency: number;
  effort: number;
};

export interface AgentRun {
  id: string;
  startedAt: string;
  trigger: "auto" | "manual";
  instructions?: string;
  durationMs: number;
  status: "running" | "success" | "failed";
  rescored: number;
  topMover?: { title: string; delta: number };
  weightsSnapshot: Weights;
}

export type AgentApplyFn = (params: {
  weights: Weights;
  instructions: string;
  runInstructions?: string;
}) => { rescored: number; topMover?: { title: string; delta: number } };

interface AgentCtx {
  weights: Weights;
  setWeights: (w: Weights) => void;
  resetWeights: () => void;
  instructions: string;
  setInstructions: (s: string) => void;
  runs: AgentRun[];
  status: "idle" | "running";
  runAgent: (opts?: { trigger?: "auto" | "manual"; instructions?: string }) => void;
  registerApply: (fn: AgentApplyFn | null) => void;
  learnedRules: LearnedRule[];
  pendingProposals: Proposal[];
  proposeRule: (p: Omit<Proposal, "id" | "createdAt">) => void;
  acceptProposal: (id: string, finalRule?: string) => void;
  dismissProposal: (id: string) => void;
  toggleLearnedRule: (id: string) => void;
  removeLearnedRule: (id: string) => void;
}


const Ctx = createContext<AgentCtx | null>(null);

const DEFAULT_INSTRUCTIONS =
  "Prioritise requests tied to active enterprise deals, named revenue at risk, or imminent regulatory deadlines. Down-weight pure cosmetic asks unless reach is broad. Cluster duplicates and prefer those with multi-channel mentions.";

export function AgentProvider({ children }: { children: ReactNode }) {
  const [weights, setWeightsState] = useState<Weights>({ impact: 0.35, reach: 0.25, urgency: 0.20, effort: 0.20 });
  const [instructions, setInstructionsState] = useState<string>(DEFAULT_INSTRUCTIONS);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [status, setStatus] = useState<"idle" | "running">("idle");
  const [learnedRules, setLearnedRules] = useState<LearnedRule[]>([]);
  const [pendingProposals, setPendingProposals] = useState<Proposal[]>([]);
  const applyRef = useRef<AgentApplyFn | null>(null);

  // Load initial state from DB
  useEffect(() => {
    Promise.all([getAgentConfig(), getAgentRuns(), getLearnedRules()])
      .then(([config, runs, rules]) => {
        setWeightsState(config.weights);
        if (config.instructions) setInstructionsState(config.instructions);
        setRuns(runs);
        setLearnedRules(rules);
      })
      .catch(console.error);
  }, []);

  const proposeRule = useCallback((p: Omit<Proposal, "id" | "createdAt">) => {
    const proposal: Proposal = {
      ...p,
      id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setPendingProposals((arr) => [proposal, ...arr].slice(0, 50));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("agent:proposal", { detail: proposal }));
    }
  }, []);

  const acceptProposal = useCallback((id: string, finalRule?: string) => {
    setPendingProposals((arr) => {
      const p = arr.find((x) => x.id === id);
      if (p) {
        const newRule: LearnedRule = {
          id: `rule-${Date.now()}`,
          rule: finalRule?.trim() || p.rule,
          sourceAction: p.sourceAction,
          sourceRequestId: p.sourceRequestId,
          sourceTitle: p.sourceTitle,
          createdAt: new Date().toISOString(),
          enabled: true,
        };
        setLearnedRules((rules) => [newRule, ...rules]);
        upsertLearnedRule({ data: {
          id: newRule.id,
          rule: newRule.rule,
          sourceAction: String(newRule.sourceAction),
          sourceRequestId: newRule.sourceRequestId,
          sourceTitle: newRule.sourceTitle,
          enabled: true,
        } }).catch(console.error);
      }
      return arr.filter((x) => x.id !== id);
    });
  }, []);

  const dismissProposal = useCallback((id: string) => {
    setPendingProposals((arr) => arr.filter((x) => x.id !== id));
  }, []);

  const toggleLearnedRule = useCallback((id: string) => {
    setLearnedRules((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, enabled: !r.enabled };
        upsertLearnedRule({ data: {
          id: updated.id,
          rule: updated.rule,
          sourceAction: String(updated.sourceAction),
          sourceRequestId: updated.sourceRequestId,
          sourceTitle: updated.sourceTitle,
          enabled: updated.enabled,
        } }).catch(console.error);
        return updated;
      }),
    );
  }, []);

  const removeLearnedRule = useCallback((id: string) => {
    setLearnedRules((rs) => rs.filter((r) => r.id !== id));
    deleteLearnedRuleFn({ data: { id } }).catch(console.error);
  }, []);


  const registerApply = useCallback((fn: AgentApplyFn | null) => {
    applyRef.current = fn;
  }, []);

  const setWeights = useCallback((w: Weights) => {
    setWeightsState(w);
    saveAgentConfig({ data: { weights: w, instructions } }).catch(console.error);
  }, [instructions]);

  const setInstructions = useCallback((s: string) => {
    setInstructionsState(s);
    saveAgentConfig({ data: { weights, instructions: s } }).catch(console.error);
  }, [weights]);

  const resetWeights = useCallback(
    () => setWeightsState({ impact: 0.35, reach: 0.25, urgency: 0.20, effort: 0.20 }),
    [],
  );

  const runAgent = useCallback<AgentCtx["runAgent"]>(
    (opts) => {
      const trigger = opts?.trigger ?? "manual";
      const runInstructions = opts?.instructions;
      const id = `agent-${Date.now()}`;
      const startedAt = new Date().toISOString();
      const snapshot = { ...weights };

      setStatus("running");
      setRuns((rs) => [
        {
          id,
          startedAt,
          trigger,
          instructions: runInstructions,
          durationMs: 0,
          status: "running",
          rescored: 0,
          weightsSnapshot: snapshot,
        },
        ...rs,
      ]);
      createAgentRun({ data: {
        id,
        trigger,
        instructions: runInstructions,
        weights: snapshot,
      } }).catch(console.error);

      const duration = 1400 + Math.floor(Math.random() * 1600);
      const learnedText = learnedRules
        .filter((r) => r.enabled)
        .map((r) => r.rule)
        .join("\n");
      const composedInstructions = learnedText
        ? `${instructions}\n\n[Learned rules]\n${learnedText}`
        : instructions;
      setTimeout(() => {
        const result = applyRef.current?.({
          weights: snapshot,
          instructions: composedInstructions,
          runInstructions,
        });

        setRuns((rs) =>
          rs.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "success",
                  durationMs: duration,
                  rescored: result?.rescored ?? 0,
                  topMover: result?.topMover,
                }
              : r,
          ),
        );
        completeAgentRun({ data: {
          id,
          status: "success",
          durationMs: duration,
          rescored: result?.rescored ?? 0,
          topMoverTitle: result?.topMover?.title,
          topMoverDelta: result?.topMover?.delta,
        } }).catch(console.error);
        setStatus("idle");
      }, duration);
    },
    [weights, instructions, learnedRules],
  );

  // Auto-trigger on batch landing from any source
  useEffect(() => {
    const onBatch = () => runAgent({ trigger: "auto" });
    window.addEventListener("signal:batch-complete", onBatch as EventListener);
    return () =>
      window.removeEventListener("signal:batch-complete", onBatch as EventListener);
  }, [runAgent]);

  return (
    <Ctx.Provider
      value={{
        weights,
        setWeights,
        resetWeights,
        instructions,
        setInstructions,
        runs,
        status,
        runAgent,
        registerApply,
        learnedRules,
        pendingProposals,
        proposeRule,
        acceptProposal,
        dismissProposal,
        toggleLearnedRule,
        removeLearnedRule,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}



export function useAgent() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAgent must be used inside AgentProvider");
  return v;
}

/**
 * Compute composite score with custom weights. Mirrors mock-requests.compositeScore.
 */
export function compositeWith(
  p: {
    impact: { value: number };
    reach: { value: number };
    urgency: { value: number };
    effort: { value: number };
  },
  w: Weights,
) {
  const total = w.impact + w.reach + w.urgency + w.effort || 1;
  return Math.round(
    (p.impact.value * w.impact +
      p.reach.value * w.reach +
      p.urgency.value * w.urgency +
      p.effort.value * w.effort) /
      total,
  );
}
