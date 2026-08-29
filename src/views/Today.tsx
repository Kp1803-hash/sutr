import { useHelm } from "../lib/store";
import { AGENTS, money, timeAgo, type AgentId } from "../lib/types";
import { pipelineStats } from "../agents/sales";
import { healthScore } from "../agents/ops";
import { expiringDocs } from "../agents/vault";
import { AgentTag, Bar, Btn, Card, Dial, Dot, Icon } from "../components/ui";

const STAGES: Array<{ key: string; label: string; cls: string }> = [
  { key: "new", label: "New", cls: "bg-vault" },
  { key: "contacted", label: "Contacted", cls: "bg-orch" },
  { key: "followup", label: "Follow-up", cls: "bg-sales" },
  { key: "won", label: "Won", cls: "bg-ops" },
  { key: "lost", label: "Lost", cls: "bg-alert/70" },
];

export default function Today() {
  const h = useHelm();
  const { s } = h;
  const p = pipelineStats(s);
  const health = healthScore(s);
  const freshIdeas = s.ideas.filter((i) => i.status === "new").length;
  const escalated = s.risks.filter((r) => r.status === "open" && r.severity === "high").length;
  const expiring = expiringDocs(s.docs);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const crossEvents = s.activity.slice(0, 6);

  const digest = [
    { agent: "marketing" as AgentId, n: freshIdeas, label: freshIdeas === 1 ? "new idea" : "new ideas", sub: "from the 6 AM drop", view: "marketing" as const },
    { agent: "sales" as AgentId, n: p.draftsReady, label: "drafts to approve", sub: "nothing sends without you", view: "sales" as const },
    { agent: "ops" as AgentId, n: escalated, label: escalated === 1 ? "escalated risk" : "escalated risks", sub: escalated ? "needs a decision today" : "all clear", view: "ops" as const },
    { agent: "vault" as AgentId, n: expiring.length, label: "docs expiring", sub: expiring[0] ? `${expiring[0].name.split("—")[0].trim()} · soonest` : "nothing due", view: "vault" as const },
  ];

  const stageCounts = STAGES.map((st) => ({ ...st, count: s.leads.filter((l) => l.stage === st.key).length }));
  const totalLeads = s.leads.length || 1;

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* ======== Greeting + digest ======== */}
      <div className="col-span-12 xl:col-span-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-inkmute">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">
              {greet}, {s.settings.ownerName}.
            </h1>
            <p className="mt-0.5 text-[13.5px] text-inksoft">
              Your four agents worked overnight. Here's what needs your eyes — everything else handled itself.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between bg-pine px-5 py-3 text-canvas">
            <div className="flex items-center gap-2">
              <Icon name="bolt" size={15} className="text-sales" />
              <span className="font-display text-[14px] font-semibold">While you were out</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-canvas/45">
              bundled by the orchestrator · 6:05 AM
            </span>
          </div>
          <div className="stagger grid grid-cols-2 divide-x divide-line md:grid-cols-4">
            {digest.map((d) => (
              <button key={d.agent} onClick={() => h.go(d.view)} className="group px-4 py-4 text-left transition-colors hover:bg-canvas/60">
                <div className="flex items-center gap-1.5">
                  <Dot agent={d.agent} pulse={d.n > 0 && d.agent === "ops"} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-inkmute">{AGENTS[d.agent].name.replace(" Agent", "")}</span>
                </div>
                <div className="mt-1.5 font-display text-[30px] font-bold leading-none">{d.n}</div>
                <div className="mt-1 text-[12.5px] font-medium">{d.label}</div>
                <div className="flex items-center justify-between text-[11px] text-inksoft">
                  <span>{d.sub}</span>
                  <Icon name="chevR" size={13} className="opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* pipeline snapshot */}
        <Card className="mt-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-inkmute">Sales · pipeline snapshot</div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-display text-[30px] font-bold tracking-tight">{money(p.openValue)}</span>
                <span className="text-[12.5px] text-inksoft">{p.openCount} open leads · win rate {p.winRate}%</span>
              </div>
            </div>
            <Btn variant="outline" size="sm" onClick={() => h.go("sales")}>
              Open Sales <Icon name="chevR" size={13} />
            </Btn>
          </div>
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-ink/8">
            {stageCounts.filter((c) => c.count > 0).map((c) => (
              <div key={c.key} className={`anim-bar h-full ${c.cls}`} style={{ width: `${(c.count / totalLeads) * 100}%` }} title={`${c.label}: ${c.count}`} />
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            {stageCounts.map((c) => (
              <span key={c.key} className="flex items-center gap-1.5 text-[11.5px] text-inksoft">
                <span className={`h-2 w-2 rounded-sm ${c.cls}`} /> {c.label} <b className="text-ink">{c.count}</b>
              </span>
            ))}
            {p.coldCount > 0 && (
              <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-alert">
                <Icon name="alert" size={12} /> {p.coldCount} gone cold — nudges drafted
              </span>
            )}
          </div>
        </Card>

        {/* cross-agent wiring */}
        <Card className="mt-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-inkmute">Shared context store</div>
              <h2 className="font-display text-[18px] font-semibold">The crew talking to each other</h2>
            </div>
            <Btn variant="outline" size="sm" onClick={() => h.go("activity")}>
              Full log <Icon name="chevR" size={13} />
            </Btn>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {[
              { a: "sales" as AgentId, b: "ops" as AgentId, txt: "Deal closed → onboarding task auto-created", n: s.tasks.filter((t) => t.linkedLeadId).length, live: true },
              { a: "sales" as AgentId, b: "vault" as AgentId, txt: "Won deal → agreement auto-filed & tagged", n: s.docs.filter((d) => d.autoFiled).length, live: true },
              { a: "marketing" as AgentId, b: "sales" as AgentId, txt: "Campaign → closed-deal attribution", n: s.campaigns.reduce((x, c) => x + c.closedFromCampaign, 0), live: true },
            ].map((w, i) => (
              <div key={i} className="lift rounded-lg border border-line bg-canvas/50 p-3">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Dot agent={w.a} /> <Icon name="chevR" size={11} className="text-inkmute" /> <Dot agent={w.b} />
                </div>
                <p className="mt-1.5 text-[12.5px] font-medium leading-snug">{w.txt}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-inkmute">{w.n} live in store</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2.5">
            {crossEvents.map((e) => (
              <div key={e.id} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-canvas/70">
                <AgentTag agent={e.agent} size="sm" />
                <p className="flex-1 text-[12.5px] leading-snug text-ink/85">{e.text}</p>
                <span className="shrink-0 font-mono text-[10.5px] text-inkmute">{timeAgo(e.at)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ======== Right rail ======== */}
      <div className="col-span-12 space-y-4 xl:col-span-4">
        <Card className="p-5">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-inkmute">Operations · live</div>
          <div className="mt-2 flex items-center gap-5">
            <Dial score={health} />
            <div className="flex-1 space-y-2">
              {[
                { label: "High", n: s.risks.filter((r) => r.status === "open" && r.severity === "high").length, cls: "bg-alert" },
                { label: "Medium", n: s.risks.filter((r) => r.status === "open" && r.severity === "medium").length, cls: "bg-warn" },
                { label: "Low", n: s.risks.filter((r) => r.status === "open" && r.severity === "low").length, cls: "bg-ink/30" },
              ].map((r) => (
                <div key={r.label}>
                  <div className="mb-1 flex justify-between text-[11.5px]"><span className="text-inksoft">{r.label}</span><b>{r.n}</b></div>
                  <Bar pct={r.n * 34} className={r.cls} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn size="sm" onClick={() => h.runOpsScan()}><Icon name="refresh" size={13} /> Run health scan</Btn>
            <Btn size="sm" variant="outline" onClick={() => h.go("ops")}>Open Ops</Btn>
          </div>
        </Card>

        <Card className="p-5">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-inkmute">Agent status</div>
          <div className="mt-3 space-y-3">
            {(Object.keys(AGENTS) as AgentId[]).filter((a) => a !== "orchestrator").map((a) => (
              <div key={a} className="flex items-center gap-2.5">
                <Dot agent={a} pulse />
                <div className="flex-1 leading-tight">
                  <div className="text-[13px] font-semibold">{AGENTS[a].name}</div>
                  <div className="text-[11px] text-inksoft">{AGENTS[a].role}</div>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wide text-ops">on duty</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-marketing/20 bg-marketing/8 px-5 py-3">
            <div className="flex items-center gap-2 text-marketing">
              <Icon name="clock" size={14} />
              <span className="font-display text-[13.5px] font-semibold text-ink">Scheduled: 6:00 AM idea drop</span>
            </div>
          </div>
          <div className="p-5">
            <p className="text-[12.5px] leading-relaxed text-inksoft">
              Marketing reads Sales + Ops data from the shared store and queues {""}
              2–3 briefed ideas before you start work. Last run: <b className="text-ink">{s.lastDropAt ? timeAgo(s.lastDropAt) : "—"}</b>.
            </p>
            <div className="mt-3 flex gap-2">
              <Btn size="sm" variant="soft" onClick={() => h.runMorningDrop()}>
                <Icon name="spark" size={13} /> Preview today's drop
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => h.go("marketing")}>Open</Btn>
            </div>
          </div>
        </Card>

        <div className="rounded-xl border border-dashed border-line bg-canvas/50 p-4">
          <div className="flex items-start gap-2.5">
            <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-ops" />
            <p className="text-[12px] leading-relaxed text-inksoft">
              <b className="text-ink">Non-negotiables, enforced everywhere:</b> no email leaves without your click, no ad
              spend is committed by agents, every flag carries a “why”, and the Vault is access-controlled to you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
