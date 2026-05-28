## Goal

Make the staging area feel like a workspace, not a list — and make every user action quietly train the agent so that over time, manual reordering trends toward zero. Every proposed rule update is previewed before it lands in the agent's knowledge.

---

## 1. Direct manipulation on staging

Per-row controls (left → right on each request row):
- **Drag handle** (`GripVertical`) — drag-and-drop to any position. Sets a manual `rank` that overrides agent score.
- **Pin toggle** (`Pin`) — pins to top of its group. Pinned items render in a sticky "Pinned" band above the ranked list.
- **Tag chips** — inline editable, free-form. Autocomplete from existing tags. Color hashed from tag name for consistency.
- **Note icon** (`StickyNote`) — opens a small popover with a markdown-light textarea. Indicator dot when a note exists; hover preview.

Sort order on staging becomes: `pinned` → `manual rank (if set)` → `agent composite score`. A small "Reset to agent order" link appears when any manual rank or pin exists.

dnd library: `@dnd-kit/core` + `@dnd-kit/sortable` (lightweight, accessible, plays nicely with virtualization later).

---

## 2. Dynamic views (NL grouping)

Replace the static filter row with a **Views bar**:
- Built-in views: `All`, `New`, `Pinned`, `Has notes`
- **+ New view** opens a dialog with:
  - Name
  - Natural-language rule (e.g. "anything mentioning SSO or auth in title/description", "enterprise asks from Compliance Officers", "needs design input")
  - Optional grouping (flat, by user type, by product area, by tag)
- Views are saved to local context and shown as pills. Click a pill to apply; ⋯ menu to edit/delete.

The NL rule is interpreted by the prioritization agent as a predicate over `{title, description, tags, userType, productArea, source}`. Simulated locally with a keyword/regex fallback so it works without a live model call; when AI is wired up it becomes a real classification pass cached per request.

---

## 3. Feedback loop → Learned rules

A new **Learned rules** panel on `/agent`, separate from Standing instructions. Schema:
```
{ id, rule, sourceAction, sourceRequestId?, createdAt, enabled }
```
Rendered as a toggleable list with delete + "view source action" link. The agent reads `standingInstructions` + `enabled` learned rules together on each run.

### Action → proposed rule mapping

| User action | Proposed rule shape (example) |
|---|---|
| Dismiss a high-scored item | "De-prioritize requests where {derived signal from title/tags/userType}" |
| Push to Jira | "Treat {signal} as ready-to-ship; boost urgency" |
| Manual reorder up | "Boost impact for requests matching {signal}" |
| Manual reorder down | "Lower impact for requests matching {signal}" |
| Pin | "Pin/boost {signal} until released" |
| Add tag | "Tag {signal} as #{tag}" (becomes part of the agent's vocabulary) |
| Add note | Note text is offered verbatim as an optional rule snippet |
| Group assignment | "Group {signal} under {group name}" |

"Signal" is derived heuristically: shared keywords across recent matching actions, dominant `userType`, dominant `productArea`, source. The point is *transparency* — the user always sees and edits before commit.

### Preview-before-append (non-negotiable)

After any teaching action, a non-blocking **toast-card** slides in from the bottom-right:
- Title: "Teach the agent?"
- Diff-style preview: shows the exact bullet about to be appended to **Learned rules** (file location labeled: `Agent → Learned rules`)
- Editable textarea (pre-filled, user can refine)
- Buttons: `Add rule` · `Skip` · `Never suggest for this action type`
- Auto-dismisses after 12s as `Skip`

Multiple actions in a short window are batched into one card with a list of proposed rules, each individually toggleable.

A small "pending teachings" badge on the Agent nav item shows count of un-actioned proposals so nothing is missed.

---

## 4. "Less reordering over time" signal

Top of staging shows a thin **Trust meter**:
- "Agent autonomy: 64% — manual overrides down 38% this week"
- Computed from `(1 - manualActionsThisWeek / manualActionsBaseline)`.
- Clicking expands a sparkline of weekly manual actions and a link to /agent.

This gives the user a visible payoff for teaching.

---

## Technical Plan

### New / edited files

**State**
- `src/lib/staging-context.tsx` (new) — owns `manualRank`, `pinnedIds`, `tags`, `notes`, `views`, `groupByMode`. Persists to localStorage.
- `src/lib/agent-context.tsx` (edit) — add `learnedRules: LearnedRule[]`, `pendingProposals: Proposal[]`, `proposeRule()`, `acceptProposal()`, `dismissProposal()`. `compositeWith` already exists; extend `runAgent` to fold enabled learned rules into the keyword-boost simulation.
- `src/lib/teach.ts` (new) — pure helpers: `deriveSignal(request, action, history)`, `buildProposedRule(action, signal)`.

**UI**
- `src/components/signal/StagingRow.tsx` (new, extracted from `routes/index.tsx`) — handles drag, pin, tags, note popover.
- `src/components/signal/ViewsBar.tsx` (new) — pills + "+ New view" dialog.
- `src/components/signal/NewViewDialog.tsx` (new) — name + NL rule + grouping.
- `src/components/signal/NotePopover.tsx` (new)
- `src/components/signal/TagEditor.tsx` (new)
- `src/components/signal/TeachToast.tsx` (new) — global mount in `__root.tsx`, listens to `agent:proposal` events.
- `src/components/signal/TrustMeter.tsx` (new)
- `src/routes/index.tsx` (edit) — replace plain rows with `<StagingRow>`, mount `<ViewsBar>` and `<TrustMeter>`, wire dnd-kit `DndContext` + `SortableContext`.
- `src/routes/agent.tsx` (edit) — add **Learned rules** section + **Pending proposals** section above run history.

**Deps**
- `bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

### Event flow
```text
user action ─▶ stagingContext mutation
            └▶ teach.buildProposedRule()
               └▶ agentContext.proposeRule({rule, sourceAction, requestId})
                  └▶ window.dispatchEvent("agent:proposal", proposal)
                     └▶ <TeachToast> renders preview card
                        ├─ Accept → agentContext.acceptProposal() → learnedRules[]
                        └─ Skip   → marked dismissed
```

### Not in scope this pass
- Real LLM call for NL view interpretation (heuristic fallback ships; AI wiring is a follow-up once `/api/chat` style endpoint is in place).
- Server persistence — everything stays in `localStorage` via existing context pattern.
- Multi-user / shared views.
