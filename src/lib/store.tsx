import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type {
  ActivityEvent, AgentId, DraftKind, Lead, Notice, ReplySentiment, State, View,
} from "./types";
import { todayKey, uid } from "./types";
import { SEED_VERSION, seedState } from "./seed";
import { composeDraft, markColdLeads } from "../agents/sales";
import { generateIdeas, nextSlotDate } from "../agents/marketing";
import { runScan } from "../agents/ops";
import { autoTag } from "../agents/vault";
import { routeCommand } from "../agents/orchestrator";

const LS_KEY = "helm.state.v1";

function load(): State {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed && parsed._v === SEED_VERSION) {
        return { ...parsed, toasts: [], typing: null, chatOpen: parsed.chatOpen ?? false };
      }
    }
  } catch {
    /* corrupted storage → reseed */
  }
  return seedState();
}

export interface UploadInput {
  name: string;
  size: number;
  content: string;
}

export interface HelmApi {
  s: State;
  go: (v: View) => void;
  toast: (text: string, agent?: AgentId) => void;
  setChatOpen: (open: boolean) => void;
  sendChat: (text: string) => void;
  requestDraft: (leadId: string, kind: DraftKind) => void;
  approveDraft: (id: string) => void;
  markSent: (id: string) => void;
  logReply: (leadId: string, sentiment: ReplySentiment) => void;
  markWon: (leadId: string) => void;
  markLost: (leadId: string) => void;
  addLead: (l: { company: string; contact: string; email: string; source: Lead["source"]; value: number; notes: string }) => void;
  runMorningDrop: () => string;
  approveIdea: (id: string) => void;
  dismissIdea: (id: string) => void;
  runOpsScan: () => { summary: string };
  resolveRisk: (id: string) => void;
  addTask: (t: { title: string; owner: string; dueDays: number }) => void;
  toggleTask: (id: string) => void;
  setVendor: (id: string, status: "ok" | "watch" | "delayed") => void;
  uploadDocs: (files: UploadInput[]) => void;
  replaceDoc: (id: string, file: UploadInput) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  updateSettings: (patch: Partial<State["settings"]>) => void;
  connectGmail: (account: string) => void;
  disconnectGmail: () => void;
  checkDayRollover: () => void;
  resetDemo: () => void;
}

const Ctx = createContext<HelmApi | null>(null);

export const useHelm = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHelm outside provider");
  return ctx;
};

export function HelmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(load);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    const { toasts, typing, chatOpen, ...rest } = state;
    void toasts; void typing; void chatOpen;
    localStorage.setItem(LS_KEY, JSON.stringify({ ...rest, toasts: [], typing: null, chatOpen: false }));
  }, [state]);

  const commit = (next: State) => {
    ref.current = next;
    setState(next);
  };

  const evt = (agent: AgentId, text: string, why?: string): ActivityEvent => ({
    id: uid(), at: new Date().toISOString(), agent, text, why,
  });

  const toast = (text: string, agent?: AgentId) => {
    const id = uid();
    setState((s) => ({ ...s, toasts: [...s.toasts, { id, text, agent }] }));
    setTimeout(() => {
      setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4600);
  };

  /* ============ Sales ============ */
  const requestDraft: HelmApi["requestDraft"] = (leadId, kind) => {
    const S = ref.current;
    const lead = S.leads.find((l) => l.id === leadId);
    if (!lead) return;
    const draft = composeDraft(lead, S, kind);
    commit({
      ...S,
      drafts: [draft, ...S.drafts],
      activity: [evt("sales", `Drafted a ${kind} email for ${lead.company}.`, draft.why), ...S.activity],
      lastTopic: "draft",
    });
    toast(`${kind === "outreach" ? "Outreach" : kind === "nudge" ? "Cold-nudge" : "Follow-up"} draft for ${lead.company} ready for your review`, "sales");
  };

  const approveDraft: HelmApi["approveDraft"] = (id) => {
    const S = ref.current;
    const d = S.drafts.find((x) => x.id === id);
    if (!d || d.status !== "ready") return;
    const lead = S.leads.find((l) => l.id === d.leadId);
    commit({
      ...S,
      drafts: S.drafts.map((x) => (x.id === id ? { ...x, status: "synced" } : x)),
      activity: [
        evt("sales", `You approved the ${d.kind} draft for ${lead?.company ?? "a lead"} — synced to Gmail Drafts (sandbox).`, "Hard rule honored: the Gmail API call uses the drafts scope only. Sending stays in your hands, in Gmail."),
        ...S.activity,
      ],
    });
    toast(`Synced to Gmail Drafts — open Gmail → Drafts and press send yourself`, "sales");
  };

  const markSent: HelmApi["markSent"] = (id) => {
    const S = ref.current;
    const d = S.drafts.find((x) => x.id === id);
    if (!d) return;
    const lead = S.leads.find((l) => l.id === d.leadId);
    commit({
      ...S,
      drafts: S.drafts.map((x) => (x.id === id ? { ...x, status: "sent" } : x)),
      leads: S.leads.map((l) =>
        l.id === d.leadId
          ? {
              ...l,
              stage: l.stage === "new" ? "contacted" : l.stage,
              touches: l.touches + 1,
              lastTouchAt: new Date().toISOString(),
              cold: false,
            }
          : l
      ),
      activity: [evt("sales", `You sent the ${d.kind} email to ${lead?.company ?? "a lead"} from Gmail. Lead stage and cadence updated automatically.`), ...S.activity],
    });
    toast(`${lead?.company ?? "Lead"} updated: touch #${(lead?.touches ?? 0) + 1}, cadence clock reset`, "sales");
  };

  const markWon: HelmApi["markWon"] = (leadId) => {
    const S = ref.current;
    const lead = S.leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === "won") return;
    const now = new Date().toISOString();
    const events: ActivityEvent[] = [
      evt("sales", `Lead ${lead.company} marked Won ($${lead.value.toLocaleString()}).`),
    ];
    let tasks = S.tasks;
    let docs = S.docs;
    let campaigns = S.campaigns;
    const notices: Notice[] = [];

    if (S.settings.autoOpsOnWin) {
      tasks = [
        {
          id: uid(),
          title: `Onboard ${lead.company} — schedule delivery window`,
          owner: S.settings.ownerName,
          due: new Date(Date.now() + 7 * 86400000).toISOString(),
          status: "open",
          linkedLeadId: lead.id,
          createdAt: now,
        },
        ...tasks,
      ];
      events.unshift(evt("ops", `Auto-created onboarding task for ${lead.company} after Sales closed the deal.`, "Your auto-ops-on-win rule: every closed deal gets an onboarding task immediately — Operations reads the shared store, not your inbox."));
    }
    const docName = `Service Agreement — ${lead.company}.pdf`;
    docs = [
      {
        id: uid(),
        name: docName,
        type: "contract",
        tags: ["contract", "signed", lead.company.toLowerCase().replace(/[^a-z0-9]+/g, "-")],
        person: lead.company,
        content: `Service agreement for ${lead.company}. Value $${lead.value.toLocaleString()}. Signed ${new Date().toLocaleDateString()}.`,
        summary: `Auto-filed agreement for the ${lead.company} win.`,
        uploadedAt: now,
        size: 388000,
        autoFiled: "The orchestrator passed the closed-deal event to the Vault; tags were generated from the document text.",
        versions: [{ v: 1, at: now, name: docName, note: "Auto-filed on close" }],
      },
      ...docs,
    ];
    events.unshift(evt("vault", `Auto-filed “${docName}” (tags: contract, signed).`, "Closed-deal events carry the deal metadata, so the Vault can file without being asked."));

    const live = campaigns.find((c) => c.status === "live");
    if (live) {
      campaigns = campaigns.map((c) => (c.id === live.id ? { ...c, closedFromCampaign: c.closedFromCampaign + 1 } : c));
      events.unshift(evt("marketing", `Credited one closed deal to “${live.name}”.`, "Attribution runs off the shared store: Sales closed → Marketing sees which campaign sourced the lead."));
    }

    notices.push({
      id: uid(),
      at: now,
      agent: "orchestrator",
      title: `Cross-agent handoff — ${lead.company} won`,
      body: `Sales closed ${lead.company} ($${lead.value.toLocaleString()}). Ops created onboarding, Vault filed the agreement, Marketing updated attribution.`,
      kind: "digest",
      read: false,
      actionView: "activity",
      actionLabel: "See handoff",
    });

    commit({
      ...S,
      leads: S.leads.map((l) => (l.id === leadId ? { ...l, stage: "won", wonAt: now, cold: false, reply: { sentiment: "positive", at: now } } : l)),
      tasks, docs, campaigns,
      activity: [...events, ...S.activity],
      notices: [...notices, ...S.notices],
    });
    toast(`${lead.company} won — Ops, Vault, and Marketing were notified through the shared store`, "orchestrator");
  };

  const logReply: HelmApi["logReply"] = (leadId, sentiment) => {
    const S = ref.current;
    const lead = S.leads.find((l) => l.id === leadId);
    if (!lead) return;
    const now = new Date().toISOString();
    if (sentiment === "positive") {
      commit({ ...S, leads: S.leads.map((l) => (l.id === leadId ? { ...l, reply: { sentiment, at: now } } : l)) });
      markWon(leadId);
      return;
    }
    if (sentiment === "later") {
      commit({
        ...S,
        leads: S.leads.map((l) =>
          l.id === leadId ? { ...l, stage: "followup", reply: { sentiment, at: now }, lastTouchAt: now, cold: false } : l
        ),
        activity: [evt("sales", `Reply tracked from ${lead.company}: “not now”. Stage moved to Follow-up; next touch scheduled per your ${S.settings.cadenceDays}-day cadence.`, "Reply-tracking reads Gmail (read scope) and maps sentiment to stages — no manual data entry."), ...S.activity],
      });
      toast(`${lead.company}: follow-up queued per your cadence rules`, "sales");
    } else {
      commit({
        ...S,
        leads: S.leads.map((l) => (l.id === leadId ? { ...l, stage: "lost", reply: { sentiment, at: now } } : l)),
        activity: [evt("sales", `Reply tracked from ${lead.company}: not a fit. Marked Lost and archived from the active board.`), ...S.activity],
      });
      toast(`${lead.company} marked Lost`, "sales");
    }
  };

  const markLost: HelmApi["markLost"] = (leadId) => {
    const S = ref.current;
    const lead = S.leads.find((l) => l.id === leadId);
    if (!lead) return;
    commit({
      ...S,
      leads: S.leads.map((l) => (l.id === leadId ? { ...l, stage: "lost" } : l)),
      activity: [evt("sales", `${lead.company} marked Lost.`), ...S.activity],
    });
  };

  const addLead: HelmApi["addLead"] = (l) => {
    const S = ref.current;
    const now = new Date().toISOString();
    const lead: Lead = {
      id: uid(), ...l, stage: "new", createdAt: now, lastTouchAt: now, touches: 0, cold: false,
    };
    commit({
      ...S,
      leads: [lead, ...S.leads],
      activity: [evt("sales", `New lead added: ${l.company} ($${l.value.toLocaleString()}, ${l.source}).`, "Added from your source list. First-touch draft can be queued with one click."), ...S.activity],
    });
    toast(`${l.company} added to the pipeline — want an outreach draft?`, "sales");
  };

  /* ============ Marketing ============ */
  const runMorningDrop: HelmApi["runMorningDrop"] = () => {
    const S = ref.current;
    const { ideas, summary } = generateIdeas(S);
    const now = new Date().toISOString();
    const notices = ideas.length
      ? [
          {
            id: uid(), at: now, agent: "marketing" as AgentId,
            title: `Idea drop — ${ideas.length} new ideas`,
            body: ideas.map((i) => i.title).join(" · "),
            kind: "idea" as const, read: false, actionView: "marketing" as View, actionLabel: "Review ideas",
          },
        ]
      : [];
    commit({
      ...S,
      ideas: [...ideas, ...S.ideas],
      lastDropAt: now,
      dayKey: todayKey(),
      activity: [evt("marketing", ideas.length ? `Idea drop generated ${ideas.length} ideas.` : "Idea drop ran: nothing queued — pipeline healthy, no underperformers.", `Scheduled 6 AM trigger, run ${ideas.length ? "with live Sales/Ops data" : "on demand"}.`), ...S.activity],
      notices: [...notices, ...S.notices],
      lastTopic: "idea",
    });
    if (ideas.length) toast(`Marketing queued ${ideas.length} new ideas from live store data`, "marketing");
    return summary;
  };

  const approveIdea: HelmApi["approveIdea"] = (id) => {
    const S = ref.current;
    const idea = S.ideas.find((i) => i.id === id);
    if (!idea || idea.status !== "new") return;
    const slotDate = nextSlotDate(S);
    commit({
      ...S,
      ideas: S.ideas.map((i) => (i.id === id ? { ...i, status: "approved" } : i)),
      campaigns: [
        {
          id: uid(), name: idea.title, channel: idea.channel, status: "planned",
          budget: idea.budgetMax, spent: 0, ctr: 0, leadsGenerated: 0, closedFromCampaign: 0,
          startedAt: slotDate.toISOString(),
        },
        ...S.campaigns,
      ],
      calendar: [...S.calendar, { id: uid(), date: slotDate.toISOString(), label: idea.title, channel: idea.channel }].sort((a, b) => a.date.localeCompare(b.date)),
      activity: [evt("marketing", `You approved “${idea.title}” — brief created and slotted into the content calendar for ${slotDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}.`, "Approval is yours; the agent only proposed. Planned budget $" + idea.budgetMax + " will not be committed without a second explicit approval."), ...S.activity],
    });
    toast(`“${idea.title}” approved — calendar updated, spend still at $0 until you commit`, "marketing");
  };

  const dismissIdea: HelmApi["dismissIdea"] = (id) => {
    const S = ref.current;
    const idea = S.ideas.find((i) => i.id === id);
    commit({
      ...S,
      ideas: S.ideas.map((i) => (i.id === id ? { ...i, status: "dismissed" } : i)),
      activity: [evt("marketing", `You dismissed “${idea?.title ?? "an idea"}”. I'll weight similar ideas down next drop.`), ...S.activity],
    });
  };

  /* ============ Operations ============ */
  const runOpsScan: HelmApi["runOpsScan"] = () => {
    const S = ref.current;
    const result = runScan(S);
    const now = new Date().toISOString();
    const notices: Notice[] = result.newHigh.map((r) => ({
      id: uid(), at: now, agent: "ops" as AgentId,
      title: `Escalated: ${r.title}`, body: r.why, kind: "alert" as const, read: false,
      actionView: "ops" as View, actionLabel: "See risk",
    }));
    commit({
      ...S,
      risks: result.risks,
      activity: [evt("ops", result.summary, result.newHigh.length ? "High-severity risks bypass the daily summary — that's the escalation rule." : undefined), ...S.activity],
      notices: [...notices, ...S.notices],
      lastTopic: "risk",
    });
    if (result.newHigh.length) toast(`Ops escalated ${result.newHigh.length} high-severity risk — see Operations`, "ops");
    else toast(result.summary, "ops");
    return { summary: result.summary };
  };

  const resolveRisk: HelmApi["resolveRisk"] = (id) => {
    const S = ref.current;
    const r = S.risks.find((x) => x.id === id);
    commit({
      ...S,
      risks: S.risks.map((x) => (x.id === id ? { ...x, status: "resolved" } : x)),
      activity: [evt("ops", `You resolved “${r?.title ?? "a risk"}”. It stays in the register for the audit trail.`), ...S.activity],
    });
    toast("Risk resolved — register updated", "ops");
  };

  const addTask: HelmApi["addTask"] = (t) => {
    const S = ref.current;
    commit({
      ...S,
      tasks: [
        { id: uid(), title: t.title, owner: t.owner, due: new Date(Date.now() + t.dueDays * 86400000).toISOString(), status: "open", createdAt: new Date().toISOString() },
        ...S.tasks,
      ],
      activity: [evt("ops", `Task added: “${t.title}” (due in ${t.dueDays}d, owner ${t.owner}). Ops will watch the deadline automatically.`), ...S.activity],
    });
    toast("Task added — Ops is already watching its deadline", "ops");
  };

  const toggleTask: HelmApi["toggleTask"] = (id) => {
    const S = ref.current;
    const t = S.tasks.find((x) => x.id === id);
    if (!t) return;
    commit({
      ...S,
      tasks: S.tasks.map((x) => (x.id === id ? { ...x, status: x.status === "open" ? "done" : "open" } : x)),
      activity: [evt("ops", `Task “${t.title}” marked ${t.status === "open" ? "done" : "reopened"}.`), ...S.activity],
    });
  };

  const setVendor: HelmApi["setVendor"] = (id, status) => {
    const S = ref.current;
    const v = S.vendors.find((x) => x.id === id);
    commit({
      ...S,
      vendors: S.vendors.map((x) => (x.id === id ? { ...x, status, lastCheckedAt: new Date().toISOString() } : x)),
      activity: [evt("ops", `Vendor ${v?.name ?? ""} status set to “${status}” (manual input). Downstream risk check queued.`), ...S.activity],
    });
    if (status !== "ok") toast(`${v?.name} marked ${status} — run a health check to see exposure`, "ops");
  };

  /* ============ Vault ============ */
  const uploadDocs: HelmApi["uploadDocs"] = (files) => {
    const S = ref.current;
    const now = new Date().toISOString();
    const docs = files.map((f) => {
      const meta = autoTag(f.name, f.content);
      return {
        id: uid(),
        name: f.name,
        type: meta.type,
        tags: meta.tags,
        person: meta.person,
        content: f.content,
        summary: meta.why,
        uploadedAt: now,
        size: f.size,
        expiresAt: meta.expiresAt,
        versions: [{ v: 1, at: now, name: f.name, note: "Original upload" }],
      };
    });
    commit({
      ...S,
      docs: [...docs, ...S.docs],
      activity: [
        ...docs.map((d) => evt("vault" as AgentId, `Filed “${d.name}” — auto-tagged [${d.tags.slice(0, 4).join(", ")}].`, `Tagging reason: ${d.summary}`)),
        ...S.activity,
      ],
    });
    toast(`${docs.length} document${docs.length > 1 ? "s" : ""} filed and auto-tagged — no folder tetris needed`, "vault");
  };

  const replaceDoc: HelmApi["replaceDoc"] = (id, file) => {
    const S = ref.current;
    const doc = S.docs.find((d) => d.id === id);
    if (!doc) return;
    const now = new Date().toISOString();
    const v = doc.versions.length + 1;
    commit({
      ...S,
      docs: S.docs.map((d) =>
        d.id === id
          ? { ...d, name: file.name, content: file.content, size: file.size, uploadedAt: now, versions: [...d.versions, { v, at: now, name: file.name, note: "Replaced — previous version kept in history" }] }
          : d
      ),
      activity: [evt("vault", `“${doc.name}” updated to v${v}. Full version history retained.`, "Versioning is automatic on replace — the old file is never lost."), ...S.activity],
    });
    toast(`Updated to v${v} — version history kept`, "vault");
  };

  /* ============ Shared infra ============ */
  const go: HelmApi["go"] = (v) => commit({ ...ref.current, view: v });

  const markRead: HelmApi["markRead"] = (id) =>
    commit({ ...ref.current, notices: ref.current.notices.map((n) => (n.id === id ? { ...n, read: true } : n)) });

  const markAllRead: HelmApi["markAllRead"] = () =>
    commit({ ...ref.current, notices: ref.current.notices.map((n) => ({ ...n, read: true })) });

  const updateSettings: HelmApi["updateSettings"] = (patch) => {
    const S = ref.current;
    const settings = { ...S.settings, ...patch };
    commit({
      ...S,
      settings,
      leads: patch.coldDays !== undefined ? markColdLeads(S.leads, patch.coldDays) : S.leads,
      activity: [evt("orchestrator", `Settings updated (${Object.keys(patch).join(", ")}). All agents read the new rules immediately.`), ...S.activity],
    });
  };

  const connectGmail: HelmApi["connectGmail"] = (account) => {
    const S = ref.current;
    commit({
      ...S,
      settings: { ...S.settings, gmailConnected: true, gmailAccount: account },
      activity: [evt("orchestrator", `Gmail connected (sandbox): ${account}. Scopes granted: gmail.modify (create drafts) + gmail.readonly (track replies).`, "Tokens live server-side in production. The browser never sees them — see Settings for the full flow."), ...S.activity],
    });
    toast("Gmail connected — drafts scope only. Sending stays yours.", "orchestrator");
  };

  const disconnectGmail: HelmApi["disconnectGmail"] = () => {
    const S = ref.current;
    commit({
      ...S,
      settings: { ...S.settings, gmailConnected: false },
      activity: [evt("orchestrator", "Gmail disconnected. Token revoked; drafts queue pauses until reconnected."), ...S.activity],
    });
  };

  const checkDayRollover: HelmApi["checkDayRollover"] = () => {
    const S = ref.current;
    if (todayKey() === S.dayKey) return;
    if (new Date().getHours() >= 6) {
      commit({ ...S, leads: markColdLeads(S.leads, S.settings.coldDays), dayKey: todayKey() });
      runMorningDrop(); // sets dayKey
      toast("New day — cold-lead rules re-applied and the 6 AM idea drop just ran", "orchestrator");
    } else {
      commit({ ...S, dayKey: todayKey() });
    }
  };

  const resetDemo: HelmApi["resetDemo"] = () => {
    localStorage.removeItem(LS_KEY);
    commit(seedState());
    toast("Demo data reset to a fresh morning", "orchestrator");
  };

  const setChatOpen: HelmApi["setChatOpen"] = (open) => commit({ ...ref.current, chatOpen: open });

  const sendChat: HelmApi["sendChat"] = (text) => {
    const S = ref.current;
    const userMsg = { id: uid(), from: "you" as const, text, at: new Date().toISOString() };
    commit({
      ...S,
      chat: [...S.chat, userMsg],
      chatOpen: true,
      typing: "orchestrator",
      activity: [evt("orchestrator", `You asked: “${text.length > 60 ? text.slice(0, 60) + "…" : text}”`), ...S.activity],
    });
    window.setTimeout(() => {
      const cur = ref.current;
      const api = {
        requestDraft,
        runOpsScan: () => runOpsScan(),
        runMorningDrop: () => runMorningDrop(),
        markWon,
        go,
      };
      const route = routeCommand(text, cur, api);
      // agents may have updated typing via their commits; re-read
      const after = ref.current;
      commit({
        ...after,
        typing: null,
        lastTopic: route.topic || after.lastTopic,
        chat: [
          ...after.chat,
          { id: uid(), from: "agent" as const, agent: route.agent, text: route.reply, at: new Date().toISOString() },
        ],
      });
    }, 750);
  };

  const value: HelmApi = {
    s: state, go, toast, setChatOpen, sendChat,
    requestDraft, approveDraft, markSent, logReply, markWon, markLost, addLead,
    runMorningDrop, approveIdea, dismissIdea,
    runOpsScan, resolveRisk, addTask, toggleTask, setVendor,
    uploadDocs, replaceDoc, markRead, markAllRead,
    updateSettings, connectGmail, disconnectGmail, checkDayRollover, resetDemo,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
