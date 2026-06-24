# IdeaBox

IdeaBox is an AI-powered idea management platform that helps teams capture, organize, prioritize, and ship ideas through a structured pipeline.

## Overview

Ideas flow through four stages:

| Stage | Purpose |
|-------|---------|
| **Spark** | Capture and triage incoming ideas from pulls, manual entry, and external sources |
| **Shape** | Group, refine, and prioritize ideas into actionable feature candidates |
| **Launch** | Plan, track, and coordinate delivery with integrations like Jira |
| **Shelve** | Archive completed or discarded ideas as institutional memory |

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) — React 19 SSR with file-based routing
- **Auth / DB:** Supabase (Postgres + GitHub OAuth)
- **UI:** Radix UI + shadcn components + Tailwind CSS 4
- **State:** React Context + optimistic updates
- **Drag & Drop:** dnd-kit
- **Build:** Vite + Node

## Getting Started

```bash
npm install
npm run dev   # http://localhost:8000
```

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials before running.

## Project Structure

```
src/
  routes/          # File-based pages (box, settings, etc.)
  components/
    signal/        # Core pipeline UI (SignalShell, StagingView, DetailDrawer, etc.)
    ui/            # Reusable primitives (buttons, dialogs, etc.)
  hooks/           # Custom React hooks
  lib/             # Utilities, API functions, context providers
```

## Key Concepts

- **Pull** — a scheduled or manual import of signals from connected sources (meetings, tickets, docs, etc.)
- **Spark tab** — the intake queue where pulled items are triaged (keep / discard / group)
- **Staging** — the shared pipeline view across all stages with drag-and-drop reordering
- **Brainstorm** — an AI-assisted workspace for exploring and connecting ideas
- **Agent settings** — per-stage AI agent configuration (knowledge context, learnings, orchestration)

## Roadmap & Iteration Ideas

See [ITERATION_IDEAS.md](./ITERATION_IDEAS.md) for planned improvements and future direction.
