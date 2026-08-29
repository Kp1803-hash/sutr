import { useEffect, useState } from "react";
import { useSutr } from "../lib/store";
import { money, timeAgo } from "../lib/types";
import { findUnderperformers } from "../agents/marketing";
import { Bar, Btn, Card, Icon, ReasoningPanel, SectionHead } from "../components/ui";

function nextDrop(): Date {
  const d = new Date();
  d.setHours(6, 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

export default function Marketing() {
  const h = useSutr();
  const { s } = h;
  const [countdown, setCountdown] = useState("");
  const [dropping, setDropping] = useState(false);
  const fresh = s.ideas.filter((i) => i.status === "new");
  const past = s.ideas.filter((i) => i.status !== "new").slice(0, 5);
  const weak = findUnderperformers(s);

  useEffect(() => {
    const tick = () => {
      const ms = nextDrop().getTime() - Date.now();
      const hh = Math.floor(ms / 3600000);
      const mm = Math.floor((ms % 3600000) / 60000);
      setCountdown(`${hh}h ${mm}m`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const runDrop = async () => {
    setDropping(true);
    await h.runMorningDrop();
    setDropping(false);
  };

  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86400000));
  const slotFor = (d: Date) => s.calendar.filter((c) => new Date(c.date).toDateString() === d.toDateString());

  return (
    <div>
      {/* ===== 6 AM drop ===== */}
      <Card className="mb-6 overflow-hidden">
        <div className="plum-veil flex flex-wrap items-center justify-between gap-4 bg-plum px-5 py-4 text-cream">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-rose/25 text-rose">
              <Icon name="megaphone" size={19} />
            </span>
            <div>
              <div className="font-display text-[17px] font-bold">The 6:00 AM idea drop</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.13em] text-cream/50">
                scheduled trigger · last run {timeAgo(s.lastDropAt)} · reasons from sales + ops + stored research
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-cream/10 px-3 py-1.5 font-mono text-[11px] text-cream/80">
              next drop in {countdown}
            </span>
            <button onClick={runDrop} disabled={dropping}
              className="flex items-center gap-1.5 rounded-lg bg-rose px-3.5 py-2 text-[13px] font-semibold text-cream transition-all hover:brightness-110 active:scale-95 disabled:opacity-60">
              {dropping ? <><span className="spin-slow inline-block h-3.5 w-3.5 rounded-full border-2 border-cream/30 border-t-cream" /> reasoning…</> : <><Icon name="spark" size={14} /> Run the drop now</>}
            </button>
          </div>
        </div>
        <div className="grid divide-x divide-line md:grid-cols-3">
          {[
            { k: "Inputs", v: "Brand voice · budget cap · stored FY25 research · live campaign numbers", icon: "calendar" },
            { k: "Engine", v: s.engine.provider === "none" ? "Transparent local inference (connect a model in Settings for Claude/OpenAI reasoning)" : `Reasoned by ${s.engine.provider === "claude" ? "Claude" : "OpenAI"} (${s.engine.model}) over the shared store`, icon: "brain" },
            { k: "Guardrail", v: `Proposes budgets ≤ ${money(s.settings.weeklyBudgetCap)}/wk — never commits spend`, icon: "shield" },
          ].map((c) => (
            <div key={c.k} className="flex items-start gap-2.5 px-4 py-3">
              <Icon name={c.icon} size={15} className="mt-0.5 shrink-0 text-rose" />
              <div>
                <div className="font-mono text-[9.5px] uppercase tracking-[0.15em] text-inkmute">{c.k}</div>
                <div className="text-[12px] leading-snug text-ink/85">{c.v}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ===== ideas ===== */}
      <SectionHead kicker="Briefs · approve or dismiss" title={`Today's ideas (${fresh.length})`} />
      <div className="stagger mb-7 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {fresh.map((i) => (
          <Card key={i.id} className="lift flex flex-col overflow-hidden">
            <div className="border-b border-line bg-rose/6 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-rose/12 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-rose">{i.channel}</span>
                <span className="font-mono text-[10.5px] text-inkmute">{timeAgo(i.createdAt)}</span>
              </div>
              <h3 className="mt-2 font-display text-[16px] font-bold leading-snug">{i.title}</h3>
            </div>
            <div className="flex-1 space-y-2.5 p-4 text-[12.5px]">
              {[["Objective", i.objective], ["Audience", i.audience], ["Message", i.message], ["Format", i.format], ["Seasonality", i.seasonality]].map(([k, v]) => (
                <div key={k}>
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-inkmute">{k}</div>
                  <div className="leading-snug text-ink/85">{v}</div>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg bg-canvas/70 px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-wide text-inkmute">Proposed budget</span>
                <span className="font-display text-[14px] font-bold">{i.budgetMin === 0 ? "₹0" : money(i.budgetMin)}–{money(i.budgetMax)}</span>
              </div>
              <ReasoningPanel r={i.reasoning} label="Why this idea, this week" />
            </div>
            <div className="flex gap-2 border-t border-line p-3">
              <Btn size="sm" className="flex-1 justify-center" onClick={() => h.approveIdea(i.id)}><Icon name="check" size={13} /> Approve → brief + calendar</Btn>
              <Btn size="sm" variant="ghost" onClick={() => h.dismissIdea(i.id)}>Dismiss</Btn>
            </div>
          </Card>
        ))}
        {fresh.length === 0 && (
          <Card className="p-8 text-center lg:col-span-2 xl:col-span-3">
            <Icon name="spark" size={26} className="mx-auto text-inkmute" />
            <p className="mt-2 text-[13px] text-inksoft">Queue is clear — run the drop for fresh ideas reasoned from live store data.</p>
          </Card>
        )}
      </div>

      {/* ===== campaigns ===== */}
      <SectionHead
        kicker="Live performance · attribution flows in from Sales"
        title="Campaigns"
        right={weak.length ? (
          <span className="flex items-center gap-1.5 rounded-full bg-warn/12 px-2.5 py-1 text-[11.5px] font-medium text-warn">
            <Icon name="alert" size={12} /> {weak.length} underperforming — with reasoned diagnosis
          </span>
        ) : undefined}
      />
      <Card className="mb-7 overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.12em] text-inkmute">
              <th className="px-4 py-2.5 font-medium">Campaign</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Budget / spent</th>
              <th className="px-3 py-2.5 font-medium">CTR</th>
              <th className="px-3 py-2.5 font-medium">Leads</th>
              <th className="px-3 py-2.5 font-medium">Closed (from Sales)</th>
            </tr>
          </thead>
          <tbody>
            {s.campaigns.map((c) => (
              <tr key={c.id} className="border-b border-line/60 align-top transition-colors last:border-0 hover:bg-canvas/60">
                <td className="max-w-[300px] px-4 py-3">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-[11px] text-inksoft">{c.channel}</div>
                  {c.flag && (
                    <div className="mt-1.5 space-y-1.5">
                      <div className="flex items-start gap-1 text-[11px] font-medium text-warn"><Icon name="alert" size={11} className="mt-0.5 shrink-0" /> {c.flag}</div>
                      {c.flagReasoning && <ReasoningPanel r={c.flagReasoning} label="Why it's underperforming" />}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${
                    c.status === "live" ? "bg-sage/12 text-[#55633f]" : c.status === "planned" ? "bg-vault/10 text-plum3" : "bg-ink/6 text-inksoft"
                  }`}>{c.status}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="mb-1 font-mono text-[11px]">{money(c.spent)} / {money(c.budget)}</div>
                  <div className="w-28"><Bar pct={c.budget ? (c.spent / c.budget) * 100 : 0} className="bg-rose" /></div>
                </td>
                <td className={`px-3 py-3 font-display text-[15px] font-bold ${c.ctr > 0 && c.ctr < 1.5 ? "text-alert" : ""}`}>{c.ctr ? `${c.ctr}%` : "—"}</td>
                <td className="px-3 py-3 font-display text-[15px] font-bold">{c.leads || "—"}</td>
                <td className="px-3 py-3">
                  {c.converted > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/12 px-2 py-0.5 text-[11.5px] font-semibold text-[#55633f]">
                      <Icon name="check" size={11} /> {c.converted} deal{c.converted > 1 ? "s" : ""} closed
                    </span>
                  ) : <span className="text-inkmute">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ===== calendar + history ===== */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHead kicker="Rolling 7 days" title="Content calendar" />
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d, idx) => {
              const slots = slotFor(d);
              return (
                <div key={idx} className={`min-h-[110px] rounded-lg border p-2 ${idx === 0 ? "border-rose/40 bg-rose/6" : "border-line bg-surface"}`}>
                  <div className={`font-mono text-[9.5px] uppercase tracking-wide ${idx === 0 ? "text-rose" : "text-inkmute"}`}>
                    {d.toLocaleDateString(undefined, { weekday: "short" })} <span className="text-ink">{d.getDate()}</span>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {slots.map((sl) => (
                      <div key={sl.id} className="rounded-md border-l-2 border-rose bg-rose/8 px-1.5 py-1 text-[10px] font-medium leading-tight">
                        {sl.label}
                        <div className="font-mono text-[8.5px] uppercase text-inkmute">{sl.channel}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <SectionHead kicker="History" title="Past ideas" />
          <Card className="divide-y divide-line/70">
            {past.map((i) => (
              <div key={i.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                <Icon name={i.status === "approved" ? "check" : "x"} size={13} className={i.status === "approved" ? "text-sage" : "text-inkmute"} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium">{i.title}</div>
                  <div className="font-mono text-[9.5px] uppercase text-inkmute">{i.status} · {timeAgo(i.createdAt)}</div>
                </div>
              </div>
            ))}
            {past.length === 0 && <div className="px-4 py-6 text-center text-[12px] text-inkmute">No history yet.</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}
