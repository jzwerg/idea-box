-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- REQUESTS (core idea/signal records)
-- ============================================================
create table requests (
  id            text primary key,                  -- e.g. req_001
  title         text not null,
  description   text not null default '',
  product_area  text not null,
  primary_source text not null,
  frequency     integer not null default 1,
  confidence    numeric(4,3) not null default 0.5, -- 0-1
  user_type     text not null,
  status        text not null default 'new',       -- new | reviewed | shelve | launch
  jira_key      text,
  -- priority breakdown (stored as flat columns for query convenience)
  impact_value      integer not null default 50,
  impact_rationale  text not null default '',
  reach_value       integer not null default 50,
  reach_rationale   text not null default '',
  urgency_value     integer not null default 50,
  urgency_rationale text not null default '',
  effort_value      integer not null default 50,
  effort_rationale  text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- SOURCE MENTIONS (each signal can have multiple source quotes)
-- ============================================================
create table source_mentions (
  id          text primary key,
  request_id  text not null references requests(id) on delete cascade,
  source      text not null,  -- Teams | Email | Read.AI
  author      text not null,
  client      text not null,
  excerpt     text not null,
  link        text not null default '#',
  ts          timestamptz not null default now()
);

create index source_mentions_request_id_idx on source_mentions(request_id);

-- ============================================================
-- USER STAGING PREFERENCES (per-user overrides on requests)
-- ============================================================
create table user_staging_prefs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,
  request_id  text not null references requests(id) on delete cascade,
  pinned      boolean not null default false,
  manual_rank integer,
  tags        text[] not null default '{}',
  note        text not null default '',
  -- parked
  parked_reason text,                -- low-confidence | snoozed | null (not parked)
  parked_note   text,
  parked_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, request_id)
);

create index user_staging_prefs_user_id_idx on user_staging_prefs(user_id);

-- ============================================================
-- SAVED VIEWS
-- ============================================================
create table saved_views (
  id          text primary key,
  user_id     text not null,
  name        text not null,
  rule        text not null default '',
  group_by    text not null default 'none',
  scope       text not null default 'spark',
  stage       text,
  builtin     boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index saved_views_user_id_idx on saved_views(user_id);

-- ============================================================
-- AGENT CONFIG (per user)
-- ============================================================
create table agent_config (
  id            uuid primary key default uuid_generate_v4(),
  user_id       text not null unique,
  weight_impact  numeric(4,3) not null default 0.35,
  weight_reach   numeric(4,3) not null default 0.25,
  weight_urgency numeric(4,3) not null default 0.20,
  weight_effort  numeric(4,3) not null default 0.20,
  instructions  text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- LEARNED RULES
-- ============================================================
create table learned_rules (
  id              text primary key,
  user_id         text not null,
  rule            text not null,
  source_action   text not null,
  source_request_id text,
  source_title    text,
  enabled         boolean not null default true,
  created_at      timestamptz not null default now()
);

create index learned_rules_user_id_idx on learned_rules(user_id);

-- ============================================================
-- AGENT RUNS
-- ============================================================
create table agent_runs (
  id              text primary key,
  user_id         text not null,
  started_at      timestamptz not null default now(),
  trigger         text not null default 'manual',  -- auto | manual
  instructions    text,
  duration_ms     integer not null default 0,
  status          text not null default 'running', -- running | success | failed
  rescored        integer not null default 0,
  top_mover_title text,
  top_mover_delta numeric(6,2),
  weight_impact   numeric(4,3),
  weight_reach    numeric(4,3),
  weight_urgency  numeric(4,3),
  weight_effort   numeric(4,3)
);

create index agent_runs_user_id_idx on agent_runs(user_id);

-- ============================================================
-- SOURCE CONFIGS (per user)
-- ============================================================
create table source_configs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,
  source_id   text not null,   -- teams | outlook | readai | jira | slack | zendesk
  connected   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, source_id)
);

create table source_scope_items (
  id          text primary key,
  user_id     text not null,
  source_id   text not null,
  label       text not null,
  sublabel    text,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now()
);

create index source_scope_items_user_source_idx on source_scope_items(user_id, source_id);

-- ============================================================
-- INGESTION RUNS
-- ============================================================
create table ingestion_runs (
  id                text primary key,
  user_id           text not null,
  source_id         text not null,
  started_at        timestamptz not null default now(),
  duration_ms       integer not null default 0,
  items_scanned     integer not null default 0,
  signals_extracted integer not null default 0,
  pushed_to_spark   integer not null default 0,
  status            text not null default 'running',  -- running | success | partial | failed
  notes             text
);

create table ingestion_run_items (
  id          uuid primary key default uuid_generate_v4(),
  run_id      text not null references ingestion_runs(id) on delete cascade,
  title       text not null,
  outcome     text not null,  -- signal | filtered | duplicate
  reason      text
);

create index ingestion_runs_user_source_idx on ingestion_runs(user_id, source_id);

-- ============================================================
-- TRUST EVENTS
-- ============================================================
create table trust_events (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,
  action      text not null,
  request_id  text,
  ts          timestamptz not null default now()
);

create index trust_events_user_id_idx on trust_events(user_id);

-- Auto-update updated_at helper
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger requests_updated_at before update on requests
  for each row execute function update_updated_at();

create trigger user_staging_prefs_updated_at before update on user_staging_prefs
  for each row execute function update_updated_at();

create trigger agent_config_updated_at before update on agent_config
  for each row execute function update_updated_at();

create trigger source_configs_updated_at before update on source_configs
  for each row execute function update_updated_at();
