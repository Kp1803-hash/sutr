import type { Idea, State } from "../lib/types";
import { uid } from "../lib/types";
import type { IdeaSeed } from "../lib/local";

/**
 * Marketing Agent — campaigns, briefs, and the 6:00 AM idea drop.
 * Reasoning happens in lib/llm (Claude/OpenAI) or lib/local (fallback);
 * this module assembles results and watches live performance.
 * Hard rule: it proposes budgets. It never commits spend.
 */

export function assembleIdeas(seeds: IdeaSeed[]): Idea[] {
  const now = new Date().toISOString();
  return seeds.map((s) => ({ ...s, id: uid(), createdAt: now, status: "new" as const }));
}

export function findUnderperformers(state: State) {
  return state.campaigns.filter((c) => c.status === "live" && c.ctr > 0 && c.ctr < 1.5);
}

/** Next open weekday slot for the content calendar. */
export function nextSlotDate(state: State, offset = 0): Date {
  const taken = new Set(state.calendar.map((c) => new Date(c.date).toDateString()));
  let added = 0;
  for (let i = 1; i < 30; i++) {
    const cand = new Date(Date.now() + i * 86400000);
    const day = cand.getDay();
    if (day === 0 || day === 6) continue;
    if (taken.has(cand.toDateString())) continue;
    if (added === offset) return cand;
    added++;
  }
  return new Date(Date.now() + 7 * 86400000);
}
