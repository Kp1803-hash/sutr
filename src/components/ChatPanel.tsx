import React, { useEffect, useRef, useState } from "react";
import { useHelm } from "../lib/store";
import { timeAgo } from "../lib/types";
import { AGENTS } from "../lib/types";
import { AgentTag, Icon } from "./ui";

const QUICK = [
  "Status summary",
  "Why is the Maple Row install at risk?",
  "Draft a follow-up for Bluebird",
  "Run an ops health check",
  "Pull up the VoltEdge agreement",
];

export default function ChatPanel() {
  const h = useHelm();
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
    <div className="anim-slide-left fixed inset-y-0 right-0 z-40 flex w-full max-w-[430px] flex-col border-l border-line bg-surface shadow-2xl">
      {/* header */}
      <div className="flex items-center justify-between border-b border-pine3 bg-pine px-4 py-3.5 text-canvas">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-canvas/10">
            <Icon name="helm" size={18} />
          </span>
          <div>
            <div className="font-display text-[14px] font-bold leading-tight">Orchestrator</div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-canvas/45">
              routes to the right agent · logs everything
            </div>
          </div>
        </div>
        <button onClick={() => h.setChatOpen(false)} className="rounded-md p-1.5 text-canvas/60 transition-colors hover:bg-canvas/10 hover:text-canvas">
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* messages */}
      <div className="scroll-slim flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {s.chat.map((m) => (
          <div key={m.id} className={`anim-fade-up ${m.from === "you" ? "flex justify-end" : ""}`}>
            {m.from === "you" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2.5 text-[13px] leading-relaxed text-canvas">
                {m.text}
              </div>
            ) : (
              <div className="max-w-[95%]">
                <div className="mb-1 flex items-center gap-2">
                  {m.agent && <AgentTag agent={m.agent} size="sm" />}
                  <span className="font-mono text-[10px] text-inkmute">{timeAgo(m.at)}</span>
                </div>
                <div
                  className={`rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.agent && m.agent !== "orchestrator" ? `${AGENTS[m.agent].soft} ${AGENTS[m.agent].border}` : "border-line bg-canvas/70"
                  }`}
                >
                  <span className="whitespace-pre-line">{m.text}</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {s.typing && (
          <div className="anim-fade-up">
            <div className="mb-1"><AgentTag agent={s.typing} size="sm" /></div>
            <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-line bg-canvas/70 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-inksoft" style={{ animationDelay: `${i * 0.18}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* quick actions */}
      <div className="scroll-slim flex gap-1.5 overflow-x-auto border-t border-line px-3 py-2">
        {QUICK.map((q) => (
          <button
            key={q}
            onClick={() => h.sendChat(q)}
            className="shrink-0 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] text-inksoft transition-all hover:border-ink/30 hover:text-ink"
          >
            {q}
          </button>
        ))}
      </div>

      {/* input */}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line px-3 py-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask in plain language…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-canvas/70 px-3.5 py-2.5 text-[13.5px] outline-none transition-all focus:border-ink/30 focus:bg-surface focus:ring-2 focus:ring-ink/10"
        />
        <button
          type="submit"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink text-canvas transition-all hover:bg-pine3 active:scale-90 disabled:opacity-40"
          disabled={!text.trim()}
        >
          <Icon name="send" size={16} />
        </button>
      </form>

      <div className="border-t border-line bg-canvas/60 px-4 py-2 text-center font-mono text-[9.5px] uppercase tracking-[0.12em] text-inkmute">
        guardrails: no auto-send · no auto-spend · every answer explainable
      </div>
    </div>
  );
}
