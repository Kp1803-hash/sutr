import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type {
  ActivityEvent, AgentId, Draft, DraftKind, Lead, Notice, ReplySentiment, State, View,
} from "./types";
import { todayKey, uid } from "./types";
import { SEED_VERSION, seedState } from "./seed";
import { markColdLeads, nextActionFor } from "../agents/sales";
import { assembleIdeas, nextSlotDate } from "../agents/marketing";
import { runScan } from "../agents/ops";
import { autoTag } from "../agents/vault";
import { routeCommand } from "../agents/orchestrator";
import { llmDraft, llmIdeas } from "./llm";
import { localDraft, localIdeas } from "./local";
import { fitLead } from "./local";
import { getStoredKey, getStoredProvider, maskKey, saveKey, saveProvider, callLLM } from "./engine";

const LS_KEY = "sutr.state.v1";

function load(): State {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed && parsed._v === SEED_VERSION) {
        const s: State = { ...parsed, toasts: [], typing: null, chatOpen: parsed.chatOpen ?? false };
        // restore engine from secure-ish local storage if a key exists
        const k = getStoredKey();
        if (k && s.engine.provider === "none") {
          s.engine = { provider: getStoredProvider(), model: getStoredProvider() === "openai" ? "gpt-4o" : "claude-sonnet-4-6", status: "ok" };
        }
        return s;
      }
    }
  } catch {
    /* corrupted → reseed */
  }
  return seedState();
}

export interface UploadInput { name: string; size: number; content: string; }

export interface SutrApi {
  s: State;
  go: (v: View) => void;
  toast: (text: string, agent?: AgentId) => void;
  setChatOpen: (open: boolean) => void;
  sendChat: (text: string) => void;
  requestDraft: (leadId: string, kind: DraftKind) => Promise<Draft | undefined>;
  approveDraft: (id: string) => void;
  markSent: (id: string) => void;
  logReply: (leadId: string, sentiment: ReplySentiment) => void;
  markWon: (leadId: string) => void;
  markLost: (leadId: string) => void;
  addLead: (l: { planner: string; studio: string; city: string; eventsPerYear: number; usesTool: Lead["usesTool"]; source: Lead["source"]; notes: string }) => void;
  runMorningDrop: () => Promise<string>;
  approveIdea: (id: string) => void;
  dismissIdea: (id: string) => void;
  runOpsScan: () => { summary: string };
  resolveRisk: (id: string) => void;
  addTask: (t: { title: string; owner: string; dueDays: number; category: "onboarding" | "support" | "event" }) => void;
  toggleTask: (id: string) => void;
  resolveTicket: (id: string) => void;
  setVendor: (id: string, status: "ok" | "watch" | "delayed") => void;
  uploadDocs: (files: UploadInput[]) => void;
  replaceDoc: (id: string, file: UploadInput) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  updateSettings: (patch: Partial<State["settings"]>) => void;
  connectGmail: (account: string) => void;
  disconnectGmail: () => void;
  connectEngine: (provider: "claude" | "openai", key: string, model: string) => Promise<boolean>;
  clearEngine: () => void;
  dismissGate: () => void;
  checkDayRollover: () => void;
  resetDemo: () => void;
}

const Ctx = createContext<SutrApi | null>(null);
export const useSutr = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSutr outside provider");
  return ctx;
};

export function SutrProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(load);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...ref.current, toasts: [], typing: null, chatOpen: false }));
  }, [state]);

  const commit = (next: State) => { ref.current = next; setState(next); };

  const evt = (agent: AgentId, text: string, reasoning?: ActivityEvent["reasoning"]): ActivityEvent => ({
    id: uid(), at: new Date().toISOString(), agent, text, reasoning,
  });

  const toast: SutrApi["toast"] = (text, agent) => {
    const id = uid();
    setState((s) => ({ ...s, toasts: [...s.toasts, { id, text, agent }] }));
    setTimeout(() => setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) })), 5200);
  };

  /* ================= Sales ================= */
  const requestDraft: SutrApi["requestDraft"] = async (leadId, kind) => {
    const S = ref.current;
    const lead = S.leads.find((l) => l.id === leadId);
    if (!lead) return undefined;
    commit({
      ...S,
      activity: [evt("sales", `Sales Agent is reasoning about ${lead.studio} — reading their record, your tone sample, and the season context…`), ...S.activity],
      lastTopic: "draft",
    });
    let result: { subject: string; body: string; reasoning: Draft["reasoning"] };
    let fellBack = false;
    try {
      result = await llmDraft(lead, ref.current, kind);
    } catch (e) {
      fellBack = true;
      result = localDraft(lead, ref.current, kind);
      toast(`${e instanceof Error ? e.message : "LLM unavailable"} — local inference took over transparently`, "sales");
    }
    const draft: Draft = { id: uid(), leadId, kind, subject: result.subject, body: result.body, status: "ready", createdAt: new Date().toISOString(), reasoning: result.reasoning };
    commit({
      ...ref.current,
      drafts: [draft, ...ref.current.drafts],
      activity: [
        evt("sales", `Drafted a ${kind} email for ${lead.studio} (${result.reasoning.engine === "local" ? "local inference" : result.reasoning.engine}). Awaiting your approval — nothing sends without it.`, result.reasoning),
        ...ref.current.activity,
      ],
    });
    if (!fellBack) toast(`${kind === "outreach" ? "Outreach" : kind === "nudge" ? "Cold-nudge" : "Follow-up"} draft for ${lead.studio} ready — reasoned by ${result.reasoning.engine === "local" ? "local inference" : result.reasoning.engine === "claude" ? "Claude" : "OpenAI"}`, "sales");
    return draft;
  };

  const approveDraft: SutrApi["approveDraft"] = (id) => {
    const S = ref.current;
    const d = S.drafts.find((x) => x.id === id);
    if (!d || d.status !== "ready") return;
    const lead = S.leads.find((l) => l.id === d.leadId);
    commit({
      ...S,
      drafts: S.drafts.map((x) => (x.id === id ? { ...x, status: "synced" } : x)),
      activity: [
        evt("sales", `You approved the ${d.kind} draft for ${lead?.studio ?? "a lead"} — synced to Gmail Drafts (${S.settings.gmailConnected ? "connected account" : "sandbox"}).`, {
          engine: "local",
          steps: [
            "Hard rule honored: the Gmail API call uses the drafts scope only (users.drafts.create).",
            "No send scope exists on the token, so autonomous sending is technically impossible.",
            "Sending stays in your hands, in Gmail.",
          ],
          dataCited: [lead?.studio ?? "", "gmail.modify scope"],
        }),
        ...S.activity,
      ],
    });
    toast(`Synced to Gmail Drafts — open Gmail → Drafts and press send yourself`, "sales");
  };

  const markSent: SutrApi["markSent"] = (id) => {
    const S = ref.current;
    const d = S.drafts.find((x) => x.id === id);
    if (!d) return;
    const lead = S.leads.find((l) => l.id === d.leadId);
    const updated: Lead | undefined = lead
      ? { ...lead, stage: lead.stage === "new" ? "contacted" : lead.stage, touches: lead.touches + 1, lastTouchAt: new Date().toISOString(), cold: false }
      : undefined;
    const withAction = updated ? { ...updated, nextAction: nextActionFor(updated, S).action } : undefined;
    commit({
      ...S,
      drafts: S.drafts.map((x) => (x.id === id ? { ...x, status: "sent" } : x)),
      leads: S.leads.map((l) => (withAction && l.id === withAction.id ? withAction : l)),
      activity: [evt("sales", `You sent the ${d.kind} email to ${lead?.studio ?? "a lead"} from Gmail. Touch #${(lead?.touches ?? 0) + 1} logged; cadence clock reset; next best action recomputed.`), ...S.activity],
    });
    toast(`${lead?.studio ?? "Lead"} updated — next best action: ${withAction?.nextAction ?? "recomputed"}`, "sales");
  };

  const markWon: SutrApi["markWon"] = (leadId) => {
    const S = ref.current;
    const lead = S.leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === "won") return;
    const now = new Date().toISOString();
    const events: ActivityEvent[] = [evt("sales", `Lead ${lead.studio} marked Won (${lead.tierSuggestion}, ₹${lead.suggestedPrice.toLocaleString("en-IN")}/event).`)];
    let tasks = S.tasks, docs = S.docs, campaigns = S.campaigns;
    const notices: Notice[] = [];

    if (S.settings.autoOpsOnWin) {
      tasks = [{ id: uid(), title: `Onboard ${lead.studio} — schedule setup walkthrough`, owner: "Onboarding", due: new Date(Date.now() + 7 * 86400000).toISOString(), status: "open", category: "onboarding", linkedPlannerId: lead.id, createdAt: now }, ...tasks];
      events.unshift(evt("ops", `Auto-created onboarding task for ${lead.studio} after Sales closed the deal.`, { engine: "local", steps: ["Your auto-ops-on-win rule fired: closed deal → onboarding task, instantly.", "Operations reads the shared store, not your inbox."], dataCited: [lead.studio, "auto-ops-on-win"] }));
    }
    const docName = `Planner Contract — ${lead.studio} (${lead.tierSuggestion}, signed).pdf`;
    docs = [{
      id: uid(), name: docName, type: "contract",
      tags: ["contract", "signed", lead.tierSuggestion.toLowerCase(), lead.studio.toLowerCase().replace(/[^a-z0-9]+/g, "-")],
      person: lead.studio,
      content: `${lead.tierSuggestion}-tier agreement for ${lead.studio}, ${lead.city}. ₹${lead.suggestedPrice.toLocaleString("en-IN")}/event, no lock-in, planner owns their data. Signed ${new Date().toLocaleDateString()}.`,
      summary: `Auto-filed on close: ${lead.tierSuggestion} contract for ${lead.studio}.`,
      uploadedAt: now, size: 388000,
      versions: [{ v: 1, at: now, name: docName, note: "Auto-filed on close" }],
    }, ...docs];
    events.unshift(evt("vault", `Auto-filed “${docName}” — tags generated from the document text.`, { engine: "local", steps: ["The orchestrator passed the closed-deal event to the Vault.", "Tags came from extracted text: tier, studio, contract type."], dataCited: [lead.studio, lead.tierSuggestion] }));

    const top = [...campaigns].filter((c) => c.status === "live").sort((a, b) => b.leads - a.leads)[0];
    if (top) {
      campaigns = campaigns.map((c) => (c.id === top.id ? { ...c, converted: c.converted + 1 } : c));
      events.unshift(evt("marketing", `Credited one closed deal to “${top.name}”.`, { engine: "local", steps: ["Attribution runs off the shared store: Sales closed → Marketing sees which live campaign sourced the most leads.", "No invented attribution — the store record is the source."], dataCited: [top.name, lead.studio] }));
    }

    notices.push({ id: uid(), at: now, agent: "orchestrator", title: `Cross-agent handoff — ${lead.studio} won`, body: `Sales closed ${lead.studio} (${lead.tierSuggestion}). Ops created onboarding, Vault filed the contract, Marketing updated attribution.`, kind: "digest", read: false, actionView: "activity", actionLabel: "See handoff" });

    commit({
      ...S,
      leads: S.leads.map((l) => (l.id === leadId ? { ...l, stage: "won", wonAt: now, cold: false, reply: { sentiment: "positive", at: now }, nextAction: "Closed — handoff to Operations runs automatically via the shared store." } : l)),
      tasks, docs, campaigns,
      activity: [...events, ...S.activity],
      notices: [...notices, ...S.notices],
    });
    toast(`${lead.studio} won — Ops, Vault, and Marketing were notified through the shared store`, "orchestrator");
  };

  const markLost: SutrApi["markLost"] = (leadId) => {
    const S = ref.current;
    const lead = S.leads.find((l) => l.id === leadId);
    if (!lead) return;
    commit({ ...S, leads: S.leads.map((l) => (l.id === leadId ? { ...l, stage: "lost", nextAction: "Archived as Lost. No further touches." } : l)), activity: [evt("sales", `${lead.studio} marked Lost and archived.`), ...S.activity] });
  };

  const logReply: SutrApi["logReply"] = (leadId, sentiment) => {
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
      const upd: Lead = { ...lead, stage: "followup", reply: { sentiment, at: now }, lastTouchAt: now, cold: false };
      const action = nextActionFor(upd, S);
      commit({
        ...S,
        leads: S.leads.map((l) => (l.id === leadId ? { ...upd, nextAction: action.action } : l)),
        activity: [evt("sales", `Reply tracked from ${lead.studio}: “not now”. Stage → Follow-up; next best action reasoned.`, action.reasoning), ...S.activity],
      });
      toast(`${lead.studio}: ${action.action}`, "sales");
    } else {
      commit({ ...S, leads: S.leads.map((l) => (l.id === leadId ? { ...l, stage: "lost", reply: { sentiment, at: now }, nextAction: "Archived as Lost. No further touches." } : l)), activity: [evt("sales", `Reply tracked from ${lead.studio}: not a fit. Marked Lost.`), ...S.activity] });
      toast(`${lead.studio} marked Lost`, "sales");
    }
  };

  const addLead: SutrApi["addLead"] = (l) => {
    const S = ref.current;
    const now = new Date().toISOString();
    const fit = fitLead(l);
    const lead: Lead = {
      id: uid(), ...l,
      tierSuggestion: fit.tier as Lead["tierSuggestion"], suggestedPrice: fit.price, score: fit.score,
      stage: "new", createdAt: now, lastTouchAt: now, touches: 0, cold: false,
    };
    const action = nextActionFor(lead, S);
    commit({
      ...S,
      leads: [{ ...lead, nextAction: action.action }, ...S.leads],
      activity: [evt("sales", `New lead qualified: ${l.studio} → ${fit.tier} (${fit.score}/100).`, fit.reasoning), ...S.activity],
    });
    toast(`${l.studio} qualified as ${fit.tier} — reasoning in the Activity log`, "sales");
  };

  /* ================= Marketing ================= */
  const runMorningDrop: SutrApi["runMorningDrop"] = async () => {
    const S0 = ref.current;
    commit({ ...S0, activity: [evt("marketing", "Marketing Agent is reasoning over stalled leads, campaign CTRs, ops risks, and stored seasonality research…"), ...S0.activity], lastTopic: "idea" });
    let seeds, fromLLM = true;
    try {
      const res = await llmIdeas(ref.current);
      seeds = res.seeds; fromLLM = res.fromLLM;
    } catch (e) {
      seeds = localIdeas(ref.current); fromLLM = false;
      toast(`${e instanceof Error ? e.message : "LLM unavailable"} — local inference generated the drop instead`, "marketing");
    }
    const existing = new Set(ref.current.ideas.filter((i) => i.status === "new").map((i) => i.title));
    const fresh = assembleIdeas(seeds.filter((s) => !existing.has(s.title))).slice(0, 3);
    const now = new Date().toISOString();
    const notice: Notice[] = fresh.length ? [{ id: uid(), at: now, agent: "marketing", title: `Idea drop — ${fresh.length} new idea${fresh.length > 1 ? "s" : ""}`, body: fresh.map((i) => i.title).join(" · "), kind: "idea", read: false, actionView: "marketing", actionLabel: "Review ideas" }] : [];
    commit({
      ...ref.current,
      ideas: [...fresh, ...ref.current.ideas],
      lastDropAt: now,
      dayKey: todayKey(),
      activity: [evt("marketing", fresh.length ? `Idea drop produced ${fresh.length} ideas (${fromLLM ? "reasoned by Claude/OpenAI" : "local inference"}).` : "Idea drop ran: pipeline healthy, no underperformers — nothing queued.", { engine: fromLLM ? (getStoredProvider() as "claude" | "openai") : "local", steps: ["Read stalled-lead count, live CTRs, open ops risks, and the FY25 seasonality doc from the shared store.", `Budgets capped at ₹${ref.current.settings.weeklyBudgetCap.toLocaleString("en-IN")}/week — proposals only, never committed.`], dataCited: [`${ref.current.leads.filter((l) => l.cold).length} cold leads`, ...ref.current.campaigns.filter((c) => c.flag).map((c) => c.name)] }), ...ref.current.activity],
      notices: [...notice, ...ref.current.notices],
    });
    if (fresh.length) toast(`Marketing queued ${fresh.length} idea${fresh.length > 1 ? "s" : ""} reasoned from live store data`, "marketing");
    return fresh.length
      ? `The drop is in: ${fresh.length} new idea${fresh.length > 1 ? "s" : ""} (${fromLLM ? "reasoned by your connected model" : "local inference"}), each citing live Sales/Ops numbers. Budgets stay under your ₹${ref.current.settings.weeklyBudgetCap.toLocaleString("en-IN")}/week cap — proposals only.`
      : "The drop ran: pipeline is healthy and no campaign is underperforming, so no new ideas were queued. I won't invent busywork.";
  };

  const approveIdea: SutrApi["approveIdea"] = (id) => {
    const S = ref.current;
    const idea = S.ideas.find((i) => i.id === id);
    if (!idea || idea.status !== "new") return;
    const slotDate = nextSlotDate(S);
    commit({
      ...S,
      ideas: S.ideas.map((i) => (i.id === id ? { ...i, status: "approved" } : i)),
      campaigns: [{ id: uid(), name: idea.title, channel: idea.channel, status: "planned", budget: idea.budgetMax, spent: 0, ctr: 0, leads: 0, converted: 0, startedAt: slotDate.toISOString() }, ...S.campaigns],
      calendar: [...S.calendar, { id: uid(), date: slotDate.toISOString(), label: idea.title, channel: idea.channel }].sort((a, b) => a.date.localeCompare(b.date)),
      activity: [evt("marketing", `You approved “${idea.title}” — brief created, calendar slot ${slotDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}.`, { engine: "local", steps: ["Approval is yours; the agent only proposed.", `Planned budget ₹${idea.budgetMax.toLocaleString("en-IN")} will not be committed without a second explicit approval in the ad platform.`], dataCited: [idea.title, `₹${idea.budgetMax.toLocaleString("en-IN")}`] }), ...S.activity],
    });
    toast(`“${idea.title}” approved — spend stays ₹0 until you commit`, "marketing");
  };

  const dismissIdea: SutrApi["dismissIdea"] = (id) => {
    const S = ref.current;
    const idea = S.ideas.find((i) => i.id === id);
    commit({ ...S, ideas: S.ideas.map((i) => (i.id === id ? { ...i, status: "dismissed" } : i)), activity: [evt("marketing", `You dismissed “${idea?.title ?? "an idea"}”. Similar ideas get weighted down next drop.`), ...S.activity] });
  };

  /* ================= Operations ================= */
  const runOpsScan: SutrApi["runOpsScan"] = () => {
    const S = ref.current;
    const result = runScan(S);
    const now = new Date().toISOString();
    const notices: Notice[] = result.newHigh.map((r) => ({ id: uid(), at: now, agent: "ops", title: `Escalated: ${r.title}`, body: r.why, kind: "alert", read: false, actionView: "ops", actionLabel: "See risk" }));
    commit({
      ...S,
      risks: result.risks,
      activity: [evt("ops", result.summary, result.newHigh.length ? { engine: "local", steps: ["High-severity risks bypass the daily digest — that's the escalation rule."], dataCited: result.newHigh.map((r) => r.title) } : undefined), ...S.activity],
      notices: [...notices, ...S.notices],
      lastTopic: "risk",
    });
    if (result.newHigh.length) toast(`Ops escalated ${result.newHigh.length} high-severity risk${result.newHigh.length > 1 ? "s" : ""} — see Operations`, "ops");
    else toast(result.summary, "ops");
    return { summary: result.summary };
  };

  const resolveRisk: SutrApi["resolveRisk"] = (id) => {
    const S = ref.current;
    const r = S.risks.find((x) => x.id === id);
    commit({ ...S, risks: S.risks.map((x) => (x.id === id ? { ...x, status: "resolved" } : x)), activity: [evt("ops", `You resolved “${r?.title ?? "a risk"}”. It stays in the register for the audit trail.`), ...S.activity] });
    toast("Risk resolved — register updated", "ops");
  };

  const addTask: SutrApi["addTask"] = (t) => {
    const S = ref.current;
    commit({ ...S, tasks: [{ id: uid(), title: t.title, owner: t.owner, due: new Date(Date.now() + t.dueDays * 86400000).toISOString(), status: "open", category: t.category, createdAt: new Date().toISOString() }, ...S.tasks], activity: [evt("ops", `Task added: “${t.title}” (due in ${t.dueDays}d). Ops will watch the deadline automatically.`), ...S.activity] });
    toast("Task added — Ops is already watching its deadline", "ops");
  };

  const toggleTask: SutrApi["toggleTask"] = (id) => {
    const S = ref.current;
    const t = S.tasks.find((x) => x.id === id);
    if (!t) return;
    commit({ ...S, tasks: S.tasks.map((x) => (x.id === id ? { ...x, status: x.status === "open" ? "done" : "open" } : x)), activity: [evt("ops", `Task “${t.title}” marked ${t.status === "open" ? "done" : "reopened"}.`), ...S.activity] });
  };

  const resolveTicket: SutrApi["resolveTicket"] = (id) => {
    const S = ref.current;
    const t = S.tickets.find((x) => x.id === id);
    const planner = S.leads.find((l) => l.id === t?.plannerId);
    commit({ ...S, tickets: S.tickets.map((x) => (x.id === id ? { ...x, status: "resolved" } : x)), activity: [evt("ops", `Ticket resolved for ${planner?.studio ?? "a planner"}: “${t?.subject}”. Churn-pattern watch on this account will re-evaluate on the next scan.`), ...S.activity] });
    toast("Ticket resolved — the churn watch re-evaluates on next scan", "ops");
  };

  const setVendor: SutrApi["setVendor"] = (id, status) => {
    const S = ref.current;
    const v = S.vendors.find((x) => x.id === id);
    commit({ ...S, vendors: S.vendors.map((x) => (x.id === id ? { ...x, status, lastCheckedAt: new Date().toISOString() } : x)), activity: [evt("ops", `Vendor ${v?.name ?? ""} status set to “${status}” (manual input). Downstream risk check queued.`), ...S.activity] });
    if (status !== "ok") toast(`${v?.name} marked ${status} — run a health check to see exposure`, "ops");
  };

  /* ================= Vault ================= */
  const uploadDocs: SutrApi["uploadDocs"] = (files) => {
    const S = ref.current;
    const now = new Date().toISOString();
    const docs = files.map((f) => {
      const meta = autoTag(f.name, f.content);
      return {
        id: uid(), name: f.name, type: meta.type, tags: meta.tags, person: meta.person, content: f.content,
        summary: meta.why, uploadedAt: now, size: f.size, expiresAt: meta.expiresAt,
        versions: [{ v: 1, at: now, name: f.name, note: "Original upload" }],
      };
    });
    commit({
      ...S,
      docs: [...docs, ...S.docs],
      activity: [...docs.map((d) => evt("vault" as AgentId, `Filed “${d.name}” — auto-tagged [${d.tags.slice(0, 4).join(", ")}].`, { engine: "local" as const, steps: [`Tagging reason: ${d.summary}`], dataCited: d.tags.slice(0, 4) })), ...S.activity],
    });
    toast(`${docs.length} document${docs.length > 1 ? "s" : ""} filed and auto-tagged — no folder tetris needed`, "vault");
  };

  const replaceDoc: SutrApi["replaceDoc"] = (id, file) => {
    const S = ref.current;
    const doc = S.docs.find((d) => d.id === id);
    if (!doc) return;
    const now = new Date().toISOString();
    const v = doc.versions.length + 1;
    commit({
      ...S,
      docs: S.docs.map((d) => (d.id === id ? { ...d, name: file.name, content: file.content, size: file.size, uploadedAt: now, versions: [...d.versions, { v, at: now, name: file.name, note: "Replaced — previous version kept in history" }] } : d)),
      activity: [evt("vault", `“${doc.name}” updated to v${v}. Full version history retained.`), ...S.activity],
    });
    toast(`Updated to v${v} — version history kept`, "vault");
  };

  /* ================= Shared infra ================= */
  const go: SutrApi["go"] = (v) => commit({ ...ref.current, view: v });
  const markRead: SutrApi["markRead"] = (id) => commit({ ...ref.current, notices: ref.current.notices.map((n) => (n.id === id ? { ...n, read: true } : n)) });
  const markAllRead: SutrApi["markAllRead"] = () => commit({ ...ref.current, notices: ref.current.notices.map((n) => ({ ...n, read: true })) });

  const updateSettings: SutrApi["updateSettings"] = (patch) => {
    const S = ref.current;
    commit({
      ...S,
      settings: { ...S.settings, ...patch },
      leads: patch.coldDays !== undefined ? markColdLeads(S.leads, patch.coldDays) : S.leads,
      activity: [evt("orchestrator", `Settings updated (${Object.keys(patch).join(", ")}). All agents read the new rules immediately from the shared store.`), ...S.activity],
    });
  };

  const connectGmail: SutrApi["connectGmail"] = (account) => {
    const S = ref.current;
    commit({ ...S, settings: { ...S.settings, gmailConnected: true, gmailAccount: account }, activity: [evt("orchestrator", `Gmail connected (sandbox): ${account}. Scopes: gmail.modify (drafts) + gmail.readonly (replies). No send scope.`, { engine: "local", steps: ["Tokens live server-side in production; the browser never sees them.", "The send scope is deliberately never requested."], dataCited: ["gmail.modify", "gmail.readonly"] }), ...S.activity] });
    toast("Gmail connected — drafts scope only. Sending stays yours.", "orchestrator");
  };
  const disconnectGmail: SutrApi["disconnectGmail"] = () => {
    const S = ref.current;
    commit({ ...S, settings: { ...S.settings, gmailConnected: false }, activity: [evt("orchestrator", "Gmail disconnected. Token revoked; drafts queue pauses until reconnected."), ...S.activity] });
  };

  /* ================= Reasoning engine ================= */
  const connectEngine: SutrApi["connectEngine"] = async (provider, key, model) => {
    saveProvider(provider);
    saveKey(key);
    commit({ ...ref.current, engine: { provider, model, status: "testing" } });
    try {
      await callLLM(provider, model, key, "You are Sutr's connectivity probe.", { check: "connectivity" }, "Reply with exactly one word: ready.");
      commit({ ...ref.current, engine: { provider, model, status: "ok" }, activity: [evt("orchestrator", `Reasoning engine connected: ${provider === "claude" ? "Claude" : "OpenAI"} (${model}). Key stored in this browser only; never rendered, never logged.`, { engine: provider, steps: ["Probe call succeeded.", "Every agent now retrieves store context → reasons with the model → returns grounded output with a visible trace."], dataCited: [model] }), ...ref.current.activity] });
      toast(`Connected — every agent now reasons with ${provider === "claude" ? "Claude" : "OpenAI"}`, "orchestrator");
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      commit({ ...ref.current, engine: { provider, model, status: "error", error: msg } });
      return false;
    }
  };

  const clearEngine: SutrApi["clearEngine"] = () => {
    saveKey("");
    commit({ ...ref.current, engine: { provider: "none", model: "claude-sonnet-4-6", status: "off" }, activity: [evt("orchestrator", "Reasoning key removed from this browser. Agents continue on transparent local inference."), ...ref.current.activity] });
    toast("Key removed — agents continue on local inference", "orchestrator");
  };

  const dismissGate: SutrApi["dismissGate"] = () => localStorage.setItem("sutr.gate.dismissed", "1");

  const checkDayRollover: SutrApi["checkDayRollover"] = () => {
    const S = ref.current;
    if (todayKey() === S.dayKey) return;
    commit({ ...S, leads: markColdLeads(S.leads, S.settings.coldDays), dayKey: todayKey() });
    if (new Date().getHours() >= 6) {
      void runMorningDrop();
      toast("New day — cold-lead rules re-applied and the 6 AM idea drop just ran", "orchestrator");
    }
  };

  const resetDemo: SutrApi["resetDemo"] = () => {
    localStorage.removeItem(LS_KEY);
    const fresh = seedState();
    const k = getStoredKey();
    if (k) fresh.engine = { provider: getStoredProvider(), model: getStoredProvider() === "openai" ? "gpt-4o" : "claude-sonnet-4-6", status: "ok" };
    commit(fresh);
    toast("Demo data reset to a fresh Sutr morning", "orchestrator");
  };

  const setChatOpen: SutrApi["setChatOpen"] = (open) => commit({ ...ref.current, chatOpen: open });

  const sendChat: SutrApi["sendChat"] = (text) => {
    const S = ref.current;
    commit({
      ...S,
      chat: [...S.chat, { id: uid(), from: "you", text, at: new Date().toISOString() }],
      chatOpen: true,
      typing: "orchestrator",
    });
    const wantsIdeas = /\b(idea|ideas|campaign|marketing|drop)\b/i.test(text) && /\b(new|more|generate|run|another|fresh|again)\b/i.test(text);
    window.setTimeout(async () => {
      const cur = ref.current;
      const api = {
        requestDraft: async () => undefined,
        runOpsScan: () => runOpsScan(),
        runMorningDrop: async () => "",
        markWon,
        go,
      };
      const route = routeCommand(text, cur, api);
      commit({
        ...ref.current,
        typing: null,
        lastTopic: route.topic || ref.current.lastTopic,
        chat: [...ref.current.chat, { id: uid(), from: "agent", agent: route.agent, text: route.reply, at: new Date().toISOString() }],
      });
      if (route.draftIntent) {
        commit({ ...ref.current, typing: "sales" });
        const draft = await requestDraft(route.draftIntent.leadId, route.draftIntent.kind);
        if (draft) {
          const lead = ref.current.leads.find((l) => l.id === route.draftIntent!.leadId);
          commit({
            ...ref.current,
            typing: null,
            chat: [...ref.current.chat, { id: uid(), from: "agent", agent: "sales", text: `Done — “${draft.subject}” is in your review queue for ${lead?.studio ?? "the planner"}.\n\n${draft.body.split("\n").slice(0, 3).join("\n")}…\n\nReasoned by ${draft.reasoning.engine === "local" ? "local inference" : draft.reasoning.engine === "claude" ? "Claude" : "OpenAI"} over their live record. Approve it in Sales — nothing sends without you.`, at: new Date().toISOString(), reasoning: draft.reasoning }],
          });
        } else {
          commit({ ...ref.current, typing: null });
        }
      } else if (wantsIdeas) {
        commit({ ...ref.current, typing: "marketing" });
        const summary = await runMorningDrop();
        commit({
          ...ref.current,
          typing: null,
          chat: [...ref.current.chat, { id: uid(), from: "agent", agent: "marketing", text: summary, at: new Date().toISOString() }],
        });
      }
    }, 700);
  };

  const value: SutrApi = {
    s: state, go, toast, setChatOpen, sendChat,
    requestDraft, approveDraft, markSent, logReply, markWon, markLost, addLead,
    runMorningDrop, approveIdea, dismissIdea,
    runOpsScan, resolveRisk, addTask, toggleTask, resolveTicket, setVendor,
    uploadDocs, replaceDoc, markRead, markAllRead,
    updateSettings, connectGmail, disconnectGmail,
    connectEngine, clearEngine, dismissGate, checkDayRollover, resetDemo,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { maskKey };
