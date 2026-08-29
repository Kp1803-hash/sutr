/* LLM reasoning layer — every function follows the same contract:
   1. retrieve relevant slices of the shared context store
   2. reason with Claude (preferred) or OpenAI, under the grounding contract
   3. return structured output + the reasoning trace (steps + cited data)
   Falls back to the local inference engine when no key is configured. */

import { callLLM, extractCitations, getStoredKey, getStoredProvider, makeReasoning, parseSteps } from "./engine";
import type { Campaign, DraftKind, Idea, Lead, Reasoning, State } from "./types";
import { EVENT, SEASON, money } from "./types";
import { localDraft, localIdeas, localUnderperformer, type IdeaSeed } from "./local";

const SYS = (agent: string) =>
  `You are Sutr's ${agent} agent. Sutr is an AI wedding-logistics platform sold B2B to Indian wedding planners (the planner is the customer, not the couple). ` +
  `Per-event pricing tiers: Sage ₹9K (≤10 events/yr), Marigold ₹15K (11–25), Royal ₹25K (26–50), Sovereign ₹40K+ (50+). ` +
  `Competitors: Meragi, WedMeGood. Brand: deep plum & gold, tagline "every thread, connected" — warm, specific, senior-planner voice. ` +
  `Current market context: ${SEASON.insight} Flagship client event in the platform: ${EVENT.couple} at ${EVENT.venue}.`;

const hasKey = () => getStoredKey().length > 10;
export const activeEngine = (): "claude" | "openai" | "local" => (hasKey() ? getStoredProvider() : "local");

function compactState(s: State) {
  return {
    leads: s.leads.map((l) => ({ studio: l.studio, planner: l.planner, city: l.city, eventsPerYear: l.eventsPerYear, usesTool: l.usesTool, stage: l.stage, tier: l.tierSuggestion, price: l.suggestedPrice, touches: l.touches, daysSinceTouch: Math.max(0, Math.floor((Date.now() - +new Date(l.lastTouchAt)) / 86400000)), cold: l.cold, notes: l.notes })),
    campaigns: s.campaigns.map((c) => ({ name: c.name, channel: c.channel, status: c.status, budget: c.budget, spent: c.spent, ctr: c.ctr, leads: c.leads, converted: c.converted })),
    openRisks: s.risks.filter((r) => r.status === "open").map((r) => ({ title: r.title, severity: r.severity, category: r.category })),
    openTasks: s.tasks.filter((t) => t.status === "open").map((t) => ({ title: t.title, owner: t.owner, category: t.category, dueInDays: Math.ceil((+new Date(t.due) - Date.now()) / 86400000) })),
    openTickets: s.tickets.filter((t) => t.status === "open").map((t) => ({ subject: t.subject, openDays: Math.floor((Date.now() - +new Date(t.openedAt)) / 86400000) })),
    settings: { coldDays: s.settings.coldDays, cadenceDays: s.settings.cadenceDays, weeklyBudgetCap: s.settings.weeklyBudgetCap, tone: s.settings.toneSample, brandVoice: s.settings.brandVoice },
    season: SEASON,
    storedResearch: s.docs.filter((d) => d.type === "research").map((d) => ({ name: d.name, excerpt: d.content.slice(0, 240) })),
  };
}

/* ---------------- Sales: reasoned draft ---------------- */
export async function llmDraft(lead: Lead, state: State, kind: DraftKind): Promise<{ subject: string; body: string; reasoning: Reasoning }> {
  if (!hasKey()) return localDraft(lead, state, kind);
  const provider = getStoredProvider();
  const context = {
    lead: { studio: lead.studio, planner: lead.planner, city: lead.city, eventsPerYear: lead.eventsPerYear, usesTool: lead.usesTool, tier: lead.tierSuggestion, suggestedPrice: lead.suggestedPrice, stage: lead.stage, touches: lead.touches, notes: lead.notes, cold: lead.cold },
    ownerName: state.settings.ownerName,
    toneSample: state.settings.toneSample,
    season: SEASON,
    recentPipeline: compactState(state).leads.slice(0, 5),
  };
  const task =
    `Write ONE ${kind} email from ${state.settings.ownerName} (Sutr) to ${lead.planner} of ${lead.studio}.` +
    (kind === "outreach"
      ? ` This is first contact. Reason about their specific situation — city, event volume, current tooling — and why ${lead.tierSuggestion} (${money(lead.suggestedPrice)}/event) is the right tier to mention.`
      : kind === "followup"
        ? ` They have had ${lead.touches} touch(es) with no reply. Give the email new substance tied to their actual situation — never a bare "just checking in".`
        : ` This lead has gone cold. One honest, concrete hook tied to their data; give them an easy exit. This is the last touch before deprioritizing.`) +
    `\nReturn EXACTLY this format:\nSubject: <line>\n\n<body — 4 to 7 short lines, no markdown>`;
  const res = await callLLM(provider, state.engine.model || "claude-sonnet-4-6", getStoredKey(), SYS("Sales"), context, task);
  const m = res.text.match(/^Subject:\s*(.+)$/im);
  const subject = (m?.[1] ?? `${lead.studio} + Sutr`).trim();
  const body = res.text.replace(/^Subject:.*$/im, "").trim();
  return {
    subject,
    body,
    reasoning: makeReasoning(
      provider,
      res.steps.length ? res.steps : parseSteps(res.text),
      extractCitations(res.text + subject, context),
      res.tokens,
      res.ms
    ),
  };
}

/* ---------------- Marketing: reasoned idea drop ---------------- */
export async function llmIdeas(state: State): Promise<{ seeds: IdeaSeed[]; fromLLM: boolean }> {
  if (!hasKey()) return { seeds: localIdeas(state), fromLLM: false };
  const provider = getStoredProvider();
  const context = compactState(state);
  const task =
    `Generate exactly 3 campaign/content ideas for Sutr aimed at wedding planners for THIS week. Each idea must reason from the live data: ` +
    `stalled leads, underperforming campaigns, open ops risks, the Nov–Feb seasonality, and competitive moves by Meragi/WedMeGood evident in stored research. ` +
    `Budgets must stay within ₹${state.settings.weeklyBudgetCap}/week and are PROPOSALS only. Vary the channels — do not default everything to Instagram. ` +
    `Return ONLY a JSON array of 3 objects with keys: title, objective, audience, channel, message, format, seasonality, budgetMin (number), budgetMax (number), why (string, 2-3 sentences citing specific data).`;
  const res = await callLLM(provider, state.engine.model || "claude-sonnet-4-6", getStoredKey(), SYS("Marketing"), context, task);
  const start = res.text.indexOf("[");
  const end = res.text.lastIndexOf("]");
  if (start < 0 || end < 0) throw new Error("Marketing returned no parseable idea list.");
  const arr = JSON.parse(res.text.slice(start, end + 1)) as Array<Record<string, unknown>>;
  const seeds: IdeaSeed[] = arr.slice(0, 3).map((o) => ({
    title: String(o.title ?? "Untitled idea"),
    objective: String(o.objective ?? ""),
    audience: String(o.audience ?? ""),
    channel: String(o.channel ?? ""),
    message: String(o.message ?? ""),
    format: String(o.format ?? ""),
    seasonality: String(o.seasonality ?? SEASON.window),
    budgetMin: Number(o.budgetMin ?? 0),
    budgetMax: Math.min(Number(o.budgetMax ?? 0), state.settings.weeklyBudgetCap),
    reasoning: makeReasoning(
      provider,
      res.steps.length ? res.steps : parseSteps(String(o.why ?? "")),
      extractCitations(String(o.title) + " " + String(o.why ?? ""), context),
      res.tokens,
      res.ms
    ),
  }));
  if (seeds.length === 0) throw new Error("Marketing returned zero ideas.");
  return { seeds, fromLLM: true };
}

/* ---------------- Marketing: reasoned underperformer diagnosis ---------------- */
export async function llmUnderperformer(c: Campaign, state: State): Promise<{ why: string; fix: string; reasoning: Reasoning }> {
  if (!hasKey()) return localUnderperformer(c, state);
  const provider = getStoredProvider();
  const context = { campaign: { name: c.name, channel: c.channel, budget: c.budget, spent: c.spent, ctr: c.ctr, leads: c.leads, converted: c.converted }, otherCampaigns: compactState(state).campaigns, competitiveResearch: state.docs.filter((d) => d.type === "research").map((d) => d.content.slice(0, 260)) };
  const task = `Diagnose why "${c.name}" is underperforming (${c.ctr}% CTR vs 1.5% floor). Reason from the numbers and the competitive research — no generic advice. Return exactly:\nWHY: <2-3 sentences>\nFIX: <1-2 concrete actions>`;
  const res = await callLLM(provider, state.engine.model || "claude-sonnet-4-6", getStoredKey(), SYS("Marketing"), context, task);
  const why = (res.text.match(/WHY:\s*([\s\S]*?)(?=FIX:|$)/i)?.[1] ?? res.text).trim();
  const fix = (res.text.match(/FIX:\s*([\s\S]*)$/i)?.[1] ?? "Rotate creative variants and re-test.").trim();
  return { why, fix, reasoning: makeReasoning(provider, res.steps.length ? res.steps : parseSteps(why), extractCitations(res.text, context), res.tokens, res.ms) };
}

/* ---------------- Ops: reasoned risk explanation ---------------- */
export async function llmRiskExplain(
  risk: { title: string; category: string; severity: string; evidence: string[] },
  state: State
): Promise<{ why: string; recommendation: string; reasoning: Reasoning }> {
  if (!hasKey()) {
    return {
      why: risk.evidence.join(" "),
      recommendation: "Address the earliest upstream dependency first; confirm the owner has slack this week.",
      reasoning: makeReasoning("local", [`Assembled from ${risk.evidence.length} store records.`, "No LLM key configured — local inference applied the same evidence."], risk.evidence),
    };
  }
  const provider = getStoredProvider();
  const context = { risk, onboardings: compactState(state).openTasks.filter((t) => t.category === "onboarding"), tickets: compactState(state).openTickets, event: { couple: EVENT.couple, venue: EVENT.venue, daysAway: Math.ceil((+new Date(EVENT.dateISO) - Date.now()) / 86400000) }, vendors: state.vendors.map((v) => ({ name: v.name, status: v.status, note: v.note })) };
  const task = `Explain the risk "${risk.title}" (${risk.category}, ${risk.severity}). The evidence from the shared store is listed — build the causal chain from it. Return exactly:\nWHY: <2-4 sentences, citing the evidence>\nNEXT: <one recommended action>`;
  const res = await callLLM(provider, state.engine.model || "claude-sonnet-4-6", getStoredKey(), SYS("Operations"), context, task);
  const why = (res.text.match(/WHY:\s*([\s\S]*?)(?=NEXT:|$)/i)?.[1] ?? res.text).trim();
  const recommendation = (res.text.match(/NEXT:\s*([\s\S]*)$/i)?.[1] ?? "Act on the earliest dependency this week.").trim();
  return { why, recommendation, reasoning: makeReasoning(provider, res.steps.length ? res.steps : parseSteps(why), extractCitations(res.text, context), res.tokens, res.ms) };
}

/* (next-best-action reasoning lives in lib/local.nextActionFor and runs on
    every touch/reply — deterministic cases don't need a round-trip.) */
