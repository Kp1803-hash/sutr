import { useState } from "react";
import { useHelm } from "../lib/store";
import type { DraftKind, Lead, Stage } from "../lib/types";
import { daysSince, money, timeAgo } from "../lib/types";
import { stageLabel } from "../agents/sales";
import { Btn, Card, Icon, Modal, SectionHead, Why, inputCls } from "../components/ui";

const COLS: Array<{ key: Stage; label: string; hint: string }> = [
  { key: "new", label: "New", hint: "sourced, untouched" },
  { key: "contacted", label: "Contacted", hint: "first email out" },
  { key: "followup", label: "Follow-up", hint: "in the cadence" },
  { key: "won", label: "Won / Lost", hint: "closed" },
];

const kindFor = (l: Lead): DraftKind => (l.stage === "new" ? "outreach" : l.cold ? "nudge" : "followup");

export default function Sales() {
  const h = useHelm();
  const { s } = h;
  const [preview, setPreview] = useState<string | null>(null);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ company: "", contact: "", email: "", source: "website" as Lead["source"], value: "", notes: "" });

  const ready = s.drafts.filter((d) => d.status === "ready");
  const synced = s.drafts.filter((d) => d.status === "synced");
  const sentCount = s.drafts.filter((d) => d.status === "sent").length;
  const leadOf = (id: string) => s.leads.find((l) => l.id === id);
  const draft = s.drafts.find((d) => d.id === preview);

  const copy = async (subject: string, body: string) => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      h.toast("Email copied — paste it anywhere, or approve to sync to Gmail Drafts", "sales");
    } catch {
      h.toast("Clipboard blocked by browser — select and copy manually", "sales");
    }
  };

  const submitLead = () => {
    if (!form.company.trim() || !form.contact.trim()) return;
    h.addLead({
      company: form.company.trim(),
      contact: form.contact.trim(),
      email: form.email.trim() || "—",
      source: form.source,
      value: Number(form.value) || 0,
      notes: form.notes.trim(),
    });
    setForm({ company: "", contact: "", email: "", source: "website", value: "", notes: "" });
    setAddOpen(false);
  };

  return (
    <div>
      {/* guardrail */}
      <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-ops/25 bg-ops/8 px-4 py-2.5">
        <Icon name="shield" size={16} className="shrink-0 text-ops" />
        <p className="text-[12.5px] text-ink/80">
          <b>Hard rule:</b> this agent creates Gmail <b>drafts</b> — it can never send. You approve, you click send in Gmail.
          {!s.settings.gmailConnected && <span className="ml-1 font-medium text-alert">Gmail isn't connected — connect it in Settings to sync drafts.</span>}
        </p>
      </div>

      {/* ============ Draft queue ============ */}
      <SectionHead
        kicker="Draft-then-approve queue"
        title={`Ready for your review (${ready.length})`}
        right={sentCount ? <span className="font-mono text-[11px] text-inkmute">{sentCount} sent by you · tracked</span> : undefined}
      />
      <div className="stagger mb-7 grid gap-3 lg:grid-cols-2">
        {ready.map((d) => {
          const lead = leadOf(d.leadId);
          return (
            <Card key={d.id} className="lift overflow-hidden">
              <div className="flex items-center justify-between border-b border-line bg-canvas/60 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-sales/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-sales">{d.kind}</span>
                  <span className="text-[12px] font-medium">{lead?.company}</span>
                </div>
                <span className="font-mono text-[10.5px] text-inkmute">{timeAgo(d.createdAt)}</span>
              </div>
              <div className="p-4">
                <div className="font-mono text-[10.5px] uppercase tracking-wide text-inkmute">To: {lead?.email}</div>
                <div className="mt-1 font-display text-[14.5px] font-semibold leading-snug">{d.subject}</div>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-inksoft">{d.body}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Why text={d.why} label="Why this draft?" />
                  <Btn size="sm" variant="ghost" onClick={() => setPreview(d.id)}><Icon name="eye" size={13} /> Preview</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => copy(d.subject, d.body)}><Icon name="copy" size={13} /> Copy</Btn>
                  <span className="flex-1" />
                  <Btn size="sm" disabled={!s.settings.gmailConnected} onClick={() => h.approveDraft(d.id)} title={s.settings.gmailConnected ? "Creates the draft in your Gmail Drafts folder" : "Connect Gmail in Settings first"}>
                    <Icon name="mail" size={13} /> Approve → Gmail Drafts
                  </Btn>
                </div>
              </div>
            </Card>
          );
        })}
        {synced.map((d) => {
          const lead = leadOf(d.leadId);
          return (
            <Card key={d.id} className="border-ops/30 bg-ops/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="check" size={15} className="text-ops" />
                  <span className="text-[13px] font-semibold">{lead?.company} — synced to Gmail Drafts</span>
                </div>
                <span className="font-mono text-[10.5px] text-inkmute">{timeAgo(d.createdAt)}</span>
              </div>
              <p className="mt-1 text-[12px] text-inksoft">Waiting in <b className="text-ink">Gmail → Drafts</b>. Open it, press send, then tell me so I update the lead.</p>
              <div className="mt-2.5 flex gap-2">
                <Btn size="sm" variant="outline" onClick={() => copy(d.subject, d.body)}><Icon name="copy" size={13} /> Copy again</Btn>
                <Btn size="sm" onClick={() => h.markSent(d.id)}><Icon name="send" size={13} /> I sent it — update lead</Btn>
              </div>
            </Card>
          );
        })}
        {ready.length === 0 && synced.length === 0 && (
          <Card className="p-8 text-center lg:col-span-2">
            <Icon name="mail" size={26} className="mx-auto text-inkmute" />
            <p className="mt-2 text-[13px] text-inksoft">Queue is clear. Draft one from any lead below, or ask the crew in chat.</p>
          </Card>
        )}
      </div>

      {/* ============ Pipeline ============ */}
      <SectionHead
        kicker={`Lead database · ${s.leads.length} leads`}
        title="Pipeline"
        right={
          <Btn size="sm" onClick={() => setAddOpen(true)}>
            <Icon name="plus" size={13} /> Add lead
          </Btn>
        }
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLS.map((col) => {
          const leads = s.leads.filter((l) => (col.key === "won" ? l.stage === "won" || l.stage === "lost" : l.stage === col.key));
          return (
            <div key={col.key} className="rounded-xl border border-line bg-canvas/40 p-2.5">
              <div className="mb-2 flex items-baseline justify-between px-1">
                <span className="font-display text-[13.5px] font-semibold">{col.label}</span>
                <span className="font-mono text-[10.5px] text-inkmute">{leads.length} · {col.hint}</span>
              </div>
              <div className="space-y-2">
                {leads.map((l) => (
                  <Card key={l.id} className={`lift p-3 ${l.stage === "lost" ? "opacity-55" : ""} ${l.stage === "won" ? "border-ops/30" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold leading-tight">{l.company}</div>
                        <div className="truncate text-[11px] text-inksoft">{l.contact} · {l.source}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-display text-[14px] font-bold">{money(l.value)}</div>
                        {l.stage === "lost" ? (
                          <div className="font-mono text-[9.5px] uppercase text-alert">lost</div>
                        ) : l.stage === "won" ? (
                          <div className="font-mono text-[9.5px] uppercase text-ops">won</div>
                        ) : (
                          <div className="font-mono text-[9.5px] uppercase text-inkmute">{daysSince(l.lastTouchAt)}d since touch</div>
                        )}
                      </div>
                    </div>
                    {l.cold && l.stage !== "won" && l.stage !== "lost" && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-md bg-alert/8 px-2 py-1 text-[11px] font-medium text-alert">
                        <Icon name="alert" size={12} /> Cold — {daysSince(l.lastTouchAt)}d silent (threshold {s.settings.coldDays}d)
                      </div>
                    )}
                    {l.notes && <p className="mt-2 line-clamp-2 text-[11.5px] leading-snug text-inksoft">{l.notes}</p>}
                    {l.stage !== "won" && l.stage !== "lost" && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <Btn size="sm" variant="soft" onClick={() => h.requestDraft(l.id, kindFor(l))}>
                          <Icon name="mail" size={12} /> {kindFor(l) === "outreach" ? "Outreach" : kindFor(l) === "nudge" ? "Nudge" : "Follow-up"}
                        </Btn>
                        <Btn size="sm" variant="ghost" onClick={() => setReplyFor(replyFor === l.id ? null : l.id)}>
                          <Icon name="chevD" size={12} /> Log reply
                        </Btn>
                        <Btn size="sm" variant="ghost" className="text-ops" onClick={() => h.markWon(l.id)}>
                          <Icon name="check" size={12} /> Won
                        </Btn>
                      </div>
                    )}
                    {replyFor === l.id && (
                      <div className="anim-fade-up mt-2 rounded-lg border border-line bg-canvas/70 p-2.5">
                        <div className="mb-1.5 font-mono text-[9.5px] uppercase tracking-wide text-inkmute">
                          Reply sentiment (tracked from Gmail in production)
                        </div>
                        <div className="flex gap-1.5">
                          <Btn size="sm" variant="soft" className="text-ops" onClick={() => { h.logReply(l.id, "positive"); setReplyFor(null); }}>Positive → Won</Btn>
                          <Btn size="sm" variant="ghost" onClick={() => { h.logReply(l.id, "later"); setReplyFor(null); }}>“Not now”</Btn>
                          <Btn size="sm" variant="ghost" className="text-alert" onClick={() => { h.logReply(l.id, "no"); setReplyFor(null); }}>No fit</Btn>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
                {leads.length === 0 && (
                  <div className="rounded-lg border border-dashed border-line px-3 py-5 text-center text-[11.5px] text-inkmute">
                    Nothing here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.14em] text-inkmute">
        Sources: website forms · LinkedIn · referrals · trade shows · google ads · manual lists — add yours in Settings-free fashion above
      </p>

      {/* ============ Preview modal ============ */}
      <Modal open={!!draft} onClose={() => setPreview(null)} title="Draft preview — exactly what Gmail will hold" wide>
        {draft && (
          <div>
            <div className="rounded-lg border border-line bg-canvas/60 p-4">
              <div className="space-y-1 border-b border-line pb-3 font-mono text-[11.5px]">
                <div><span className="text-inkmute">From:</span> {s.settings.gmailAccount || "you (Gmail not connected)"}</div>
                <div><span className="text-inkmute">To:</span> {leadOf(draft.leadId)?.email}</div>
                <div><span className="text-inkmute">Subject:</span> <b>{draft.subject}</b></div>
              </div>
              <p className="whitespace-pre-line pt-3 text-[13.5px] leading-relaxed">{draft.body}</p>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-pine p-3 text-canvas">
              <Icon name="spark" size={14} className="mt-0.5 shrink-0 text-sales" />
              <p className="text-[12px] leading-relaxed">{draft.why}</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Btn variant="outline" onClick={() => copy(draft.subject, draft.body)}><Icon name="copy" size={14} /> Copy email</Btn>
              <Btn disabled={!s.settings.gmailConnected || draft.status !== "ready"} onClick={() => { h.approveDraft(draft.id); setPreview(null); }}>
                <Icon name="mail" size={14} /> Approve → Gmail Drafts
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ============ Add lead modal ============ */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a lead to the database">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Company *" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <input className={inputCls} placeholder="Contact person *" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <select className={inputCls} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as Lead["source"] })}>
              <option value="website">Website form</option>
              <option value="linkedin">LinkedIn</option>
              <option value="referral">Referral</option>
              <option value="trade-show">Trade show</option>
              <option value="google-ads">Google Ads</option>
              <option value="manual">Manual list</option>
            </select>
          </div>
          <input className={inputCls} placeholder="Deal value ($)" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <textarea className={`${inputCls} h-20 resize-none`} placeholder="Notes — pain points, context the agent should use" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Btn>
            <Btn onClick={submitLead} disabled={!form.company.trim() || !form.contact.trim()}>
              <Icon name="plus" size={14} /> Add lead
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
