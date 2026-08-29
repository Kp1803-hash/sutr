import { useState } from "react";
import { useSutr } from "../lib/store";
import { CITIES, TIERS, daysSince, money, timeAgo, type Lead, type LeadSource } from "../lib/types";
import { churnBlock, pipelineStats, stageLabel } from "../agents/sales";
import { Bar, Btn, Card, Icon, Modal, ReasoningPanel, SectionHead, Stat, inputCls } from "../components/ui";

const STAGES: Lead["stage"][] = ["new", "contacted", "followup", "won", "lost"];
const SOURCES: LeadSource[] = ["WedMeGood directory", "Instagram DM", "LinkedIn", "WIPA referral", "Expo", "Inbound form", "Referral"];

export default function Sales() {
  const h = useSutr();
  const { s } = h;
  const p = pipelineStats(s);
  const [open, setOpen] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [f, setF] = useState({ planner: "", studio: "", city: CITIES[0] as string, eventsPerYear: 20, usesTool: "spreadsheets" as Lead["usesTool"], source: "Inbound form" as LeadSource, notes: "" });

  const queue = s.drafts.filter((d) => d.status !== "sent");

  const draft = async (leadId: string, kind: "outreach" | "followup" | "nudge") => {
    setDrafting(leadId + kind);
    await h.requestDraft(leadId, kind);
    setDrafting(null);
  };

  return (
    <div>
      {/* stats */}
      <div className="stagger mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Open pipeline" value={money(p.openValue)} sub={`${p.openCount} planners · per-event value`} />
        <Stat label="Win rate" value={`${p.winRate}%`} sub="closed won vs lost, all time" />
        <Stat label="Awaiting your click" value={p.draftsReady} sub="drafts ready — none send without you" accent="text-[#8a6414]" />
        <Stat label="Cold leads" value={p.coldCount} sub={`no touch in ${s.settings.coldDays}+ days`} accent={p.coldCount ? "text-warn" : "text-sage"} />
      </div>

      {/* gmail banner */}
      {!s.settings.gmailConnected && (
        <div className="anim-fade-up mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-gold/35 bg-gold/8 px-4 py-3">
          <Icon name="mail" size={17} className="text-[#8a6414]" />
          <p className="flex-1 text-[12.5px] text-ink/85">
            <b>Gmail not connected</b> — drafts are created in-sandbox. Connect for real Drafts-folder sync (drafts scope only; sending stays yours).
          </p>
          <Btn size="sm" variant="gold" onClick={() => h.go("settings")}><Icon name="lock" size={12} /> Connect Gmail</Btn>
        </div>
      )}

      {/* ready-to-send queue */}
      <SectionHead
        kicker="Draft-then-approve · the hard rule lives here"
        title={`Ready to send (${queue.filter((d) => d.status === "ready").length})`}
        right={<span className="font-mono text-[10.5px] text-inkmute">no email leaves your account without your click</span>}
      />
      <div className="stagger mb-7 space-y-3">
        {queue.map((d) => {
          const lead = s.leads.find((l) => l.id === d.leadId);
          const expanded = open === d.id;
          return (
            <Card key={d.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-line bg-canvas/60 px-4 py-3">
                <span className={`grid h-9 w-9 place-items-center rounded-lg ${d.kind === "nudge" ? "bg-warn/12 text-warn" : "bg-gold/12 text-[#8a6414]"}`}>
                  <Icon name="mail" size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-bold">{d.subject}</span>
                    <span className="rounded-full bg-plum/8 px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-plum2">{d.kind}</span>
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wide ${d.status === "ready" ? "bg-gold/15 text-[#8a6414]" : "bg-sage/12 text-sage"}`}>
                      {d.status === "ready" ? "awaiting you" : "in Gmail drafts"}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wide text-inkmute">
                    to {lead?.planner} · {lead?.studio} · {timeAgo(d.createdAt)}
                  </div>
                </div>
                <button onClick={() => setOpen(expanded ? null : d.id)} className="flex items-center gap-1 text-[12px] font-semibold text-plum hover:underline">
                  {expanded ? "Collapse" : "Read draft"} <Icon name="chevD" size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
              </div>
              {expanded && (
                <div className="anim-fade-in space-y-3 px-4 py-4">
                  <pre className="scroll-slim max-h-[300px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-canvas/70 p-4 font-body text-[13px] leading-relaxed text-ink/90">{d.body}</pre>
                  <ReasoningPanel r={d.reasoning} label="Why the agent wrote it this way" />
                  <div className="flex flex-wrap gap-2">
                    {d.status === "ready" ? (
                      <>
                        <Btn variant="gold" onClick={() => h.approveDraft(d.id)}><Icon name="check" size={14} /> Approve → Gmail Drafts</Btn>
                        <Btn variant="ghost" onClick={() => h.go("settings")}><Icon name="lock" size={13} /> {s.settings.gmailConnected ? s.settings.gmailAccount : "sandbox mode"}</Btn>
                      </>
                    ) : (
                      <Btn variant="solid" onClick={() => h.markSent(d.id)}><Icon name="send" size={14} /> I sent it from Gmail</Btn>
                    )}
                  </div>
                  {d.status === "synced" && (
                    <p className="text-[11.5px] text-inksoft">Open Gmail → Drafts, review once more, press send. Then tap “I sent it” so the lead stage and cadence update.</p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        {queue.length === 0 && (
          <Card className="p-8 text-center">
            <Icon name="mail" size={26} className="mx-auto text-inkmute" />
            <p className="mt-2 text-[13px] text-inksoft">Queue is clear. Ask for a draft below, or say “draft a follow-up for Aarav” in the chat.</p>
          </Card>
        )}
      </div>

      {/* pipeline board */}
      <SectionHead
        kicker="New → Contacted → Follow-up → Won / Lost"
        title="Planner pipeline"
        right={<Btn size="sm" variant="gold" onClick={() => setAddOpen(true)}><Icon name="plus" size={13} /> Add planner lead</Btn>}
      />
      <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STAGES.map((stage) => {
          const leads = s.leads.filter((l) => l.stage === stage);
          return (
            <div key={stage} className="rounded-xl border border-line bg-canvas/60 p-2.5">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-inksoft">{stageLabel[stage]}</span>
                <span className="rounded-full bg-surface px-1.5 py-0.5 font-mono text-[10px] text-inksoft shadow-sm">{leads.length}</span>
              </div>
              <div className="space-y-2">
                {leads.map((l) => {
                  const block = churnBlock(l, s);
                  return (
                    <Card key={l.id} className="lift p-3">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-bold">{l.studio}</div>
                          <div className="truncate text-[11px] text-inksoft">{l.planner} · {l.city}</div>
                        </div>
                        {l.cold && <span className="shrink-0 rounded-full bg-warn/12 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase text-warn">cold {daysSince(l.lastTouchAt)}d</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <span className="rounded-full bg-plum/8 px-1.5 py-0.5 text-[10px] font-semibold text-plum2">{l.tierSuggestion} · {money(l.suggestedPrice)}</span>
                        <span className="rounded-full bg-ink/5 px-1.5 py-0.5 text-[10px] text-inksoft">{l.eventsPerYear}/yr</span>
                        <span className="rounded-full bg-ink/5 px-1.5 py-0.5 text-[10px] text-inksoft">{l.usesTool === "none" ? "no tool" : l.usesTool}</span>
                      </div>
                      <div className="mt-2"><Bar pct={l.score} className={l.score >= 75 ? "bg-gold" : "bg-plum3"} /></div>
                      {l.nextAction && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-gold/8 px-2 py-1.5 text-[10.5px] font-medium leading-snug text-[#8a6414]">
                          <Icon name="spark" size={11} className="mt-0.5 shrink-0" /> {l.nextAction}
                        </div>
                      )}
                      {block.blocked && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-alert/8 px-2 py-1.5 text-[10.5px] font-semibold leading-snug text-alert">
                          <Icon name="alert" size={11} className="mt-0.5 shrink-0" /> HOLD — Ops churn flag: {block.reason}
                        </div>
                      )}
                      {(stage === "new" || stage === "contacted" || stage === "followup") && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <Btn size="sm" variant="outline" disabled={drafting === l.id + (l.stage === "new" ? "outreach" : l.cold ? "nudge" : "followup")}
                            onClick={() => draft(l.id, l.stage === "new" ? "outreach" : l.cold ? "nudge" : "followup")}>
                            {drafting === l.id + (l.stage === "new" ? "outreach" : l.cold ? "nudge" : "followup")
                              ? <><span className="spin-slow inline-block h-3 w-3 rounded-full border-2 border-plum/20 border-t-plum" /> reasoning…</>
                              : <><Icon name="mail" size={12} /> {l.stage === "new" ? "Outreach" : l.cold ? "Nudge" : "Follow-up"}</>}
                          </Btn>
                          {l.touches > 0 && (
                            <Btn size="sm" variant="ghost" title="Log a reply you received" onClick={() => h.logReply(l.id, "later")}>
                              <Icon name="refresh" size={12} /> Reply: later
                            </Btn>
                          )}
                          <Btn size="sm" variant="ghost" onClick={() => h.markWon(l.id)} title="Mark won"><Icon name="check" size={12} /> Won</Btn>
                          <Btn size="sm" variant="ghost" onClick={() => h.markLost(l.id)} title="Mark lost"><Icon name="x" size={12} /></Btn>
                        </div>
                      )}
                      {stage === "won" && l.wonAt && <div className="mt-2 font-mono text-[9.5px] uppercase text-sage">closed {timeAgo(l.wonAt)} · handoff ran</div>}
                    </Card>
                  );
                })}
                {leads.length === 0 && <div className="rounded-lg border border-dashed border-line px-2 py-4 text-center text-[11px] text-inkmute">empty</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* tier legend */}
      <Card className="mb-6 p-4">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.15em] text-inkmute">Tier logic the Sales Agent reasons with</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {TIERS.map((t) => (
            <div key={t.name} className="rounded-lg border border-line bg-canvas/60 p-2.5">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[14px] font-bold">{t.name}</span>
                <span className="font-mono text-[11px] text-[#8a6414]">{money(t.price)}/event</span>
              </div>
              <div className="text-[11px] text-inksoft">{t.blurb} — {t.fit}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* add lead modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a planner lead — the agent qualifies it" wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Studio</span>
            <input className={inputCls} placeholder="e.g. Lotus & Line Events" value={f.studio} onChange={(e) => setF({ ...f, studio: e.target.value })} /></label>
          <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Planner name</span>
            <input className={inputCls} placeholder="e.g. Meera Kapoor" value={f.planner} onChange={(e) => setF({ ...f, planner: e.target.value })} /></label>
          <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">City</span>
            <select className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Events per year</span>
            <input type="number" min={1} className={inputCls} value={f.eventsPerYear} onChange={(e) => setF({ ...f, eventsPerYear: Math.max(1, Number(e.target.value) || 1) })} /></label>
          <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Current tooling</span>
            <select className={inputCls} value={f.usesTool} onChange={(e) => setF({ ...f, usesTool: e.target.value as Lead["usesTool"] })}>
              {["none", "Meragi", "WedMeGood", "spreadsheets"].map((t) => <option key={t} value={t}>{t === "none" ? "no tool yet" : t}</option>)}
            </select></label>
          <label className="block"><span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Source</span>
            <select className={inputCls} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as LeadSource })}>{SOURCES.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="block sm:col-span-2"><span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Notes (what you know about their situation)</span>
            <textarea className={`${inputCls} h-20 resize-none`} placeholder="e.g. Frustrated with WedMeGood commissions; runs 3 destination weddings a season…" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11px] text-inksoft">On save, the Sales Agent qualifies tier + score and shows its reasoning in the Activity log.</p>
          <Btn variant="gold" disabled={!f.studio.trim() || !f.planner.trim()} onClick={() => {
            h.addLead({ planner: f.planner.trim(), studio: f.studio.trim(), city: f.city, eventsPerYear: f.eventsPerYear, usesTool: f.usesTool, source: f.source, notes: f.notes.trim() || "—" });
            setAddOpen(false); setF({ ...f, planner: "", studio: "", notes: "" });
          }}><Icon name="plus" size={14} /> Qualify & add</Btn>
        </div>
      </Modal>
    </div>
  );
}
