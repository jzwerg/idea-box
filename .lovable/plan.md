
## Brainstorm

A lightweight "given an idea, what existing requests are relevant?" surface. Lives next to Views on staging, and behaves like smart groups but ranked instead of binary filtered.

### Entry points

- **Staging toolbar**: new `Brainstorm` button (Lightbulb icon) next to the `New view` chip. Opens a right-side `Sheet`.
- **Global**: keyboard shortcut `B` when staging is focused.
- (Optional) A "Brainstorm from this" item in `StagingRow`'s overflow menu, prefilling the idea with the row's title + description.

### Sheet layout

```text
┌─ Brainstorm ─────────────────────────────────┐
│ Idea (textarea, ~4 rows)                     │
│ [Find related]   [Clear]                     │
│                                              │
│ 12 related requests          [▼ relevance]   │
│ ─ 92%  Title …            tags • userType   │
│ ─ 88%  Title …                              │
│ ─ 71%  Title …                              │
│  …                                           │
│                                              │
│ Actions: [Save as view] [Tag all] [Group]   │
└──────────────────────────────────────────────┘
```

- Rows reuse the existing `StagingRow` summary (compact variant) so clicking opens the detail drawer.
- Empty state explains: "Describe an idea, problem, or theme. We'll surface requests that look related — across titles, descriptions, tags, user type, and product area."

### Scoring (heuristic, local)

Extend `matchesView` into a `scoreRequest(idea, ctx)` helper in `staging-context.tsx`:

1. Tokenize idea: lowercase, strip punctuation, drop stopwords (`a, the, for, to, with, of, and, or, on, in, is, are, my, i, we`), keep tokens length > 2.
2. Bigrams from remaining tokens (boosted weight).
3. Per request, build the same haystack used by `matchesView` (title, description, tags, userType, productArea).
4. Score = Σ(token hits × weight) where weight = title:3, tag:2.5, productArea:2, userType:1.5, description:1; bigrams ×1.5.
5. Normalize to 0-100 against the top score in the batch. Show only requests scoring ≥ 20%.

This is intentionally simple and explainable — same family as the view matcher, just ranked. Real semantic embedding is a follow-up.

### Follow-up actions on results

- **Save as view** → opens `NewViewDialog` prefilled with `name = first 4 words of idea` and `rule = idea`. Reuses the same NL matcher path.
- **Tag all** → prompts for a tag name, applies to every visible result (records a single `tag` trust event per row → feeds existing teach loop).
- **Group these** → adds an ad-hoc group banner on staging that filters to exactly these IDs until cleared.

### Teach loop

Saving a brainstorm as a view, or tagging the result set, already routes through `recordAction`/`teach.ts`, so the agent learns "users care about ideas like X" without new wiring. No additional rule type needed.

### Files

**New**
- `src/components/signal/BrainstormSheet.tsx` — sheet UI, idea textarea, ranked results, action buttons.

**Edited**
- `src/lib/staging-context.tsx` — add `scoreRequest(idea, ctx)` helper exported alongside `matchesView`. No state changes needed (brainstorm is ephemeral).
- `src/components/signal/ViewsBar.tsx` — add `Brainstorm` trigger button next to `New view`. (Or place in staging header in `routes/index.tsx` — see Technical.)
- `src/routes/index.tsx` — mount `<BrainstormSheet />`, wire `B` shortcut, pass current request list to the sheet via existing context.

### Out of scope

- Real embedding-based similarity (heuristic ships; LLM wiring deferred).
- Brainstorming across dismissed / archived requests (active staging only for now).
- Persisting brainstorm history.

### Technical notes

- `BrainstormSheet` reads requests from `useRequests()` (same source as staging) so it stays in sync, and reads `tags`/`notes`/`pinned` from `useStaging()` to render the compact row.
- Trigger button location: put it in the staging header row (`routes/index.tsx`) rather than inside `ViewsBar` to keep `ViewsBar` purely about views. The shortcut handler also lives there.
- Use the existing shadcn `Sheet` component; right side; `sm:max-w-lg`.
