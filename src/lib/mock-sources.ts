export type SourceId =
  | "teams"
  | "outlook"
  | "readai"
  | "jira"
  | "slack"
  | "zendesk";

export type RunStatus = "success" | "partial" | "failed" | "running";

export type ItemOutcome = "signal" | "filtered" | "duplicate";

export interface ScopeItem {
  id: string;
  label: string;
  sublabel?: string;
  enabled: boolean;
}

export interface RunItem {
  title: string;
  outcome: ItemOutcome;
  reason?: string;
}

export interface IngestionRun {
  id: string;
  startedAt: string; // ISO
  durationMs: number;
  itemsScanned: number;
  signalsExtracted: number;
  pushedToStaging: number;
  status: RunStatus;
  notes?: string;
  items: RunItem[];
}

export interface SourceConfig {
  id: SourceId;
  name: string;
  vendor: string;
  description: string;
  scopeNoun: string; // "channels", "mailboxes", "meeting series"
  scopePickerOptions: string[];
  connected: boolean;
  scope: ScopeItem[];
  runs: IngestionRun[];
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

function mkRuns(
  base: Array<Omit<IngestionRun, "id"> & { id?: string }>,
): IngestionRun[] {
  return base.map((r, i) => ({ id: r.id ?? `run-${i}-${Math.random().toString(36).slice(2, 7)}`, ...r }));
}

export const MOCK_SOURCES: SourceConfig[] = [
  {
    id: "teams",
    name: "Microsoft Teams",
    vendor: "Microsoft",
    description: "Channels where clients and CSMs discuss the U-Reg platform.",
    scopeNoun: "channels",
    scopePickerOptions: [
      "#ureg-product",
      "#kyc-feedback",
      "#reporting-questions",
      "#risk-engine",
      "#client-portal",
      "#compliance-watch",
    ],
    connected: true,
    scope: [
      { id: "c1", label: "#ureg-support", sublabel: "142 members", enabled: true },
      { id: "c2", label: "#kyc-product", sublabel: "38 members", enabled: true },
      { id: "c3", label: "#compliance-watch", sublabel: "21 members", enabled: true },
      { id: "c4", label: "#general", sublabel: "411 members — noisy", enabled: false },
    ],
    runs: mkRuns([
      {
        startedAt: minutesAgo(4),
        durationMs: 4200,
        itemsScanned: 142,
        signalsExtracted: 6,
        pushedToStaging: 4,
        status: "success",
        items: [
          { title: "Need bulk export for SAR list", outcome: "signal" },
          { title: "Re-run KYC for closed accounts?", outcome: "signal" },
          { title: "+1 to weekend reporting", outcome: "duplicate", reason: "merged into REQ-0142" },
          { title: "Login lag this morning", outcome: "filtered", reason: "not feature-related" },
        ],
      },
      {
        startedAt: minutesAgo(22),
        durationMs: 3800,
        itemsScanned: 98,
        signalsExtracted: 3,
        pushedToStaging: 3,
        status: "success",
        items: [
          { title: "Risk score drilldown by entity", outcome: "signal" },
          { title: "Stale alerts after escalation", outcome: "signal" },
        ],
      },
      {
        startedAt: minutesAgo(48),
        durationMs: 5100,
        itemsScanned: 211,
        signalsExtracted: 9,
        pushedToStaging: 7,
        status: "partial",
        notes: "2 filtered (confidence < 0.4)",
        items: [
          { title: "PDF watermark on exports", outcome: "signal" },
          { title: "??? maybe a bug ???", outcome: "filtered", reason: "confidence 0.31" },
        ],
      },
      {
        startedAt: hoursAgo(2),
        durationMs: 0,
        itemsScanned: 0,
        signalsExtracted: 0,
        pushedToStaging: 0,
        status: "failed",
        notes: "Auth token expired — refreshed automatically",
        items: [],
      },
    ]),
  },
  {
    id: "outlook",
    name: "Outlook",
    vendor: "Microsoft",
    description: "Shared mailboxes and folders containing user feedback.",
    scopeNoun: "mailboxes",
    scopePickerOptions: [
      "feedback@u-reg.com",
      "support@u-reg.com",
      "compliance@u-reg.com",
      "Folder: RegTech feedback",
      "Folder: Enhancement requests",
    ],
    connected: true,
    scope: [
      { id: "m1", label: "feedback@u-reg.com", sublabel: "Shared mailbox", enabled: true },
      { id: "m2", label: "support@u-reg.com", sublabel: "Tier-2 escalations only", enabled: true },
      { id: "m3", label: "Folder: RegTech feedback", sublabel: "On product team mailbox", enabled: true },
    ],
    runs: mkRuns([
      {
        startedAt: minutesAgo(11),
        durationMs: 2100,
        itemsScanned: 28,
        signalsExtracted: 4,
        pushedToStaging: 3,
        status: "success",
        items: [
          { title: "Quarterly attestation needs e-sign", outcome: "signal" },
          { title: "Re: pricing", outcome: "filtered", reason: "not product feedback" },
        ],
      },
      {
        startedAt: minutesAgo(41),
        durationMs: 1900,
        itemsScanned: 19,
        signalsExtracted: 2,
        pushedToStaging: 2,
        status: "success",
        items: [],
      },
      {
        startedAt: hoursAgo(3),
        durationMs: 3300,
        itemsScanned: 47,
        signalsExtracted: 5,
        pushedToStaging: 4,
        status: "partial",
        notes: "1 duplicate merged",
        items: [],
      },
    ]),
  },
  {
    id: "readai",
    name: "Read.AI",
    vendor: "Read.AI",
    description: "Auto-captured meeting notes and action items.",
    scopeNoun: "meeting series",
    scopePickerOptions: [
      "Weekly client QBR",
      "Compliance office hours",
      "Product discovery",
      "RegOps standup",
      "Onboarding kickoffs",
    ],
    connected: true,
    scope: [
      { id: "r1", label: "Weekly client QBR", sublabel: "12 series", enabled: true },
      { id: "r2", label: "Compliance office hours", sublabel: "4 series", enabled: true },
      { id: "r3", label: "Filter: RegTech, KYC, reporting", sublabel: "Keyword include", enabled: true },
    ],
    runs: mkRuns([
      {
        startedAt: minutesAgo(22),
        durationMs: 6800,
        itemsScanned: 9,
        signalsExtracted: 5,
        pushedToStaging: 5,
        status: "success",
        items: [
          { title: "QBR — Nordea: wants regional reporting view", outcome: "signal" },
          { title: "Compliance hours: SAR templating", outcome: "signal" },
        ],
      },
      {
        startedAt: hoursAgo(4),
        durationMs: 5400,
        itemsScanned: 6,
        signalsExtracted: 3,
        pushedToStaging: 2,
        status: "success",
        items: [],
      },
    ]),
  },
  {
    id: "jira",
    name: "Jira",
    vendor: "Atlassian",
    description: "Write-back destination. Signal pushes triaged tickets here.",
    scopeNoun: "projects",
    scopePickerOptions: ["UREG", "KYC", "RISK", "PORT", "COMP"],
    connected: true,
    scope: [
      { id: "j1", label: "UREG", sublabel: "Default project", enabled: true },
      { id: "j2", label: "KYC", sublabel: "KYC squad", enabled: true },
      { id: "j3", label: "RISK", sublabel: "Risk engine squad", enabled: true },
    ],
    runs: [],
  },
  {
    id: "slack",
    name: "Slack",
    vendor: "Salesforce",
    description: "Customer Slack Connect channels.",
    scopeNoun: "channels",
    scopePickerOptions: [],
    connected: false,
    scope: [],
    runs: [],
  },
  {
    id: "zendesk",
    name: "Zendesk",
    vendor: "Zendesk",
    description: "Support tickets tagged as feature requests.",
    scopeNoun: "views",
    scopePickerOptions: [],
    connected: false,
    scope: [],
    runs: [],
  },
];

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function formatDuration(ms: number): string {
  if (ms === 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
