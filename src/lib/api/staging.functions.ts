import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { z } from "zod";
import { getSupabaseAdmin } from "../supabase.server";
import { requireSession } from "../auth.server";
import type { ParkReason, SavedView, TrustEvent } from "../staging-context";

// ── Staging prefs ─────────────────────────────────────────────────────────────

export const getStagingPrefs = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const user = await requireSession(request);
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("user_staging_prefs")
    .select("*")
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  const pinned: Record<string, boolean> = {};
  const manualRank: Record<string, number> = {};
  const tags: Record<string, string[]> = {};
  const notes: Record<string, string> = {};
  const parked: Record<string, { reason: ParkReason; note?: string; at: string }> = {};

  for (const row of data ?? []) {
    const rid = row.request_id as string;
    if (row.pinned) pinned[rid] = true;
    if (row.manual_rank != null) manualRank[rid] = row.manual_rank as number;
    if ((row.tags as string[]).length) tags[rid] = row.tags as string[];
    if (row.note) notes[rid] = row.note as string;
    if (row.parked_reason) {
      parked[rid] = {
        reason: row.parked_reason as ParkReason,
        note: row.parked_note as string | undefined,
        at: row.parked_at as string,
      };
    }
  }

  return { pinned, manualRank, tags, notes, parked };
});

const UpsertPrefInput = z.object({
  requestId: z.string(),
  pinned: z.boolean().optional(),
  manualRank: z.number().nullable().optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional(),
  parkedReason: z.enum(["low-confidence", "snoozed"]).nullable().optional(),
  parkedNote: z.string().nullable().optional(),
  parkedAt: z.string().nullable().optional(),
});

export const upsertStagingPref = createServerFn({ method: "POST" })
  .inputValidator(UpsertPrefInput)
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await requireSession(request);
    const db = getSupabaseAdmin();

    const { error } = await db.from("user_staging_prefs").upsert(
      {
        user_id: user.id,
        request_id: data.requestId,
        ...(data.pinned !== undefined && { pinned: data.pinned }),
        ...(data.manualRank !== undefined && { manual_rank: data.manualRank }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.parkedReason !== undefined && { parked_reason: data.parkedReason }),
        ...(data.parkedNote !== undefined && { parked_note: data.parkedNote }),
        ...(data.parkedAt !== undefined && { parked_at: data.parkedAt }),
      },
      { onConflict: "user_id,request_id" },
    );

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearManualOrdering = createServerFn({ method: "POST" }).handler(async () => {
  const request = getRequest();
  const user = await requireSession(request);
  const db = getSupabaseAdmin();

  const { error } = await db
    .from("user_staging_prefs")
    .update({ manual_rank: null, pinned: false })
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  return { ok: true };
});

// ── Saved views ───────────────────────────────────────────────────────────────

export const getSavedViews = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const user = await requireSession(request);
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("saved_views")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order");

  if (error) throw new Error(error.message);

  return (data ?? []).map(
    (row): SavedView => ({
      id: row.id as string,
      name: row.name as string,
      rule: row.rule as string,
      groupBy: row.group_by as SavedView["groupBy"],
      scope: row.scope as SavedView["scope"],
      stage: row.stage as SavedView["stage"],
      builtin: row.builtin as boolean,
    }),
  );
});

export const upsertView = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string(),
      rule: z.string(),
      groupBy: z.string(),
      scope: z.string().optional(),
      stage: z.string().optional(),
      builtin: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await requireSession(request);
    const db = getSupabaseAdmin();

    const { error } = await db.from("saved_views").upsert(
      {
        id: data.id,
        user_id: user.id,
        name: data.name,
        rule: data.rule,
        group_by: data.groupBy,
        scope: data.scope ?? "spark",
        stage: data.stage ?? null,
        builtin: data.builtin ?? false,
        sort_order: data.sortOrder ?? 0,
      },
      { onConflict: "id" },
    );

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteView = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await requireSession(request);
    const db = getSupabaseAdmin();

    const { error } = await db
      .from("saved_views")
      .delete()
      .eq("id", data.id)
      .eq("user_id", user.id)
      .eq("builtin", false);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Trust events ──────────────────────────────────────────────────────────────

export const recordTrustEvent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      action: z.string(),
      requestId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await requireSession(request);
    const db = getSupabaseAdmin();

    await db.from("trust_events").insert({
      user_id: user.id,
      action: data.action,
      request_id: data.requestId ?? null,
    });

    return { ok: true };
  });

export const getTrustHistory = createServerFn({ method: "GET" })
  .inputValidator(z.object({ limit: z.number().default(200) }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await requireSession(request);
    const db = getSupabaseAdmin();

    const { data: rows, error } = await db
      .from("trust_events")
      .select("*")
      .eq("user_id", user.id)
      .order("ts", { ascending: false })
      .limit(data.limit);

    if (error) throw new Error(error.message);

    return (rows ?? []).map(
      (row): TrustEvent => ({
        ts: row.ts as string,
        action: row.action as TrustEvent["action"],
        requestId: row.request_id as string | undefined,
      }),
    );
  });
