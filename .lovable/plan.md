
## Signal — Prototype Plan

A clickable, frontend-only prototype of **Signal**, the AI triage dashboard from the PRD. No backend, no real ingestion — everything runs on realistic mock data so you can demo the core ritual end-to-end.

### Scope (v0 prototype)

Single-page app focused on the **staging dashboard** (Section 7 of the PRD), which is the heart of the product. Built around the key user flow from Section 9.

### Screens / surfaces

1. **Staging table** (home)
   - Ranked, sortable, filterable table of extracted requests
   - Columns: Rank, Title, Product area, Source, Frequency, Confidence, Priority score, Status
   - Filters: status (new/reviewed/dismissed/pushed), product area, source, compliance-flagged
   - Bulk-select with action bar: Merge, Dismiss, Push to Jira
   - Compliance-flagged rows visually distinct

2. **Detail drawer** (slides in on row click)
   - Full description, source links with origin badges (Teams / Email / Read.AI)
   - Clustered mentions list (showing aggregated evidence)
   - Score breakdown — 4 dimensions (Impact 35%, Reach 25%, Urgency 20%, Effort 20%) with rationale text per dimension and editable sub-scores; composite updates live
   - Inline edit of title / area
   - Actions: Dismiss, Push to Jira

3. **Push to Jira modal**
   - Project + issue type selectors, field-mapping preview
   - On confirm: rows stamped `pushed` with a fake `jira_key`, toast confirmation

4. **Top nav / shell**
   - Logo "Signal", tab strip (Staging · Pushed · Dismissed · Settings — only Staging is fully interactive)
   - Stat strip: new this week, avg confidence, compliance-flagged count

### Mock data

~25 seeded requests across the 6 U-Reg platform apps, realistic RegTech phrasing, mix of sources, a couple of compliance-flagged items, one obvious duplicate pair to demo Merge.

### Out of scope for prototype
Real connectors, auth, persistence (state is in-memory React only), Settings page internals, analytics.

### Technical notes
- TanStack Start route `src/routes/index.tsx` renders the dashboard
- State: local React state + a single mock-data module in `src/lib/mock-requests.ts`
- UI: shadcn primitives (table, sheet for drawer, dialog for Jira modal, badge, button, checkbox, select)
- Design tokens: dark, focused "operator console" feel — deep slate background, single sharp accent for priority/score, monospaced numerics. Defined in `src/styles.css`.
- No new dependencies needed
