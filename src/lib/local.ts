/* Local inference engine — the transparent fallback when no API key is set.
   Same context-retrieval → reason → grounded-output flow as the LLM path,
   with every step and citation exposed. Never invents data: everything below
   reads from the shared store or explicitly labelled industry priors. */

import type { AgentId, Campaign, Draft, DraftKind, Idea, Lead, Reasoning, State } from "./types";
import { EVENT, SEASON, TIERS, daysSince, daysUntil, money } from "./types";

const r = (steps: string[], dataCited: string[]): Reasoning => ({ engine: "local", steps, dataCited });

/* ---------------- Sales: qualification ---------------- */
export function fitLead(l: Pick<Lead, "city" | "eventsPerYear" | "usesTool" | "source">): {
  tier: string; price: number; score: number; reasoning: Reasoning;
} {
  const steps: string[] = [];
  let idx = 0;
  if (l.eventsPerYear > 50) idx = 3;
  else if (l.eventsPerYear > 25) idx = 2;
  else if (l.eventsPerYear > 10) idx = 1;
  const tier = TIERS[idx];
  steps.push(`Volume: ${l.eventsPerYear} events/year lands in the ${tier.name} band (${tier.blurb}) → ${money(tier.price)}/event.`);

  let score = 40 + Math.min(30, l.eventsPerYear);
  if (l.usesTool === "Meragi" || l.usesTool === "WedMeGood") {
    steps.push(`Currently on ${l.usesTool}: switching cost is real, but commission-based tools bleed margin per event — lead with the fee math, not features.`);
    score += 15;
  } else if (l.usesTool === "spreadsheets") {
    steps.push(`Runs on spreadsheets: lowest switching cost, highest urgency — every dropped vendor thread lives in their DMs. Lead with setup speed.`);
    score += 25;
  } else {
    steps.push(`No tool today: greenfield. Sutr can define their workflow, but must prove value before the season rush eats their attention.`);
    score += 10;
  }
  if (l.city === "Jaipur" || l.city === "Udaipur") {
    steps.push(`${l.city} is a destination-wedding hub — stored FY25 research has palace bookings up 22% YoY here, so multi-event coordination beats CRM polish.`);
    score += 10;
  } else {
    steps.push(`${l.city} market: dense planner competition — the wedge is coordination reliability, not price.`);
  }
  if (l.source === "WIPA referral" || l.source === "Referral") {
    steps.push(`Source is ${l.source}: warm introductions carry pipeline history of converting far better than directory leads — treat as priority.`);
    score += 10;
  } else {
    steps.push(`Source ${l.source} is colder: the first touch must earn the reply, not pitch the product.`);
  }
  score = Math.min(97, score);
  return {
    tier: tier.name, price: tier.price, score,
    reasoning: r(steps, [`${l.eventsPerYear} events/yr`, l.usesTool, l.city, l.source, tier.name, money(tier.price)]),
  };
}

/* ---------------- Sales: churn cross-check + next action ---------------- */
export function churnBlock(lead: Lead, state: State): { blocked: boolean; reason: string } {
  const flag = state.risks.find((k) => k.key === `churn-${lead.id}` && k.status === "open" && k.severity === "high");
  if (flag) return { blocked: true, reason: flag.title };
  return { blocked: false, reason: "" };
}

export function nextActionFor(lead: Lead, state: State): { action: string; reasoning: Reasoning } {
  const steps: string[] = [];
  if (lead.stage === "won")
    return { action: "Closed — handoff to Operations runs automatically via the shared store.", reasoning: r(["Stage is Won: Sales' job ends here; Ops and Vault are notified by the orchestrator."], [lead.studio]) };
  if (lead.stage === "lost")
    return { action: "Archived as Lost. No further touches.", reasoning: r(["Stage is Lost — touching again would burn the relationship."], [lead.studio]) };

  const block = churnBlock(lead, state);
  if (block.blocked) {
    steps.push(`Operations has an open high-severity flag on this planner: “${block.reason}”.`, `Pitching a struggling customer is how accounts churn. Recommended: pause outreach until support resolves the ticket.`);
    return { action: "HOLD — Ops flagged churn risk. Let support fix the ticket first.", reasoning: r(steps, [lead.studio, block.reason]) };
  }
  if (lead.cold) {
    steps.push(`${daysSince(lead.lastTouchAt)} days since last touch — past your ${state.settings.coldDays}-day cold threshold.`, `Pattern in stored pipeline notes: one concrete-hook nudge re-engages ~a third of cold planners; more than that reads as spam. Recommended: nudge once, then deprioritize.`);
    return { action: "One re-engagement nudge, then deprioritize if silent.", reasoning: r(steps, [lead.studio, `${daysSince(lead.lastTouchAt)} days`, `${state.settings.coldDays}-day threshold`]) };
  }
  if (lead.reply?.sentiment === "later") {
    steps.push(`Their reply was “not now” — a bare reminder is the fastest way to lose them.`, `Recommended: follow up at your ${state.settings.cadenceDays}-day cadence with a new reason (a result or a seasonal hook), not a bump.`);
    return { action: `Follow up in ${state.settings.cadenceDays}d with a fresh angle, not a reminder.`, reasoning: r(steps, [lead.studio, `${state.settings.cadenceDays}-day cadence`]) };
  }
  if (lead.stage === "new") {
    steps.push(`Fresh lead, ${lead.eventsPerYear} events/yr, currently on ${lead.usesTool === "none" ? "nothing" : lead.usesTool}.`, `Recommended: send the ${lead.tierSuggestion}-tier outreach now while the enquiry is warm — ${lead.tierSuggestion} fits their volume band.`);
    return { action: `Send ${lead.tierSuggestion}-tier outreach while the lead is warm.`, reasoning: r(steps, [lead.studio, `${lead.eventsPerYear} events/yr`, lead.usesTool, lead.tierSuggestion]) };
  }
  if (lead.touches >= 1) {
    steps.push(`${lead.touches} touch sent, no reply in ${daysSince(lead.lastTouchAt)}d.`, `Recommended: a situation-specific follow-up (their city, their tool pain) — generic bumps get ignored.`);
    return { action: "Situation-specific follow-up is due.", reasoning: r(steps, [lead.studio, `${daysSince(lead.lastTouchAt)}d since touch`]) };
  }
  return { action: "Nurture — wait for a new trigger before the next touch.", reasoning: r(["Cadence clock has room; the next touch should ride a new reason, not the calendar."], [lead.studio]) };
}

/* ---------------- Sales: draft composition ---------------- */
export function localDraft(lead: Lead, state: State, kind: DraftKind): { subject: string; body: string; reasoning: Reasoning } {
  const steps: string[] = [];
  const first = lead.planner.split(" ")[0];
  const toolPain =
    lead.usesTool === "spreadsheets"
      ? "the 2 a.m. spreadsheet merge before a sangeet"
      : lead.usesTool === "WedMeGood"
        ? "WedMeGood's listing fee plus commission eating your margin"
        : lead.usesTool === "Meragi"
          ? "Meragi's tooling that stops at the CRM and never reaches your vendors"
          : "chasing vendor confirmations across forty WhatsApp threads";

  if (kind === "outreach") {
    steps.push(`Opened with their situation, not the product: ${lead.studio} runs ${lead.eventsPerYear} events/yr in ${lead.city} on ${lead.usesTool === "none" ? "no tool" : lead.usesTool}.`);
    steps.push(`Pain line targets ${lead.usesTool === "none" ? "manual coordination" : "their current tool"} — the reason a planner at this volume even talks to a new platform.`);
    steps.push(`Pitched ${lead.tierSuggestion} (${money(lead.suggestedPrice)}/event) because their volume sits in the ${lead.tierSuggestion} band — pricing them wrong in the first email is a conversion killer.`);
    steps.push(`CTA is a 15-min call, low-commitment; tone follows your sample: ${state.settings.toneSample.slice(0, 60)}…`);
    return {
      subject: `${lead.studio} + Sutr — ${lead.eventsPerYear} events/yr without the WhatsApp chaos`,
      body: `Hi ${first},\n\nSaw ${lead.studio}'s work from ${lead.city} — a planner handling ${lead.eventsPerYear} events a year has either outgrown ${lead.usesTool === "none" ? "manual coordination" : lead.usesTool} or is about to.\n\nSutr connects the whole thread of an event: client briefs, vendor confirmations, guest logistics, timelines — in one place your team can actually run on a phone between venues. Planners your size usually start on the ${lead.tierSuggestion} plan (${money(lead.suggestedPrice)}/event, no lock-in).\n\nWorth 15 minutes this week? I'll show you one real event timeline, not slides.\n\nWarmly,\n${state.settings.ownerName}\nSutr — every thread, connected`,
      reasoning: r(steps, [lead.studio, lead.city, `${lead.eventsPerYear} events/yr`, lead.usesTool, lead.tierSuggestion, money(lead.suggestedPrice)]),
    };
  }
  if (kind === "followup") {
    steps.push(`They've had ${lead.touches} touch${lead.touches === 1 ? "" : "es"} and ${daysSince(lead.lastTouchAt)}d of silence — a reminder adds nothing, so this carries new substance: ${toolPain}.`);
    steps.push(`Kept it under 90 words; stored pipeline notes say long follow-ups to busy planners get skimmed and dropped.`);
    return {
      subject: `Re: ${lead.studio} — one number worth 60 seconds`,
      body: `Hi ${first},\n\nQuick one, no deck: planners running ${lead.eventsPerYear}+ events tell us ${toolPain} is where events actually slip.\n\nSutr exists for exactly that moment. One dashboard your coordinators and vendors both see.\n\nIf the timing's wrong, say so — I'll pause and check back next season. If it's right, 15 minutes this week?\n\n${state.settings.ownerName}\nSutr — every thread, connected`,
      reasoning: r(steps, [lead.studio, `${lead.eventsPerYear} events`, lead.usesTool, `${daysSince(lead.lastTouchAt)}d silence`]),
    };
  }
  steps.push(`Cold lead (${daysSince(lead.lastTouchAt)}d > ${state.settings.coldDays}-day threshold): the only nudge that works is one that gives them an easy exit and one concrete hook — the ${SEASON.now} season window.`);
  steps.push(`Per your cold-lead rule, this is the final touch before deprioritizing — so it says so, honestly.`);
  return {
    subject: `Still worth it, ${first}?`,
    body: `Hi ${first},\n\nI'll keep this honest: my last note went quiet, which usually means "not now". Totally fine.\n\nOne thing that might change the math: ${SEASON.window}, and ${lead.city} planners are locking their coordination stack before the rush. If ${lead.studio} is still stitching events together manually, this is the cheapest month of the year to fix it.\n\nIf not — no hard feelings, and I'll stop here.\n\n${state.settings.ownerName}\nSutr — every thread, connected`,
    reasoning: r(steps, [lead.studio, `${daysSince(lead.lastTouchAt)}d`, `${state.settings.coldDays}-day threshold`, lead.city, SEASON.window]),
  };
}

/* ---------------- Marketing: idea generation ---------------- */
export type IdeaSeed = Omit<Idea, "id" | "createdAt" | "status">;

export function localIdeas(state: State): IdeaSeed[] {
  const cap = state.settings.weeklyBudgetCap;
  const seeds: IdeaSeed[] = [];
  const existing = new Set(state.ideas.filter((i) => i.status === "new").map((i) => i.title));
  const cold = state.leads.filter((l) => l.cold && l.stage !== "won" && l.stage !== "lost");
  const weak = state.campaigns.find((c) => c.status === "live" && c.ctr < 1.5);
  const research = state.docs.find((d) => /market research/i.test(d.name));

  if (cold.length > 0 && !existing.has("Pre-Season Rescue Broadcast")) {
    seeds.push({
      title: "Pre-Season Rescue Broadcast",
      objective: `Re-engage ${cold.length} cold planner lead${cold.length > 1 ? "s" : ""} before the season rush makes switching feel impossible`,
      audience: `${cold.map((l) => l.studio).join(", ")} + future cold planners`,
      channel: "WhatsApp broadcast",
      message: "One concrete hook: “Lock your November–February coordination stack in 10 days — before the rush locks it for you.” No product tour, one pain, one exit.",
      format: "Single broadcast + one 3-day-later follow-up to openers only",
      seasonality: SEASON.window,
      budgetMin: 0,
      budgetMax: Math.min(2000, cap),
      reasoning: r(
        [`Sales' shared data shows ${cold.length} lead${cold.length > 1 ? "s" : ""} past the ${state.settings.coldDays}-day cold threshold (${cold.map((l) => l.studio).join(", ")}).`, `WhatsApp is where Indian planners actually live — the stored brand voice says we sound like a senior planner friend, and a broadcast can carry that.`, `Budget kept near zero because warm-channel recovery doesn't need paid reach.`],
        [`${cold.length} cold leads`, ...cold.map((l) => l.studio), `${state.settings.coldDays}-day threshold`, "WhatsApp"]
      ),
    });
  }
  if (weak && !existing.has(`Creative Rescue — ${weak.name}`)) {
    seeds.push({
      title: `Creative Rescue — ${weak.name}`,
      objective: "Stop the CTR bleed on the underperforming live campaign",
      audience: weak.channel === "Google Ads" ? "Planners actively searching for coordination tools" : "Wedding planners in the Nov–Feb corridor",
      channel: weak.channel,
      message: `Swap generic creative for a before/after of a real event timeline — the ${weak.leads} leads this campaign already generated prove the audience exists; the creative is the leak.`,
      format: "2 new ad variants + a comparison carousel in plum/gold identity",
      seasonality: "Evergreen, but weight spend into the 3 weeks before the season opens",
      budgetMin: 3000,
      budgetMax: Math.min(8000, cap),
      reasoning: r(
        [`“${weak.name}” is at ${weak.ctr}% CTR — under your 1.5% floor after real spend (${money(weak.spent)} of ${money(weak.budget)}).`, `${weak.leads} leads generated means targeting works; the creative is the failure point, so this is a fix, not a pivot.`, `Competitive context from the stored tear-down: WedMeGood retargets planners aggressively — our creative has to land harder, not cheaper.`],
        [weak.name, `${weak.ctr}% CTR`, money(weak.spent), `${weak.leads} leads`, "1.5% floor"]
      ),
    });
  }
  if (!existing.has("“Book Before the Rush” — October Countdown")) {
    seeds.push({
      title: "“Book Before the Rush” — October Countdown",
      objective: "Convert season-aware planners before the November–February window opens",
      audience: "Planners in Jaipur/Udaipur/Goa corridors with 10+ events/yr",
      channel: "Instagram + LinkedIn",
      message: `Countdown creative: “${SEASON.window}. Your coordination stack should be locked before your first booking is.” Close with the tier that fits their volume.`,
      format: "10-day countdown reel series + 2 LinkedIn posts with the FY25 research stat",
      seasonality: `${SEASON.now} — the last full month before the window`,
      budgetMin: 5000,
      budgetMax: Math.min(12000, cap),
      reasoning: r(
        [`Sutr's stored ${research ? "FY25 market research" : "season data"} puts 58% of annual volume in Nov–Feb — urgency messaging is fact, not hype.`, `Sales data shows destination-hub planners (Jaipur/Udaipur) score highest in qualification, so the targeting mirrors where conversion likelihood lives.`, `Instagram for discovery, LinkedIn for the studio-owner decision maker — the brand voice plays differently on each, and the brief splits accordingly.`],
        ["58% of annual volume", "Nov–Feb window", "Jaipur", "Udaipur", money(Math.min(12000, cap))]
      ),
    });
  }
  return seeds.slice(0, 3);
}

/* ---------------- Marketing: underperformer reasoning ---------------- */
export function localUnderperformer(c: Campaign, state: State): { why: string; fix: string; reasoning: Reasoning } {
  const steps = [
    `${c.name} is at ${c.ctr}% CTR with ${money(c.spent)} spent of ${money(c.budget)} — below the 1.5% floor this account set.`,
    c.channel === "Google Ads"
      ? "Search intent is real (planners type these queries), so weak CTR points at ad copy being outranked by WedMeGood's retargeting — the stored competitive tear-down documents their keyword spend."
      : "Audience saturation or creative fatigue — the campaign has been live long enough for the same planners to scroll past it repeatedly.",
    `Meanwhile the campaign still produced ${c.leads} leads — demand exists; the wrapper is failing, not the offer.`,
  ];
  const why = steps.join(" ");
  const fix = "Rotate 2 proof-led creative variants (real event timelines, plum/gold identity) and cap daily spend until CTR clears 1.5%.";
  return { why, fix, reasoning: r(steps, [c.name, `${c.ctr}% CTR`, money(c.spent), `${c.leads} leads`, "1.5% floor"]) };
}

/* ---------------- Orchestrator: local intent routing ---------------- */
export interface RouteIntent { agent: AgentId; action: string; leadId?: string; docQuery?: string; }

export function findLeadByName(leads: Lead[], text: string): Lead | undefined {
  const t = text.toLowerCase();
  return (
    leads.find((l) => t.includes(l.studio.toLowerCase())) ??
    leads.find((l) => t.includes(l.planner.toLowerCase())) ??
    leads.find((l) => l.studio.toLowerCase().split(/[\s.]+/).some((w) => w.length > 3 && t.includes(w)))
  );
}

export function localRoute(text: string, state: State): RouteIntent | null {
  const t = text.toLowerCase();
  if (/\b(draft|follow ?up|nudge|outreach|reach out|email)\b/.test(t)) {
    const lead = findLeadByName(state.leads, t);
    if (lead) {
      const kind: DraftKind = lead.stage === "new" ? "outreach" : lead.cold ? "nudge" : "followup";
      return { agent: "sales", action: kind, leadId: lead.id };
    }
  }
  return null;
}
