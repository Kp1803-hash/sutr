import React, { useEffect, useMemo, useState } from "react";
import { useHelm } from "../lib/store";
import { AGENTS, type AgentId, type View } from "../lib/types";
import { expiringDocs } from "../agents/vault";
import { healthScore } from "../agents/ops";
import { Icon, AgentTag } from "./ui";
import ChatPanel from "./ChatPanel";
import Today from "../views/Today";
import Inbox from "../views/Inbox";
import Sales from "../views/Sales";
import Marketing from "../views/Marketing";
import Ops from "../views/Ops";
import Vault from "../views/Vault";
import Activity from "../views/Activity";
import Settings from "../views/Settings";

const TITLES: Record<View, { title: string; sub: string }> = {
  today: { title: "Morning Brief", sub: "Everything your crew did while you slept" },
  inbox: { title: "Inbox", sub: "Notifications from all four agents" },
  sales: { title: "Sales Agent", sub: "Pipeline, drafts, and the send-nothing-without-you queue" },
  marketing: { title: "Marketing Agent", sub: "Idea drops, briefs, and the content calendar" },
  ops: { title: "Operations Agent", sub: "Risk register, tasks, and vendor watch" },
  vault: { title: "Document Vault", sub: "Every document, searchable by asking" },
  activity: { title: "Activity Log", sub: "Every agent action, auditable" },
  settings: { title: "Settings", sub: "Your rules — the agents follow them" },
};

function nextSixAM(): Date {
  const n = new Date();
  n.setHours(6, 0, 0, 0);
  if (n.getTime() <= Date.now()) n.setDate(n.getDate() + 1);
  return n;
}

export default function Shell() {
  const h = useHelm();
  const { s } = h;
  const [cmd, setCmd] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      h.checkDayRollover();
    }, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badges = useMemo(
    () => ({
      inbox: s.notices.filter((n) => !n.read).length,
      sales: s.drafts.filter((d) => d.status === "ready").length,
      marketing: s.ideas.filter((i) => i.status === "new").length,
      ops: s.risks.filter((r) => r.status === "open" && r.severity === "high").length,
      vault: expiringDocs(s.docs).length,
    }),
    [s]
  );

  const nav: Array<{ section: string; items: Array<{ view: View; icon: string; agent?: AgentId }> }> = [
    {
      section: "Overview",
      items: [
        { view: "today", icon: "helm" },
        { view: "inbox", icon: "inbox" },
      ],
    },
    {
      section: "Agents",
      items: [
        { view: "sales", icon: "target", agent: "sales" },
        { view: "marketing", icon: "megaphone", agent: "marketing" },
        { view: "ops", icon: "gauge", agent: "ops" },
        { view: "vault", icon: "lock", agent: "vault" },
      ],
    },
    {
      section: "System",
      items: [
        { view: "activity", icon: "pulse" },
        { view: "settings", icon: "sliders" },
      ],
    },
  ];

  const countdown = useMemo(() => {
    const ms = nextSixAM().getTime() - now.getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  }, [now]);

  const health = healthScore(s);

  const submitCmd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmd.trim()) return;
    h.sendChat(cmd.trim());
    setCmd("");
  };

  return (
    <div className="ambient flex h-screen overflow-hidden">
      {/* ============ Sidebar ============ */}
      <aside className="flex w-[228px] shrink-0 flex-col border-r border-pine3 bg-pine text-canvas">
        <button onClick={() => h.go("today")} className="group flex items-center gap-2.5 px-4 pb-4 pt-5 text-left">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-canvas/10 text-canvas transition-colors group-hover:bg-sales/80">
            <Icon name="helm" size={22} />
          </span>
          <span>
            <span className="block font-display text-[17px] font-bold leading-none tracking-tight">HELM</span>
            <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-[0.14em] text-canvas/45">
              {s.settings.businessName}
            </span>
          </span>
        </button>

        <nav className="scroll-slim flex-1 overflow-y-auto px-2.5">
          {nav.map((sec) => (
            <div key={sec.section} className="mb-4">
              <div className="px-2.5 pb-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-canvas/35">
                {sec.section}
              </div>
              {sec.items.map((item) => {
                const active = s.view === item.view;
                const label = item.view === "ops" ? "Operations" : item.view === "today" ? "Today" : item.view.charAt(0).toUpperCase() + item.view.slice(1);
                const badge = badges[item.view as keyof typeof badges];
                const accent = item.agent ? AGENTS[item.agent].dot : "bg-canvas";
                return (
                  <button
                    key={item.view}
                    onClick={() => h.go(item.view)}
                    className={`nav-item relative mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium ${
                      active ? "bg-pine3 text-canvas" : "text-canvas/65 hover:bg-pine2 hover:text-canvas"
                    }`}
                  >
                    {active && <span className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r ${accent}`} />}
                    <span className={active && item.agent ? AGENTS[item.agent!].text : ""}>
                      <Icon name={item.icon} size={16} />
                    </span>
                    <span className="flex-1 text-left">{label}</span>
                    {badge ? (
                      <span
                        className={`rounded-full px-1.5 py-px font-mono text-[10px] font-semibold ${
                          item.view === "ops" ? "bg-alert text-canvas" : item.view === "inbox" ? "bg-canvas text-pine" : "bg-canvas/15 text-canvas"
                        }`}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-pine3 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${s.settings.gmailConnected ? "bg-ops pulse-dot" : "bg-canvas/25"}`} />
            <span className="text-[11.5px] text-canvas/70">
              {s.settings.gmailConnected ? `Gmail · drafts only` : "Gmail not connected"}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-canvas/10 font-display text-[12px] font-bold">
              {s.settings.ownerName.charAt(0)}
            </span>
            <div className="leading-tight">
              <div className="text-[12px] font-medium text-canvas/90">{s.settings.ownerName} · Owner</div>
              <div className="font-mono text-[9.5px] text-canvas/40">4 agents on duty</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ============ Main ============ */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-4 border-b border-line bg-surface/80 px-6 py-3 backdrop-blur">
          <div className="min-w-0">
            <h1 className="truncate font-display text-[17px] font-bold leading-tight">{TITLES[s.view].title}</h1>
            <p className="truncate text-[11.5px] text-inksoft">{TITLES[s.view].sub}</p>
          </div>

          <form onSubmit={submitCmd} className="relative mx-auto w-full max-w-md">
            <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-inkmute" />
            <input
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder="Ask the crew… “why is that flagged?” “pull up the VoltEdge agreement”"
              className="w-full rounded-lg border border-line bg-canvas/70 py-2 pl-9 pr-3 text-[13px] outline-none transition-all placeholder:text-inkmute focus:border-ink/30 focus:bg-surface focus:ring-2 focus:ring-ink/10"
            />
          </form>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 lg:flex" title="Marketing's scheduled idea drop">
              <Icon name="clock" size={13} className="text-marketing" />
              <span className="font-mono text-[11px] text-inksoft">6 AM drop in {countdown}</span>
            </div>
            <div className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 xl:flex" title="Operations health score">
              <Icon name="gauge" size={13} className={health >= 75 ? "text-ops" : health >= 50 ? "text-warn" : "text-alert"} />
              <span className="font-mono text-[11px] text-inksoft">ops {health}</span>
            </div>
          </div>
        </header>

        <main className="scroll-slim min-h-0 flex-1 overflow-y-auto">
          <div key={s.view} className="anim-fade-up mx-auto max-w-[1180px] px-6 py-6">
            {s.view === "today" && <Today />}
            {s.view === "inbox" && <Inbox />}
            {s.view === "sales" && <Sales />}
            {s.view === "marketing" && <Marketing />}
            {s.view === "ops" && <Ops />}
            {s.view === "vault" && <Vault />}
            {s.view === "activity" && <Activity />}
            {s.view === "settings" && <Settings />}
          </div>
        </main>
      </div>

      {/* ============ Chat launcher ============ */}
      <button
        onClick={() => h.setChatOpen(!s.chatOpen)}
        className="group fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-pine py-2.5 pl-3.5 pr-5 text-canvas shadow-xl transition-all hover:scale-[1.03] hover:bg-pine3 active:scale-95"
      >
        <span className="relative grid h-7 w-7 place-items-center rounded-full bg-canvas/10">
          <Icon name="helm" size={17} />
          {s.typing && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-sales pulse-dot" />}
        </span>
        <span className="text-[13px] font-semibold">{s.chatOpen ? "Close" : "Ask the crew"}</span>
      </button>

      <ChatPanel />

      {/* ============ Toasts ============ */}
      <div className="pointer-events-none fixed bottom-5 left-[248px] z-50 flex w-[380px] flex-col gap-2">
        {s.toasts.map((t) => (
          <div key={t.id} className="anim-slide-left pointer-events-auto flex items-start gap-2.5 rounded-lg border border-pine3 bg-pine px-3.5 py-3 text-canvas shadow-xl">
            {t.agent && <span className="mt-1"><AgentTag agent={t.agent} size="sm" /></span>}
            <p className="flex-1 text-[12.5px] leading-snug">{t.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
