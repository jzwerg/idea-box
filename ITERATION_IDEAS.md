# Iteration Ideas

A living document of product improvement ideas, organized by theme. Items marked **Next** are candidates for the next sprint.

---

## Capture & Input

- **Quick-add shortcut** — single keystroke to open an inline input: type, hit enter, done. Zero friction manual entry into the idea box.
- **Manual pull** — trigger a pull on demand (e.g. right after a critical meeting to capture feature ideas discussed), in addition to the existing scheduled cadence (e.g. weekly org-wide intel).
- **External submission portal** — public or org-internal portal for users to submit ideas, see status, and track what has launched or completed. Especially valuable in large orgs with many micro-solutions and overlapping efforts. Submitted ideas feed into the Spark tab as a tagged source.

---

## Spark (Triage)

- **Kanban view** — in addition to the list view, a kanban board for triage. Columns: incoming → keep → group → first-level priority. Pull-sourced items are tagged and filterable by source/pull.
- **Queue mechanism** — treat Spark (and Shelve) as queue in / queue out rather than a flat list.
- **AI triage agent** — auto-flag items on ingest: surface urgent items (e.g. a support request caught by mistake) and suggest immediate discards. The reviewer/validator confirms or overrides. Agent improves with feedback over time.
- **Cross-pull deduplication** — merge recommendations should span across pulls and against the main database, not just within a single pull.
- **Time decay** — surface staleness signals on older ideas (e.g. flagging items from 12+ months ago as potentially deprecated).

---

## Shape (Refinement)

- **AI grouping refinement** — agent that improves groupings iteratively and surfaces a top-20 feature suggestion list based on the highest-signal clusters.
- **Shelve suggestions** — agent proactively recommends ideas to shelve based on recency, signal strength, or overlap with shipped items.

---

## Brainstorm

- **Split-pane layout** — left side: chat interface surfacing relevant items from the box; right side: interactive graph of ideas.
- **Graph actions** — group nodes on the graph to create a new tag, a new view, or merge items together.
- **Real-time collaboration** — graph component supports multiplayer editing natively across users.

---

## Launch (Planning & Delivery)

- **Planning views** — Gantt chart and/or kanban board within the Launch stage.
- **Jira sync** — bi-directional sync with Jira: push ideas as issues, pull sprint tags back, keep status in sync automatically.
- **GTM support** — agent suggestions for go-to-market plan, client communications draft, and rollout checklist.
- **UAT feedback loop** — store UAT feedback in Shelve as learnings that inform future features being shipped.

---

## Shelve (Archive)

- **Completed vs. Discarded split** — two sub-buckets: *Completed* (shipped) and *Discarded* (rejected but kept for context). Discarded items prevent re-litigating the same ideas and serve as long-term institutional memory.

---

## Settings & Agent Architecture

- **Single settings page, stage-scoped** — replace the left nav panel with a single settings page. Title is a dropdown to select the stage. Each stage section exposes: agents, knowledge context, learnings flow, and orchestration logic.
- **Agent tree per stage** — define the agents needed for each stage (Spark, Shape, Launch, Shelve). Each agent has its own context, training signal, and can be added directly onto the dataset with its orchestration logic as the platform scales.
- **Scalable agent registry** — architecture should support adding new agents directly onto the dataset with their orchestration logic, without requiring code changes.

---

## Org & Workspace

- **Org / workspace level** — additional setting (under an avatar icon next to the gear) for org-level vs. workspace-level scope. Workspaces map to workstreams (e.g. Sales, Product, Tech, QA).
  - Org-level users see all items with a workspace tag column.
  - Workspace-level users see only their own items (no workspace tag needed).
- **Cross-user scoring** — contribution score beyond volume: how much you add, how much you help resolve, and how much you contribute to training the system.

---

## Future Vision

- **Product lines / app catalog** — org-level view of launched products and active improvement threads. New source for Spark (more organic, less noise). Reduces duplicate effort across teams building overlapping micro-solutions.
- **Graph as primary model** — the brainstorm graph becomes the canonical representation of the idea space, with all pipeline stages as views/filters on top of it.
