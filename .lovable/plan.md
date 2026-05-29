## Settings nav + icons + richer views + centered detail modal

### 1. Move Sources and Agent out of the main nav into Settings

**Main nav** (`SignalShell.tsx`) becomes just:
- Box (the only product surface)
- Settings (gear icon, right-aligned next to the stats)

**New routes**:
- `src/routes/settings.tsx` — layout shell with a left sub-nav (Sources, Agent, later: Members/etc.) + `<Outlet />`.
- `src/routes/settings.index.tsx` — redirect to `/settings/sources`.
- `src/routes/settings.sources.tsx` — wraps the existing Sources list (content moved from `routes/ingestion.index.tsx`).
- `src/routes/settings.sources.$sourceId.tsx` — wraps the existing source-detail content (moved from `routes/ingestion.$sourceId.tsx`).
- `src/routes/settings.agent.tsx` — wraps the existing Agent content (moved from `routes/agent.tsx`).
- Old top-level routes (`/ingestion`, `/ingestion/$sourceId`, `/agent`) keep their files but redirect to their `/settings/...` equivalents (so deep links don't 404).

**Contextual entry points** (not main nav, but reachable from the workflow):
- **Detail modal** (the item view) gets a small "Sources" affordance in its header/footer: a link "Manage sources →" that navigates to `/settings/sources`, plus each individual mention row links to `/settings/sources/$sourceId` for that mention's source. Mentions remain rendered inline in the modal; this just adds the redirection paths the user asked for.
- **Brainstorm modal** gets a quiet footer link "Agent settings →" that navigates to `/settings/agent` (closing the modal first; if dirty, runs the existing discard-confirm).

### 2. Remove all emojis → lucide icons with thicker strokes

Replace every emoji currently rendered in JSX with a lucide icon. Use `strokeWidth={2.25}` consistently (slightly heavier than the lucide default 2) so the icons read confidently against the Notion-style neutral surfaces, without going to brutalist 3.

Concrete swaps:
- Stage tabs in `box.tsx`: 💡 → `Lightbulb`, 🚀 → `Rocket`, 🗑️ → `Trash2`.
- Nav items in `SignalShell.tsx`: 📦 → `Package` (already used in logo, fine to reuse), settings → `Settings`. Drop 📥/🤖 entirely (those nav items are gone).
- Sweep other components for stray emojis (e.g. any source-card icons, empty states, toasts).

The `STAGES` config in `box.tsx` swaps `emoji: string` for `Icon: LucideIcon`, and renders `<Icon className="h-3.5 w-3.5" strokeWidth={2.25} />`.

### 3. Rework views vs filters: views = grouping/scope, pinned/notes = filters

**Data-model additions** in `src/lib/mock-requests.ts` (mock data only, no schema migration):
- `client: string` — primary client; derived per request from its first mention's `client` (e.g. "NordBank AS", "Helvetia Trust", …).
- `app: string` — new top-level product split (e.g. "Compass", "Atlas", "Beacon"); seed 3–4 values across the existing fixtures.
- `revenuePotential: "low" | "medium" | "high" | "critical"` — categorical, seeded per request to give the views meaningful buckets.
- `criticalDissatisfaction: boolean` — flag for unresolved items causing critical client dissatisfaction (seeded true on a handful of high-urgency/enterprise items).

**Built-in views become real groupings/scopes** in `staging-context.tsx`:
- `All` (no grouping)
- `By client` (groupBy `client`)
- `By app` (groupBy `app`)
- `By revenue potential` (groupBy `revenuePotential`, ordered critical→low)
- `Critical dissatisfaction` (filter rule `__critical_dissatisfaction__`, no grouping)
- Custom user-saved views still appear after the built-ins (existing `addView` flow), and the existing "Smart groups" concept aligns with these — each view is essentially a smart group.

Extend `GroupBy` with `"client" | "app" | "revenuePotential"`, and extend `matchesView` with the `__critical_dissatisfaction__` sentinel.

**Pinned / Has notes are demoted to filters**, not views:
- Remove the `pinned` and `notes` built-in views from `BUILTIN_VIEWS`.
- In `box.tsx`, render two small toggle chips next to "Show parked" on the right side of the views row: `Pinned only` and `Has notes`. Both are local filters layered on top of whatever view is active. They use the existing `pinned` / `notes` state in staging context — no new state shape.

**Grouped rendering** in `box.tsx`:
- When `activeView.groupBy !== "none"`, render the list as a flat sequence of section headers (group key + count) followed by their rows, instead of one continuous list. Sorting within a group stays the same (pinned → manual → composite score).
- Existing DnD continues to operate on the flat visible list; manual order survives across groupings (don't try to scope manual rank per group for this pass).

**ViewsBar** gets a small visual distinction between built-in grouping views (chip with a `Layers` icon prefix) and custom views (no prefix), so the user can tell smart groups apart.

### 4. Detail view → centered modal

`DetailDrawer.tsx` currently uses Radix Sheet (right-side drawer). Rewrite to use Dialog (centered modal), keeping the same props/API so callers don't change:
- `max-w-3xl`, `max-h-[85vh]`, internal scroll on the body.
- Header: title + close. Footer: existing Push / Dismiss / Park actions, plus the new "Manage sources →" link.
- Reuses all current content sections (priority breakdown, mentions, tags, notes).
- Rename file to `DetailModal.tsx` and update the two import sites (`box.tsx`, `FloatingAgent.tsx`), or keep the filename and just swap the implementation — pick the rename for clarity.

### Technical details

- No new dependencies. All UI from existing `@/components/ui/dialog`, `@/components/ui/alert-dialog`, lucide-react.
- All color usage stays on semantic tokens; no new gradients.
- `lucide-react` icons use `strokeWidth={2.25}` consistently across the app via a small inline convention (no wrapper component needed for this pass).
- `staging-context.tsx` `STORAGE_KEY` bumps to `signal.staging.v3` so the new built-in view list replaces the old `pinned`/`notes` views without leaving orphaned entries in users' localStorage.
- Redirect routes use `<Navigate to="/settings/..." replace />` or `loader: () => redirect({ to: "/settings/..." })`.

### Files touched

- `src/components/signal/SignalShell.tsx` — strip nav to Box + Settings, remove emojis.
- `src/routes/settings.tsx` (new) — settings layout with sub-nav.
- `src/routes/settings.index.tsx` (new) — redirect to sources.
- `src/routes/settings.sources.tsx`, `src/routes/settings.sources.$sourceId.tsx`, `src/routes/settings.agent.tsx` (new) — wrap existing content.
- `src/routes/ingestion.index.tsx`, `src/routes/ingestion.$sourceId.tsx`, `src/routes/agent.tsx` — replace component body with redirects.
- `src/lib/mock-requests.ts` — add `client`, `app`, `revenuePotential`, `criticalDissatisfaction` to the type and seed values across fixtures.
- `src/lib/staging-context.tsx` — extend `GroupBy`, new built-in views, `__critical_dissatisfaction__` rule, drop pinned/notes built-ins, bump storage key.
- `src/components/signal/ViewsBar.tsx` — render grouping views with a small `Layers` prefix; update the New View dialog's groupBy select to include client/app/revenue.
- `src/routes/box.tsx` — emoji→icon swap, grouped rendering, new Pinned-only and Has-notes filter chips on the views row.
- `src/components/signal/DetailDrawer.tsx` → `DetailModal.tsx` — rewrite as centered Dialog, add "Manage sources →" link, update callers.
- `src/components/signal/FloatingAgent.tsx` — add "Agent settings →" link in modal footer (routes through dirty-confirm if needed).
- Light sweep for stray emojis elsewhere (toasts, source cards, empty states).
