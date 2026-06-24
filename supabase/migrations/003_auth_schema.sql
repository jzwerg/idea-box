-- Superseded: switched from Auth.js to Supabase Auth natively.
-- No additional schema is needed. Supabase manages auth.users internally.
select 1;

grant usage  on schema next_auth to service_role;
grant all    on all tables    in schema next_auth to service_role;
grant all    on all sequences in schema next_auth to service_role;
grant all    on all routines  in schema next_auth to service_role;

create table if not exists next_auth.users (
  id              uuid not null default uuid_generate_v4(),
  name            text,
  email           text unique,
  "emailVerified" timestamptz,
  image           text,
  primary key (id)
);

create table if not exists next_auth.accounts (
  id                  uuid not null default uuid_generate_v4(),
  type                text not null,
  provider            text not null,
  "providerAccountId" text not null,
  refresh_token       text,
  access_token        text,
  expires_at          bigint,
  token_type          text,
  scope               text,
  id_token            text,
  session_state       text,
  "userId"            uuid,
  primary key (id),
  constraint "accounts_userId_fkey" foreign key ("userId")
    references next_auth.users (id) on delete cascade
);

create unique index if not exists accounts_provider_account_key
  on next_auth.accounts (provider, "providerAccountId");

create table if not exists next_auth.sessions (
  id             uuid not null default uuid_generate_v4(),
  expires        timestamptz not null,
  "sessionToken" text not null unique,
  "userId"       uuid,
  primary key (id),
  constraint "sessions_userId_fkey" foreign key ("userId")
    references next_auth.users (id) on delete cascade
);

create table if not exists next_auth.verification_tokens (
  identifier text        not null,
  token      text        not null,
  expires    timestamptz not null,
  primary key (token)
);

create unique index if not exists verification_tokens_identifier_token_key
  on next_auth.verification_tokens (identifier, token);

-- Helper: returns the Auth.js user UUID from the current JWT (useful for RLS policies later)
create or replace function next_auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
