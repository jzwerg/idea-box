/**
 * One-shot seed script for local/staging dev.
 * Run with: bun run scripts/seed-dev.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 */
import { createClient } from "@supabase/supabase-js";
import { MOCK_REQUESTS } from "../src/lib/mock-requests";
import { MOCK_SOURCES } from "../src/lib/mock-sources";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function seedRequests() {
  console.log("Seeding requests...");
  for (const req of MOCK_REQUESTS) {
    const { error } = await db.from("requests").upsert({
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
    if (error) throw new Error(`requests upsert failed: ${error.message}`);

    for (const m of req.mentions) {
      const { error: me } = await db.from("source_mentions").upsert({
        id: m.id,
        request_id: req.id,
        source: m.source,
        author: m.author,
        client: m.client,
        excerpt: m.excerpt,
        link: m.link,
        ts: m.timestamp,
      });
      if (me) throw new Error(`source_mentions upsert failed: ${me.message}`);
    }
  }
  console.log(`  ✓ ${MOCK_REQUESTS.length} requests seeded`);
}

async function seedSources(userId: string) {
  console.log(`Seeding sources for user ${userId}...`);
  for (const src of MOCK_SOURCES) {
    await db.from("source_configs").upsert(
      { user_id: userId, source_id: src.id, connected: src.connected },
      { onConflict: "user_id,source_id" },
    );
    for (const item of src.scope) {
      await db.from("source_scope_items").upsert(
        {
          id: `${userId}-${item.id}`,
          user_id: userId,
          source_id: src.id,
          label: item.label,
          sublabel: item.sublabel ?? null,
          enabled: item.enabled,
        },
        { onConflict: "id" },
      );
    }
  }
  console.log(`  ✓ ${MOCK_SOURCES.length} sources seeded`);
}

const DEV_USER_ID = process.env.SEED_USER_ID ?? "dev-user-001";

await seedRequests();
await seedSources(DEV_USER_ID);
console.log("Done.");
