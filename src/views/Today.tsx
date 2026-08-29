import { useSutr } from "../lib/store";
import { AGENTS, EVENT, SEASON, daysUntil, isToday, timeAgo } from "../lib/types";
import { pipelineStats } from "../agents/sales";
import { healthScore } from "../agents/ops";
import { expiringDocs } from "../agents/vault";
import { Btn, Card, EngineChip, Icon } from "../components/ui";

export default function Today() {
  const h = useSutr();
  const { s } = h;
  const p = pipelineStats(s);
  const score = healthScore(s);
  const expiring = expiringDocs(s.docs, 45);
  const draftsReady = s.drafts.filter((d) => d.status === "ready");
  const newIdeas = s.ideas.filter((i) => i.status === "new");
  const highRisks = s.risks.filter((r) => r.status === "open" && r.severity === "high");
  const unread = s.notices.filter((n) => !n.read);
  const eventDays = daysUntil(EVENT.dateISO);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const feed = s.activity.slice(0, 7);

  return (
    <div>
      {/* ===== header band ===== */}
      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="plum-veil relative overflow-hidden rounded-2xl bg-plum p-6 text-cream">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-goldsoft/80">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · {SEASON.now}
          </div>
          <h2 className="mt-2 font-display text-[34px] font-black leading-tight">
            {greeting}, {s.settings.ownerName}.
          </h2>
          <p className="mt-1 max-w-[520px] text-[13.5px] leading-relaxed text-cream/70">
            {unread.length > 0
              ? `${unread.length} thing${unread.length > 1 ? "s" : ""} need${unread.length === 1 ? "s" : ""} you: ${draftsReady.length} draft${draftsReady.length === 1 ? "" : "s"} to approve, ${newIdeas.length} idea${newIdeas.length === 1 ? "" : "s"} from the 6 AM drop, ${highRisks.length} escalated risk${highRisks.length === 1 ? "" : "s"}.`
              : "Inbox is clear. The crew kept working while you were away — the feed below has the trail."}
          </p>
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border-l-2 border-gold bg-cream/6 px-3.5 py-2.5">
            <Icon name="calendar" size={15} className="mt-0.5 shrink-0 text-goldsoft" />
            <p className="text-[12.5px] leading-relaxed text-cream/85">
              <b className="text-goldsoft">{SEASON.window}.</b> {SEASON.insight}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {draftsReady.length > 0 && (
              <button onClick={() => h.go("sales")} className="lift flex items-center gap-2 rounded-full bg-gold px-3.5 py-2 text-[12.5px] font-bold text-plum">
                <Icon name="mail" size={13} /> Review {draftsReady.length} draft{draftsReady.length > 1 ? "s" : ""}
              </button>
            )}
            {newIdeas.length > 0 && (
              <button onClick={() => h.go("marketing")} className="lift flex items-center gap-2 rounded-full border border-rose/50 bg-rose/15 px-3.5 py-2 text-[12.5px] font-semibold text-cream">
                <Icon name="spark" size={13} className="text-rose" /> {newIdeas.length} idea{newIdeas.length > 1 ? "s" : ""} from the drop
              </button>
            )}
            {highRisks.length > 0 && (
              <button onClick={() => h.go("ops")} className="lift flex items-center gap-2 rounded-full border border-alert/60 bg-alert/20 px-3.5 py-2 text-[12.5px] font-semibold text-cream">
                <Icon name="alert" size={13} className="text-alert" /> {highRisks.length} escalated risk{highRisks.length > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Card className="flex-1 p-4">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-inkmute">Flagship event in the platform</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`font-display text-[40px] font-black leading-none ${eventDays <= 21 ? "text-alert" : "text-ink"}`}>{eventDays}</span>
              <span className="text-[13px] font-semibold text-inksoft">days to go</span>
            </div>
            <div className="mt-1 text-[13px] font-semibold">{EVENT.couple}</div>
            <div className="text-[11.5px] text-inksoft">{EVENT.venue}</div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-inksoft">
              <span className={`h-1.5 w-1.5 rounded-full ${s.vendors.filter((v) => v.status !== "ok").length ? "bg-warn" : "bg-sage"}`} />
              {s.vendors.filter((v) => v.status === "ok").length}/{s.vendors.length} vendors green · Ops watching the rest
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-inkmute">Ops health</span>
              <span className={`font-display text-[17px] font-bold ${score >= 75 ? "text-sage" : score >= 55 ? "text-warn" : "text-alert"}`}>{score}/100</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-plum/8">
              <div className={`anim-bar h-full rounded-full ${score >= 75 ? "bg-sage" : score >= 55 ? "bg-warn" : "bg-alert"}`} style={{ width: `${score}%` }} />
            </div>
            <button onClick={() => h.go("ops")} className="mt-2.5 flex items-center gap-1 text-[11.5px] font-semibold text-plum hover:underline">
              Open risk register <Icon name="chevR" size={11} />
            </button>
          </Card>
        </div>
      </div>

      {/* ===== four-agent snapshot ===== */}
      <div className="stagger mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <button onClick={() => h.go("sales")} className="text-left">
          <Card className="lift h-full overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gold/25 bg-gold/10 px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-gold" /><span className="text-[12.5px] font-bold">Sales</span>
              <span className="ml-auto font-mono text-[9px] uppercase tracking-wide text-inkmute">{p.openCount} open</span>
            </div>
            <div className="space-y-1.5 p-4 text-[12px] text-ink/85">
              <div className="flex justify-between"><span className="text-inksoft">Awaiting your approval</span><b>{p.draftsReady} drafts</b></div>
              <div className="flex justify-between"><span className="text-inksoft">Open pipeline</span><b>₹{(p.openValue / 1000).toFixed(0)}K/event</b></div>
              <div className="flex justify-between"><span className="text-inksoft">Win rate</span><b>{p.winRate}%</b></div>
              <div className="flex justify-between"><span className="text-inksoft">Cold leads</span><b className={p.coldCount ? "text-warn" : ""}>{p.coldCount}</b></div>
            </div>
          </Card>
        </button>
        <button onClick={() => h.go("marketing")} className="text-left">
          <Card className="lift h-full overflow-hidden">
            <div className="flex items-center gap-2 border-b border-rose/25 bg-rose/8 px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-rose" /><span className="text-[12.5px] font-bold">Marketing</span>
              <span className="ml-auto font-mono text-[9px] uppercase tracking-wide text-inkmute">6 AM drop</span>
            </div>
            <div className="space-y-1.5 p-4 text-[12px] text-ink/85">
              <div className="flex justify-between"><span className="text-inksoft">Ideas waiting</span><b>{newIdeas.length}</b></div>
              <div className="flex justify-between"><span className="text-inksoft">Campaigns live</span><b>{s.campaigns.filter((c) => c.status === "live").length}</b></div>
              <div className="flex justify-between"><span className="text-inksoft">Underperforming</span><b className={s.campaigns.some((c) => c.flag) ? "text-alert" : ""}>{s.campaigns.filter((c) => c.flag).length}</b></div>
              <div className="flex justify-between"><span className="text-inksoft">Last drop</span><b>{timeAgo(s.lastDropAt)}</b></div>
            </div>
          </Card>
        </button>
        <button onClick={() => h.go("ops")} className="text-left">
          <Card className="lift h-full overflow-hidden">
            <div className="flex items-center gap-2 border-b border-sage/25 bg-sage/10 px-4 py-2.5">
              <span className={`h-2 w-2 rounded-full bg-sage ${highRisks.length ? "pulse-gold" : ""}`} /><span className="text-[12.5px] font-bold">Operations</span>
              <span className="ml-auto font-mono text-[9px] uppercase tracking-wide text-inkmute">score {score}</span>
            </div>
            <div className="space-y-1.5 p-4 text-[12px] text-ink/85">
              <div className="flex justify-between"><span className="text-inksoft">Open risks</span><b className={highRisks.length ? "text-alert" : ""}>{s.risks.filter((r) => r.status === "open").length}</b></div>
              <div className="flex justify-between"><span className="text-inksoft">High severity</span><b className={highRisks.length ? "text-alert" : ""}>{highRisks.length}</b></div>
              <div className="flex justify-between"><span className="text-inksoft">Open tickets</span><b>{s.tickets.filter((t) => t.status === "open").length}</b></div>
              <div className="flex justify-between"><span className="text-inksoft">Event countdown</span><b>{eventDays}d</b></div>
            </div>
          </Card>
        </button>
        <button onClick={() => h.go("vault")} className="text-left">
          <Card className="lift h-full overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line bg-ivory/40 px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-plum3" /><span className="text-[12.5px] font-bold">Document Vault</span>
              <span className="ml-auto font-mono text-[9px] uppercase tracking-wide text-inkmute">{s.docs.length} docs</span>
            </div>
            <div className="space-y-1.5 p-4 text-[12px] text-ink/85">
              <div className="flex justify-between"><span className="text-inksoft">Nearing expiry</span><b className={expiring.length ? "text-warn" : ""}>{expiring.length}</b></div>
              <div className="flex justify-between"><span className="text-inksoft">Versioned</span><b>{s.docs.filter((d) => d.versions.length > 1).length}</b></div>
              <div className="flex justify-between"><span className="text-inksoft">Access</span><b>{s.settings.vaultAccess.length} {s.settings.vaultAccess.length === 1 ? "person" : "people"}</b></div>
              <div className="flex justify-between"><span className="text-inksoft">Searchable by</span><b>content, not name</b></div>
            </div>
          </Card>
        </button>
      </div>

      {/* ===== live thread feed ===== */}
      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a6414]">Live · the shared store at work</div>
              <h3 className="font-display text-[19px] font-bold">What the crew has been doing</h3>
            </div>
            <Btn size="sm" variant="outline" onClick={() => h.go("activity")}>Full log <Icon name="chevR" size={12} /></Btn>
          </div>
          <Card className="divide-y divide-line/70">
            {feed.map((e) => (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${AGENTS[e.agent].dot}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[12.5px] leading-snug ${isToday(e.at) ? "" : "text-inksoft"}`}>{e.text}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[9.5px] uppercase tracking-wide text-inkmute">{AGENTS[e.agent].name} · {timeAgo(e.at)}</span>
                    {e.reasoning && <EngineChip engine={e.reasoning.engine} />}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div>
          <div className="mb-2.5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a6414]">Cross-agent threads</div>
            <h3 className="font-display text-[19px] font-bold">Why they share one brain</h3>
          </div>
          <div className="space-y-2.5">
            {[
              { icon: "mail", text: "Ops flags a churn-risk planner → Sales automatically holds outreach on that account.", who: "ops → sales" },
              { icon: "megaphone", text: "Sales closes a deal → Marketing credits the source campaign with a real conversion.", who: "sales → marketing" },
              { icon: "file", text: "A closed deal → Vault files the signed contract, tagged from the document text.", who: "orchestrator → vault" },
              { icon: "gauge", text: "A resolved ticket → the churn-pattern watch re-evaluates on the next scan.", who: "support → ops" },
            ].map((c) => (
              <Card key={c.who} className="lift p-3.5">
                <div className="flex items-start gap-2.5">
                  <Icon name={c.icon} size={15} className="mt-0.5 shrink-0 text-[#8a6414]" />
                  <div>
                    <p className="text-[12px] leading-relaxed text-ink/85">{c.text}</p>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.13em] text-inkmute">{c.who}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
