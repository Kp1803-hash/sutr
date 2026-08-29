import { useHelm } from "../lib/store";
import { money, timeAgo } from "../lib/types";
import { findUnderperformers } from "../agents/marketing";
import { Bar, Btn, Card, Icon, SectionHead, Why } from "../components/ui";

export default function Marketing() {
  const h = useHelm();
  const { s } = h;
  const fresh = s.ideas.filter((i) => i.status === "new");
  const past = s.ideas.filter((i) => i.status !== "new").slice(0, 5);
  const weak = findUnderperformers(s);

  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86400000));
  const slotFor = (d: Date) => s.calendar.filter((c) => new Date(c.date).toDateString() === d.toDateString());

  return (
    <div>
      {/* ============ 6 AM drop ============ */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-pine px-5 py-4 text-canvas">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-marketing/25 text-marketing">
              <Icon name="megaphone" size={19} />
            </span>
            <div>
              <div className="font-display text-[16px] font-bold">The 6:00 AM idea drop</div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.13em] text-canvas/50">
                scheduled trigger · last run {s.lastDropAt ? timeAgo(s.lastDropAt) : "—"} · reads sales + ops data
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-canvas/10 px-3 py-1.5 font-mono text-[11px] text-canvas/80">
              {fresh.length} waiting for you
            </span>
            <button
              onClick={() => h.runMorningDrop()}
              className="flex items-center gap-1.5 rounded-lg bg-marketing px-3.5 py-2 text-[13px] font-semibold text-canvas transition-all hover:brightness-110 active:scale-95"
            >
              <Icon name="spark" size={14} /> Run the drop now
            </button>
          </div>
        </div>
        <div className="grid gap-0 divide-x divide-line md:grid-cols-3">
          {[
            { k: "Inputs", v: "Brand voice · budget cap · past performance", icon: "sliders" },
            { k: "Engine", v: "Reads stalled leads, CTR floors, closed deals from the shared store", icon: "helm" },
            { k: "Guardrail", v: `Proposes budgets ≤ ${money(s.settings.weeklyBudgetCap)}/wk — never commits spend`, icon: "shield" },
          ].map((c) => (
            <div key={c.k} className="flex items-start gap-2.5 px-4 py-3">
              <Icon name={c.icon} size={15} className="mt-0.5 shrink-0 text-marketing" />
              <div>
                <div className="font-mono text-[9.5px] uppercase tracking-[0.15em] text-inkmute">{c.k}</div>
                <div className="text-[12px] leading-snug text-ink/85">{c.v}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ============ Idea queue ============ */}
      <SectionHead kicker="Briefs · approve or dismiss" title={`Today's ideas (${fresh.length})`} />
      <div className="stagger mb-7 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {fresh.map((i) => (
          <Card key={i.id} className="lift flex flex-col overflow-hidden">
            <div className="border-b border-line bg-marketing/6 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-marketing/12 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-marketing">
                  {i.channel}
                </span>
                <span className="font-mono text-[10.5px] text-inkmute">{timeAgo(i.createdAt)}</span>
              </div>
              <h3 className="mt-2 font-display text-[15px] font-semibold leading-snug">{i.title}</h3>
            </div>
            <div className="flex-1 space-y-2.5 p-4 text-[12.5px]">
              {[
                ["Objective", i.objective],
                ["Audience", i.audience],
                ["Message", i.message],
                ["Format", i.format],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-inkmute">{k}</div>
                  <div className="leading-snug text-ink/85">{v}</div>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg bg-canvas/70 px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-wide text-inkmute">Proposed budget</span>
                <span className="font-display text-[14px] font-bold">{i.budgetMin === 0 ? "$0" : money(i.budgetMin)}–{money(i.budgetMax)}</span>
              </div>
              <Why text={i.why} label="Why this idea?" />
            </div>
            <div className="flex gap-2 border-t border-line p-3">
              <Btn size="sm" className="flex-1 justify-center" onClick={() => h.approveIdea(i.id)}>
                <Icon name="check" size={13} /> Approve → brief + calendar
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => h.dismissIdea(i.id)}>Dismiss</Btn>
            </div>
          </Card>
        ))}
        {fresh.length === 0 && (
          <Card className="p-8 text-center lg:col-span-2 xl:col-span-3">
            <Icon name="spark" size={26} className="mx-auto text-inkmute" />
            <p className="mt-2 text-[13px] text-inksoft">Queue is clear — run the drop for fresh ideas drawn from live store data.</p>
          </Card>
        )}
      </div>

      {/* ============ Campaigns ============ */}
      <SectionHead
        kicker="Live performance · attribution from the shared store"
        title="Campaigns"
        right={weak.length ? (
          <span className="flex items-center gap-1.5 rounded-full bg-warn/10 px-2.5 py-1 text-[11.5px] font-medium text-warn">
            <Icon name="alert" size={12} /> {weak.length} underperforming — flagged
          </span>
        ) : undefined}
      />
      <Card className="mb-7 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[12.5px]">
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
              <tr key={c.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-canvas/60">
                <td className="px-4 py-3">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-[11px] text-inksoft">{c.channel}</div>
                  {c.flagged && (
                    <div className="mt-1 flex items-start gap-1 text-[11px] font-medium text-warn">
                      <Icon name="alert" size={11} className="mt-0.5 shrink-0" /> {c.flagged}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${
                    c.status === "live" ? "bg-ops/10 text-ops" : c.status === "planned" ? "bg-vault/10 text-vault" : "bg-ink/6 text-inksoft"
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="mb-1 font-mono text-[11px]">{money(c.spent)} / {money(c.budget)}</div>
                  <div className="w-28"><Bar pct={(c.spent / c.budget) * 100} className="bg-marketing" /></div>
                </td>
                <td className={`px-3 py-3 font-display text-[15px] font-bold ${c.ctr < 1.5 && c.status === "live" ? "text-alert" : ""}`}>
                  {c.ctr ? `${c.ctr}%` : "—"}
                </td>
                <td className="px-3 py-3 font-display text-[15px] font-bold">{c.leadsGenerated || "—"}</td>
                <td className="px-3 py-3">
                  {c.closedFromCampaign > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ops/10 px-2 py-0.5 text-[11.5px] font-semibold text-ops">
                      <Icon name="check" size={11} /> {c.closedFromCampaign} deal{c.closedFromCampaign > 1 ? "s" : ""} closed
                    </span>
                  ) : (
                    <span className="text-inkmute">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ============ Calendar ============ */}
      <div className="mb-7 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHead kicker="Rolling 7 days" title="Content calendar" />
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d, idx) => {
              const slots = slotFor(d);
              return (
                <div key={idx} className={`min-h-[104px] rounded-lg border p-2 ${idx === 0 ? "border-marketing/40 bg-marketing/6" : "border-line bg-surface"}`}>
                  <div className={`font-mono text-[9.5px] uppercase tracking-wide ${idx === 0 ? "text-marketing" : "text-inkmute"}`}>
                    {d.toLocaleDateString(undefined, { weekday: "short" })}
                    <span className="ml-1 text-ink">{d.getDate()}</span>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {slots.map((sl) => (
                      <div key={sl.id} className="rounded-md border-l-2 border-marketing bg-marketing/8 px-1.5 py-1 text-[10px] font-medium leading-tight">
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
                <Icon name={i.status === "approved" ? "check" : "x"} size={13} className={i.status === "approved" ? "text-ops" : "text-inkmute"} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium">{i.title}</div>
                  <div className="font-mono text-[9.5px] uppercase text-inkmute">{i.status} · {timeAgo(i.createdAt)}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
