import { useState } from "react";
import { useSutr } from "../lib/store";
import { EVENT, daysSince, daysUntil, timeAgo, type Severity } from "../lib/types";
import { healthScore } from "../agents/ops";
import { Btn, Card, Icon, ReasoningPanel, SectionHead, inputCls } from "../components/ui";

const SEV: Record<Severity, { label: string; cls: string }> = {
  high: { label: "high", cls: "bg-alert/12 text-alert border-alert/25" },
  medium: { label: "medium", cls: "bg-warn/12 text-warn border-warn/25" },
  low: { label: "low", cls: "bg-ink/5 text-inksoft border-line" },
};

export default function Ops() {
  const h = useSutr();
  const { s } = h;
  const [scanning, setScanning] = useState(false);
  const [tf, setTf] = useState({ title: "", owner: "Kabir", dueDays: 5, category: "onboarding" as "onboarding" | "support" | "event" });
  const score = healthScore(s);
  const open = s.risks.filter((r) => r.status === "open");
  const resolved = s.risks.filter((r) => r.status === "resolved");
  const eventDays = daysUntil(EVENT.dateISO);
  const openTickets = s.tickets.filter((t) => t.status === "open");

  const scan = () => {
    setScanning(true);
    setTimeout(() => { h.runOpsScan(); setScanning(false); }, 600);
  };

  return (
    <div>
      {/* ===== header ===== */}
      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a6414]">Operational health</div>
              <div className="flex items-baseline gap-2">
                <span className={`font-display text-[42px] font-black leading-none ${score >= 75 ? "text-sage" : score >= 55 ? "text-warn" : "text-alert"}`}>{score}</span>
                <span className="text-[13px] font-semibold text-inksoft">/100 · {open.length} open risk{open.length === 1 ? "" : "s"} · {open.filter((r) => r.severity === "high").length} high</span>
              </div>
            </div>
            <Btn variant="gold" onClick={scan} disabled={scanning}>
              {scanning ? <><span className="spin-slow inline-block h-3.5 w-3.5 rounded-full border-2 border-plum/20 border-t-plum" /> scanning store…</> : <><Icon name="gauge" size={15} /> Run health scan</>}
            </Btn>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-plum/8">
            <div className={`anim-bar h-full rounded-full ${score >= 75 ? "bg-sage" : score >= 55 ? "bg-warn" : "bg-alert"}`} style={{ width: `${score}%` }} />
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-inksoft">
            The scan joins onboarding tasks, support tickets, vendor statuses, closed deals and the event timeline from the shared store.
            Every flag carries a data trail — <b className="text-ink">no speculative risk-flagging</b>. High severity escalates immediately; the rest waits for the morning digest.
          </p>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-plum px-4 py-3 text-cream">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-goldsoft/80">Event timeline watch</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`font-display text-[30px] font-black leading-none ${eventDays <= 21 ? "text-alert" : "text-goldsoft"}`}>{eventDays}d</span>
              <span className="text-[12px] text-cream/70">to {EVENT.couple}</span>
            </div>
            <div className="text-[11px] text-cream/60">{EVENT.venue}</div>
          </div>
          <div className="space-y-2 p-4">
            {s.vendors.map((v) => (
              <div key={v.id} className="flex items-center gap-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${v.status === "ok" ? "bg-sage" : v.status === "watch" ? "bg-warn" : "bg-alert"} ${v.status === "delayed" ? "pulse-gold" : ""}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold">{v.name}</div>
                  <div className="truncate text-[10.5px] text-inksoft">{v.note}</div>
                </div>
                <select value={v.status} onChange={(e) => h.setVendor(v.id, e.target.value as "ok" | "watch" | "delayed")}
                  className="rounded-md border border-line bg-surface px-1.5 py-1 text-[11px] outline-none">
                  {["ok", "watch", "delayed"].map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ===== risk register ===== */}
      <SectionHead kicker="Every flag traces to specific store records" title={`Risk register (${open.length} open)`} />
      <div className="stagger mb-7 space-y-3">
        {open.map((r) => (
          <Card key={r.id} className={`overflow-hidden ${r.severity === "high" ? "border-alert/30" : ""}`}>
            <div className="flex flex-wrap items-center gap-2.5 border-b border-line/70 px-4 py-3">
              <span className={`rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wide ${SEV[r.severity].cls}`}>{SEV[r.severity].label}</span>
              <span className="rounded-full bg-plum/8 px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-plum2">{r.category}</span>
              <h3 className="flex-1 text-[14px] font-bold">{r.title}</h3>
              {r.severity === "high" && (
                <span className="flex items-center gap-1 font-mono text-[9.5px] font-semibold uppercase text-alert"><Icon name="alert" size={11} /> escalated immediately</span>
              )}
              <span className="font-mono text-[10px] text-inkmute">{timeAgo(r.createdAt)}</span>
            </div>
            <div className="grid gap-3 px-4 py-3.5 md:grid-cols-2">
              <div>
                <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-inkmute">Why this is a risk</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink/85">{r.why}</p>
              </div>
              <div>
                <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-inkmute">Recommended next step</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink/85">{r.recommendation}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line/70 px-4 py-2.5">
              {r.reasoning && <div className="flex-1"><ReasoningPanel r={r.reasoning} label="Data trail" /></div>}
              <Btn size="sm" variant="outline" onClick={() => h.resolveRisk(r.id)}><Icon name="check" size={13} /> Mark resolved</Btn>
            </div>
          </Card>
        ))}
        {open.length === 0 && (
          <Card className="p-10 text-center">
            <Icon name="shield" size={26} className="mx-auto text-sage" />
            <p className="mt-2 text-[13px] font-semibold text-sage">Register is clear.</p>
            <p className="text-[12px] text-inksoft">Run a scan after any change — new tickets, vendor updates, or closed deals.</p>
          </Card>
        )}
        {resolved.length > 0 && (
          <div className="rounded-lg border border-line bg-canvas/60 px-4 py-2.5 text-[11.5px] text-inksoft">
            <b>{resolved.length} resolved</b> this period — kept in the register for the audit trail: {resolved.slice(0, 3).map((r) => r.title).join(" · ")}
          </div>
        )}
      </div>

      {/* ===== onboarding + tickets ===== */}
      <div className="mb-7 grid gap-4 lg:grid-cols-2">
        <div>
          <SectionHead kicker="Planner onboarding pipeline" title="Tasks" />
          <Card className="divide-y divide-line/70">
            {s.tasks.map((t) => {
              const du = daysUntil(t.due);
              const late = t.status === "open" && du <= 0;
              const soon = t.status === "open" && du > 0 && du <= 3;
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <button onClick={() => h.toggleTask(t.id)}
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all ${t.status === "done" ? "border-sage bg-sage text-cream" : "border-line bg-surface hover:border-plum/40"}`}>
                    {t.status === "done" && <Icon name="check" size={12} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-[12.5px] font-medium ${t.status === "done" ? "text-inkmute line-through" : ""}`}>{t.title}</div>
                    <div className="font-mono text-[9.5px] uppercase tracking-wide text-inkmute">{t.category} · {t.owner}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${t.status === "done" ? "bg-ink/5 text-inkmute" : late ? "bg-alert/12 text-alert" : soon ? "bg-warn/12 text-warn" : "bg-ink/5 text-inksoft"}`}>
                    {t.status === "done" ? "done" : late ? "overdue" : `due in ${du}d`}
                  </span>
                </div>
              );
            })}
          </Card>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <input className={`${inputCls} min-w-[180px] flex-1`} placeholder="New task…" value={tf.title} onChange={(e) => setTf({ ...tf, title: e.target.value })} />
            <input type="number" min={0} className={`${inputCls} w-20`} value={tf.dueDays} onChange={(e) => setTf({ ...tf, dueDays: Math.max(0, Number(e.target.value) || 0) })} title="Days until due" />
            <select className={`${inputCls} w-32`} value={tf.category} onChange={(e) => setTf({ ...tf, category: e.target.value as typeof tf.category })}>
              {["onboarding", "support", "event"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <Btn variant="outline" disabled={!tf.title.trim()} onClick={() => { h.addTask({ title: tf.title.trim(), owner: tf.owner, dueDays: tf.dueDays, category: tf.category }); setTf({ ...tf, title: "" }); }}>
              <Icon name="plus" size={13} /> Add
            </Btn>
          </div>
        </div>

        <div>
          <SectionHead kicker="Support — the churn early-warning line" title={`Open tickets (${openTickets.length})`} />
          <Card className="divide-y divide-line/70">
            {openTickets.map((t) => {
              const planner = s.leads.find((l) => l.id === t.plannerId);
              const age = daysSince(t.openedAt);
              return (
                <div key={t.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold">{t.subject}</div>
                      <div className="font-mono text-[9.5px] uppercase tracking-wide text-inkmute">{planner?.studio ?? "—"} · opened {age}d ago {age >= 4 && <span className="text-alert">· past 48h SLA</span>}</div>
                    </div>
                    <Btn size="sm" variant="outline" onClick={() => h.resolveTicket(t.id)}><Icon name="check" size={12} /> Resolve</Btn>
                  </div>
                </div>
              );
            })}
            {openTickets.length === 0 && <div className="px-4 py-8 text-center text-[12.5px] text-inksoft">No open tickets — support is clear.</div>}
          </Card>
          <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-sage/30 bg-sage/8 p-3.5">
            <Icon name="shield" size={15} className="mt-0.5 shrink-0 text-sage" />
            <p className="text-[12px] leading-relaxed text-ink/80">
              <b>Why Ops watches tickets:</b> the stored churn pattern is setup-stall + open ticket inside week 3. When this list clears,
              the churn watch on affected accounts re-evaluates on the next scan — and Sales outreach unblocks automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
