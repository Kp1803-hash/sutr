import type { Lead, State } from "../lib/types";
import { daysSince } from "../lib/types";

/**
 * Sales Agent — finds planners, reasons about fit, drafts (never sends).
 * Qualification + drafting live in lib/local (local inference) and lib/llm
 * (Claude/OpenAI) — both read the same shared-store context.
 */

export { fitLead, localDraft, churnBlock, nextActionFor } from "../lib/local";

export const stageLabel: Record<Lead["stage"], string> = {
  new: "New",
  contacted: "Contacted",
  followup: "Follow-up",
  won: "Won",
  lost: "Lost",
};

export const markColdLeads = (leads: Lead[], coldDays: number): Lead[] =>
  leads.map((l) =>
    l.stage === "won" || l.stage === "lost" ? l : { ...l, cold: daysSince(l.lastTouchAt) >= coldDays }
  );

export function pipelineStats(state: State) {
  const open = state.leads.filter((l) => l.stage !== "won" && l.stage !== "lost");
  const won = state.leads.filter((l) => l.stage === "won").length;
  const lost = state.leads.filter((l) => l.stage === "lost").length;
  return {
    openCount: open.length,
    openValue: open.reduce((a, l) => a + l.suggestedPrice, 0),
    winRate: won + lost === 0 ? 0 : Math.round((won / (won + lost)) * 100),
    draftsReady: state.drafts.filter((d) => d.status === "ready").length,
    coldCount: open.filter((l) => l.cold).length,
  };
}
