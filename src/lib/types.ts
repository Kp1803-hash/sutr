/* Sutr — shared type contract for the four-agent system + orchestrator. */

export type View = "today" | "inbox" | "sales" | "marketing" | "ops" | "vault" | "activity" | "settings";
export type AgentId = "orchestrator" | "sales" | "marketing" | "ops" | "vault";
export type EngineProvider = "none" | "claude" | "openai" | "local";
export type DraftKind = "outreach" | "followup" | "nudge";
export type LeadStage = "new" | "contacted" | "followup" | "won" | "lost";
export type LeadSource =
  | "WedMeGood directory" | "Instagram DM" | "LinkedIn" | "WIPA referral" | "Expo" | "Inbound form" | "Referral";
export type ReplySentiment = "positive" | "later" | "negative";
export type Severity = "high" | "medium" | "low";
export type DocType = "contract" | "invoice" | "brand" | "research" | "spec" | "agreement" | "pitch" | "other";

export interface EngineState {
  provider: "none" | "claude" | "openai";
  model: string;
  status: "off" | "ok" | "testing" | "error";
  error?: string;
}

/** Every explainable output carries its reasoning trace. */
export interface Reasoning {
  steps: string[];
  dataCited: string[];
  engine: "claude" | "openai" | "local";
  tokens?: number;
  ms?: number;
}

export interface Lead {
  id: string;
  planner: string;
  studio: string;
  city: string;
  eventsPerYear: number;
  usesTool: "none" | "Meragi" | "WedMeGood" | "spreadsheets";
  tierSuggestion: "Sage" | "Marigold" | "Royal" | "Sovereign";
  suggestedPrice: number;
  stage: LeadStage;
  source: LeadSource;
  score: number;
  createdAt: string;
  lastTouchAt: string;
  touches: number;
  cold: boolean;
  reply?: { sentiment: ReplySentiment; at: string };
  notes: string;
  nextAction?: string;
  wonAt?: string;
}

export interface Draft {
  id: string;
  leadId: string;
  kind: DraftKind;
  subject: string;
  body: string;
  status: "ready" | "synced" | "sent";
  createdAt: string;
  reasoning: Reasoning;
}

export interface Idea {
  id: string;
  title: string;
  objective: string;
  audience: string;
  channel: string;
  message: string;
  format: string;
  seasonality: string;
  budgetMin: number;
  budgetMax: number;
  createdAt: string;
  status: "new" | "approved" | "dismissed";
  reasoning: Reasoning;
}

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: "live" | "planned" | "paused";
  budget: number;
  spent: number;
  ctr: number;
  leads: number;
  converted: number;
  startedAt: string;
  flag?: string;
  flagReasoning?: Reasoning;
}

export interface CalItem { id: string; date: string; label: string; channel: string; }

export interface Task {
  id: string;
  title: string;
  owner: string;
  due: string;
  status: "open" | "done";
  category: "onboarding" | "support" | "event";
  linkedPlannerId?: string;
  createdAt: string;
}

export interface Ticket { id: string; plannerId: string; subject: string; status: "open" | "resolved"; openedAt: string; }

export interface VendorRec {
  id: string; name: string; category: string;
  status: "ok" | "watch" | "delayed";
  note: string;
  lastCheckedAt: string;
}

export interface Risk {
  id: string;
  key: string;
  title: string;
  why: string;
  severity: Severity;
  recommendation: string;
  status: "open" | "resolved";
  category: string;
  createdAt: string;
  reasoning?: Reasoning;
}

export interface VaultDoc {
  id: string;
  name: string;
  type: DocType;
  tags: string[];
  person?: string;
  content: string;
  summary: string;
  uploadedAt: string;
  size: number;
  expiresAt?: string;
  versions: { v: number; at: string; name: string; note: string }[];
}

export interface ActivityEvent { id: string; at: string; agent: AgentId; text: string; reasoning?: Reasoning; }
export interface ChatMsg { id: string; from: "you" | "agent"; agent?: AgentId; text: string; at: string; reasoning?: Reasoning; }
export interface Notice {
  id: string; at: string; agent: AgentId; title: string; body: string;
  kind: "digest" | "alert" | "sales" | "idea" | "doc";
  read: boolean; actionView?: View; actionLabel?: string;
}
export interface Toast { id: string; text: string; agent?: AgentId; }

export interface Settings {
  ownerName: string;
  coldDays: number;
  cadenceDays: number;
  toneSample: string;
  weeklyBudgetCap: number;
  brandVoice: string;
  autoOpsOnWin: boolean;
  gmailConnected: boolean;
  gmailAccount?: string;
  vaultAccess: string[];
}

export interface State {
  _v: number;
  view: View;
  chatOpen: boolean;
  engine: EngineState;
  engineKey?: string;
  leads: Lead[];
  drafts: Draft[];
  ideas: Idea[];
  campaigns: Campaign[];
  calendar: CalItem[];
  tasks: Task[];
  tickets: Ticket[];
  vendors: VendorRec[];
  risks: Risk[];
  docs: VaultDoc[];
  activity: ActivityEvent[];
  chat: ChatMsg[];
  notices: Notice[];
  dayKey: string;
  lastDropAt: string;
  lastTopic: string;
  toasts: Toast[];
  typing: AgentId | null;
  settings: Settings;
}

/* ------------------------------------------------------------------ */

export const TIERS = [
  { name: "Sage", price: 9000, blurb: "up to 10 events/yr", fit: "boutique planners starting out" },
  { name: "Marigold", price: 15000, blurb: "11–25 events/yr", fit: "growing studios with repeat clients" },
  { name: "Royal", price: 25000, blurb: "26–50 events/yr", fit: "established multi-city planners" },
  { name: "Sovereign", price: 40000, blurb: "50+ events/yr", fit: "high-volume destination specialists" },
] as const;

export const CITIES = ["Jaipur", "Udaipur", "Goa", "Delhi NCR", "Mumbai"] as const;

export const EVENT = {
  couple: "Aditi & Vivaan",
  venue: "Leela Palace, Udaipur",
  dateISO: (() => {
    const d = new Date(Date.now() + 63 * 86400000);
    while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d.toISOString();
  })(),
};

export const SEASON = {
  now: "October",
  window: "The November–February wedding window opens in 3 weeks",
  insight: "Per Sutr's stored FY25 market research, this window carries 58% of annual volume — planners are locking tools and vendors right now.",
};

export const AGENTS: Record<
  AgentId,
  { name: string; role: string; dot: string; text: string; soft: string; border: string; chip: string }
> = {
  orchestrator: {
    name: "Orchestrator", role: "routes work, shares context, keeps the log",
    dot: "bg-cream/30", text: "text-cream", soft: "bg-cream/8", border: "border-cream/20", chip: "bg-plum/8 text-plum",
  },
  sales: {
    name: "Sales", role: "finds planners, reasons about fit, drafts — never sends",
    dot: "bg-gold", text: "text-gold", soft: "bg-gold/12", border: "border-gold/35", chip: "bg-gold/14 text-[#8a6414]",
  },
  marketing: {
    name: "Marketing", role: "campaigns & the 6 AM idea drop — proposes, never spends",
    dot: "bg-rose", text: "text-rose", soft: "bg-rose/10", border: "border-rose/30", chip: "bg-rose/12 text-rose",
  },
  ops: {
    name: "Operations", role: "watches onboarding, tickets, event timelines",
    dot: "bg-sage", text: "text-sage", soft: "bg-sage/14", border: "border-sage/35", chip: "bg-sage/14 text-[#55633f]",
  },
  vault: {
    name: "Document Vault", role: "single source of truth, access-controlled",
    dot: "bg-ivory", text: "text-ivory", soft: "bg-ivory/14", border: "border-ivory/35", chip: "bg-ivory text-plum2",
  },
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const money = (n: number) =>
  "₹" + (n >= 100000 ? (Math.round((n / 100000) * 10) / 10).toString().replace(/\.0$/, "") + "L" : n.toLocaleString("en-IN"));

export const daysSince = (iso: string) => Math.floor((Date.now() - +new Date(iso)) / 86400000);
export const daysUntil = (iso: string) => Math.ceil((+new Date(iso) - Date.now()) / 86400000);
export const todayKey = () => new Date().toDateString();
export const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - +new Date(iso)) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
