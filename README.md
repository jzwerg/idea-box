# IdeaBox

> A triage tool for PMs who get more signal than they can process.

Teams generate feature requests across meetings, emails, support tickets, and Slack threads. Most of it gets lost or duplicated. IdeaBox pulls it all in, scores it with a configurable AI agent, and gives you a single queue to work from — so you're making decisions, not doing admin.

---

## How it works

Ideas move through four stages:

| Stage | What happens |
|---|---|
| **Spark** | Raw signals land here from connected sources. Triage: keep, group, or discard. |
| **Shape** | Grouped ideas get scored, refined, and prioritized for delivery. |
| **Launch** | Shaped ideas become tracked deliverables and push to Jira. |
| **Shelve** | Completed and rejected ideas stay as searchable institutional memory. |

---

## Notable design decisions

**Optimistic UI throughout.** Every action — pin, tag, sort, reorder, dismiss — updates instantly. DB writes happen fire-and-forget in the background. No spinners, no waiting.

**Keyboard-first.** `⌘I` opens a two-step quick-add modal anywhere in the app. Arrow keys navigate the stage picker. Full bulk-action support with keyboard shortcuts.

**Configurable AI scoring.** The agent panel lets you set weights, write natural-language instructions, and review learned rules per stage. Scores update live as you tune.

**Drag-and-drop with persistent rank.** dnd-kit handles row reordering in the Shape stage; manual rank order is stored in Supabase and survives page reloads.

**SSR with cookie-based auth.** TanStack Start server functions read the Supabase session from cookies — no token passing in request bodies, auth works consistently on client and server.

---

## Stack

| | |
|---|---|
| **Framework** | [TanStack Start](https://tanstack.com/start) v1 — SSR, file-based routing, typed server functions |
| **Database / Auth** | Supabase — Postgres + GitHub OAuth via `@supabase/ssr` |
| **UI** | Tailwind CSS v4 + shadcn/ui + Radix primitives |
| **Drag & Drop** | dnd-kit |
| **Toasts** | Sonner |

---

## Running locally

```bash
cp .env.local.example .env.local   # add your Supabase credentials + GitHub OAuth app
npm install
npm run dev                         # → http://localhost:8000
```

Migrations live in `supabase/migrations/`. Point at a new Supabase project and run them in order.

---

## Roadmap

See [ITERATION_IDEAS.md](./ITERATION_IDEAS.md) — planned features include cross-pull deduplication, a graph-based brainstorm workspace, bi-directional Jira sync, and multi-workspace support.
