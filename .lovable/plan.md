# Plan: Ingestion settings & runs visibility

Add two new sections that sit *upstream* of the staging dashboard, so you can see exactly what's flowing in before it lands in triage.

## 1. Top nav: wire up the tab strip

Today the "Signal" shell has a static tab strip. Make it real with TanStack routes:

- `/` — Staging (existing)
- `/ingestion` — Ingestion settings (new)
- `/ingestion/$sourceId` — Source detail with runs + scope (new)

## 2. `/ingestion` — Connected sources

A grid of source cards (one per integration), with simulated SSO:

| Source | Status | Last run | Items ingested (24h) |
|---|---|---|---|
| Microsoft Teams | Connected | 4m ago | 38 |
| Outlook | Connected | 11m ago | 17 |
| Read.AI / Meeting Notes | Connected | 22m ago | 9 |
| Jira (write-back) | Connected | — | — |
| Slack | Not connected | — | — |
| Zendesk | Not connected | — | — |

Each card has:
- Source logo + name + short description
- Connect / Disconnect button (simulated SSO modal: "Sign in with Microsoft" spinner → success toast → status flips to Connected)
- Scope summary chips (e.g. "3 Teams channels", "2 mailboxes", "All meetings")
- "Configure" link → opens detail route

Empty/disconnected cards show a muted "Connect to start ingesting" CTA.

## 3. `/ingestion/$sourceId` — Source detail

Two stacked panels:

### a. Scope
What this connector is allowed to pull. Editable inline (local state only).
- Teams: list of channels with toggle switches (e.g. `#ureg-support`, `#kyc-product`, `#compliance-watch`)
- Outlook: shared mailboxes + label/folder filters (`feedback@`, `support@`, "RegTech feedback" folder)
- Read.AI: meeting series filters, participants, keywords
- Each list shows item count + "Add channel/mailbox/filter" button (opens a small picker dialog with mock options)

### b. Recent runs
Table of the last ~15 ingestion runs for this source:

| Started | Duration | Items scanned | Signals extracted | Pushed to staging | Status |
|---|---|---|---|---|---|
| 2m ago | 4.2s | 142 | 6 | 4 | Success |
| 18m ago | 3.8s | 98 | 3 | 3 | Success |
| 34m ago | 5.1s | 211 | 9 | 7 | Partial — 2 filtered (low confidence) |
| 1h ago | — | — | — | — | Failed — auth expired |

Click a row → expandable details: list of source items scanned (titles only), which became signals, which were filtered and why ("duplicate of #REQ-0142", "confidence < 0.4", "not feature-related"). This makes the pre-staging funnel transparent.

Header actions: "Run now" (simulated — appends a new row with a spinner that resolves in ~2s), "Pause source".

## 4. Mock data layer

New file `src/lib/mock-sources.ts`:

```ts
export type SourceId = 'teams' | 'outlook' | 'readai' | 'jira' | 'slack' | 'zendesk';
export type RunStatus = 'success' | 'partial' | 'failed' | 'running';

export interface IngestionRun {
  id: string;
  startedAt: string;
  durationMs: number;
  itemsScanned: number;
  signalsExtracted: number;
  pushedToStaging: number;
  status: RunStatus;
  notes?: string;
  items?: { title: string; outcome: 'signal' | 'filtered' | 'duplicate'; reason?: string }[];
}

export interface Source {
  id: SourceId;
  name: string;
  description: string;
  connected: boolean;
  scope: ScopeItem[];          // shape varies per source
  runs: IngestionRun[];
}
```

State lives in a small Zustand-free React context (`SourcesProvider` in `src/lib/sources-context.tsx`) so Connect / Disconnect / Run-now / scope toggles persist across `/ingestion` and `/ingestion/$sourceId` during the session.

## 5. Components (under `src/components/signal/`)

- `SourceCard.tsx` — grid card for `/ingestion`
- `ConnectDialog.tsx` — simulated SSO modal (provider-branded copy, fake 1.5s spinner)
- `ScopePanel.tsx` — editable scope list with add/remove
- `RunsTable.tsx` — runs table with expandable row
- `RunDetailRow.tsx` — per-item breakdown

Reuses existing `SourceBadge` for icons and the dark operator-console tokens already in `src/styles.css`. No new dependencies.

## 6. Out of scope (call out for later)

- Real OAuth — fully simulated
- Persisting state beyond the session (no Lovable Cloud yet)
- Editing scoring weights from the source detail (still lives in DetailDrawer)

---

Approve and I'll build it; or tell me which sources / scope fields you want adjusted first.
