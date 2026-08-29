import { Icon, TallyGlyph, TallyMarks } from "./icons";
import type { CloudUser, SyncState } from "../lib/puter";

interface RailProps {
  now: Date;
  doneToday: number;
  streak: number;
  dueTodayTotal: number;
  dueTodayDone: number;
  openCount: number;
  user: CloudUser;
  sync: SyncState;
  savedAt: number | null;
  signingIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

function ago(ts: number, now: number): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 8) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function syncMeta(sync: SyncState, user: CloudUser) {
  switch (sync) {
    case "boot":
      return { dot: "bg-paper/40 animate-pulse", title: "Finding Puter…", sub: "Loading the Puter.js SDK." };
    case "syncing":
      return { dot: "bg-sun pulse-dot", title: "Syncing…", sub: "Writing your list to the Puter key-value store." };
    case "saved":
      return {
        dot: "bg-leafbright",
        title: user.signedIn ? `Cloud · @${user.username ?? "you"}` : "Cloud session",
        sub: user.signedIn
          ? "Your list lives in your Puter account — pick it up on any device."
          : "Saved to this browser's Puter session. Sign in to keep it forever.",
      };
    case "error":
      return {
        dot: "bg-coral",
        title: "Sync paused",
        sub: "Couldn't reach Puter just now. Your list is safe on this device — the next change retries.",
      };
    default:
      return {
        dot: "bg-paper/40",
        title: "On this device",
        sub: "Your list is stored locally. Sign in with Puter to sync it to the cloud.",
      };
  }
}

export default function Rail(p: RailProps) {
  const meta = syncMeta(p.sync, p.user);
  const weekday = p.now.toLocaleDateString(undefined, { weekday: "long" });
  const month = p.now.toLocaleDateString(undefined, { month: "long" });
  const clock = p.now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <aside className="rail-texture relative flex flex-col gap-6 overflow-hidden bg-pine px-7 py-8 text-paper lg:h-full">
      {/* drifting watermark */}
      <div className="anim-drift pointer-events-none absolute -right-8 top-40 hidden opacity-[0.05] lg:block">
        <TallyGlyph size={230} verticals="#f2f5f0" diagonal="#f2f5f0" />
      </div>

      {/* wordmark */}
      <div className="relative flex items-center gap-3.5">
        <TallyGlyph size={30} />
        <div>
          <div className="font-display text-[27px] font-extrabold leading-none tracking-tight">Tally</div>
          <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-paper/40">
            a running account of things done
          </div>
        </div>
      </div>

      {/* the day itself — the opening act */}
      <div className="relative">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-sun">{weekday}</div>
        <div className="font-display text-[96px] font-extrabold leading-[0.86] tracking-tight text-paper">
          {p.now.getDate()}
        </div>
        <div className="font-display -mt-1 text-[23px] font-bold text-paper/70">
          {month} <span className="text-paper/40">{p.now.getFullYear()}</span>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-paper/12 bg-paper/[0.04] px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sun" />
          <span className="font-mono text-[12px] tabular-nums text-paper/70">{clock}</span>
          <span className="font-mono text-[10px] uppercase tracking-wide text-paper/30">local</span>
        </div>
      </div>

      <div className="h-px bg-paper/10" />

      {/* tally of the day */}
      <div className="relative">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/45">Done today</span>
          <span className="font-display text-[32px] font-extrabold leading-none text-sun">{p.doneToday}</span>
        </div>
        <div className="mt-3">
          <TallyMarks count={p.doneToday} />
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[12px]">
          <Icon name="bolt" size={13} className={p.streak > 0 ? "text-sun" : "text-paper/30"} />
          {p.streak > 0 ? (
            <span className="font-semibold text-paper/85">
              {p.streak}-day streak{p.streak >= 3 ? " — keep it alive" : ""}
            </span>
          ) : (
            <span className="text-paper/45">Finish one today to start a streak</span>
          )}
        </div>
        {p.dueTodayTotal > 0 && (
          <div className="mt-3.5">
            <div className="mb-1.5 flex justify-between font-mono text-[10px] uppercase tracking-wide text-paper/45">
              <span>Due today</span>
              <span className="tabular-nums text-paper/70">
                {p.dueTodayDone}/{p.dueTodayTotal} cleared
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-paper/10">
              <div
                className="h-full rounded-full bg-sun transition-all duration-500"
                style={{ width: `${Math.round((p.dueTodayDone / p.dueTodayTotal) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Puter cloud card */}
      <div className="relative rounded-xl border border-paper/10 bg-pine2 p-4">
        <div className="flex items-center gap-2.5">
          <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
          <span className="truncate text-[13px] font-bold">{meta.title}</span>
          <Icon name="cloud" size={15} className="ml-auto shrink-0 text-paper/35" />
        </div>
        <p className="mt-1.5 text-[11.5px] leading-snug text-paper/55">{meta.sub}</p>
        {p.savedAt !== null && p.sync === "saved" && (
          <div className="mt-1 font-mono text-[10px] text-paper/35">saved {ago(p.savedAt, p.now.getTime())}</div>
        )}
        {p.user.signedIn ? (
          <button
            onClick={p.onSignOut}
            className="mt-3 w-full rounded-lg border border-paper/15 py-2 text-[12.5px] font-semibold text-paper/75 transition-all hover:border-paper/35 hover:text-paper active:scale-[0.98]"
          >
            Sign out
          </button>
        ) : (
          <button
            onClick={p.onSignIn}
            disabled={p.signingIn || p.sync === "boot"}
            className="mt-3 w-full rounded-lg bg-sun py-2 text-[13px] font-bold text-pine transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
          >
            {p.signingIn ? "Opening Puter…" : "Sign in with Puter"}
          </button>
        )}
      </div>

      {/* footer */}
      <div className="relative space-y-2.5 font-mono text-[10px] text-paper/35">
        <div>
          <kbd>/</kbd> focus · <kbd>enter</kbd> add · <kbd>2× click</kbd> rename
        </div>
        <a
          href="https://developer.puter.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-sun"
        >
          <Icon name="cloud" size={12} /> Powered by Puter
        </a>
      </div>
    </aside>
  );
}
