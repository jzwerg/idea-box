# Refine top bar + scroll pinning behavior

## 1. Top bar (SignalShell)

- Switch header layout to a 3-column grid: `[left inline slot] [centered logo] [right settings]`.
- Center the IdeaBox icon + "IdeaBox" wordmark in the middle column (horizontally only — header stays compact).
- Remove the "v0.4" version line entirely; logo becomes a single horizontal lockup (icon + name).
- Change header background from `bg-card/85` to `bg-background/85` so the top bar reads as the page surface, while the box below keeps its white `bg-card`.
- Header stays `sticky top-0 z-30` with `border-b border-border/60`.

## 2. Collapsed picker (left of header, on scroll)

- Replace the toggle-with-switch CompactPicker with one that shows **both** the current stage chip and the current view chip side-by-side (small `bg-chip` pills with a `ChevronDown`), separated by a faint `/`.
- Drop the `ArrowLeftRight` switch button and the `mode` state — both are always rendered (view chip hidden only on Spark where views don't apply).
- Each chip remains a `DropdownMenu` to switch stage / view.

## 3. Scroll pinning of the box

Goal: as the user scrolls down, the stage chips scroll away (they're already outside the box). The box itself stays put, the views bar + filters bar **scroll away with the page**, and the **table header pins** to the top of the box right under the page header so only rows are visible below it.

Changes in `src/routes/box.tsx`:

- Keep current natural-scroll layout (no fixed heights).
- Page header is ~49px tall now; recompute the sticky `top-[...]` for the table `<thead>` to match the new header height (use `top-[49px]`).
- Give the sticky `<thead>` a subtle `border-b` and `bg-card` so when it pins under the page header it visually becomes the top edge of the box (the box's rounded border remains visible on the sides). Add a small `shadow-[0_1px_0_0_var(--border)]` to reinforce the seam.
- Leave the Views bar and Filter bar as normal (non-sticky) elements inside the box — they scroll away naturally, which is the desired behavior.
- No changes to the bordered box wrapper itself (`rounded-2xl border bg-card`) — it stays as is so the box outline remains continuous around the pinned header.

## Technical notes

- Files edited: `src/components/signal/SignalShell.tsx`, `src/routes/box.tsx`.
- No state/logic changes outside `CompactPicker` simplification and the small `top-[...]` offset tweak.
- No new dependencies.
- Spark stage (StagingView) is unchanged; CompactPicker simply omits the view chip when no views are passed in.