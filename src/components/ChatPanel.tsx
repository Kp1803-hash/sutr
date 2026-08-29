import React, { useEffect, useRef, useState } from "react";
import { useSutr } from "../lib/store";
import { AGENTS, timeAgo } from "../lib/types";
import { AgentTag, Icon, ReasoningPanel } from "./ui";

const QUICK = [
  "Status summary",
  "Why is Riva at churn risk?",
  "Draft a follow-up for Aarav",
  "Run an ops health check",
  "Pull up the Meragi tear-down",
  "Generate new ideas",
];

export default function ChatPanel() {
  const h = useSutr();
  const { s } = h;
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [s.chat.length, s.typing, s.chatOpen]);

  if (!s.chatOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    h.sendChat(text.trim());
    setText("");
  };

  return (
    <div className="anim-slide-left fixed inset-y-0 right-0 z-40 flex w-full max-w-[440px] flex-col border-l border-line bg-surface shadow-2xl">
      <div className="plum-veil flex items-center justify-between bg-plum px-4 py-3.5 text-cream">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold text-plum">
            <Icon name="thread" size={17} />
          </span>
          <div>
            <div className="font-display text-[15px] font-bold leading-tight">Orchestrator</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-goldsoft/70">
              {s.engine.provider === "none" ? "routing · local inference" : `routing · ${s.engine.provider === "claude" ? "claude" : "openai"} reasoning`}
            </div>
          </div>
        </div>
        <button onClick={() => h.setChatOpen(false)} className="rounded-md p-1.5 text-cream/60 transition-colors hover:bg-cream/10 hover:text-cream">
          <Icon name="x" size={16} />
        </button>
      </div>

      <div className="scroll-slim flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {s.chat.map((m) => (
          <div key={m.id} className={`anim-fade-up ${m.from === "you" ? "flex justify-end" : ""}`}>
            {m.from === "you" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-plum px-3.5 py-2.5 text-[13px] leading-relaxed text-cream">
                {m.text}
              </div>
            ) : (
              <div className="max-w-[95%] space-y-1.5">
                <div className="flex items-center gap-2">
                  {m.agent && <AgentTag agent={m.agent} size="sm" />}
                  <span className="font-mono text-[10px] text-inkmute">{timeAgo(m.at)}</span>
                </div>
                <div className={`rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  m.agent && m.agent !== "orchestrator" ? `${AGENTS[m.agent].soft} ${AGENTS[m.agent].border}` : "border-line bg-canvas/70"
                }`}>
                  <span className="whitespace-pre-line">{m.text}</span>
                </div>
                {m.reasoning && <ReasoningPanel r={m.reasoning} />}
              </div>
            )}
          </div>
        ))}

        {s.typing && (
          <div className="anim-fade-up">
            <div className="mb-1"><AgentTag agent={s.typing} size="sm" /></div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-line bg-canvas/70 px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-inksoft" style={{ animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
              <div className="thinking-bar h-1 w-44 rounded-full" />
              <div className="font-mono text-[9.5px] uppercase tracking-wide text-inkmute">
                gathering store context → reasoning → grounding output
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="scroll-slim flex gap-1.5 overflow-x-auto border-t border-line px-3 py-2">
        {QUICK.map((q) => (
          <button key={q} onClick={() => h.sendChat(q)}
            className="shrink-0 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] text-inksoft transition-all hover:border-plum/40 hover:text-plum">
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line px-3 py-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask in plain language…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-canvas/70 px-3.5 py-2.5 text-[13.5px] outline-none transition-all focus:border-plum/40 focus:bg-surface focus:ring-2 focus:ring-plum/10"
        />
        <button type="submit" disabled={!text.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold text-plum transition-all hover:brightness-105 active:scale-90 disabled:opacity-40">
          <Icon name="send" size={16} />
        </button>
      </form>

      <div className="border-t border-line bg-canvas/60 px-4 py-2 text-center font-mono text-[9px] uppercase tracking-[0.13em] text-inkmute">
        guardrails: no auto-send · no auto-spend · no fabricated grounding
      </div>
    </div>
  );
}
