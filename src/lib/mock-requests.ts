export type Source = "Teams" | "Email" | "Read.AI";
export type UserType =
  | "Compliance Officer"
  | "Risk Analyst"
  | "KYC Analyst"
  | "Operations Lead"
  | "Client Admin"
  | "Exec Sponsor";
export type Status = "new" | "reviewed" | "dismissed" | "pushed";
export type ProductArea =
  | "Reporting"
  | "KYC"
  | "Transaction Monitoring"
  | "Risk Engine"
  | "Client Portal"
  | "Admin Console";

export interface SourceMention {
  id: string;
  source: Source;
  author: string;
  client: string;
  excerpt: string;
  timestamp: string;
  link: string;
}

export interface ScoreDimension {
  value: number; // 0-100
  rationale: string;
}

export interface PriorityBreakdown {
  impact: ScoreDimension;
  reach: ScoreDimension;
  urgency: ScoreDimension;
  effort: ScoreDimension; // inverted: higher value = less effort
}

export interface RequestRecord {
  id: string;
  title: string;
  description: string;
  productArea: ProductArea;
  primarySource: Source;
  mentions: SourceMention[];
  frequency: number;
  confidence: number; // 0-1
  userType: UserType;
  priority: PriorityBreakdown;
  status: Status;
  createdAt: string;
  jiraKey?: string;
}

export const WEIGHTS = {
  impact: 0.35,
  reach: 0.25,
  urgency: 0.2,
  effort: 0.2,
} as const;

export function compositeScore(p: PriorityBreakdown): number {
  return Math.round(
    p.impact.value * WEIGHTS.impact +
      p.reach.value * WEIGHTS.reach +
      p.urgency.value * WEIGHTS.urgency +
      p.effort.value * WEIGHTS.effort,
  );
}

const today = new Date("2026-05-28T09:00:00Z");
const daysAgo = (n: number) =>
  new Date(today.getTime() - n * 86400000).toISOString();

export const MOCK_REQUESTS: RequestRecord[] = [
  {
    id: "req_001",
    title: "Bulk approval for SAR filings",
    description:
      "Compliance officers spend significant time approving Suspicious Activity Reports one by one. They want to multi-select filings in the queue and approve in a single action, with an aggregated audit trail.",
    productArea: "Transaction Monitoring",
    primarySource: "Email",
    frequency: 7,
    confidence: 0.92,
    userType: "Compliance Officer",
    priority: {
      impact: {
        value: 88,
        rationale:
          "Eliminates a daily 90-minute bottleneck for tier-1 compliance teams; tied to retention conversations with two top-10 clients.",
      },
      reach: {
        value: 78,
        rationale: "Requested by 7 clients across 3 countries, including 2 enterprise tier.",
      },
      urgency: {
        value: 72,
        rationale: "Q3 AMLD6 deadline raises filing volume — clients want this before September.",
      },
      effort: {
        value: 55,
        rationale: "Backend bulk handler exists; mostly UI work and audit-log changes.",
      },
    },
    mentions: [
      {
        id: "m1",
        source: "Email",
        author: "Sandra Voss",
        client: "NordBank AS",
        excerpt:
          "Our team approves 200+ SARs weekly — clicking each one is killing throughput. Can we get a bulk action?",
        timestamp: daysAgo(2),
        link: "#",
      },
      {
        id: "m2",
        source: "Teams",
        author: "Lukas Meyer",
        client: "Helvetia Trust",
        excerpt: "Multi-select approve please. Even 10 at a time would save hours.",
        timestamp: daysAgo(4),
        link: "#",
      },
      {
        id: "m3",
        source: "Read.AI",
        author: "QBR with FinSquare",
        client: "FinSquare",
        excerpt:
          "Customer raised SAR queue performance as the #1 friction point. Asked for batch ops explicitly.",
        timestamp: daysAgo(6),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(2),
  },
  {
    id: "req_002",
    title: "Bulk approve flagged transactions",
    description:
      "Same need as bulk SAR approval but for the transaction review queue — likely a duplicate cluster candidate.",
    productArea: "Transaction Monitoring",
    primarySource: "Teams",
    frequency: 3,
    confidence: 0.81,
    userType: "Compliance Officer",
    priority: {
      impact: { value: 80, rationale: "Significant time savings for review teams." },
      reach: { value: 60, rationale: "3 clients asking, overlapping with SAR request." },
      urgency: { value: 65, rationale: "Linked to year-end review load." },
      effort: { value: 60, rationale: "Reuses same bulk infrastructure." },
    },
    mentions: [
      {
        id: "m4",
        source: "Teams",
        author: "Anika Roth",
        client: "Helvetia Trust",
        excerpt: "Could we batch-approve low-risk flagged tx the same way?",
        timestamp: daysAgo(3),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(3),
  },
  {
    id: "req_003",
    title: "Export risk scores to CSV with custom columns",
    description:
      "Analysts want to choose which columns appear in CSV exports of the risk register, then save the column preset for re-use.",
    productArea: "Risk Engine",
    primarySource: "Email",
    frequency: 5,
    confidence: 0.88,
    userType: "Risk Analyst",
    priority: {
      impact: { value: 62, rationale: "Quality-of-life win; analysts currently post-process in Excel." },
      reach: { value: 70, rationale: "5 clients, mostly mid-market analytics teams." },
      urgency: { value: 35, rationale: "No deadline tied to it." },
      effort: { value: 78, rationale: "Small frontend change, existing export endpoint." },
    },
    mentions: [
      {
        id: "m5",
        source: "Email",
        author: "Marc Dubois",
        client: "Parisien Capital",
        excerpt: "The CSV always includes columns we don't need. Can we pick?",
        timestamp: daysAgo(5),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(5),
  },
  {
    id: "req_004",
    title: "Two-factor auth via hardware key (FIDO2)",
    description:
      "Enterprise clients require WebAuthn / FIDO2 support for admin logins. Currently only TOTP is supported.",
    productArea: "Admin Console",
    primarySource: "Read.AI",
    frequency: 4,
    confidence: 0.95,
    userType: "Compliance Officer",
    priority: {
      impact: { value: 90, rationale: "Blocker for 2 active enterprise deals (~€480k ARR)." },
      reach: { value: 55, rationale: "Smaller cohort but high-value." },
      urgency: { value: 85, rationale: "One deal expects answer within 4 weeks." },
      effort: { value: 40, rationale: "Library integration + admin UI + recovery flow." },
    },
    mentions: [
      {
        id: "m6",
        source: "Read.AI",
        author: "Procurement call — BlauBank",
        client: "BlauBank",
        excerpt:
          "Security team won't approve onboarding without hardware-key support. This is a hard requirement.",
        timestamp: daysAgo(1),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(1),
  },
  {
    id: "req_005",
    title: "Dark mode for client portal",
    description:
      "End users have asked for a dark theme, particularly trading desks working late hours.",
    productArea: "Client Portal",
    primarySource: "Teams",
    frequency: 9,
    confidence: 0.78,
    userType: "KYC Analyst",
    priority: {
      impact: { value: 35, rationale: "Cosmetic; no revenue tie identified." },
      reach: { value: 80, rationale: "Most-requested QoL item this quarter." },
      urgency: { value: 20, rationale: "No deadline." },
      effort: { value: 35, rationale: "Touches every screen — meaningful design+QA effort." },
    },
    mentions: [
      {
        id: "m7",
        source: "Teams",
        author: "Various",
        client: "Multiple",
        excerpt: "Aggregated from 9 separate mentions across client channels.",
        timestamp: daysAgo(8),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(8),
  },
  {
    id: "req_006",
    title: "KYC document re-request workflow",
    description:
      "When a KYC document is rejected, ops want a templated one-click request back to the client with the rejection reason auto-populated.",
    productArea: "KYC",
    primarySource: "Email",
    frequency: 6,
    confidence: 0.9,
    userType: "Compliance Officer",
    priority: {
      impact: { value: 75, rationale: "Cuts onboarding time on rejections from ~3 days to ~1 day." },
      reach: { value: 72, rationale: "All KYC-using clients (6 named)." },
      urgency: { value: 55, rationale: "Painful but not blocking." },
      effort: { value: 60, rationale: "Template engine exists; mostly workflow + email." },
    },
    mentions: [
      {
        id: "m8",
        source: "Email",
        author: "Tessa Vandermeer",
        client: "DeltaPay",
        excerpt: "Rejection emails are written from scratch every time. Big time sink.",
        timestamp: daysAgo(7),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(7),
  },
  {
    id: "req_007",
    title: "Configurable report scheduling (weekly/monthly)",
    description:
      "Clients want to schedule recurring reports rather than running them manually each period.",
    productArea: "Reporting",
    primarySource: "Email",
    frequency: 8,
    confidence: 0.93,
    userType: "Operations Lead",
    priority: {
      impact: { value: 70, rationale: "Frees ~2 hours/week per client analyst." },
      reach: { value: 85, rationale: "8 clients, broad applicability." },
      urgency: { value: 50, rationale: "Workaround exists (manual runs)." },
      effort: { value: 50, rationale: "Need scheduler + delivery + retry logic." },
    },
    mentions: [
      {
        id: "m9",
        source: "Email",
        author: "Ingrid Hofstede",
        client: "AmsterFin",
        excerpt: "Please let me set the monthly close report to run on the 1st automatically.",
        timestamp: daysAgo(4),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(4),
  },
  {
    id: "req_008",
    title: "PDF report templates with client branding",
    description: "Allow uploading a logo and brand color set applied to all generated PDFs.",
    productArea: "Reporting",
    primarySource: "Read.AI",
    frequency: 4,
    confidence: 0.84,
    userType: "Client Admin",
    priority: {
      impact: { value: 50, rationale: "Helps client-facing presentation, no direct revenue." },
      reach: { value: 60, rationale: "4 mid-market clients." },
      urgency: { value: 30, rationale: "Nice-to-have." },
      effort: { value: 55, rationale: "Template engine refactor." },
    },
    mentions: [
      {
        id: "m10",
        source: "Read.AI",
        author: "QBR — Parisien",
        client: "Parisien Capital",
        excerpt: "Reports going to our investors look generic. Branding would help.",
        timestamp: daysAgo(10),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(10),
  },
  {
    id: "req_009",
    title: "Audit log filtering by user + action type",
    description:
      "Compliance leads need to filter the system audit log by combinations of user, action, and date range.",
    productArea: "Admin Console",
    primarySource: "Teams",
    frequency: 3,
    confidence: 0.87,
    userType: "Compliance Officer",
    priority: {
      impact: { value: 65, rationale: "Cuts incident-investigation time materially." },
      reach: { value: 45, rationale: "Compliance teams only, 3 clients." },
      urgency: { value: 60, rationale: "Tied to upcoming audit at one client." },
      effort: { value: 65, rationale: "Index + UI filters; backend already logs everything." },
    },
    mentions: [
      {
        id: "m11",
        source: "Teams",
        author: "Pavel Novak",
        client: "Praha Capital",
        excerpt: "Auditor needs filtered logs by next month — currently I export everything.",
        timestamp: daysAgo(2),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(2),
  },
  {
    id: "req_010",
    title: "Inline comments on risk register rows",
    description: "Let analysts attach short comments to individual risk rows for context.",
    productArea: "Risk Engine",
    primarySource: "Teams",
    frequency: 2,
    confidence: 0.7,
    userType: "Exec Sponsor",
    priority: {
      impact: { value: 40, rationale: "Collaboration improvement, modest." },
      reach: { value: 30, rationale: "Only 2 mentions so far." },
      urgency: { value: 25, rationale: "Slack/Teams used today as workaround." },
      effort: { value: 65, rationale: "Comments service + UI." },
    },
    mentions: [
      {
        id: "m12",
        source: "Teams",
        author: "Greta Wahl",
        client: "BlauBank",
        excerpt: "Would be nice to leave a note on a row so my colleague sees the context.",
        timestamp: daysAgo(11),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(11),
  },
  {
    id: "req_011",
    title: "SSO via Okta / Azure AD",
    description: "Enterprise clients want SAML SSO with their existing IdP.",
    productArea: "Admin Console",
    primarySource: "Read.AI",
    frequency: 5,
    confidence: 0.96,
    userType: "Risk Analyst",
    priority: {
      impact: { value: 82, rationale: "Removes a procurement blocker for enterprise deals." },
      reach: { value: 65, rationale: "5 clients, all upper tier." },
      urgency: { value: 70, rationale: "Two deals waiting on this." },
      effort: { value: 45, rationale: "SAML lib + provisioning + admin UI." },
    },
    mentions: [
      {
        id: "m13",
        source: "Read.AI",
        author: "Onboarding — NordBank",
        client: "NordBank AS",
        excerpt: "We can't roll out without Azure AD federation.",
        timestamp: daysAgo(6),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(6),
  },
  {
    id: "req_012",
    title: "Mobile-responsive dashboards",
    description: "Client portal dashboards break below 768px width.",
    productArea: "Client Portal",
    primarySource: "Email",
    frequency: 3,
    confidence: 0.83,
    userType: "KYC Analyst",
    priority: {
      impact: { value: 45, rationale: "Most users on desktop; mobile is occasional." },
      reach: { value: 50, rationale: "3 clients, but execs view on phones." },
      urgency: { value: 30, rationale: "Workaround: open on laptop." },
      effort: { value: 40, rationale: "Significant responsive rewrite." },
    },
    mentions: [
      {
        id: "m14",
        source: "Email",
        author: "Frédéric Lambert",
        client: "Parisien Capital",
        excerpt: "Can't read the dashboard on my phone during travel.",
        timestamp: daysAgo(9),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(9),
  },
  {
    id: "req_013",
    title: "Webhook on transaction-flag events",
    description:
      "Tech-savvy clients want outbound webhooks so their internal systems react to flag events.",
    productArea: "Transaction Monitoring",
    primarySource: "Teams",
    frequency: 4,
    confidence: 0.89,
    userType: "Operations Lead",
    priority: {
      impact: { value: 60, rationale: "Unlocks automation downstream of monitoring." },
      reach: { value: 50, rationale: "4 technical clients." },
      urgency: { value: 40, rationale: "No hard deadline." },
      effort: { value: 55, rationale: "Webhook infra + retries + signature." },
    },
    mentions: [
      {
        id: "m15",
        source: "Teams",
        author: "Jonas Lindqvist",
        client: "NordBank AS",
        excerpt: "Give us a webhook on flag — we'll pipe it into our SIEM.",
        timestamp: daysAgo(3),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(3),
  },
  {
    id: "req_014",
    title: "Saved filter views in transaction queue",
    description: "Save filter combinations as named views (e.g. 'High-risk EUR > 10k').",
    productArea: "Transaction Monitoring",
    primarySource: "Email",
    frequency: 6,
    confidence: 0.91,
    userType: "Client Admin",
    priority: {
      impact: { value: 60, rationale: "Speeds up daily triage." },
      reach: { value: 70, rationale: "Most monitoring users." },
      urgency: { value: 45, rationale: "Productivity win." },
      effort: { value: 70, rationale: "Localstorage or per-user persistence." },
    },
    mentions: [
      {
        id: "m16",
        source: "Email",
        author: "Hannah Bauer",
        client: "Helvetia Trust",
        excerpt: "Same filter every morning — save it, please.",
        timestamp: daysAgo(5),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(5),
  },
  {
    id: "req_015",
    title: "Bulk-edit client metadata in KYC",
    description: "Update country code / segment for many client records at once.",
    productArea: "KYC",
    primarySource: "Teams",
    frequency: 2,
    confidence: 0.74,
    userType: "Exec Sponsor",
    priority: {
      impact: { value: 50, rationale: "Useful for periodic data cleanup." },
      reach: { value: 30, rationale: "2 mentions." },
      urgency: { value: 20, rationale: "No deadline." },
      effort: { value: 50, rationale: "Validation + audit." },
    },
    mentions: [
      {
        id: "m17",
        source: "Teams",
        author: "Mia Andersen",
        client: "DeltaPay",
        excerpt: "Migrating segments — bulk edit would save days.",
        timestamp: daysAgo(13),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(13),
  },
  {
    id: "req_016",
    title: "Slack integration for alerts",
    description: "Forward configured alerts into a Slack channel.",
    productArea: "Admin Console",
    primarySource: "Email",
    frequency: 4,
    confidence: 0.86,
    userType: "Risk Analyst",
    priority: {
      impact: { value: 55, rationale: "Faster alert response." },
      reach: { value: 55, rationale: "4 clients, Slack-using." },
      urgency: { value: 40, rationale: "Email alerts work today." },
      effort: { value: 75, rationale: "Slack OAuth + simple webhook poster." },
    },
    mentions: [
      {
        id: "m18",
        source: "Email",
        author: "Ravi Shah",
        client: "FinSquare",
        excerpt: "Push alerts to Slack — email is too noisy.",
        timestamp: daysAgo(4),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(4),
  },
  {
    id: "req_017",
    title: "Multi-currency display in reports",
    description: "Show monetary values in client's preferred currency, not just EUR.",
    productArea: "Reporting",
    primarySource: "Read.AI",
    frequency: 3,
    confidence: 0.8,
    userType: "KYC Analyst",
    priority: {
      impact: { value: 65, rationale: "Removes manual conversion for non-EUR clients." },
      reach: { value: 45, rationale: "3 non-EUR clients." },
      urgency: { value: 55, rationale: "Asked repeatedly." },
      effort: { value: 50, rationale: "FX source + per-report toggle." },
    },
    mentions: [
      {
        id: "m19",
        source: "Read.AI",
        author: "QBR — Praha Capital",
        client: "Praha Capital",
        excerpt: "We work in CZK — converting every report is painful.",
        timestamp: daysAgo(7),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(7),
  },
  {
    id: "req_018",
    title: "Risk score change history per entity",
    description: "Show timeline of how an entity's risk score evolved with reasons.",
    productArea: "Risk Engine",
    primarySource: "Teams",
    frequency: 3,
    confidence: 0.82,
    userType: "Compliance Officer",
    priority: {
      impact: { value: 70, rationale: "Critical for audit defensibility." },
      reach: { value: 45, rationale: "Compliance + risk teams." },
      urgency: { value: 55, rationale: "Tied to audit cycles." },
      effort: { value: 55, rationale: "Event-sourcing of score changes." },
    },
    mentions: [
      {
        id: "m20",
        source: "Teams",
        author: "Pavel Novak",
        client: "Praha Capital",
        excerpt: "When an entity's score changes I need to explain why.",
        timestamp: daysAgo(6),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(6),
  },
  {
    id: "req_019",
    title: "Tooltip explanations on risk indicators",
    description: "Hover tooltips that explain what each risk indicator means.",
    productArea: "Risk Engine",
    primarySource: "Email",
    frequency: 2,
    confidence: 0.68,
    userType: "Operations Lead",
    priority: {
      impact: { value: 30, rationale: "Helps new users; docs cover this elsewhere." },
      reach: { value: 25, rationale: "2 mentions." },
      urgency: { value: 15, rationale: "No urgency." },
      effort: { value: 85, rationale: "Trivial content addition." },
    },
    mentions: [
      {
        id: "m21",
        source: "Email",
        author: "New user — DeltaPay",
        client: "DeltaPay",
        excerpt: "What does 'PEP-proximity' mean in the indicator list?",
        timestamp: daysAgo(12),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(12),
  },
  {
    id: "req_020",
    title: "API rate-limit transparency in client portal",
    description: "Show clients their current API usage vs. their plan limits.",
    productArea: "Client Portal",
    primarySource: "Teams",
    frequency: 3,
    confidence: 0.85,
    userType: "Client Admin",
    priority: {
      impact: { value: 45, rationale: "Reduces support tickets about rate limits." },
      reach: { value: 40, rationale: "API-using clients." },
      urgency: { value: 30, rationale: "Workaround: ask support." },
      effort: { value: 60, rationale: "Read-only metering page." },
    },
    mentions: [
      {
        id: "m22",
        source: "Teams",
        author: "Ravi Shah",
        client: "FinSquare",
        excerpt: "We keep getting 429s — show us where we are vs the limit.",
        timestamp: daysAgo(5),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(5),
  },
  {
    id: "req_021",
    title: "Re-run rules on historical transactions",
    description: "After a rule change, re-evaluate past 30/60/90 days of transactions.",
    productArea: "Transaction Monitoring",
    primarySource: "Read.AI",
    frequency: 3,
    confidence: 0.88,
    userType: "Compliance Officer",
    priority: {
      impact: { value: 78, rationale: "Closes a compliance gap when rules tighten." },
      reach: { value: 50, rationale: "Compliance-driven clients." },
      urgency: { value: 65, rationale: "Asked after regulatory updates." },
      effort: { value: 35, rationale: "Heavy batch job + safe-mode flags." },
    },
    mentions: [
      {
        id: "m23",
        source: "Read.AI",
        author: "Compliance review — Helvetia",
        client: "Helvetia Trust",
        excerpt: "After we tighten a rule, we need to re-check the last quarter.",
        timestamp: daysAgo(4),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(4),
  },
  {
    id: "req_022",
    title: "User-defined risk thresholds per segment",
    description: "Allow ops to set different risk cutoffs per client segment.",
    productArea: "Risk Engine",
    primarySource: "Email",
    frequency: 4,
    confidence: 0.87,
    userType: "Exec Sponsor",
    priority: {
      impact: { value: 70, rationale: "More precise targeting reduces false positives." },
      reach: { value: 55, rationale: "4 clients with segmentation strategy." },
      urgency: { value: 45, rationale: "Roadmap-aligned." },
      effort: { value: 50, rationale: "Config UI + engine support." },
    },
    mentions: [
      {
        id: "m24",
        source: "Email",
        author: "Hannah Bauer",
        client: "Helvetia Trust",
        excerpt: "Retail and corporate should not share a threshold.",
        timestamp: daysAgo(6),
        link: "#",
      },
    ],
    status: "reviewed",
    createdAt: daysAgo(9),
  },
  {
    id: "req_023",
    title: "Export audit log to SIEM-compatible format",
    description: "Native CEF/LEEF export for security teams.",
    productArea: "Admin Console",
    primarySource: "Teams",
    frequency: 2,
    confidence: 0.79,
    userType: "Compliance Officer",
    priority: {
      impact: { value: 60, rationale: "Important for enterprise security posture." },
      reach: { value: 30, rationale: "2 enterprise-tier clients." },
      urgency: { value: 50, rationale: "Requested in security questionnaires." },
      effort: { value: 60, rationale: "Format adapter + scheduled export." },
    },
    mentions: [
      {
        id: "m25",
        source: "Teams",
        author: "Jonas Lindqvist",
        client: "NordBank AS",
        excerpt: "Our SOC wants CEF feeds, not JSON dumps.",
        timestamp: daysAgo(8),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(8),
  },
  {
    id: "req_024",
    title: "Faster initial portal load",
    description: "Client portal first-paint feels slow on cold loads.",
    productArea: "Client Portal",
    primarySource: "Email",
    frequency: 5,
    confidence: 0.72,
    userType: "Risk Analyst",
    priority: {
      impact: { value: 55, rationale: "Perception issue impacting NPS." },
      reach: { value: 70, rationale: "All portal users." },
      urgency: { value: 40, rationale: "Slow-cooking issue." },
      effort: { value: 30, rationale: "Real perf work — could be deep." },
    },
    mentions: [
      {
        id: "m26",
        source: "Email",
        author: "Various",
        client: "Multiple",
        excerpt: "Aggregated: 5 separate 'portal feels slow' complaints.",
        timestamp: daysAgo(14),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(14),
  },
  {
    id: "req_025",
    title: "Light-mode toggle in admin",
    description: "Some admins prefer light mode at their desk monitors.",
    productArea: "Admin Console",
    primarySource: "Teams",
    frequency: 1,
    confidence: 0.55,
    userType: "KYC Analyst",
    priority: {
      impact: { value: 20, rationale: "Single requester." },
      reach: { value: 15, rationale: "1 mention." },
      urgency: { value: 10, rationale: "None." },
      effort: { value: 40, rationale: "Theme work everywhere." },
    },
    mentions: [
      {
        id: "m27",
        source: "Teams",
        author: "Anonymous",
        client: "DeltaPay",
        excerpt: "Could we have a light mode option?",
        timestamp: daysAgo(15),
        link: "#",
      },
    ],
    status: "new",
    createdAt: daysAgo(15),
  },
];
