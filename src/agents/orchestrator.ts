import type { AgentId, Lead, State } from "../lib/types";
import { daysSince, money } from "../lib/types";
import { pipelineStats } from "./sales";
import { searchDocs } from "./vault";

/**
 * Orchestrator — parses plain-language commands, routes them to the right
 * agent, and narrates the routing so nothing is a black box.
 * The host store passes an `api` of side-effectful actions.
 */

export interface HostApi {
  requestDraft: (leadId: string, kind: "outreach" | "followup" | "nudge") => void;
  runOpsScan: () => { summary: string };
  runMorningDrop: () => string;
  markWon: (leadId: string) => void;
  go: (view: State["view"]) => void;
}

export interface RouteResult {
  agent: AgentId;
  reply: string;
  topic: string;
}

const findLead = (leads: Lead[], text: string): Lead | undefined => {
  const t = text.toLowerCase();
  return leads.find(
    (l) => t.includes(l.company.toLowerCase()) || l.company.toLowerCase().split(/\s+/).some((w) => w.length > 4 && t.includes(w))
  );
};

export function routeCommand(text: string, state: State, api: HostApi): RouteResult {
  const t = text.toLowerCase();

  /* ---- explainability: “why …?” ---- */
  if (/\bwhy\b|\bexplain\b|\breason\b/.test(t)) {
    if (/risk|flag|install|maple|ops/.test(t) || state.lastTopic === "risk") {
      const top = state.risks.find((r) => r.status === "open" && r.severity === "high") ?? state.risks.find((r) => r.status === "open");
      if (top)
        return {
          agent: "ops",
          topic: "risk",
          reply: `Because of this — “${top.title}”:\n\n${top.why}\n\nRecommended next step: ${top.recommendation}`,
        };
    }
    if (/idea|campaign|drop|market/.test(t) || state.lastTopic === "idea") {
      const idea = state.ideas.find((i) => i.status === "new");
      if (idea)
        return {
          agent: "marketing",
          topic: "idea",
          reply: `Here's the reasoning behind “${idea.title}”:\n\n${idea.why}`,
        };
    }
    if (/draft|email|nudge|follow/.test(t) || state.lastTopic === "draft") {
      const d = state.drafts.find((x) => x.status === "ready");
      if (d) {
        const lead = state.leads.find((l) => l.id === d.leadId);
        return {
          agent: "sales",
          topic: "draft",
          reply: `The ${lead?.company ?? "lead"} draft (${d.kind}) was written because:\n\n${d.why}`,
        };
      }
    }
    if (/tag|doc|file|vault/.test(t)) {
      const doc = state.docs[0];
      return {
        agent: "vault",
        topic: "doc",
        reply: `Every Vault tag records its reason. Example — “${doc.name}”:\n\n${doc.autoFiled ?? "Auto-tagged from document text"}: matched keywords in the extracted text, not just the filename.`,
      };
    }
    return {
      agent: "orchestrator",
      topic: state.lastTopic,
      reply: "I can explain any decision. Point me at one:\n• “Why did Ops flag that risk?”\n• “Why that marketing idea?”\n• “Why did Sales draft that email?”\n• “Why was that document tagged that way?”",
    };
  }

  /* ---- vault retrieval ---- */
  if (/\b(pull|find|get|fetch|search|show|where|retrieve)\b/.test(t) && /\b(doc|document|agreement|contract|invoice|license|nda|file|pdf|survey|guideline)s?\b/.test(t)) {
    const hits = searchDocs(text, state.docs);
    if (hits.length === 0)
      return {
        agent: "vault",
        topic: "doc",
        reply: "I searched every document's name, tags, extracted text, parties, and dates — nothing matched. Try a party name (“VoltEdge”), a type (“license”), or a month.",
      };
    const lines = hits
      .map((h, i) => `${i + 1}. ${h.doc.name}\n   ${h.reason}${h.doc.expiresAt ? ` · expires ${new Date(h.doc.expiresAt).toLocaleDateString()}` : ""}`)
      .join("\n");
    return {
      agent: "vault",
      topic: "doc",
      reply: `Found ${hits.length} match${hits.length > 1 ? "es" : ""} by searching extracted content, not just filenames:\n\n${lines}\n\nFull details are in the Vault view.`,
    };
  }
  if (/\bvault\b/.test(t)) {
    return {
      agent: "vault",
      topic: "doc",
      reply: `The Vault holds ${state.docs.length} documents, auto-tagged and searchable by content. ${state.docs.filter((d) => d.expiresAt).length} carry expiry dates — I watch them nightly. Try: “pull up the VoltEdge agreement”.`,
    };
  }

  /* ---- sales actions ---- */
  if (/\b(draft|follow ?up|follow-up|nudge|email|outreach|reach out)\b/.test(t)) {
    const lead = findLead(state.leads, t);
    if (!lead)
      return {
        agent: "sales",
        topic: "draft",
        reply: "Which lead? I can see: " + state.leads.filter((l) => ["new", "contacted", "followup"].includes(l.stage)).map((l) => l.company).join(", ") + ".",
      };
    const kind = lead.stage === "new" ? "outreach" : lead.cold ? "nudge" : "followup";
    api.requestDraft(lead.id, kind);
    return {
      agent: "sales",
      topic: "draft",
      reply: `Done — a ${kind} draft for ${lead.company} is in your review queue. It uses your tone profile and references their latest note. Nothing sends until you approve it in the Sales view.`,
    };
  }

  if (/\b(mark|close).*\b(won|closed|deal)\b|\bwon\b.*\b(mark|close)\b/.test(t) || (/^(mark|close)\b/.test(t) && /\bwon\b/.test(t))) {
    const lead = findLead(state.leads, t);
    if (lead && lead.stage !== "won") {
      api.markWon(lead.id);
      return {
        agent: "orchestrator",
        topic: "deal",
        reply: `${lead.company} marked Won (${money(lead.value)}). I routed the event across the crew: Operations created an onboarding task, the Vault filed the agreement, and Marketing credited the source campaign. Watch the Activity log — that's the whole point of the shared store.`,
      };
    }
    return { agent: "orchestrator", topic: "deal", reply: "Tell me which lead to close, e.g. “mark Bluebird Dental as won”." };
  }

  /* ---- ops ---- */
  if (/\b(ops|operations|health|scan|risk|deadline|bottleneck|vendor)\b/.test(t)) {
    const res = api.runOpsScan();
    const open = state.risks.filter((r) => r.status === "open").length;
    return {
      agent: "ops",
      topic: "risk",
      reply: `${res.summary}\n\n${open ? `Open register: ${state.risks.filter((r) => r.status === "open").slice(0, 3).map((r) => `• [${r.severity}] ${r.title}`).join("\n")}\n\nFull detail + recommendations are in the Operations view.` : "The register is clear."}`,
    };
  }

  /* ---- marketing ---- */
  if (/\b(idea|ideas|campaign|marketing|brief|content)\b/.test(t)) {
    if (/\b(new|more|generate|run|drop|another|fresh)\b/.test(t)) {
      const summary = api.runMorningDrop();
      return { agent: "marketing", topic: "idea", reply: summary + "\n\nReview them in the Marketing view — approve and I'll slot them into the content calendar." };
    }
    const fresh = state.ideas.filter((i) => i.status === "new");
    return {
      agent: "marketing",
      topic: "idea",
      reply: fresh.length
        ? `You have ${fresh.length} unreviewed idea${fresh.length > 1 ? "s" : ""} from the 6 AM drop:\n\n${fresh.map((i) => `• ${i.title} — ${i.channel}`).join("\n")}\n\nEach one cites the Sales/Ops data behind it. Ask “why that idea?” for the reasoning.`
        : "The drop queue is empty. Say “generate new ideas” and I'll run the 6 AM routine right now.",
    };
  }

  /* ---- status / summary ---- */
  if (/\b(status|summary|pipeline|brief|morning|today|overview|numbers)\b/.test(t)) {
    const p = pipelineStats(state);
    const cold = state.leads.filter((l) => l.cold);
    return {
      agent: "orchestrator",
      topic: "status",
      reply: `Here's the picture across all four agents:\n\n• Sales: ${p.openCount} open leads worth ${money(p.openValue)} · win rate ${p.winRate}% · ${p.draftsReady} drafts awaiting you · ${p.coldCount} cold\n• Marketing: ${state.ideas.filter((i) => i.status === "new").length} ideas waiting, ${state.campaigns.filter((c) => c.status === "live").length} campaigns live\n• Ops: health ${res(state)} with ${state.risks.filter((r) => r.status === "open").length} open risks\n• Vault: ${state.docs.length} documents, ${state.docs.filter((d) => d.expiresAt && daysSince(d.uploadedAt) >= 0).length} expiry-tracked${cold.length ? `\n\nCold leads to nudge: ${cold.map((l) => l.company).join(", ")}.` : ""}`,
    };
  }

  if (/\b(cold|stale|stuck|stall)\b/.test(t)) {
    const cold = state.leads.filter((l) => l.cold && l.stage !== "lost" && l.stage !== "won");
    return {
      agent: "sales",
      topic: "draft",
      reply: cold.length
        ? `${cold.length} lead${cold.length > 1 ? "s" : ""} past your ${state.settings.coldDays}-day threshold: ${cold.map((l) => `${l.company} (${daysSince(l.lastTouchAt)}d)`).join(", ")}.\n\nSay “draft a nudge for ${cold[0].company.split(" ")[0]}” and I'll queue one for your approval.`
        : `Nothing is cold right now — every open lead has been touched within ${state.settings.coldDays} days.`,
    };
  }

  if (/\b(help|what can|how do|menu)\b/.test(t)) {
    return {
      agent: "orchestrator",
      topic: "help",
      reply:
        "I route plain-language commands to your four agents. Things I do every day:\n\n• “Draft a follow-up for {company}” → Sales (you approve before anything touches Gmail)\n• “Why is {thing} flagged?” → the responsible agent explains itself\n• “Run an ops health check” → Operations scans tasks, vendors, deals\n• “Pull up the {document}” → Vault searches content, not just filenames\n• “Give me a status summary” → numbers from all four agents\n• “Mark {company} as won” → closes the deal and triggers the cross-agent handoff",
    };
  }

  return {
    agent: "orchestrator",
    topic: "help",
    reply: "I didn't catch a clear intent — I'd rather tell you than guess. Try “status summary”, “run an ops health check”, “draft a follow-up for Kite Fitness”, or “pull up the VoltEdge agreement”.",
  };
}

const res = (state: State) => {
  const open = state.risks.filter((r) => r.status === "open");
  const score = Math.max(
    20,
    100 - open.reduce((a, r) => a + (r.severity === "high" ? 18 : r.severity === "medium" ? 9 : 4), 0)
  );
  return `${score}/100`;
};
