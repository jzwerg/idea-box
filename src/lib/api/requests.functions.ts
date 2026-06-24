import { createServerFn } from "@tanstack/react-start";
import { getRequest as getWebRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSupabaseAdmin } from "../supabase.server";
import { requireSession } from "../auth.server";
import type {
  RequestRecord,
  PriorityBreakdown,
  Source,
  UserType,
  ProductArea,
  Status,
} from "../mock-requests";
import type { SourceMention } from "../mock-requests";

// ── DB row → domain type ──────────────────────────────────────────────────────

function rowToRequest(
  row: Record<string, unknown>,
  mentions: SourceMention[],
): RequestRecord {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    productArea: row.product_area as ProductArea,
    primarySource: row.primary_source as Source,
    frequency: row.frequency as number,
    confidence: row.confidence as number,
    userType: row.user_type as UserType,
    status: row.status as Status,
    jiraKey: row.jira_key as string | undefined,
    priority: {
      impact: { value: row.impact_value as number, rationale: row.impact_rationale as string },
      reach: { value: row.reach_value as number, rationale: row.reach_rationale as string },
      urgency: { value: row.urgency_value as number, rationale: row.urgency_rationale as string },
      effort: { value: row.effort_value as number, rationale: row.effort_rationale as string },
    } satisfies PriorityBreakdown,
    mentions,
    createdAt: row.created_at as string,
  };
}

function mentionRowToMention(row: Record<string, unknown>): SourceMention {
  return {
    id: row.id as string,
    source: row.source as Source,
    author: row.author as string,
    client: row.client as string,
    excerpt: row.excerpt as string,
    timestamp: row.ts as string,
    link: row.link as string,
  };
}

// ── List all requests ─────────────────────────────────────────────────────────

export const listRequests = createServerFn({ method: "GET" }).handler(async () => {
  const db = getSupabaseAdmin();

  const { data: rows, error } = await db
    .from("requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const { data: mentionRows } = await db
    .from("source_mentions")
    .select("*")
    .in("request_id", (rows ?? []).map((r) => r.id));

  const mentionsByRequest = ((mentionRows ?? []) as Record<string, unknown>[]).reduce<
    Record<string, SourceMention[]>
  >((acc, m) => {
    const rid = m.request_id as string;
    acc[rid] ??= [];
    acc[rid].push(mentionRowToMention(m));
    return acc;
  }, {});

  return ((rows ?? []) as Record<string, unknown>[]).map((row) =>
    rowToRequest(row, mentionsByRequest[row.id as string] ?? []),
  );
});

// ── Get a single request ──────────────────────────────────────────────────────

export const getRequest = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const db = getSupabaseAdmin();

    const { data: row, error } = await db
      .from("requests")
      .select("*")
      .eq("id", data.id)
      .single();

    if (error) throw new Error(error.message);

    const { data: mentionRows } = await db
      .from("source_mentions")
      .select("*")
      .eq("request_id", data.id);

    return rowToRequest(
      row as Record<string, unknown>,
      ((mentionRows ?? []) as Record<string, unknown>[]).map(mentionRowToMention),
    );
  });

// ── Update request status ─────────────────────────────────────────────────────

export const updateRequestStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), status: z.enum(["new", "reviewed", "shelve", "launch"]) }))
  .handler(async ({ data }) => {
    const request = getWebRequest();
    await requireSession(request);
    const db = getSupabaseAdmin();

    const { error } = await db
      .from("requests")
      .update({ status: data.status })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Set Jira key ──────────────────────────────────────────────────────────────

export const setJiraKey = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), jiraKey: z.string() }))
  .handler(async ({ data }) => {
    const request = getWebRequest();
    await requireSession(request);
    const db = getSupabaseAdmin();

    const { error } = await db
      .from("requests")
      .update({ jira_key: data.jiraKey })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Create a request manually ─────────────────────────────────────────────────

export const createRequest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().min(1),
      description: z.string().default(""),
      status: z.enum(["new", "reviewed", "shelve", "launch"]).default("new"),
    }),
  )
  .handler(async ({ data }) => {
    const request = getWebRequest();
    await requireSession(request);
    const db = getSupabaseAdmin();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const row = {
      id,
      title: data.title.trim(),
      description: data.description,
      product_area: "Reporting",
      primary_source: "manual",
      frequency: 1,
      confidence: 0.5,
      user_type: "Compliance Officer",
      status: data.status,
      impact_value: 50,
      impact_rationale: "",
      reach_value: 50,
      reach_rationale: "",
      urgency_value: 50,
      urgency_rationale: "",
      effort_value: 50,
      effort_rationale: "",
      created_at: now,
    };

    const { error } = await db.from("requests").insert(row);
    if (error) throw new Error(error.message);

    return {
      id,
      title: row.title,
      description: row.description,
      productArea: "Reporting" as ProductArea,
      primarySource: "manual" as Source,
      frequency: 1,
      confidence: 0.5,
      userType: "Compliance Officer" as UserType,
      status: data.status as Status,
      priority: {
        impact: { value: 50, rationale: "" },
        reach: { value: 50, rationale: "" },
        urgency: { value: 50, rationale: "" },
        effort: { value: 50, rationale: "" },
      },
      mentions: [],
      createdAt: now,
    } satisfies RequestRecord;
  });

// ── Delete a request ──────────────────────────────────────────────────────────

export const deleteRequest = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const request = getWebRequest();
    await requireSession(request);
    const db = getSupabaseAdmin();

    await db.from("source_mentions").delete().eq("request_id", data.id);
    const { error } = await db.from("requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Seed mock data (dev only) ─────────────────────────────────────────────────

export const seedRequests = createServerFn({ method: "POST" }).handler(async () => {
  const db = getSupabaseAdmin();
  const { MOCK_REQUESTS } = await import("../mock-requests");

  for (const req of MOCK_REQUESTS) {
    await db.from("requests").upsert({
      id: req.id,
      title: req.title,
      description: req.description,
      product_area: req.productArea,
      primary_source: req.primarySource,
      frequency: req.frequency,
      confidence: req.confidence,
      user_type: req.userType,
      status: req.status,
      jira_key: req.jiraKey ?? null,
      impact_value: req.priority.impact.value,
      impact_rationale: req.priority.impact.rationale,
      reach_value: req.priority.reach.value,
      reach_rationale: req.priority.reach.rationale,
      urgency_value: req.priority.urgency.value,
      urgency_rationale: req.priority.urgency.rationale,
      effort_value: req.priority.effort.value,
      effort_rationale: req.priority.effort.rationale,
      created_at: req.createdAt,
    });

    for (const m of req.mentions) {
      await db.from("source_mentions").upsert({
        id: m.id,
        request_id: req.id,
        source: m.source,
        author: m.author,
        client: m.client,
        excerpt: m.excerpt,
        link: m.link,
        ts: m.timestamp,
      });
    }
  }

  return { seeded: MOCK_REQUESTS.length };
});
