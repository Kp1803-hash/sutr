import { useEffect, useState } from "react";
import { useSutr } from "../lib/store";
import { AGENTS, timeAgo, type AgentId, type View } from "../lib/types";
import { expiringDocs } from "../agents/vault";
import { Icon } from "./ui";
import ChatPanel from "./ChatPanel";
import KeyGate from "./KeyGate";
import Today from "../views/Today";
import Inbox from "../views/Inbox";
import Sales from "../views/Sales";
import Marketing from "../views/Marketing";
import Ops from "../views/Ops";
import Vault from "../views/Vault";
import Activity from "../views/Activity";
import Settings from "../views/Settings";

const TITLES: Record<View, { title: string; sub: string }> = {
  today: { title: "Morning Brief", sub: "every thread of your day, connected" },
  inbox: { title: "Inbox", sub: "notices and escalations from the crew" },
  sales: { title: "Sales", sub: "planner pipeline · drafts you approve, never auto-sent" },
  marketing: { title: "Marketing", sub: "the 6 AM drop, campaigns, content calendar" },
  ops: { title: "Operations", sub: "onboarding, tickets, vendors, event timeline" },
  vault: { title: "Document Vault", sub: "single source of truth · access-controlled" },
  activity: { title: "Activity Log", sub: "every agent action, with its reasoning" },
  settings: { title: "Settings", sub: "reasoning engine, rules, integrations, access" },
};

export default function Shell() {
  const h = useSutr();
  const { s } = h;
  const [gateOpen, setGateOpen] = useState(
    () => s.engine.provider === "none" && localStorage.getItem("sutr.gate.dismissed") !== "1"
  );
  const [bellOpen, setBellOpen] = useState(false);
  const [cmd, setCmd] = useState("");

  useEffect(() => { h.checkDayRollover(); /* eslint-disable-next-line */ }, []);

  const unread = s.notices.filter((n) => !n.read).length;
  const draftsReady = s.drafts.filter((d) => d.status === "ready").length;
  const newIdeas = s.ideas.filter((i) => i.status === "new").length;
  const openRisks = s.risks.filter((r) => r.status === "open").length;
  const highRisks = s.risks.filter((r) => r.status === "open" && r.severity === "high").length;
  const expiring = expiringDocs(s.docs, 45).length;

  const nav = (v: View, icon: string, label: string, badge?: number, badgeCls?: string) => (
    <button
      onClick={() => { h.go(v); setBellOpen(false); }}
      className={`nav-item flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] ${
        s.view === v ? "bg-cream/12 text-cream" : "text-cream/60 hover:bg-cream/6 hover:text-cream/90"
      }`}
    >
      <Icon name={icon} size={15} />
      <span className="flex-1 font-medium">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold ${badgeCls ?? "bg-cream/15 text-cream"}`}>{badge}</span>
      )}
    </button>
  );

  const agentNav = (id: AgentId, v: View, icon: string, label: string, badge?: number, badgeCls?: string) => (
    <button
      onClick={() => { h.go(v); setBellOpen(false); }}
      className={`nav-item flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] ${
        s.view === v ? "bg-cream/12 text-cream" : "text-cream/60 hover:bg-cream/6 hover:text-cream/90"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${AGENTS[id].dot} ${id === "ops" && highRisks ? "pulse-gold" : ""}`} />
      <Icon name={icon} size={15} />
      <span className="flex-1 font-medium">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold ${badgeCls ?? "bg-cream/15 text-cream"}`}>{badge}</span>
      )}
    </button>
  );

  const engineLabel =
    s.engine.provider === "claude" ? "Claude reasoning" :
    s.engine.provider === "openai" ? "OpenAI reasoning" : "Local inference";

  return (
    <div className="ambient flex h-full overflow-hidden">
      {/* ================= Sidebar ================= */}
      <aside className="plum-veil flex w-[248px] shrink-0 flex-col bg-plum text-cream">
        <div className="flex items-center gap-3 px-4 pb-4 pt-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-plum shadow-[0_4px_14px_rgba(201,150,46,0.4)]">
            <Icon name="thread" size={22} />
          </span>
          <div>
            <div className="font-display text-[21px] font-bold leading-none tracking-tight">Sutr</div>
            <div className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.22em] text-goldsoft/80">every thread, connected</div>
          </div>
        </div>

        <div className="scroll-slim flex-1 space-y-4 overflow-y-auto px-2.5 pb-4">
          <div>
            <div className="px-3 pb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-cream/35">Overview</div>
            {nav("today", "spark", "Morning Brief", unread, "bg-gold text-plum")}
            {nav("inbox", "inbox", "Inbox", unread, "bg-gold text-plum")}
          </div>
          <div>
            <div className="px-3 pb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-cream/35">Your crew</div>
            {agentNav("sales", "sales", "mail", "Sales", draftsReady, "bg-gold text-plum")}
            {agentNav("marketing", "marketing", "megaphone", "Marketing", newIdeas, "bg-rose/90 text-cream")}
            {agentNav("ops", "ops", "gauge", "Operations", openRisks, highRisks ? "bg-alert text-cream" : "bg-cream/15 text-cream")}
            {agentNav("vault", "vault", "file", "Document Vault", expiring, "bg-ivory/20 text-ivory")}
          </div>
          <div>
            <div className="px-3 pb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-cream/35">System</div>
            {nav("activity", "clock", "Activity Log")}
            {nav("settings", "key", "Settings")}
          </div>
        </div>

        <div className="border-t border-cream/10 p-3">
          <button onClick={() => { h.go("settings"); }} className="group flex w-full items-center gap-2.5 rounded-lg bg-cream/6 px-3 py-2.5 text-left transition-colors hover:bg-cream/10">
            <span className={`h-2 w-2 rounded-full ${s.engine.provider === "none" ? "bg-cream/40" : s.engine.status === "error" ? "bg-alert" : "bg-gold pulse-gold"}`} />
            <span className="flex-1">
              <span className="block text-[12px] font-semibold text-cream/90">{engineLabel}</span>
              <span className="block font-mono text-[9px] uppercase tracking-wide text-cream/40">
                {s.engine.provider === "none" ? "tap to connect a model" : s.engine.status === "error" ? "connection error" : s.engine.model}
              </span>
            </span>
            <Icon name="chevR" size={13} className="text-cream/40 transition-transform group-hover:translate-x-0.5" />
          </button>
          <div className="mt-2 px-1 text-center font-mono text-[8.5px] uppercase tracking-[0.14em] text-cream/30">
            no auto-send · no auto-spend · no invented data
          </div>
        </div>
      </aside>

      {/* ================= Main ================= */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-surface/80 px-6 py-3.5 backdrop-blur">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[21px] font-bold leading-tight text-ink">{TITLES[s.view].title}</h1>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-inkmute">{TITLES[s.view].sub}</p>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); if (cmd.trim()) { h.sendChat(cmd.trim()); setCmd(""); } }}
            className="relative hidden w-[330px] md:block"
          >
            <Icon name="search" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-inkmute" />
            <input
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder="Command the crew… “why is Riva at risk?”"
              className="w-full rounded-full border border-line bg-canvas/70 py-2 pl-9 pr-3 text-[12.5px] outline-none transition-all placeholder:text-inkmute focus:border-plum/40 focus:bg-surface focus:ring-2 focus:ring-plum/10"
            />
          </form>

          <div className="relative">
            <button onClick={() => setBellOpen(!bellOpen)} className="relative grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-inksoft transition-colors hover:border-plum/40 hover:text-plum">
              <Icon name="bell" size={16} />
              {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 font-mono text-[9px] font-bold text-plum">{unread}</span>}
            </button>
            {bellOpen && (
              <div className="anim-pop absolute right-0 top-11 z-40 w-[340px] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
                  <span className="text-[12.5px] font-bold">Notices</span>
                  <button onClick={() => { h.markAllRead(); }} className="text-[11px] font-medium text-inksoft hover:text-plum">Mark all read</button>
                </div>
                <div className="scroll-slim max-h-[320px] overflow-y-auto">
                  {s.notices.slice(0, 6).map((n) => (
                    <button key={n.id} onClick={() => { h.markRead(n.id); if (n.actionView) h.go(n.actionView); setBellOpen(false); }}
                      className="flex w-full items-start gap-2.5 border-b border-line/60 px-3.5 py-2.5 text-left transition-colors last:border-0 hover:bg-canvas/70">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? "bg-line" : AGENTS[n.agent].dot}`} />
                      <span className="min-w-0">
                        <span className={`block truncate text-[12px] ${n.read ? "text-inksoft" : "font-semibold text-ink"}`}>{n.title}</span>
                        <span className="block font-mono text-[9.5px] text-inkmute">{AGENTS[n.agent].name} · {timeAgo(n.at)}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <button onClick={() => { h.go("inbox"); setBellOpen(false); }} className="w-full border-t border-line px-3.5 py-2 text-center text-[11.5px] font-semibold text-plum transition-colors hover:bg-canvas/70">
                  Open full inbox
                </button>
              </div>
            )}
          </div>

          <button onClick={() => h.setChatOpen(true)} className="flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-[12.5px] font-bold text-plum shadow-sm transition-all hover:brightness-105 active:scale-95">
            <Icon name="thread" size={14} /> Ask the crew
          </button>
        </header>

        <main className="scroll-slim flex-1 overflow-y-auto px-6 py-5" onClick={() => bellOpen && setBellOpen(false)}>
          <div key={s.view} className="anim-fade-in mx-auto max-w-[1180px]">
            {s.view === "today" && <Today />}
            {s.view === "inbox" && <Inbox />}
            {s.view === "sales" && <Sales />}
            {s.view === "marketing" && <Marketing />}
            {s.view === "ops" && <Ops />}
            {s.view === "vault" && <Vault />}
            {s.view === "activity" && <Activity />}
            {s.view === "settings" && <Settings onConnectModel={() => setGateOpen(true)} />}
          </div>
        </main>
      </div>

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[380px] flex-col gap-2">
        {s.toasts.map((t) => (
          <div key={t.id} className="anim-slide-left pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-plum px-4 py-3 text-cream shadow-2xl">
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${t.agent ? AGENTS[t.agent].dot : "bg-gold"}`} />
            <p className="text-[12.5px] leading-snug">{t.text}</p>
          </div>
        ))}
      </div>

      <ChatPanel />
      <KeyGate open={gateOpen} onClose={() => { h.dismissGate(); setGateOpen(false); }} />
    </div>
  );
}
