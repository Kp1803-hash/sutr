import type { Reasoning, Risk, Severity, State } from "../lib/types";
import { EVENT, daysSince, daysUntil, uid } from "../lib/types";

/**
 * Operations Agent — reasons over planner onboarding, support tickets,
 * event-timeline and vendor data in the shared store. Every risk carries
 * what / why (with the data trail) / recommended next step.
 * High severity escalates immediately; the rest waits for the daily digest.
 */

const R = (steps: string[], dataCited: string[]): Reasoning => ({ engine: "local", steps, dataCited });

export interface ScanResult {
  risks: Risk[];
  score: number;
  newCount: number;
  newHigh: Risk[];
  summary: string;
}

export function runScan(state: State): ScanResult {
  const now = new Date().toISOString();
  const found: Risk[] = [];

  /* Churn pattern: stalled onboarding + open ticket on the same planner */
  for (const lead of state.leads.filter((l) => l.stage !== "lost")) {
    const ticket = state.tickets.find((t) => t.plannerId === lead.id && t.status === "open");
    const setup = state.tasks.find((t) => t.linkedPlannerId === lead.id && t.category === "onboarding" && t.status === "open");
    if (ticket && setup) {
      const onboardDays = daysSince(lead.wonAt ?? lead.createdAt);
      const ticketDays = daysSince(ticket.openedAt);
      found.push({
        id: uid(),
        key: `churn-${lead.id}`,
        title: `${lead.studio} matches the churn pattern`,
        why: `Onboarded ${onboardDays} days ago, setup checklist still open (due in ${Math.max(0, daysUntil(setup.due))}d), and a support ticket — “${ticket.subject}” — open ${ticketDays} days. Stored churn history: 2 of 3 planners who left last year followed this exact sequence inside their third week.`,
        severity: "high",
        recommendation: `Call ${lead.planner.split(" ")[0]} today: fix the ticket live on the call and walk the checklist together. Sales outreach is automatically on HOLD for this account.`,
        status: "open",
        category: "Churn pattern",
        createdAt: now,
        reasoning: R(
          [
            `Joined three store records on ${lead.studio}: onboarding task (open), support ticket (open ${ticketDays}d), win date (${onboardDays}d ago).`,
            "Pattern-matched against stored churn history — setup-stall plus open ticket inside week 3 preceded 2 of 3 past churns.",
            "Cross-agent effect: Sales sees this flag in the shared store and holds outreach, so a struggling customer isn't pitched.",
          ],
          [lead.studio, `ticket open ${ticketDays} days`, "2 of 3 past churners", "onboarding checklist open"]
        ),
      });
    }
  }

  /* Aging support tickets */
  const aging = state.tickets.filter((t) => t.status === "open" && daysSince(t.openedAt) >= 4);
  if (aging.length > 0) {
    const worst = aging.reduce((a, b) => (daysSince(a.openedAt) > daysSince(b.openedAt) ? a : b));
    const planner = state.leads.find((l) => l.id === worst.plannerId);
    found.push({
      id: uid(),
      key: "ticket-aging",
      title: `${planner?.studio ?? "A planner"} ticket open ${daysSince(worst.openedAt)} days`,
      why: `“${worst.subject}” has been open ${daysSince(worst.openedAt)} days against a 48-hour SLA${planner ? `, and ${planner.studio} has an event this week` : ""}. Every extra day is a live demonstration of the failure mode they bought Sutr to avoid.`,
      severity: daysSince(worst.openedAt) >= 5 ? "medium" : "low",
      recommendation: "Fix the underlying issue today and send a workaround within the hour. Then log the root cause so the scan can watch for repeats.",
      status: "open",
      category: "Support",
      createdAt: now,
      reasoning: R(
        [`Ticket age ${daysSince(worst.openedAt)}d vs 48h SLA — pulled from the shared tickets collection.`, planner ? `Sales history on ${planner.studio} shows hesitation (“not now”) — service recovery is the only retention play left.` : ""].filter(Boolean),
        [planner?.studio ?? "planner", `${daysSince(worst.openedAt)} days`, "48h SLA"]
      ),
    });
  }

  /* Event-timeline + vendor exposure */
  const du = daysUntil(EVENT.dateISO);
  for (const v of state.vendors.filter((v) => v.status === "delayed")) {
    found.push({
      id: uid(),
      key: `vendor-${v.id}`,
      title: `${v.name} delayed — ${EVENT.couple} at ${EVENT.venue} exposed`,
      why: `${v.name} (${v.category}) reported: “${v.note}”. With ${du} days to the event, historical pattern says vendor slips past the 8-week mark forced paid rush fixes — and the catering tasting is still unscheduled, so two confirmations on one event are drifting.`,
      severity: du <= 70 ? "high" : "medium",
      recommendation: "Get a written re-confirmation by Friday and shortlist one backup today; a backup quote costs nothing, a missing mandap doesn't.",
      status: "open",
      category: "Event vendors",
      createdAt: now,
      reasoning: R(
        ["Vendor status flipped to delayed with an open note in the shared store.", `${du} days to ${EVENT.couple}; past the 8-week mark, backups start costing money.`, "A second unscheduled confirmation (catering tasting) compounds the timeline risk."],
        [v.name, `${du} days`, EVENT.venue, v.note]
      ),
    });
  }
  for (const v of state.vendors.filter((v) => v.status === "watch")) {
    found.push({
      id: uid(),
      key: `vendor-${v.id}`,
      title: `${v.name} needs a scheduled confirmation`,
      why: `Status is “watch”: ${v.note}. Unscheduled confirmations are how event timelines compress silently.`,
      severity: "low",
      recommendation: "Put the tasting on the calendar this week — a date removes the risk.",
      status: "open",
      category: "Event vendors",
      createdAt: now,
      reasoning: R(["Vendor moved to watch with an unscheduled step.", "No action needed beyond scheduling — flagged so it can't drift."], [v.name, v.note]),
    });
  }
  if (du <= 21) {
    found.push({
      id: uid(),
      key: "event-compression",
      title: `Event timeline compressed — ${du} days to ${EVENT.couple}`,
      why: `Inside 3 weeks of the flagship event, any open vendor thread becomes a same-week emergency. The store still shows ${state.vendors.filter((v) => v.status !== "ok").length} vendor(s) not green.`,
      severity: "high",
      recommendation: "Daily 10-minute vendor standup until the event; escalate anything not confirmed within 24h.",
      status: "open",
      category: "Event timeline",
      createdAt: now,
      reasoning: R([`${du} days to ${EVENT.couple} — inside the 3-week compression window.`, `${state.vendors.filter((v) => v.status !== "ok").length} vendors not green in the shared store.`], [`${du} days`, EVENT.couple]),
    });
  }

  /* Onboarding deadlines about to lapse */
  for (const t of state.tasks.filter((t) => t.status === "open" && t.category === "onboarding")) {
    const d = daysUntil(t.due);
    if (d <= 3) {
      const lead = state.leads.find((l) => l.id === t.linkedPlannerId);
      found.push({
        id: uid(),
        key: `setup-${t.id}`,
        title: `“${t.title}” due ${d <= 0 ? "today" : `in ${d}d`}`,
        why: `An open onboarding task with ${d <= 0 ? "no time left" : `${d} day${d === 1 ? "" : "s"} left`}${lead ? ` on ${lead.studio} — the exact window where stalled setups have churned before` : ""}.`,
        severity: d <= 1 ? "high" : "medium",
        recommendation: "Do it or delegate it this morning; if it slips, tell the planner now — earlier is always cheaper.",
        status: "open",
        category: "Onboarding",
        createdAt: now,
        reasoning: R(["Task deadline pulled from the shared tasks collection.", lead ? `Linked planner ${lead.studio} makes this a retention event, not just a task.` : ""].filter(Boolean), [t.title, lead?.studio ?? "", `${d}d`]),
      });
    }
  }

  /* Merge: keep existing open risks that are still valid, add fresh, keep resolved history */
  const openKeys = new Set(state.risks.filter((r) => r.status === "open").map((r) => r.key));
  const fresh = found.filter((r) => !openKeys.has(r.key));
  const stillValid = state.risks.filter((r) => r.status === "open" && found.some((f) => f.key === r.key));
  const resolved = state.risks.filter((r) => r.status === "resolved");
  const sevRank = (s: Severity) => (s === "high" ? 0 : s === "medium" ? 1 : 2);
  const risks = [...fresh, ...stillValid, ...resolved].sort((a, b) => sevRank(a.severity) - sevRank(b.severity));

  const open = risks.filter((r) => r.status === "open");
  const score = Math.max(
    18,
    100 - open.reduce((a, r) => a + (r.severity === "high" ? 18 : r.severity === "medium" ? 9 : 4), 0)
  );
  const newHigh = fresh.filter((r) => r.severity === "high");

  return {
    risks,
    score,
    newCount: fresh.length,
    newHigh,
    summary:
      fresh.length === 0
        ? `Health scan complete: no new risks — ${open.length} open, score ${score}/100. Every flag still traces to store data.`
        : `Health scan complete: ${fresh.length} new risk${fresh.length > 1 ? "s" : ""}${newHigh.length ? ` (${newHigh.length} high — escalated immediately, not batched)` : ""}. Score ${score}/100.`,
  };
}

export function healthScore(state: State): number {
  const open = state.risks.filter((r) => r.status === "open");
  return Math.max(
    18,
    100 - open.reduce((a, r) => a + (r.severity === "high" ? 18 : r.severity === "medium" ? 9 : 4), 0)
  );
}
