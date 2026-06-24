import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { z } from "zod";
import { getSupabaseAdmin } from "../supabase.server";
import { requireSession } from "../auth.server";
import type { SourceConfig, SourceId, ScopeItem, IngestionRun } from "../mock-sources";

// ── Source configs ────────────────────────────────────────────────────────────

export const getSourceConfigs = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const user = await requireSession(request);
  const db = getSupabaseAdmin();

  const [{ data: configs }, { data: scopeItems }, { data: runs }] = await Promise.all([
    db.from("source_configs").select("*").eq("user_id", user.id),
    db.from("source_scope_items").select("*").eq("user_id", user.id),
    db
      .from("ingestion_runs")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(100),
  ]);

  // Group scope items and runs by source
  const scopeBySource = ((scopeItems ?? []) as Record<string, unknown>[]).reduce<
    Record<string, ScopeItem[]>
  >((acc, item) => {
    const sid = item.source_id as string;
    acc[sid] ??= [];
    acc[sid].push({
      id: item.id as string,
      label: item.label as string,
      sublabel: item.sublabel as string | undefined,
      enabled: item.enabled as boolean,
    });
    return acc;
  }, {});

  const runsBySource = ((runs ?? []) as Record<string, unknown>[]).reduce<
    Record<string, IngestionRun[]>
  >((acc, run) => {
    const sid = run.source_id as string;
    acc[sid] ??= [];
    acc[sid].push({
      id: run.id as string,
      startedAt: run.started_at as string,
      durationMs: run.duration_ms as number,
      itemsScanned: run.items_scanned as number,
      signalsExtracted: run.signals_extracted as number,
      pushedToSpark: run.pushed_to_spark as number,
      status: run.status as IngestionRun["status"],
      notes: run.notes as string | undefined,
      items: [], // run items loaded separately when needed
    });
    return acc;
  }, {});

  const configBySource = ((configs ?? []) as Record<string, unknown>[]).reduce<
    Record<string, { connected: boolean }>
  >((acc, c) => {
    acc[c.source_id as string] = { connected: c.connected as boolean };
    return acc;
  }, {});

  return { configBySource, scopeBySource, runsBySource };
});

export const setSourceConnected = createServerFn({ method: "POST" })
  .inputValidator(z.object({ sourceId: z.string(), connected: z.boolean() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await requireSession(request);
    const db = getSupabaseAdmin();

    const { error } = await db.from("source_configs").upsert(
      {
        user_id: user.id,
        source_id: data.sourceId,
        connected: data.connected,
      },
      { onConflict: "user_id,source_id" },
    );

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setScopeItemEnabled = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      sourceId: z.string(),
      itemId: z.string(),
      enabled: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await requireSession(request);
    const db = getSupabaseAdmin();

    const { error } = await db
      .from("source_scope_items")
      .update({ enabled: data.enabled })
      .eq("id", data.itemId)
      .eq("user_id", user.id)
      .eq("source_id", data.sourceId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Ingestion runs ────────────────────────────────────────────────────────────

export const createIngestionRun = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      sourceId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await requireSession(request);
    const db = getSupabaseAdmin();

    const { error } = await db.from("ingestion_runs").insert({
      id: data.id,
      user_id: user.id,
      source_id: data.sourceId,
      status: "running",
    });

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeIngestionRun = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      sourceId: z.string(),
      durationMs: z.number(),
      itemsScanned: z.number(),
      signalsExtracted: z.number(),
      pushedToSpark: z.number(),
      status: z.enum(["success", "partial", "failed"]),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await requireSession(request);
    const db = getSupabaseAdmin();

    const { error } = await db
      .from("ingestion_runs")
      .update({
        duration_ms: data.durationMs,
        items_scanned: data.itemsScanned,
        signals_extracted: data.signalsExtracted,
        pushed_to_spark: data.pushedToSpark,
        status: data.status,
        notes: data.notes ?? null,
      })
      .eq("id", data.id)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Seed mock sources (dev only) ──────────────────────────────────────────────

export const seedSources = createServerFn({ method: "POST" }).handler(async () => {
  const request = getRequest();
  const user = await requireSession(request);
  const db = getSupabaseAdmin();
  const { MOCK_SOURCES } = await import("../mock-sources");

  for (const src of MOCK_SOURCES) {
    await db.from("source_configs").upsert(
      { user_id: user.id, source_id: src.id, connected: src.connected },
      { onConflict: "user_id,source_id" },
    );

    for (const item of src.scope) {
      await db.from("source_scope_items").upsert(
        {
          id: `${user.id}-${item.id}`,
          user_id: user.id,
          source_id: src.id,
          label: item.label,
          sublabel: item.sublabel ?? null,
          enabled: item.enabled,
        },
        { onConflict: "id" },
      );
    }
  }

  return { seeded: MOCK_SOURCES.length };
});
