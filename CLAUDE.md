# IdeaBox — Claude Code Context

## Commands

```bash
npm run dev        # starts on http://localhost:8000  (not 3000)
npm run build      # production build → .vercel/output/ (Vercel Build Output API)
npx tsc --noEmit   # type check — run before every commit
```

## Build

`vite.config.ts` uses plain Vite + `@tanstack/react-start/plugin/vite` + Nitro directly (no Lovable wrapper). Nitro preset defaults to `vercel` (overridable via `NITRO_PRESET` env var). Build output lands in `.vercel/output/` — Vercel's Build Output API format, auto-detected on deploy.

## Stack

- **TanStack Start v1** — SSR framework. No `createAPIFileRoute` exists in this version.
- **TanStack Router** — file-based routing under `src/routes/`. `beforeLoad` for auth guards, `loader` for initial data.
- **Supabase** — Postgres + Auth. Project: `gijasrrifncyipjgckxq.supabase.co`
- **`@supabase/ssr`** — `createBrowserClient` (client, cookie storage), `createServerClient` (server, reads cookie header)
- **Tailwind v4 + shadcn/ui + tw-animate-css**
- **dnd-kit** for drag-and-drop in the staging table

## Non-obvious patterns

### Server functions
All `createServerFn` calls with `.inputValidator()` require the call site to pass `{ data: { ... } }`:
```ts
// ✓ correct
upsertStagingPref({ data: { requestId: id, pinned: true } })
// ✗ wrong — TypeScript will catch this
upsertStagingPref({ requestId: id, pinned: true })
```

### DB writes are fire-and-forget
State is always updated synchronously/optimistically. DB writes are async and swallow errors:
```ts
setState(next)
serverFn({ data: ... }).catch(console.error)  // never awaited
```

### Auth flow
`__root.tsx` `beforeLoad` → `getAuthSession()` → redirect to `/signin` if null.
Session is cookie-based; `getSupabaseUserClient(request)` reads it in server fns.
GitHub OAuth redirects through Supabase (`/auth/v1/callback`) back to `/auth/callback`.

### Source type
`Source = "Teams" | "Email" | "Read.AI" | "manual"` — `"manual"` was added for quick-added ideas. Any `Record<Source, ...>` lookup (e.g. `SourceBadge`, `StagingView`) must include a `manual` entry.

## Key files

| File | Role |
|---|---|
| `src/routes/__root.tsx` | Auth gate + provider tree |
| `src/routes/box.tsx` | Main triage page — all stage/view/bulk action logic |
| `src/routes/signin.tsx` | GitHub OAuth entry point |
| `src/routes/auth.callback.tsx` | Exchanges code → session cookie, redirects to `/box` |
| `src/lib/auth.server.ts` | `getSession` / `requireSession` |
| `src/lib/supabase.server.ts` | `getSupabaseAdmin()` + `getSupabaseUserClient(request)` |
| `src/lib/staging-context.tsx` | Pins, tags, notes, parked, views — DB-backed |
| `src/lib/agent-context.tsx` | Weights, instructions, runs, learned rules — DB-backed |
| `src/lib/sources-context.tsx` | **Still uses `MOCK_SOURCES`** — server fns in `sources.functions.ts` exist but are not wired |
| `src/lib/mock-requests.ts` | Domain types (`RequestRecord`, `Source`, `Status`, …) + scoring helpers |
| `supabase/migrations/` | `001` schema, `002` seed data (DO block), `003` no-op (Auth.js was scrapped) |

## What's pending

1. **Wire `sources-context.tsx` to DB** — load `getSourceConfigs()` on mount; persist via `setSourceConnected`, `setScopeItemEnabled`, `createIngestionRun`, `completeIngestionRun`. All server fns exist in `src/lib/api/sources.functions.ts`.

2. **Persist status mutations in `box.tsx`** — `dismiss()`, `bulkDismiss()`, `confirmPush()`, `bulkReopen()` update local state only. They should fire `updateRequestStatus({ data: { id, status } })` fire-and-forget.

3. **Persist Jira key** — `confirmPush()` generates a mock key locally. Should call `setJiraKey({ data: { id, jiraKey } })` after push.

4. **RLS** — no Row Level Security policies exist yet. All DB access uses the service role key (bypasses RLS). Required before multi-user / multi-tenant launch.
