import React from "react";
import { AGENTS, type AgentId } from "../lib/types";

/* ================= Icons (hand-drawn inline SVG) ================= */
const PATHS: Record<string, React.ReactNode> = {
  helm: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
      <circle cx="12" cy="4" r="1.4" />
      <circle cx="12" cy="20" r="1.4" />
      <circle cx="4" cy="12" r="1.4" />
      <circle cx="20" cy="12" r="1.4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" />
    </>
  ),
  megaphone: (
    <>
      <path d="m3 11 15-5.5v13L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      <path d="M18 8.5a3.5 3.5 0 0 1 0 7" />
    </>
  ),
  gauge: (
    <>
      <path d="m12 14 3.5-3.5" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </>
  ),
  lock: (
    <>
      <rect x="3.5" y="11" width="17" height="10.5" rx="2" />
      <path d="M7 11V7.5a5 5 0 0 1 10 0V11" />
      <path d="M12 15.5v2" />
    </>
  ),
  inbox: (
    <>
      <path d="M22 12.5h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.61 2 12.5V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.5l-3.45-6.89A2 2 0 0 0 16.76 4.5H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  pulse: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  sliders: (
    <>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1.5 14h5M9.5 8h5M17.5 16h5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7.5" />
      <path d="m21 21-4.5-4.5" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
      <path d="M22 2 11 13" />
    </>
  ),
  plus: <path d="M5 12h14M12 5v14" />,
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 6.5V12l3.5 2" />
    </>
  ),
  alert: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  file: (
    <>
      <path d="M15 2.5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" />
      <path d="M14 2.5v4a2 2 0 0 0 2 2h4" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5M12 3v12" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12.5" height="12.5" rx="2" />
      <path d="M5.5 15H4.5a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2H13a2 2 0 0 1 2 2v1" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="4.5" width="20" height="15" rx="2" />
      <path d="m22 7.5-10 5.5L2 7.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="17" rx="2" />
      <path d="M16 2.5v4M8 2.5v4M3 10h18" />
    </>
  ),
  spark: (
    <>
      <path d="M10 3.5 11.8 8.2 16.5 10l-4.7 1.8L10 16.5 8.2 11.8 3.5 10l4.7-1.8z" />
      <path d="m18 15 .9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />
    </>
  ),
  shield: (
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 15.74-6L21 8M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.74 6L3 16M3 21v-5h5" />
    </>
  ),
  chevR: <path d="m9 18 6-6-6-6" />,
  chevD: <path d="m6 9 6 6 6-6" />,
  ext: (
    <>
      <path d="M15 3h6v6M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>
  ),
  bolt: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};

export function Icon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name] ?? PATHS.file}
    </svg>
  );
}

/* ================= Primitives ================= */

export function Btn({
  children, onClick, variant = "primary", size = "md", disabled, className = "", title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "ghost" | "soft" | "danger";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none rounded-md";
  const sizes = size === "sm" ? "text-[12.5px] px-2.5 py-1.5" : "text-[13.5px] px-3.5 py-2";
  const variants = {
    primary: "bg-ink text-canvas hover:bg-pine3 shadow-sm",
    outline: "border border-line bg-surface text-ink hover:border-ink/40 hover:shadow-sm",
    ghost: "text-inksoft hover:text-ink hover:bg-ink/5",
    soft: "bg-ink/5 text-ink hover:bg-ink/10",
    danger: "bg-alert/10 text-alert hover:bg-alert/20",
  }[variant];
  return (
    <button title={title} disabled={disabled} onClick={onClick} className={`${base} ${sizes} ${variants} ${className}`}>
      {children}
    </button>
  );
}

export function AgentTag({ agent, size = "md" }: { agent: AgentId; size?: "sm" | "md" }) {
  const m = AGENTS[agent];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${m.chip} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]"
      }`}
    >
      <Icon name={m.icon} size={size === "sm" ? 11 : 13} />
      {m.name}
    </span>
  );
}

export function Dot({ agent, pulse = false }: { agent: AgentId; pulse?: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${AGENTS[agent].dot} ${pulse ? "pulse-dot" : ""}`} />;
}

/** Explainability affordance — hover/focus reveals the agent's reasoning. */
export function Why({ text, label = "Why?" }: { text: string; label?: string }) {
  return (
    <span className="why-wrap relative inline-flex">
      <button
        tabIndex={0}
        className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-inksoft transition-colors hover:bg-ink/10 hover:text-ink"
      >
        <Icon name="spark" size={11} />
        {label}
      </button>
      <span className="why-pop absolute bottom-full left-0 z-40 mb-2 block w-72 rounded-lg border border-line bg-pine p-3 text-left text-[12px] leading-relaxed text-canvas shadow-xl">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-canvas/50">
          Agent reasoning
        </span>
        {text}
      </span>
    </span>
  );
}

export function Modal({
  open, onClose, title, children, wide,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="anim-fade-in absolute inset-0 bg-pine/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`anim-pop relative max-h-[88vh] w-full overflow-y-auto scroll-slim rounded-xl border border-line bg-surface shadow-2xl ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/95 px-5 py-3.5 backdrop-blur">
          <h3 className="font-display text-[15px] font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1.5 text-inksoft transition-colors hover:bg-ink/5 hover:text-ink">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function SectionHead({ kicker, title, right }: { kicker: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-inkmute">{kicker}</div>
        <h2 className="font-display text-[19px] font-semibold leading-tight">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function Bar({ pct, className = "bg-ops" }: { pct: number; className?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
      <div className={`anim-bar h-full rounded-full ${className}`} style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface ${className}`}>{children}</div>;
}

export function Sev({ s }: { s: "high" | "medium" | "low" }) {
  const map = {
    high: "bg-alert/10 text-alert ring-alert/25",
    medium: "bg-warn/10 text-warn ring-warn/30",
    low: "bg-ink/5 text-inksoft ring-ink/15",
  }[s];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ring-1 ${map}`}>
      {s}
    </span>
  );
}

export function Dial({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? "#2e7d63" : score >= 50 ? "#b98a2f" : "#b4443c";
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e3e8e0" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * score) / 100}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,0.9,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[34px] font-bold leading-none" style={{ color }}>
          {score}
        </span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-inkmute">/ 100</span>
      </div>
    </div>
  );
}

export const inputCls =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-[13.5px] text-ink placeholder:text-inkmute outline-none transition-all focus:border-ink/40 focus:ring-2 focus:ring-ink/10";
