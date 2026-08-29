export type View =
  | "today"
  | "inbox"
  | "sales"
  | "marketing"
  | "ops"
  | "vault"
  | "activity"
  | "settings";

export type AgentId = "sales" | "marketing" | "ops" | "vault" | "orchestrator";

export interface AgentMeta {
  id: AgentId;
  name: string;
  role: string;
  dot: string;
  text: string;
  soft: string;
  chip: string;
  border: string;
  icon: string;
}

export const AGENTS: Record<AgentId, AgentMeta> = {
  sales: {
    id: "sales",
    name: "Sales Agent",
    role: "Leads → drafts. You send.",
    dot: "bg-sales",
    text: "text-sales",
    soft: "bg-sales/10",
    chip: "bg-sales/10 text-sales ring-1 ring-sales/25",
    border: "border-sales/40",
    icon: "target",
  },
  marketing: {
    id: "marketing",
    name: "Marketing Agent",
    role: "Strategy + 6 AM idea drops",
    dot: "bg-marketing",
    text: "text-marketing",
    soft: "bg-marketing/10",
    chip: "bg-marketing/10 text-marketing ring-1 ring-marketing/25",
    border: "border-marketing/40",
    icon: "megaphone",
  },
  ops: {
    id: "ops",
    name: "Operations Agent",
    role: "Finds breaks before they break",
    dot: "bg-ops",
    text: "text-ops",
    soft: "bg-ops/10",
    chip: "bg-ops/10 text-ops ring-1 ring-ops/25",
    border: "border-ops/40",
    icon: "gauge",
  },
  vault: {
    id: "vault",
    name: "Document Vault",
    role: "Single source of truth",
    dot: "bg-vault",
    text: "text-vault",
    soft: "bg-vault/10",
    chip: "bg-vault/10 text-vault ring-1 ring-vault/25",
    border: "border-vault/40",
    icon: "lock",
  },
  orchestrator: {
    id: "orchestrator",
    name: "Orchestrator",
    role: "Routes work, shares context",
    dot: "bg-orch",
    text: "text-orch",
    soft: "bg-orch/10",
    chip: "bg-orch/10 text-orch ring-1 ring-orch/25",
    border: "border-orch/40",
    icon: "helm",
  },
};

/* ---------------- Sales ---------------- */
export type Stage = "new" | "contacted" | "followup" | "won" | "lost";
export type ReplySentiment = "positive" | "later" | "no";

export interface Lead {
  id: string;
  company: string;
  contact: string;
  email: string;
  source: "website" | "linkedin" | "referral" | "trade-show" | "google-ads" | "manual";
  value: number;
  stage: Stage;
  notes: string;
  createdAt: string;
  lastTouchAt: string;
  touches: number;
  cold?: boolean;
  reply?: { sentiment: ReplySentiment; at: string };
  wonAt?: string;
}

export type DraftKind = "outreach" | "followup" | "nudge";

export interface EmailDraft {
  id: string;
  leadId: string;
  kind: DraftKind;
  subject: string;
  body: string;
  createdAt: string;
  status: "ready" | "synced" | "sent";
  why: string;
}

/* ---------------- Marketing ---------------- */
export interface Idea {
  id: string;
  title: string;
  objective: string;
  audience: string;
  channel: string;
  message: string;
  format: string;
  budgetMin: number;
  budgetMax: number;
  why: string;
  createdAt: string;
  status: "new" | "approved" | "dismissed";
}

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: "live" | "paused" | "planned";
  budget: number;
  spent: number;
  ctr: number;
  leadsGenerated: number;
  closedFromCampaign: number;
  startedAt: string;
  flagged?: string;
}

export interface CalendarSlot {
  id: string;
  date: string;
  label: string;
  channel?: string;
}

/* ---------------- Operations ---------------- */
export interface Task {
  id: string;
  title: string;
  owner: string;
  due: string;
  status: "open" | "done";
  linkedLeadId?: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  status: "ok" | "watch" | "delayed";
  note: string;
  lastCheckedAt: string;
}

export type Severity = "high" | "medium" | "low";

export interface Risk {
  id: string;
  key: string;
  title: string;
  why: string;
  severity: Severity;
  recommendation: string;
  status: "open" | "resolved";
  category: string;
  escalated?: boolean;
  createdAt: string;
}

/* ---------------- Vault ---------------- */
export interface DocVersion {
  v: number;
  at: string;
  name: string;
  note: string;
}

export interface VaultDoc {
  id: string;
  name: string;
  type: "contract" | "invoice" | "license" | "brand" | "process" | "correspondence" | "other";
  tags: string[];
  person?: string;
  content: string;
  summary: string;
  uploadedAt: string;
  size: number;
  expiresAt?: string;
  versions: DocVersion[];
  autoFiled?: string;
}

/* ---------------- Shared infra ---------------- */
export interface ActivityEvent {
  id: string;
  at: string;
  agent: AgentId;
  text: string;
  why?: string;
}

export type NoticeKind = "digest" | "alert" | "sales" | "idea" | "doc";

export interface Notice {
  id: string;
  at: string;
  agent: AgentId;
  title: string;
  body: string;
  kind: NoticeKind;
  read: boolean;
  actionView?: View;
  actionLabel?: string;
}

export interface Settings {
  ownerName: string;
  businessName: string;
  gmailConnected: boolean;
  gmailAccount: string;
  coldDays: number;
  cadenceDays: number;
  toneName: string;
  toneSample: string;
  brandVoice: string;
  weeklyBudgetCap: number;
  vaultAccess: string[];
  autoOpsOnWin: boolean;
}

export interface ChatMsg {
  id: string;
  from: "you" | "agent";
  agent?: AgentId;
  text: string;
  at: string;
}

export interface Toast {
  id: string;
  agent?: AgentId;
  text: string;
}

export interface State {
  _v: number;
  view: View;
  dayKey: string;
  seededAt: string;
  lastDropAt?: string;
  lastTopic: string;
  leads: Lead[];
  drafts: EmailDraft[];
  ideas: Idea[];
  campaigns: Campaign[];
  calendar: CalendarSlot[];
  tasks: Task[];
  vendors: Vendor[];
  risks: Risk[];
  docs: VaultDoc[];
  activity: ActivityEvent[];
  notices: Notice[];
  settings: Settings;
  chat: ChatMsg[];
  chatOpen: boolean;
  typing: AgentId | null;
  toasts: Toast[];
}

/* ---------------- utils ---------------- */
export const uid = () => Math.random().toString(36).slice(2, 10);

export const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const daysUntil = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

export const daysSince = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

export const todayKey = () => new Date().toDateString();
