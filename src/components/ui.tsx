import React, { useState } from "react";
import { AGENTS, type AgentId, type Reasoning } from "../lib/types";

/* ---------------- Icons (hand-drawn strokes) ---------------- */
const ICONS: Record<string, React.ReactNode> = {
  thread: <><path d="M4 19c5-1 6-8 8-8s3 7 8 6" /><path d="M4 7c5 1 6 8 8 8s3-7 8-6" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /></>,
  spark: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  send: <><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></>,
  megaphone: <><path d="M3 11v3a1 1 0 001 1h2l4 4V6L6 10H4a1 1 0 00-1 1z" /><path d="M14 6c2.5 1.5 2.5 10.5 0 12" /><path d="M17.5 4.5c4 2.5 4 12.5 0 15" /></>,
  gauge: <><path d="M4.5 19a9 9 0 1115 0" /><path d="M12 13l4-4" /><circle cx="12" cy="13" r="1.5" fill="currentColor" stroke="none" /></>,
  file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M4.5 12.5l5 5L19.5 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  chevR: <path d="M9 5l7 7-7 7" />,
  chevD: <path d="M5 9l7 7 7-7" />,
  bell: <><path d="M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7" /><path d="M10 20a2 2 0 004 0" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  upload: <><path d="M12 16V4M6 10l6-6 6 6" /><path d="M4 20h16" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20c1.2-3.4 4-4.8 7-4.8s5.8 1.4 7 4.8" /><path d="M16 4.6a3.5 3.5 0 010 6.8M18.5 15.4c1.7.7 3 2 3.5 4.6" /></>,
  alert: <><path d="M12 3L2 20h20z" /><path d="M12 9.5V14" /><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" /></>,
  refresh: <><path d="M20 12a8 8 0 10-2.3 5.6" /><path d="M20 6v6h-6" /></>,
  inbox: <><path d="M3 13l3-8h12l3 8v6H3z" /><path d="M3 13h5l1.5 2.5h5L16 13h5" /></>,
  key: <><circle cx="8" cy="14" r="4.5" /><path d="M11.5 10.5L20 2M16 6l3 3M13.5 8.5l2 2" /></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  arrowR: <path d="M4 12h16M13 5l7 7-7 7" />,
  brain: <><path d="M9.5 3.5A3 3 0 006 6.5a3.5 3.5 0 00-2 3.2c0 1 .4 1.9 1 2.6A3.7 3.7 0 006.5 19c.6 1.2 1.8 2 3.2 2 .9 0 1.6-.3 2.3-.8V4.8a3.4 3.4 0 00-2.5-1.3z" /><path d="M14.5 3.5A3 3 0 0118 6.5a3.5 3.5 0 012 3.2c0 1-.4 1.9-1 2.6a3.7 3.7 0 01-1.5 6.7c-.6 1.2-1.8 2-3.2 2-.9 0-1.6-.3-2.3-.8" /></>,
};

export function Icon({ name, size = 16, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      {ICONS[name] ?? ICONS.file}
    </svg>
  );
}

/* ---------------- Agent identity chips ---------------- */
export function AgentTag({ agent, size = "md" }: { agent: AgentId; size?: "sm" | "md" }) {
  const a = AGENTS[agent];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${a.border} ${a.soft} ${a.text} ${size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11.5px]"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} />
      {a.name}
    </span>
  );
}

export function EngineChip({ engine, model }: { engine: "claude" | "openai" | "local"; model?: string }) {
  if (engine === "local")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-plum/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-plum2">
        <Icon name="brain" size={11} /> Local inference
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a6414]">
      <Icon name="spark" size={11} /> {engine === "claude" ? "Claude" : "OpenAI"}{model ? ` · ${model}` : ""}
    </span>
  );
}

/* ---------------- Reasoning panel (the explainability requirement) ---------------- */
export function ReasoningPanel({ r, label = "Reasoning" }: { r?: Reasoning; label?: string }) {
  const [open, setOpen] = useState(false);
  if (!r) return null;
  return (
    <div className="rounded-lg border border-gold/25 bg-gold/6">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left">
        <span className="flex items-center gap-2 text-[11.5px] font-semibold text-[#8a6414]">
          <Icon name="brain" size={13} /> {label}
        </span>
        <span className="flex items-center gap-2">
          <EngineChip engine={r.engine} />
          <Icon name="chevD" size={13} className={`text-[#8a6414] transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="anim-fade-in border-t border-gold/20 px-3 py-2.5">
          <ol className="space-y-1.5">
            {r.steps.map((s, i) => (
              <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-ink/85">
                <span className="mt-0.5 font-mono text-[10px] font-semibold text-[#8a6414]">{i + 1}.</span>
                {s}
              </li>
            ))}
          </ol>
          {r.dataCited.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-inkmute">data cited:</span>
              {r.dataCited.map((c) => (
                <span key={c} className="rounded-full bg-surface px-2 py-0.5 text-[10.5px] font-medium text-ink/80 shadow-sm">{c}</span>
              ))}
            </div>
          )}
          <div className="mt-2 font-mono text-[9.5px] uppercase tracking-wide text-inkmute">
            {r.engine === "local" ? "transparent rule-based inference" : `${r.tokens ?? "?"} output tokens · ${(r.ms ?? 0) / 1000}s`}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Primitives ---------------- */
export function Btn({
  children, onClick, variant = "solid", size = "md", className = "", disabled, title,
}: {
  children: React.ReactNode; onClick?: () => void; variant?: "solid" | "gold" | "outline" | "ghost" | "danger";
  size?: "sm" | "md"; className?: string; disabled?: boolean; title?: string;
}) {
  const v = {
    solid: "bg-plum text-cream hover:bg-plum3",
    gold: "bg-gold text-plum font-semibold hover:brightness-105 shadow-sm",
    outline: "border border-line bg-surface text-ink hover:border-plum/40 hover:text-plum",
    ghost: "text-inksoft hover:bg-plum/6 hover:text-plum",
    danger: "border border-alert/30 bg-alert/8 text-alert hover:bg-alert/15",
  }[variant];
  const s = size === "sm" ? "px-2.5 py-1.5 text-[12px] gap-1.5" : "px-3.5 py-2 text-[13px] gap-2";
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center rounded-lg font-medium transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${v} ${s} ${className}`}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(34,18,38,0.05)] ${className}`}>{children}</div>;
}

export function Bar({ pct, className = "bg-gold" }: { pct: number; className?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-plum/8">
      <div className={`anim-bar h-full rounded-full ${className}`} style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: string }) {
  return (
    <Card className="p-4">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.15em] text-inkmute">{label}</div>
      <div className={`mt-1 font-display text-[26px] font-bold leading-none ${accent ?? "text-ink"}`}>{value}</div>
      {sub && <div className="mt-1.5 text-[11.5px] leading-snug text-inksoft">{sub}</div>}
    </Card>
  );
}

export function SectionHead({ kicker, title, right }: { kicker: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a6414]">{kicker}</div>
        <h2 className="font-display text-[20px] font-bold leading-tight text-ink">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-plum/50 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div className={`anim-pop max-h-[88vh] w-full overflow-y-auto scroll-slim rounded-2xl border border-line bg-surface shadow-2xl ${wide ? "max-w-2xl" : "max-w-md"}`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface/95 px-5 py-3.5 backdrop-blur">
          <h3 className="font-display text-[16px] font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1.5 text-inksoft transition-colors hover:bg-plum/8 hover:text-plum"><Icon name="x" size={15} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none transition-all placeholder:text-inkmute focus:border-plum/40 focus:ring-2 focus:ring-plum/10";
