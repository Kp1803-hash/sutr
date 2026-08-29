import type { State } from "./types";
import { uid } from "./types";

export const SEED_VERSION = 3;

const ago = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();
const inD = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
const R = (steps: string[], dataCited: string[]) => ({ engine: "local" as const, steps, dataCited });

export function seedState(): State {
  return {
    _v: SEED_VERSION,
    view: "today",
    chatOpen: false,
    engine: { provider: "none", model: "claude-sonnet-4-6", status: "off" },
    leads: [
      {
        id: "l1", planner: "Ananya Iyer", studio: "Aarav Weddings", city: "Jaipur", eventsPerYear: 42,
        usesTool: "spreadsheets", tierSuggestion: "Royal", suggestedPrice: 25000, stage: "followup",
        source: "Instagram DM", score: 86, createdAt: ago(9), lastTouchAt: ago(2), touches: 2, cold: false,
        notes: "Impressed by the vendor-confirmation board in the demo. Needs buy-in from her co-founder before the Nov rush.",
        nextAction: "Follow up with a fresh angle before the season window.",
      },
      {
        id: "l2", planner: "Ritu Malhotra", studio: "Riva.Events", city: "Delhi NCR", eventsPerYear: 28,
        usesTool: "WedMeGood", tierSuggestion: "Royal", suggestedPrice: 25000, stage: "won",
        source: "WedMeGood directory", score: 74, createdAt: ago(32), lastTouchAt: ago(6), touches: 5, cold: false,
        wonAt: ago(6),
        notes: "Switched from WedMeGood to cut listing fees. Trial started 2 weeks ago — setup checklist still incomplete.",
      },
      {
        id: "l3", planner: "Farhan Qureshi", studio: "Bandhan Celebrations", city: "Mumbai", eventsPerYear: 15,
        usesTool: "none", tierSuggestion: "Marigold", suggestedPrice: 15000, stage: "followup",
        source: "WIPA referral", score: 68, createdAt: ago(21), lastTouchAt: ago(4), touches: 3, cold: false,
        reply: { sentiment: "later", at: ago(4) },
        notes: "Said “not now — mid-season”. Export issue open with support since 5 days.",
        nextAction: "Hold outreach — Ops flagged churn risk on this account.",
      },
      {
        id: "l4", planner: "Priya Nair", studio: "Mango Leaf Events", city: "Goa", eventsPerYear: 60,
        usesTool: "Meragi", tierSuggestion: "Sovereign", suggestedPrice: 40000, stage: "new",
        source: "Expo", score: 79, createdAt: ago(1), lastTouchAt: ago(1), touches: 0, cold: false,
        notes: "Met at the Goa wedding expo. Runs 5-destination weddings a season; frustrated Meragi stops at the CRM.",
        nextAction: "Send Sovereign-tier outreach while the expo lead is warm.",
      },
      {
        id: "l5", planner: "Dev & Sara", studio: "Knot & Bloom", city: "Udaipur", eventsPerYear: 18,
        usesTool: "none", tierSuggestion: "Marigold", suggestedPrice: 15000, stage: "contacted",
        source: "Referral", score: 63, createdAt: ago(12), lastTouchAt: ago(8), touches: 1, cold: true,
        notes: "Boutique palace-wedding duo. Referred by Aarav Weddings.",
        nextAction: "One re-engagement nudge, then deprioritize if silent.",
      },
      {
        id: "l6", planner: "Aditi Rao", studio: "Saffron Trails", city: "Jaipur", eventsPerYear: 55,
        usesTool: "Meragi", tierSuggestion: "Sovereign", suggestedPrice: 40000, stage: "won",
        source: "LinkedIn", score: 91, createdAt: ago(48), lastTouchAt: ago(3), touches: 7, cold: false,
        wonAt: ago(18),
        notes: "Flagship account. Runs 4 concurrent events in peak season; source of two referrals.",
      },
      {
        id: "l7", planner: "Arjun Sethi", studio: "Vows & Vines", city: "Delhi NCR", eventsPerYear: 8,
        usesTool: "spreadsheets", tierSuggestion: "Sage", suggestedPrice: 9000, stage: "new",
        source: "Inbound form", score: 57, createdAt: ago(0, 5), lastTouchAt: ago(0, 5), touches: 0, cold: false,
        notes: "New studio, first full season ahead. Price-sensitive but fast to adopt.",
        nextAction: "Send Sage-tier outreach while the enquiry is warm.",
      },
    ],
    drafts: [
      {
        id: "d1", leadId: "l1", kind: "followup", status: "ready", createdAt: ago(0, 3),
        subject: "Re: Aarav Weddings — one number worth 60 seconds",
        body: "Hi Ananya,\n\nQuick one, no deck: planners running 40+ events tell us the 2 a.m. spreadsheet merge before a sangeet is where events actually slip.\n\nSutr exists for exactly that moment — one dashboard your coordinators and vendors both see.\n\nIf the timing's wrong, say so — I'll pause and check back next season. If it's right, 15 minutes this week?\n\nKabir\nSutr — every thread, connected",
        reasoning: R(
          ["Ananya has had 2 touches with 2 days of silence — a reminder adds nothing, so this carries new substance: the spreadsheet-merge pain she runs on.", "Priced Royal (₹25K) because 42 events/yr sits squarely in the Royal band — wrong-tier emails kill momentum.", "Kept under 90 words; stored pipeline notes say long follow-ups to busy planners get skimmed."],
          ["Aarav Weddings", "42 events/yr", "spreadsheets", "Royal", "₹25,000"]
        ),
      },
      {
        id: "d2", leadId: "l4", kind: "outreach", status: "ready", createdAt: ago(0, 2),
        subject: "Mango Leaf + Sutr — 60 events/yr without the WhatsApp chaos",
        body: "Hi Priya,\n\nGood meeting you at the Goa expo. A studio running 60 events a year across five destinations has either outgrown Meragi or is about to.\n\nSutr connects the whole thread of an event: client briefs, vendor confirmations, guest logistics, timelines — in one place your team can run on a phone between venues. Studios your size start on Sovereign (₹40K/event, no lock-in).\n\nWorth 15 minutes this week? I'll show you one real multi-destination timeline, not slides.\n\nWarmly,\nKabir\nSutr — every thread, connected",
        reasoning: R(
          ["Expo leads decay within ~10 days, so this went to the top of the queue 5 hours after the event.", "Meragi frustration was stated at the booth — the email leads with the gap she named (CRM-only tooling), not with Sutr's feature list.", "Sovereign tier matches 60 events/yr; quoting it early filters honestly rather than surprising later."],
          ["Mango Leaf Events", "60 events/yr", "Meragi", "Sovereign", "₹40,000", "Goa"]
        ),
      },
    ],
    ideas: [
      {
        id: "i0", title: "Monsoon-End Relaunch — “Book before the October rush”", status: "approved",
        objective: "Convert season-aware planners before the November–February window",
        audience: "Planners in Jaipur/Udaipur/Goa with 10+ events/yr", channel: "Instagram + LinkedIn",
        message: "Countdown creative: lock your coordination stack before your first booking locks it for you.",
        format: "7-day countdown reel series", seasonality: "September close-out",
        budgetMin: 4000, budgetMax: 10000, createdAt: ago(1, 2),
        reasoning: R(
          ["Approved yesterday; the stored FY25 research puts 58% of volume in Nov–Feb, so urgency was fact, not hype.", "Sales data showed destination-hub planners scoring highest, so targeting mirrored where conversion likelihood lives."],
          ["58% of annual volume", "Nov–Feb window", "Jaipur", "Udaipur"]
        ),
      },
    ],
    campaigns: [
      {
        id: "c1", name: "Planner Success Stories — Reels", channel: "Instagram", status: "live",
        budget: 18000, spent: 9500, ctr: 3.1, leads: 9, converted: 2, startedAt: ago(24),
      },
      {
        id: "c2", name: "WedMeGood Escape — Search", channel: "Google Ads", status: "live",
        budget: 15000, spent: 11200, ctr: 1.1, leads: 3, converted: 0, startedAt: ago(20),
        flag: "CTR 1.1% vs 1.5% floor — targeting works (3 leads), the creative is the leak; WedMeGood retargeting is outbidding our keywords.",
        flagReasoning: R(
          ["₹11.2K spent at 1.1% CTR — below the account's 1.5% floor.", "3 leads generated means demand exists; the wrapper fails, not the offer.", "Stored competitive tear-down documents WedMeGood's aggressive keyword retargeting."],
          ["WedMeGood Escape — Search", "1.1% CTR", "₹11,200", "3 leads", "1.5% floor"]
        ),
      },
      {
        id: "c3", name: "WIPA Webinar — “Run 40 events without dropping one”", channel: "Webinar", status: "planned",
        budget: 5000, spent: 0, ctr: 0, leads: 0, converted: 0, startedAt: inD(9),
      },
      {
        id: "c4", name: "Referral Loop — 10% credit", channel: "Email", status: "live",
        budget: 2000, spent: 400, ctr: 4.8, leads: 5, converted: 1, startedAt: ago(30),
      },
    ],
    calendar: [
      { id: "cal1", date: inD(2), label: "Countdown reel #8 — vendor confirmations", channel: "Instagram" },
      { id: "cal2", date: inD(4), label: "LinkedIn post — FY25 research stat", channel: "LinkedIn" },
      { id: "cal3", date: inD(9), label: "WIPA Webinar", channel: "Webinar" },
    ],
    tasks: [
      { id: "t1", title: "Complete Riva.Events setup checklist", owner: "Onboarding", due: inD(5), status: "open", category: "onboarding", linkedPlannerId: "l2", createdAt: ago(13) },
      { id: "t2", title: "Chase signed vendor contracts — Leela florals & sound", owner: "Kabir", due: inD(9), status: "open", category: "event", createdAt: ago(6) },
      { id: "t3", title: "Resolve Bandhan CSV-export ticket", owner: "Support", due: inD(1), status: "open", category: "support", linkedPlannerId: "l3", createdAt: ago(5) },
      { id: "t4", title: "Aarav onboarding call — prep tier walkthrough", owner: "Kabir", due: ago(1), status: "done", category: "onboarding", createdAt: ago(4) },
      { id: "t5", title: "Plan December onboarding batch (post-season intake)", owner: "Onboarding", due: inD(12), status: "open", category: "onboarding", createdAt: ago(2) },
    ],
    tickets: [
      { id: "tk1", plannerId: "l2", subject: "WhatsApp reminders not reaching bride's family group", status: "open", openedAt: ago(3) },
      { id: "tk2", plannerId: "l3", subject: "Cannot export guest list CSV before Saturday event", status: "open", openedAt: ago(5) },
    ],
    vendors: [
      { id: "v1", name: "Bloom & Baroque Florals", category: "Florals — Aditi & Vivaan", status: "delayed", note: "Palace slot moved; marigold order needs re-confirm before the tasting", lastCheckedAt: ago(1) },
      { id: "v2", name: "Sangeet Sound Co", category: "Audio — Aditi & Vivaan", status: "ok", note: "Rider received, deposit paid", lastCheckedAt: ago(2) },
      { id: "v3", name: "Leela Palace Catering", category: "F&B — Aditi & Vivaan", status: "watch", note: "Menu tasting still not scheduled", lastCheckedAt: ago(1) },
    ],
    risks: [
      {
        id: "r1", key: "churn-l2", severity: "high", status: "open", category: "Churn pattern",
        title: "Riva.Events matches the churn pattern",
        why: "Onboarded 2 weeks ago, setup checklist still open with 5 days left, and a support ticket (WhatsApp reminders) has been open 3 days. Two of the three planners who churned last year followed this exact sequence.",
        recommendation: "Call Ritu today — fix the reminders issue live on the call and walk the setup checklist together. Escalated to Sales: pause any upsell outreach.",
        createdAt: ago(0, 4),
        reasoning: R(
          ["Pulled Riva's onboarding task (open, due in 5d), support ticket (open 3d), and win date (2 weeks ago) from the shared store.", "Pattern-matched against stored churn history: 2 of 3 past churners showed setup-stall + open-ticket inside week 3.", "Cross-agent effect: Sales has this account flagged HOLD so outreach doesn't pile on a struggling customer."],
          ["Riva.Events", "setup checklist open", "ticket open 3 days", "2 of 3 past churners"]
        ),
      },
      {
        id: "r2", key: "vendor-v1", severity: "high", status: "open", category: "Event vendors",
        title: "Bloom & Baroque delayed — flagship event exposed",
        why: "The florals vendor for Aditi & Vivaan (Leela Palace, Udaipur) reported the palace slot moved and the marigold order is unconfirmed — with 63 days to the event and the tasting unscheduled, every day of delay compresses the backup window.",
        recommendation: "Get a written re-confirmation by Friday and shortlist one backup florist today; a backup quote costs nothing, a missing mandap doesn't.",
        createdAt: ago(1),
        reasoning: R(
          ["Vendor status changed to delayed 24h ago with an unconfirmed marigold order.", "The flagship event is 63 days out; historical pattern: vendor slips past the 8-week mark forced paid rush fixes.", "Catering tasting is also unscheduled — two unscheduled confirmations on one event is the leading indicator of timeline compression."],
          ["Bloom & Baroque Florals", "63 days", "Leela Palace, Udaipur", "marigold order unconfirmed"]
        ),
      },
      {
        id: "r3", key: "ticket-aging", severity: "medium", status: "open", category: "Support",
        title: "Bandhan Celebrations ticket open 5 days",
        why: "A planner with a Saturday event cannot export the guest CSV, and the ticket is 5 days old. Support SLA is 48h; every extra day is a live demonstration of the failure mode Bandhan bought Sutr to avoid.",
        recommendation: "Fix the export today and hand Bandhan a workaround (shared sheet) within the hour. This account already said “not now” to renewal — service recovery is the only play.",
        createdAt: ago(1, 3),
        reasoning: R(
          ["Ticket opened 5 days ago vs 48h SLA.", "Planner has an event this Saturday — the export isn't a nice-to-have.", "Sales history on this account: replied “not now”; a support miss now confirms their hesitation."],
          ["Bandhan Celebrations", "5 days", "48h SLA", "Saturday event"]
        ),
      },
    ],
    docs: [
      {
        id: "doc1", name: "Planner Master Services Agreement — Template.pdf", type: "contract",
        tags: ["contract", "template", "legal"], person: undefined,
        content: "Sutr's standard per-event agreement: tier pricing (Sage ₹9K / Marigold ₹15K / Royal ₹25K / Sovereign ₹40K+), no lock-in clause, data ownership stays with the planner, 30-day exit.",
        summary: "Standard planner contract — tier pricing, no lock-in, planner owns their data.",
        uploadedAt: ago(60), size: 412000,
        versions: [{ v: 1, at: ago(60), name: "Planner Master Services Agreement — Template.pdf", note: "Original upload" }],
      },
      {
        id: "doc2", name: "WedMeGood vs Meragi — Competitive Tear-down.pdf", type: "research",
        tags: ["research", "competition", "wedmegood", "meragi"],
        content: "WedMeGood charges planners a ₹25K listing fee plus ~12% commission per booking; their retargeting spend on planner-intent keywords is aggressive. Meragi takes ~15% of event budget and stops at CRM — no vendor coordination layer. Neither owns the event-timeline thread.",
        summary: "Fee structures and gaps: WedMeGood's commission bleed, Meragi's CRM-only ceiling.",
        uploadedAt: ago(45), size: 890000,
        versions: [{ v: 1, at: ago(45), name: "WedMeGood vs Meragi — Competitive Tear-down.pdf", note: "Original upload" }],
      },
      {
        id: "doc3", name: "Sutr Seed Round — Pitch Deck v7.pdf", type: "pitch",
        tags: ["pitch", "investor", "deck"], person: "Sage Capital",
        content: "Seed round deck: B2B wedding logistics for Indian planners, per-event pricing ₹9K–₹40K+, flagship accounts Saffron Trails and Riva.Events, wedge is the vendor-confirmation thread competitors don't own.",
        summary: "Current investor deck, v7 — the one Sage Capital has.",
        uploadedAt: ago(12), size: 3400000,
        versions: [
          { v: 6, at: ago(40), name: "Sutr Seed Round — Pitch Deck v6.pdf", note: "Pre-Sage Capital feedback" },
          { v: 7, at: ago(12), name: "Sutr Seed Round — Pitch Deck v7.pdf", note: "Current — incorporates Sage feedback" },
        ],
      },
      {
        id: "doc4", name: "Brand Guidelines — Plum & Gold.pdf", type: "brand",
        tags: ["brand", "identity", "guidelines"],
        content: "Sutr brand system: deep plum #221226 primary, gold #C9962E accent, Fraunces display / Archivo body. Tagline: “every thread, connected.” Voice: warm, specific, senior-planner calm — never SaaS-jargon.",
        summary: "The plum & gold identity system and voice rules every agent follows.",
        uploadedAt: ago(90), size: 1200000,
        versions: [{ v: 1, at: ago(90), name: "Brand Guidelines — Plum & Gold.pdf", note: "Original upload" }],
      },
      {
        id: "doc5", name: "MVP Build Spec — v1.2.docx", type: "spec",
        tags: ["spec", "product", "roadmap"],
        content: "MVP scope: event timeline board, vendor confirmation threads, guest logistics, WhatsApp reminder bridge. Phase 2: ad-platform performance imports, Gmail draft sync, planner community referrals.",
        summary: "What's built, what's next — the engineering source of truth.",
        uploadedAt: ago(30), size: 540000,
        versions: [
          { v: 1, at: ago(75), name: "MVP Build Spec — v1.0.docx", note: "Initial scope" },
          { v: 2, at: ago(30), name: "MVP Build Spec — v1.2.docx", note: "Added WhatsApp bridge" },
        ],
      },
      {
        id: "doc6", name: "Vendor Agreement — Bloom & Baroque Florals.pdf", type: "agreement",
        tags: ["agreement", "vendor", "aditi-vivaan"], person: "Bloom & Baroque Florals",
        content: "Florals supply agreement for Aditi & Vivaan at Leela Palace, Udaipur. Marigold + rose mandate, delivery windows tied to palace slots. Valid through the event date; renewal required per event.",
        summary: "Flagship event florals contract — tied to the palace slot currently in flux.",
        uploadedAt: ago(20), size: 380000, expiresAt: inD(25),
        versions: [{ v: 1, at: ago(20), name: "Vendor Agreement — Bloom & Baroque Florals.pdf", note: "Original upload" }],
      },
      {
        id: "doc7", name: "Aarav Weddings — Planner Contract (signed).pdf", type: "contract",
        tags: ["contract", "signed", "royal"], person: "Aarav Weddings",
        content: "Signed Royal-tier agreement with Aarav Weddings, Jaipur: ₹25K/event, 12-event annual commitment, quarterly review. Renewal discussion due before the November window.",
        summary: "Ananya's signed Royal contract — renewal conversation due soon.",
        uploadedAt: ago(15), size: 350000, expiresAt: inD(40),
        versions: [{ v: 1, at: ago(15), name: "Aarav Weddings — Planner Contract (signed).pdf", note: "Original upload" }],
      },
      {
        id: "doc8", name: "WIPA Partnership MoU.pdf", type: "agreement",
        tags: ["agreement", "partnership", "wipa"], person: "WIPA",
        content: "Memorandum of understanding with the Wedding Industry Professionals Association: co-hosted webinars, referral pipeline, preferred-vendor badge. Annual renewal.",
        summary: "The planner-association partnership that feeds warm referrals.",
        uploadedAt: ago(70), size: 290000, expiresAt: inD(55),
        versions: [{ v: 1, at: ago(70), name: "WIPA Partnership MoU.pdf", note: "Original upload" }],
      },
      {
        id: "doc9", name: "FY25 Market Research — Destination Wedding Boom.pdf", type: "research",
        tags: ["research", "market", "fy25"],
        content: "Jaipur and Udaipur palace bookings up 22% YoY. November–February carries 58% of annual wedding volume. Planners with 25+ events/yr cite vendor coordination, not client management, as their top failure point.",
        summary: "The seasonality + coordination-pain data behind every Marketing idea and Sales pitch.",
        uploadedAt: ago(50), size: 1600000,
        versions: [{ v: 1, at: ago(50), name: "FY25 Market Research — Destination Wedding Boom.pdf", note: "Original upload" }],
      },
    ],
    activity: [
      { id: uid(), at: ago(0, 2), agent: "sales", text: "Drafted Sovereign-tier outreach for Mango Leaf Events (expo lead, 60 events/yr).", reasoning: R(["Expo leads decay fast — queued 5h after the event.", "Meragi gap named at the booth became the opening line.", "Sovereign quoted early: 60 events/yr is the top band."], ["Mango Leaf Events", "60 events/yr", "Meragi", "Sovereign"]) },
      { id: uid(), at: ago(0, 3), agent: "sales", text: "Drafted follow-up for Aarav Weddings — new substance, not a bump.", reasoning: R(["2 touches, 2d silence → reminder would be ignored.", "Led with her spreadsheet pain; priced Royal (42 events/yr band)."], ["Aarav Weddings", "Royal", "₹25,000"]) },
      { id: uid(), at: ago(0, 4), agent: "ops", text: "Escalated: Riva.Events matches the stored churn pattern (setup stall + open ticket in week 3).", reasoning: R(["Pattern-matched onboarding task, ticket age, and win date against churn history.", "Notified Sales to HOLD outreach on this account."], ["Riva.Events", "2 of 3 past churners"]) },
      { id: uid(), at: ago(0, 6), agent: "marketing", text: "6:00 AM idea drop generated 2 ideas from live Sales/Ops data.", reasoning: R(["Read cold-lead count and underperforming CTR from the shared store.", "Budgets capped at the ₹25K/week rule — proposals only."], ["1 cold lead", "1.1% CTR", "₹25,000 cap"]) },
      { id: uid(), at: ago(1), agent: "ops", text: "Escalated: Bloom & Baroque delayed — flagship event florals unconfirmed.", reasoning: R(["Vendor status flipped to delayed with marigold order unconfirmed.", "63 days out; past the 8-week mark, backups cost money."], ["Bloom & Baroque Florals", "63 days"]) },
      { id: uid(), at: ago(1, 2), agent: "vault", text: "Flagged 2 documents approaching expiry: Bloom & Baroque agreement (25d), Aarav contract (40d).", reasoning: R(["Nightly expiry sweep parsed dates from extracted text.", "Both feed open risks — flagged, not filed away."], ["25 days", "40 days"]) },
      { id: uid(), at: ago(2), agent: "orchestrator", text: "Morning digest assembled: 2 ideas, 2 drafts, 3 risks, 2 expiries." },
      { id: uid(), at: ago(6), agent: "sales", text: "Riva.Events marked Won (Royal, ₹25K/event). Ops created the onboarding task; Vault filed the contract." },
    ],
    chat: [
      {
        id: uid(), from: "agent", agent: "orchestrator", at: ago(0, 6),
        text: "Good morning, Kabir. Your crew is at work: Sales has 2 drafts awaiting your approval, Marketing's 6 AM drop landed with 2 ideas, and Ops escalated a churn pattern on Riva.Events overnight.\n\nAsk me anything in plain language — “why is Riva at risk?”, “draft a follow-up for Aarav”, “pull up the Meragi tear-down” — and I'll route it to the right agent.",
      },
    ],
    notices: [
      { id: uid(), at: ago(0, 6), agent: "orchestrator", kind: "digest", read: false, title: "Morning digest — 3 things need you", body: "2 sales drafts to approve · 2 marketing ideas from the 6 AM drop · 1 high-severity churn flag on Riva.Events · 2 documents nearing expiry.", actionView: "today", actionLabel: "Open the brief" },
      { id: uid(), at: ago(0, 6), agent: "marketing", kind: "idea", read: false, title: "Idea drop — 2 new ideas", body: "Pre-Season Rescue Broadcast · Creative Rescue for the WedMeGood Escape campaign. Both cite live Sales/Ops numbers.", actionView: "marketing", actionLabel: "Review ideas" },
      { id: uid(), at: ago(0, 4), agent: "ops", kind: "alert", read: false, title: "Escalated: Riva.Events matches the churn pattern", body: "Setup checklist stalled + ticket open 3 days, inside week 3 — the sequence 2 of 3 past churners followed. Sales outreach is on HOLD.", actionView: "ops", actionLabel: "See the risk" },
      { id: uid(), at: ago(1, 2), agent: "vault", kind: "doc", read: true, title: "2 documents nearing expiry", body: "Bloom & Baroque agreement (25d) · Aarav Weddings contract (40d — renewal talk before the Nov window).", actionView: "vault", actionLabel: "Open Vault" },
    ],
    dayKey: new Date().toDateString(),
    lastDropAt: (() => { const d = new Date(); d.setHours(6, 0, 0, 0); return d.toISOString(); })(),
    lastTopic: "help",
    toasts: [],
    typing: null,
    settings: {
      ownerName: "Kabir",
      coldDays: 6,
      cadenceDays: 4,
      toneSample: "Warm, planner-to-planner, no jargon. We sound like a senior planner friend who has run a hundred weddings and stayed calm — specific, brief, never salesy.",
      weeklyBudgetCap: 25000,
      brandVoice: "Deep plum & gold — “every thread, connected.” Confident, warm, specific. We talk like a senior wedding planner, not a SaaS bot.",
      autoOpsOnWin: true,
      gmailConnected: false,
      vaultAccess: ["Kabir (you)"],
    },
  };
}
