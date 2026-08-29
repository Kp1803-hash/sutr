import type { AgentId, DraftKind, State, View } from "../lib/types";
import { daysSince, money } from "../lib/types";
import { pipelineStats } from "./sales";
import { healthScore } from "./ops";
import { searchDocs } from "./vault";
import { churnBlock, findLeadByName } from "../lib/local";

/**
 * Orchestrator — parses plain-language commands, routes them to the right
 * agent, and narrates the routing so nothing is a black box.
 */

export interface HostApi {
  requestDraft: (leadId: string, kind: DraftKind) => Promise<void>;
  runOpsScan: () => { summary: string };
  runMorningDrop: () => Promise<string>;
  markWon: (leadId: string) => void;
  go: (v: View) => void;
}

export interface RouteResult {
  agent: AgentId;
  reply: string;
  topic: string;
  draftIntent?: { leadId: string; kind: DraftKind };
}

const fmtReasoning = (steps: string[], cited: string[], engine: string) =>
  `${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nData cited: ${cited.slice(0, 5).join(" · ") || "—"}\n(engine: ${engine})`;

export function routeCommand(text: string, state: State, api: HostApi): RouteResult {
  const t = text.toLowerCase();

  /* ---- explainability: “why …?” ---- */
  if (/\bwhy\b|\bexplain\b|\breason\b|\bhow did\b/.test(t)) {
    if (/risk|flag|churn|riva|ops|vendor|escalat/.test(t) || state.lastTopic === "risk") {
      const top = state.risks.find((r) => r.status === "open" && r.severity === "high") ?? state.risks.find((r) => r.status === "open");
      if (top)
        return {
          agent: "ops",
          topic: "risk",
          reply: `Here's the actual reasoning behind “${top.title}”:\n\n${top.why}\n\nRecommended next step: ${top.recommendation}${top.reasoning ? `\n\n${fmtReasoning(top.reasoning.steps, top.reasoning.dataCited, top.reasoning.engine)}` : ""}`,
        };
    }
    if (/idea|campaign|drop|market/.test(t) || state.lastTopic === "idea") {
      const idea = state.ideas.find((i) => i.status === "new");
      if (idea)
        return {
          agent: "marketing",
          topic: "idea",
          reply: `The reasoning behind “${idea.title}”:\n\n${fmtReasoning(idea.reasoning.steps, idea.reasoning.dataCited, idea.reasoning.engine)}`,
        };
    }
    if (/draft|email|nudge|follow|sales/.test(t) || state.lastTopic === "draft") {
      const d = state.drafts.find((x) => x.status === "ready");
      if (d) {
        const lead = state.leads.find((l) => l.id === d.leadId);
        return {
          agent: "sales",
          topic: "draft",
          reply: `Why the ${d.kind} draft for ${lead?.studio ?? "that lead"} says what it says:\n\n${fmtReasoning(d.reasoning.steps, d.reasoning.dataCited, d.reasoning.engine)}`,
        };
      }
    }
    if (/tag|doc|file|vault/.test(t)) {
      const doc = state.docs[0];
      return {
        agent: "vault",
        topic: "doc",
        reply: `Every Vault tag records its reason. Example — “${doc.name}”:\n\n${doc.summary}\n\nTags come from the extracted text layer, never just the filename.`,
      };
    }
    return {
      agent: "orchestrator",
      topic: state.lastTopic,
      reply: "I can show the reasoning behind any decision. Point me at one:\n• “Why is Riva at churn risk?”\n• “Why that marketing idea?”\n• “Why did Sales phrase the draft that way?”\n• “Why was that document tagged that way?”",
    };
  }

  /* ---- vault retrieval ---- */
  if (/\b(pull|find|get|fetch|search|show|where|retrieve)\b/.test(t) && /\b(doc|document|agreement|contract|invoice|license|nda|file|pdf|survey|guideline|deck|spec|research|tear|mou|pitch)s?\b/.test(t)) {
    const hits = searchDocs(text, state.docs);
    if (hits.length === 0)
      return {
        agent: "vault",
        topic: "doc",
        reply: "I searched every document's name, tags, extracted text, parties, and dates — nothing matched, and I won't guess. Try a party (“Bloom & Baroque”), a type (“pitch”), or a subject (“Meragi”).",
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
      reply: `The Vault holds ${state.docs.length} documents — contracts, the pitch deck, market research, the MVP spec — auto-tagged and searchable by content. ${state.docs.filter((d) => d.expiresAt).length} carry expiry dates; I sweep them nightly. Try: “pull up the Meragi tear-down”.`,
    };
  }

  /* ---- sales actions ---- */
  if (/\b(draft|follow ?up|follow-up|nudge|outreach|reach out|email)\b/.test(t)) {
    const lead = findLeadByName(state.leads, t);
    if (!lead)
      return {
        agent: "sales",
        topic: "draft",
        reply: "Which planner? I can see: " + state.leads.filter((l) => ["new", "contacted", "followup"].includes(l.stage)).map((l) => l.studio).join(", ") + ".",
      };
    const block = churnBlock(lead, state);
    if (block.blocked)
      return {
        agent: "sales",
        topic: "draft",
        reply: `I'm holding this one, deliberately. Ops has an open high-severity flag on ${lead.studio} (“${block.reason}”) and the shared store says outreach to a struggling account right now risks the relationship.\n\nFix the ticket first — then I'll draft the follow-up with genuinely good news in it.`,
      };
    const kind: DraftKind = lead.stage === "new" ? "outreach" : lead.cold ? "nudge" : "followup";
    return {
      agent: "sales",
      topic: "draft",
      draftIntent: { leadId: lead.id, kind },
      reply: `Routing to Sales — drafting a ${kind} for ${lead.studio}. The agent is reading their full record (city, volume, current tooling, your tone sample) before writing a word. You'll approve it before anything touches Gmail.`,
    };
  }

  if (/\b(mark|close)\b/.test(t) && /\bwon\b/.test(t)) {
    const lead = findLeadByName(state.leads, t);
    if (lead && lead.stage !== "won") {
      api.markWon(lead.id);
      return {
        agent: "orchestrator",
        topic: "deal",
        reply: `${lead.studio} marked Won (${lead.tierSuggestion}, ${money(lead.suggestedPrice)}/event). I routed the event across the crew: Operations created the onboarding task, the Vault filed the signed agreement, and Marketing credited the source. Watch the Activity log — the shared store doing its job.`,
      };
    }
    return { agent: "orchestrator", topic: "deal", reply: "Tell me which planner to close, e.g. “mark Aarav Weddings as won”." };
  }

  /* ---- ops ---- */
  if (/\b(ops|operations|health|scan|risk|deadline|bottleneck|vendor|onboard|ticket|churn)\b/.test(t)) {
    const res = api.runOpsScan();
    const open = state.risks.filter((r) => r.status === "open");
    return {
      agent: "ops",
      topic: "risk",
      reply: `${res.summary}\n\n${open.length ? `Open register:\n${open.slice(0, 3).map((r) => `• [${r.severity}] ${r.title}`).join("\n")}\n\nEvery flag traces to specific store records — open one in the Operations view to see the data trail.` : "The register is clear."}`,
    };
  }

  /* ---- marketing ---- */
  if (/\b(idea|ideas|campaign|marketing|brief|content|drop)\b/.test(t)) {
    if (/\b(new|more|generate|run|another|fresh|again)\b/.test(t)) {
      void api.runMorningDrop();
      return {
        agent: "marketing",
        topic: "idea",
        reply: "Running the 6 AM routine now — Marketing is reading stalled leads, campaign CTRs, open ops risks, and the stored seasonality research, then reasoning out 2–3 ideas. They'll land in the Marketing view (and here) in a moment.",
      };
    }
    const fresh = state.ideas.filter((i) => i.status === "new");
    return {
      agent: "marketing",
      topic: "idea",
      reply: fresh.length
        ? `${fresh.length} unreviewed idea${fresh.length > 1 ? "s" : ""} from the drop:\n\n${fresh.map((i) => `• ${i.title} — ${i.channel}`).join("\n")}\n\nEach cites the store data behind it. Ask “why that idea?” for the full reasoning.`
        : "The drop queue is empty. Say “generate new ideas” and I'll run the 6 AM routine on demand.",
    };
  }

  /* ---- status / summary ---- */
  if (/\b(status|summary|pipeline|brief|morning|today|overview|numbers|digest)\b/.test(t)) {
    const p = pipelineStats(state);
    const cold = state.leads.filter((l) => l.cold);
    const openRisks = state.risks.filter((r) => r.status === "open");
    return {
      agent: "orchestrator",
      topic: "status",
      reply: `Across all four agents right now:\n\n• Sales: ${p.openCount} open planners worth ~${money(p.openValue)}/event · win rate ${p.winRate}% · ${p.draftsReady} drafts awaiting you · ${p.coldCount} cold\n• Marketing: ${state.ideas.filter((i) => i.status === "new").length} ideas waiting · ${state.campaigns.filter((c) => c.status === "live").length} campaigns live, ${state.campaigns.filter((c) => c.flag).length} flagged\n• Ops: health ${healthScore(state)}/100 with ${openRisks.length} open risk${openRisks.length === 1 ? "" : "s"}${openRisks[0] ? ` — top: ${openRisks[0].title}` : ""}\n• Vault: ${state.docs.length} documents, ${state.docs.filter((d) => d.expiresAt).length} expiry-tracked${cold.length ? `\n\nCold planners to nudge: ${cold.map((l) => l.studio).join(", ")}.` : ""}`,
    };
  }

  if (/\b(cold|stale|stuck|stall)\b/.test(t)) {
    const cold = state.leads.filter((l) => l.cold && l.stage !== "lost" && l.stage !== "won");
    return {
      agent: "sales",
      topic: "draft",
      reply: cold.length
        ? `${cold.length} planner${cold.length > 1 ? "s" : ""} past your ${state.settings.coldDays}-day threshold: ${cold.map((l) => `${l.studio} (${daysSince(l.lastTouchAt)}d)`).join(", ")}.\n\nSay “draft a nudge for ${cold[0].studio.split(" ")[0]}” and Sales will reason one up for your approval.`
        : `Nothing is cold right now — every open lead has been touched within ${state.settings.coldDays} days.`,
    };
  }

  if (/\b(help|what can|how do|menu)\b/.test(t)) {
    return {
      agent: "orchestrator",
      topic: "help",
      reply:
        "I route plain-language commands to your four agents, and every one of them shows its reasoning. Try:\n\n• “Draft a follow-up for Aarav” → Sales (you approve before anything touches Gmail)\n• “Why is Riva at churn risk?” → the responsible agent shows its data trail\n• “Run an ops health check” → Operations scans onboarding, tickets, vendors, event timeline\n• “Pull up the Meragi tear-down” → Vault searches content, not just filenames\n• “Give me a status summary” → numbers from all four agents\n• “Mark Aarav as won” → closes the deal and triggers the cross-agent handoff",
    };
  }

  return {
    agent: "orchestrator",
    topic: "help",
    reply: "I didn't catch a clear intent — and I'd rather say so than guess. Try “status summary”, “run an ops health check”, “draft a follow-up for Knot & Bloom”, or “pull up the pitch deck”.",
  };
}
