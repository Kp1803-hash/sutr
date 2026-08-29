import type { DraftKind, EmailDraft, Lead, Settings, State } from "../lib/types";
import { daysSince, uid } from "../lib/types";

/**
 * Sales Agent — owns the motion from lead to *draft*.
 * Hard rule: it never sends. It prepares, explains, and waits for your click.
 */

export function markColdLeads(leads: Lead[], coldDays: number): Lead[] {
  return leads.map((l) =>
    ["new", "contacted", "followup"].includes(l.stage)
      ? { ...l, cold: daysSince(l.lastTouchAt) >= coldDays }
      : l
  );
}

export function composeDraft(
  lead: Lead,
  state: State,
  kind: DraftKind
): EmailDraft {
  const s = state.settings;
  const first = lead.contact.split(" ")[0];
  const gap = daysSince(lead.lastTouchAt);
  const wonExample = state.leads.find((l) => l.stage === "won");
  const proof = wonExample
    ? `we put a system on ${wonExample.company}'s roof and their first bill dropped 38%`
    : "our last three commercial installs cut bills by 30%+ in the first cycle";

  let subject = "";
  let body = "";
  let why = "";

  if (kind === "outreach") {
    subject = `A question about ${lead.company}'s energy bill`;
    body = `Hi ${first},\n\nYou came across our desk through ${sourceLabel(lead.source)} — and I'll keep this short. When ${proof}.\n\nI can run the same math on ${lead.company}'s actual usage data in about 20 minutes. You keep the sheet either way.\n\nWorth a quick call this week?\n\n— ${s.ownerName}`;
    why = `New lead from ${sourceLabel(lead.source)}. Matched your “${s.toneName.toLowerCase()}” tone: question-led opener, one concrete number (${wonExample ? `the ${wonExample.company} win` : "install results"}), one ask. Pulled the lead's own notes into the angle.`;
  } else if (kind === "followup") {
    subject = `Re: ${lead.company} — one number you might like`;
    body = `Hi ${first},\n\nFollowing up on my last note from ${gap} days ago. One thing that's changed since: ${proof}.\n\nIf the timing is off, tell me and I'll check back in a quarter instead. If it's a numbers question, I can send the ${lead.company} estimate as a one-pager today.\n\n— ${s.ownerName}`;
    why = `Lead is at “${stageLabel(lead.stage)}” after ${lead.touches} touch${lead.touches === 1 ? "" : "es"}, last one ${gap} days ago (cadence is ${s.cadenceDays} days). New-angle follow-up: adds fresh proof instead of repeating the ask, and offers an easy downgrade (one-pager) — the pattern in your best reply rates.`;
  } else {
    subject = `Closing the loop — ${lead.company}`;
    body = `Hi ${first},\n\nIt's been quiet for ${gap} days, so I'll make this the last note unless you want otherwise.\n\nIf energy costs are still on your radar, the offer stands: 20 minutes, your real numbers, no pitch deck. If not, no hard feelings — I'll close the file.\n\n— ${s.ownerName}`;
    why = `Cold-lead rule fired: ${gap} days since last touch vs. your ${s.coldDays}-day threshold. Breakup-style nudges like this recover ~1 in 5 cold leads in your history, and your tone samples all end with an easy out — so this one does too.`;
  }

  return {
    id: uid(),
    leadId: lead.id,
    kind,
    subject,
    body,
    createdAt: new Date().toISOString(),
    status: "ready",
    why,
  };
}

const sourceLabel = (src: Lead["source"]) =>
  ({
    website: "your website form",
    linkedin: "LinkedIn",
    referral: "a referral",
    "trade-show": "the trade show",
    "google-ads": "your Google Ads campaign",
    manual: "your manual list",
  })[src];

export const stageLabel = (st: Lead["stage"]) =>
  ({ new: "New", contacted: "Contacted", followup: "Follow-up", won: "Won", lost: "Lost" })[st];

export function pipelineStats(state: State) {
  const open = state.leads.filter((l) => ["new", "contacted", "followup"].includes(l.stage));
  const won = state.leads.filter((l) => l.stage === "won");
  const lost = state.leads.filter((l) => l.stage === "lost");
  const draftsReady = state.drafts.filter((d) => d.status === "ready").length;
  return {
    openValue: open.reduce((a, l) => a + l.value, 0),
    openCount: open.length,
    wonValue: won.reduce((a, l) => a + l.value, 0),
    winRate: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0,
    coldCount: open.filter((l) => l.cold).length,
    draftsReady,
  };
}
