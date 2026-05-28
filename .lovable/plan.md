
## Mental model

One request table. Every request has a **stage** and optional **parked** flag. Routes are stages; Views are cross-stage filters; Agent is a layer that wraps everything.

```text
Sources  →  Staging  →  Outcome
                        ├─ Pushed
                        └─ Dismissed

                        Parked  (side bin, reachable from Staging — not a top route)
                        Agent   (top strip on every page + /agent for tuning)
                        Views   (cross-stage saved filters in a left rail)
```

### Stage rules (single source of truth)

`status: "new" | "pushed" | "dismissed"` + `parked: { reason: "low-confidence" | "snoozed", until?: string } | null`.

- **Staging** = `status==="new" && !parked`. The triage surface.
- **Parked** = `!!parked`. Accessible from a tab inside Staging ("Parked · N"), not a top nav item. The agent auto-parks `confidence < 0.4` items on ingest so they don't crowd Staging.
- **Outcome** = `status==="pushed" || "dismissed"`. One route, two presentations (tabs + Kanban) — see below.

## Navigation

Top nav becomes: **Sources · Staging · Outcome · Agent**. (Today's `/` becomes `/staging`; `/` redirects to `/staging`.)

```text
/sources                Source cards + ingestion runs (today's /ingestion)
/staging                The triage table. Tabs: All · Parked
/outcome                Pushed + Dismissed. Sub-tabs: List view | Board view
/agent                  Tuning, rules, trust log (today's /agent)
```

The Quarantine concept is dropped. Low-confidence items go to **Parked** with a visible "Agent unsure — review" reason, so there's no no-man's-land.

## Outcome surface

One route, two layouts toggled by a small segmented control:

- **List view** (default) — three sub-tabs `Pushed (N) · Dismissed (N) · All`. Same row component as Staging, no checkboxes/drag.
- **Board view** — three lanes side-by-side: `Pushed · Dismissed · ← back to Staging` (drag a card back into staging to reopen). Useful for visual grooming of recent decisions.

Both views read from the same filtered list; the toggle is pure presentation.

## Views (cross-stage)

A persistent **left rail** on Staging and Outcome (collapsed by default on Outcome). Views become saved filter+stage scopes:

```text
SavedView {
  name, rule (NL),
  scope: ("staging" | "outcome" | "all"),
  groupBy
}
```

- Built-ins: `All staging`, `Pinned`, `Has notes`, `Parked`, `Recently pushed`.
- A view like `"enterprise SSO"` with `scope: "all"` shows matches across Staging + Pushed + Dismissed, with a small stage chip per row.
- Smart Groups and Brainstorm results can both be **saved as a View** (already partly wired). Brainstorm becomes "new View from idea".
- The rail replaces today's pill bar; the pill bar moves into the rail as the active list. Frees horizontal space and makes Views feel first-class rather than chrome.

## Agent layer

Stays as today's pattern but unified:

- A single **persistent top strip** (rescoring status, last run, trust meter delta) rendered by `SignalShell` on every route — not just Staging. Removes the duplicated agent banner currently inside `index.tsx`.
- `/agent` keeps deep tuning + proposed rules + trust history.
- Every teaching action (pin/dismiss/push/tag/note/reorder) still routes through `recordAction` → `proposeRule` — no behavior change, just consolidated UI.

## Data model changes

In `mock-requests.ts` (and `RequestRecord`):

- Add `parked?: { reason: "low-confidence" | "snoozed"; until?: string; note?: string }`.
- Drop the unused `"reviewed"` status.
- Seed ~5 mock requests with `parked` so the bin isn't empty.

In `staging-context.tsx`:

- Add `parkRequest(id, reason)` / `unpark(id)` actions.
- Extend `SavedView` with `scope`.
- Extend `matchesView` to honor scope and accept a request's stage.

## File-level changes

**New**
- `src/routes/staging.tsx` — extracted from current `index.tsx`. Adds `All | Parked` sub-tabs.
- `src/routes/outcome.tsx` — list/board toggle, sub-tabs, reuses `StagingRow` in read-only mode.
- `src/components/signal/OutcomeBoard.tsx` — three-lane Kanban (dnd-kit, reuse existing sensors).
- `src/components/signal/ViewsRail.tsx` — left rail, replaces `ViewsBar` placement.
- `src/components/signal/AgentStrip.tsx` — the persistent top strip, mounted by `SignalShell`.
- `src/components/signal/ParkedBadge.tsx` — tiny chip + reason tooltip.

**Edited**
- `src/routes/index.tsx` → becomes a redirect to `/staging` (keep file tiny).
- `src/routes/__root.tsx` → no structural change; nav labels updated.
- `src/components/signal/SignalShell.tsx` → mount `AgentStrip`, update nav to `Sources · Staging · Outcome · Agent`.
- `src/lib/mock-requests.ts` → add `parked` field, drop `reviewed`, seed parked items.
- `src/lib/staging-context.tsx` → `parkRequest`/`unpark`, `SavedView.scope`, updated `matchesView`.
- `src/components/signal/ViewsBar.tsx` → either delete or repurpose as the rail's inner list.
- `src/routes/ingestion.index.tsx` → rename route to `/sources` (or keep file, change label) — pick one in build.

**Deleted (or merged)**
- The duplicated agent banner block in `index.tsx` (moves into `AgentStrip`).

## Out of scope (call out, don't build)

- Real auto-parking heuristic beyond `confidence < 0.4`.
- Snooze-until scheduler (UI only; no timer that re-surfaces).
- Server persistence — all state stays in localStorage as today.
- Renaming `ingestion` route on disk if it risks breaking the generated route tree; we'll just relabel in nav if needed.

## Open question to confirm during build

Brainstorm currently lives behind the `B` shortcut + a button. After this refactor, should it stay as a sheet, or fold entirely into "New View from idea" inside the Views rail? Leaning the latter — one less surface — but happy to keep both.
