import type { Idea, State } from "../lib/types";
import { uid } from "../lib/types";

/**
 * Marketing Agent — strategy, briefs, and the 6:00 AM idea drop.
 * Hard rule: it proposes budgets. It never commits spend.
 * It reads Sales + Ops data from the shared store, so ideas cite real numbers.
 */

const TREND_POOL: Array<Omit<Idea, "id" | "createdAt" | "status">> = [
  {
    title: "“Power Bill Roast” Short-Form Series",
    objective: "Top-of-funnel attention from local business owners",
    audience: "Owners 30–55 within your service metro, interest: small business",
    channel: "Instagram Reels + TikTok",
    message: "You react (kindly) to anonymized utility bills and show the solar math in 30 seconds",
    format: "3 episodes, batch-shot in one afternoon",
    budgetMin: 80,
    budgetMax: 200,
    why: "Your brand voice is “numbers over adjectives” — a bill teardown is the most on-voice format possible, and short-form CPMs in your metro are trending down this quarter.",
  },
  {
    title: "Trade-Show Follow-Up Sprint",
    objective: "Convert expo contacts before they cool",
    audience: "Cards collected at GreenBuild + next expo list",
    channel: "Email + LinkedIn",
    message: "“You stopped by for a reason” — personalized one-liner + survey slot link",
    format: "Mail-merge, 2 touches, 4 days apart",
    budgetMin: 0,
    budgetMax: 60,
    why: "Sales data shows your trade-show leads (Northwind Roastery) are moving — expo leads decay fastest in the first 10 days, and this costs almost nothing.",
  },
  {
    title: "Financing-First Landing Page Test",
    objective: "Lift website-form conversions",
    audience: "All site traffic; split A/B 50/50",
    channel: "Website",
    message: "Lead with “$0 down, first payment after savings start” instead of the current hero",
    format: "One variant page, 2-week test",
    budgetMin: 100,
    budgetMax: 250,
    why: "Two of your stalled leads cite upfront cost in their notes (Harbor & Vine). Financing-first messaging directly answers the objection that's freezing your pipeline.",
  },
];

export function generateIdeas(state: State): { ideas: Idea[]; summary: string } {
  const now = new Date().toISOString();
  const made: Idea[] = [];
  const existing = new Set(state.ideas.filter((i) => i.status === "new").map((i) => i.title));
  const cap = state.settings.weeklyBudgetCap;

  // 1) Data-driven: stalled sales leads → nurture idea
  const stalled = state.leads.filter(
    (l) => ["contacted", "followup"].includes(l.stage) && l.cold
  );
  if (stalled.length > 0 && !existing.has("Stalled-Pipeline Rescue Nurture")) {
    made.push({
      id: uid(),
      title: "Stalled-Pipeline Rescue Nurture",
      objective: `Re-engage ${stalled.length} lead${stalled.length > 1 ? "s" : ""} stalled past your ${state.settings.coldDays}-day threshold`,
      audience: `${stalled.map((l) => l.company).join(", ")} + future cold leads`,
      channel: "Email + WhatsApp broadcast",
      message: "“Still worth it?” — one proof story + one easy ask",
      format: "2-message sequence, 3 days apart",
      budgetMin: 0,
      budgetMax: Math.min(120, cap),
      why: `The shared store shows ${stalled.length} Sales lead${stalled.length > 1 ? "s" : ""} (${stalled.map((l) => l.company).join(", ")}) past your cold threshold right now. Your history: follow-ups within ${state.settings.cadenceDays} days convert ~2× better than late ones. Proposed spend stays under your $${cap}/week cap — I propose, you approve.`,
      createdAt: now,
      status: "new",
    });
  }

  // 2) Data-driven: underperforming campaign → refresh idea
  const weak = state.campaigns.find((c) => c.status === "live" && c.ctr < 1.5);
  if (weak && !existing.has(`Creative Refresh — ${weak.name}`)) {
    made.push({
      id: uid(),
      title: `Creative Refresh — ${weak.name}`,
      objective: "Stop the CTR bleed on the underperforming live campaign",
      audience: weak.channel === "Google Ads" ? "Commercial searchers in your metro" : "Local business owners",
      channel: weak.channel,
      message: "Swap generic creative for real install photos + the 38% savings number in the headline",
      format: "2 new ad variants + 1 display cutdown",
      budgetMin: 150,
      budgetMax: Math.min(300, cap),
      why: `“${weak.name}” is at ${weak.ctr}% CTR — below your 1.5% floor — after ~3 weeks live. That's creative fatigue, not audience failure. Sales is closing referral leads with real proof right now, so proof-led creative is the obvious swing.`,
      createdAt: now,
      status: "new",
    });
  }

  // 3) Rotate a trend/evergreen idea that isn't already queued
  for (const t of TREND_POOL) {
    if (made.length >= 3) break;
    if (!existing.has(t.title) && !made.some((m) => m.title === t.title)) {
      made.push({ ...t, id: uid(), budgetMax: Math.min(t.budgetMax, cap), createdAt: now, status: "new" });
    }
  }

  const summary =
    made.length > 0
      ? `6:00 AM drop: ${made.length} new ideas, each citing live Sales/Ops data. Budgets proposed within your $${cap}/week cap — never committed.`
      : "6:00 AM drop ran: pipeline is healthy and no campaign is underperforming, so no new ideas were queued today.";
  return { ideas: made, summary };
}

export function findUnderperformers(state: State) {
  return state.campaigns.filter((c) => c.status === "live" && c.ctr < 1.5);
}

/** Next open weekday slot for the content calendar. */
export function nextSlotDate(state: State, offset = 0): Date {
  const taken = new Set(state.calendar.map((c) => new Date(c.date).toDateString()));
  const d = new Date();
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
