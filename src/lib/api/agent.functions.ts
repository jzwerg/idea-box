import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { z } from "zod";
import { getSupabaseAdmin } from "../supabase.server";
import { requireSession } from "../auth.server";
import type { Weights, AgentRun, LearnedRule, Proposal } from "../agent-context";

// ── Agent config ──────────────────────────────────────────────────────────────

export const getAgentConfig = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const user = await requireSession(request);
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("agent_config")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    return {
      weights: { impact: 0.35, reach: 0.25, urgency: 0.2, effort: 0.2 } satisfies Weights,
      instructions: "",
    };
  }

  return {
    weights: {
      impact: data.weight_impact as number,
      reach: data.weight_reach as number,
      urgency: data.weight_urgency as number,
      effort: data.weight_effort as number,
    } satisfies Weights,
    instructions: data.instructions as string,
  };
});

export const saveAgentConfig = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      weights: z.object({
        impact: z.number(),
        reach: z.number(),
        urgency: z.number(),
        effort: z.number(),
      }),
      instructions: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await requireSession(request);
    const db = getSupabaseAdmin();

    const { error } = await db.from("agent_config").upsert(
      {
        user_id: user.id,
        weight_impact: data.weights.impact,
        weight_reach: data.weights.reach,
        weight_urgency: data.weights.urgency,
        weight_effort: data.weights.effort,
        instructions: data.instructions,
      },
      { onConflict: "user_id" },
    );

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Agent runs ────────────────────────────────────────────────────────────────

export const getAgentRuns = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const user = await requireSession(request);
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("agent_runs")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []).map(
    (row): AgentRun => ({
      id: row.id as string,
      startedAt: row.started_at as string,
      trigger: row.trigger as AgentRun["trigger"],
      instructions: row.instructions as string | undefined,
      durationMs: row.duration_ms as number,
      status: row.status as AgentRun["status"],
      rescored: row.rescored as number,
      topMover:
        row.top_mover_title
          ? { title: row.top_mover_title as string, delta: row.top_mover_delta as number }
          : undefined,
      weightsSnapshot: {
        impact: row.weight_impact as number,
        reach: row.weight_reach as number,
        urgency: row.weight_urgency as number,
        effort: row.weight_effort as number,
      },
    }),
  );
});

export const createAgentRun = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      trigger: z.enum(["auto", "manual"]),
      instructions: z.string().optional(),
      weights: z.object({
        impact: z.number(),
        reach: z.number(),
        urgency: z.number(),
        effort: z.number(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await requireSession(request);
    const db = getSupabaseAdmin();

    const { error } = await db.from("agent_runs").insert({
      id: data.id,
      user_id: user.id,
      trigger: data.trigger,
      instructions: data.instructions ?? null,
      status: "running",
      weight_impact: data.weights.impact,
      weight_reach: data.weights.reach,
      weight_urgency: data.weights.urgency,
      weight_effort: data.weights.effort,
    });

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeAgentRun = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      status: z.enum(["success", "failed"]),
      durationMs: z.number(),
      rescored: z.number(),
      topMoverTitle: z.string().optional(),
      topMoverDelta: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await requireSession(request);
    const db = getSupabaseAdmin();

    const { error } = await db
      .from("agent_runs")
      .update({
        status: data.status,
        duration_ms: data.durationMs,
        rescored: data.rescored,
        top_mover_title: data.topMoverTitle ?? null,
        top_mover_delta: data.topMoverDelta ?? null,
      })
      .eq("id", data.id)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Learned rules ─────────────────────────────────────────────────────────────

export const getLearnedRules = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const user = await requireSession(request);
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("learned_rules")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map(
    (row): LearnedRule => ({
      id: row.id as string,
      rule: row.rule as string,
      sourceAction: row.source_action as LearnedRule["sourceAction"],
      sourceRequestId: row.source_request_id as string | undefined,
      sourceTitle: row.source_title as string | undefined,
      createdAt: row.created_at as string,
      enabled: row.enabled as boolean,
    }),
  );
});

export const upsertLearnedRule = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      rule: z.string(),
      sourceAction: z.string(),
      sourceRequestId: z.string().optional(),
      sourceTitle: z.string().optional(),
      enabled: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await requireSession(request);
    const db = getSupabaseAdmin();

    const { error } = await db.from("learned_rules").upsert(
      {
        id: data.id,
        user_id: user.id,
        rule: data.rule,
        source_action: data.sourceAction,
        source_request_id: data.sourceRequestId ?? null,
        source_title: data.sourceTitle ?? null,
        enabled: data.enabled,
      },
      { onConflict: "id" },
    );

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLearnedRule = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await requireSession(request);
    const db = getSupabaseAdmin();

    await db
      .from("learned_rules")
      .delete()
      .eq("id", data.id)
      .eq("user_id", user.id);

    return { ok: true };
  });
