## Visual + Interaction Overhaul

### 1. Strip the gradient / pink-orange feel → Notion-styled neutral palette with multi-hue accents

**`src/styles.css`**
- Replace warm pastel surfaces with Notion-style neutrals: near-white background (`oklch(0.99 0.002 250)`), warm-neutral foreground (`oklch(0.22 0.01 250)`), subtle borders (`oklch(0.92 0.004 250)`).
- Remove the body `background-image` radial gradients entirely — flat surface, no sunset wash.
- Diversify the accent palette so it isn't mono-coral:
  - `--primary`: muted indigo/blue `oklch(0.55 0.13 250)` (Notion-ish blue, used for primary actions)
  - `--chart-1` blue, `--chart-2` green, `--chart-3` amber, `--chart-4` violet, `--chart-5` coral — used as category/stage tints only, never as page gradients.
- Dark mode mirrors the same neutrals (Notion dark gray, not warm brown).
- Keep Sora/Manrope.

**Component sweep** (find/replace `bg-gradient-to-*`, `from-primary`, `via-chart-*`, `to-chart-*`):
- `SignalShell.tsx` — logo mark becomes flat `bg-primary` rounded square; "IdeaBox" wordmark loses the `bg-clip-text` gradient (solid foreground).
- `FloatingAgent.tsx` — gradient pill removed (replaced in step 2).
- `box.tsx`, `AgentStrip.tsx`, `OutcomeBoard.tsx`, any other gradient usage — flatten to solid tokens.

### 2. Rename "Ask Agent" → "Brainstorm" + replace floating pill with a centered command-modal

**`src/components/signal/FloatingAgent.tsx` → rebuild**
- Trigger: a small, quiet circular icon button bottom-right (Sparkles icon, neutral surface, subtle ring). No bouncing float animation, no gradient blur halo, no oversized pill. Tooltip shows label "Brainstorm" + kbd `B`.
- Clicking trigger or pressing `B` opens a **centered modal** (Radix Dialog), not a side sheet:
  - `max-w-2xl`, vertically centered, soft shadow, fade + subtle scale-in (150ms) — no springy bounce.
  - Header: "Brainstorm" + small kbd hint (`B` to toggle, `Esc` to close).
  - Body: reuse the existing `BrainstormSheet` content (prompt input + results list + open-request handoff), repackaged inside `DialogContent`.
- Keyboard:
  - `B` (no modifier, not inside input/textarea/contentEditable) toggles open/closed.
  - `Esc` closes if the modal is "clean" (empty input, no in-flight brainstorm).
  - `Esc` when "dirty" (user has typed a prompt or a brainstorm result is on screen) opens an AlertDialog: "Discard brainstorm? Your draft will be lost." with Cancel / Discard. Confirm closes; Cancel keeps modal open.
  - Same dirty-check guards backdrop click and the trigger-button-toggle close path, so one-stroke open/close only happens when there's nothing to lose.
- Remove `animate-float` keyframes from `styles.css` (no longer used).

**`src/components/signal/BrainstormSheet.tsx`**
- Extract its inner content into a `BrainstormPanel` component (or accept a `variant: "modal" | "sheet"` prop) so the new modal can render the same UI without the Sheet chrome. Keep the existing sheet export intact only if other callers use it; otherwise migrate fully to the modal.

### 3. "Show Parked" toggle — promote to the views row, right-aligned

**`src/routes/box.tsx`**
- Find the Ideation stage toolbar. Currently "Show Parked" sits below/near the stage header at a different visual level than the views chips.
- Restructure the toolbar into a single flex row:
  - Left: views chips (Pinned / Has notes / Smart groups / etc. from `ViewsBar`).
  - Right (`ml-auto`): the "Show Parked" toggle, styled as a sibling chip/switch matching the views' visual weight (same height, same radius, same muted treatment when off, accent when on).
- Only renders on the Ideation tab (existing behavior preserved); same component, just relocated and restyled.

---

### Technical details

- All color changes flow through `src/styles.css` tokens — no hex values in components.
- Modal uses existing `@/components/ui/dialog` and `@/components/ui/alert-dialog`; no new deps.
- Keyboard handler stays in `FloatingAgent`, but reads a `isDirty` flag derived from brainstorm panel state (lift state up or expose via a small context/ref).
- `animate-float` keyframe + `.animate-float` class removed from `styles.css`.
- No route changes, no data-model changes, no business logic changes.

### Files touched

- `src/styles.css` (palette + remove gradient bg + remove float keyframe)
- `src/components/signal/FloatingAgent.tsx` (rewrite as modal trigger + dirty-aware Esc)
- `src/components/signal/BrainstormSheet.tsx` (extract reusable panel)
- `src/components/signal/SignalShell.tsx` (de-gradient logo/wordmark)
- `src/routes/box.tsx` (move "Show Parked" into views row, right-aligned)
- Light sweep of other components for stray `bg-gradient-*` / `bg-clip-text` usage tied to the old palette.
