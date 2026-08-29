import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BucketId, Task } from "./lib/tasks";
import {
  bucketOf, calcStreak, completedToday, dayPart, makeTask, parseQuick, sortTasks, todayISO, uid,
} from "./lib/tasks";
import type { CloudUser, SyncState } from "./lib/puter";
import {
  breakTaskIntoSubtasks, cloudLoad, cloudSave, getCloudUser, hasPuter, loadLocal, mergeTasks,
  saveLocal, signIn, signOut, waitForPuter,
} from "./lib/puter";
import Rail from "./components/Rail";
import TaskRow from "./components/TaskRow";
import { Icon, TallyGlyph } from "./components/icons";

interface Toast {
  id: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

const BUCKETS: { id: BucketId; label: string; edge: string; note?: string }[] = [
  { id: "overdue", label: "Overdue", edge: "bg-coral", note: "needs a decision — do, defer, or drop" },
  { id: "today", label: "Today", edge: "bg-sun" },
  { id: "tomorrow", label: "Tomorrow", edge: "bg-leaf" },
  { id: "later", label: "Later", edge: "bg-sky" },
  { id: "anytime", label: "Anytime", edge: "bg-line2" },
];

const QUICK_TOKENS = ["#tag", "!high", "!med", "today", "tomorrow", "mon", "3d"];

export default function App() {
  /* ---------------- state ---------------- */
  const [tasks, setTasks] = useState<Task[]>(() => loadLocal());
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const [user, setUser] = useState<CloudUser>({ signedIn: false });
  const userRef = useRef(user);
  userRef.current = user;

  const [sync, setSync] = useState<SyncState>("boot");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const anonFailed = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showDone, setShowDone] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busyAI, setBusyAI] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(() => new Date());
  const addRef = useRef<HTMLInputElement>(null);

  /* ---------------- clock + hotkeys ---------------- */
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") {
        e.preventDefault();
        addRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------- toasts ---------------- */
  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const pushToast = useCallback(
    (text: string, opts?: { actionLabel?: string; onAction?: () => void }) => {
      const id = uid();
      setToasts((t) => [...t.slice(-2), { id, text, ...opts }]);
      window.setTimeout(() => dismissToast(id), 5200);
    },
    [dismissToast]
  );

  /* ---------------- persistence ---------------- */
  const applyTasks = useCallback((next: Task[]) => {
    setTasks(next);
    saveLocal(next);
    if (!hasPuter()) {
      setSync("local");
      return;
    }
    if (!userRef.current.signedIn && anonFailed.current) {
      setSync("local");
      return;
    }
    setSync("syncing");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await cloudSave(tasksRef.current);
        setSavedAt(Date.now());
        setSync("saved");
      } catch {
        if (userRef.current.signedIn) setSync("error");
        else {
          anonFailed.current = true;
          setSync("local");
        }
      }
    }, 650);
  }, []);

  /* boot: local first, then reconcile with Puter */
  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await waitForPuter();
      if (!alive) return;
      if (!ok) {
        setSync("local");
        return;
      }
      const u = await getCloudUser();
      if (!alive) return;
      setUser(u);
      userRef.current = u;
      const res = await cloudLoad();
      if (!alive) return;
      if (!res.ok) {
        if (u.signedIn) setSync("error");
        else {
          anonFailed.current = true;
          setSync("local");
        }
        return;
      }
      if (res.tasks && res.tasks.length) {
        const merged = mergeTasks(tasksRef.current, res.tasks);
        setTasks(merged);
        saveLocal(merged);
        try {
          await cloudSave(merged);
        } catch {
          /* best effort */
        }
        setSavedAt(Date.now());
        setSync("saved");
      } else if (tasksRef.current.length) {
        try {
          await cloudSave(tasksRef.current);
          setSavedAt(Date.now());
          setSync("saved");
        } catch {
          if (u.signedIn) setSync("error");
          else {
            anonFailed.current = true;
            setSync("local");
          }
        }
      } else {
        setSync(u.signedIn ? "saved" : "local");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ---------------- auth ---------------- */
  const doSignIn = async () => {
    setSigningIn(true);
    try {
      const u = await signIn();
      setUser(u);
      userRef.current = u;
      if (u.signedIn) {
        anonFailed.current = false;
        const res = await cloudLoad();
        if (res.ok) {
          const merged = res.tasks?.length ? mergeTasks(tasksRef.current, res.tasks) : tasksRef.current;
          setTasks(merged);
          saveLocal(merged);
          try {
            await cloudSave(merged);
            setSavedAt(Date.now());
            setSync("saved");
          } catch {
            setSync("error");
          }
        }
        pushToast(`Signed in as @${u.username ?? "you"} — your list is now synced to Puter.`);
      }
    } catch {
      pushToast("Sign-in didn't complete. You're still working locally.");
    } finally {
      setSigningIn(false);
    }
  };

  const doSignOut = async () => {
    await signOut();
    setUser({ signedIn: false });
    userRef.current = { signedIn: false };
    setSync("local");
    pushToast("Signed out — your list stays on this device.");
  };

  /* ---------------- task actions ---------------- */
  const addTask = (raw: string) => {
    const parsed = parseQuick(raw);
    if (!parsed.text) {
      pushToast("Give the task a name — the #tags and !flags are seasoning, not the meal.");
      return;
    }
    const t = makeTask(parsed);
    applyTasks([t, ...tasksRef.current]);
    setDraft("");
    const b = bucketOf(t);
    const where = b === "anytime" ? "Anytime" : b.charAt(0).toUpperCase() + b.slice(1);
    pushToast(`Added to ${where}.`);
  };

  const toggleTask = (id: string) => {
    const target = tasksRef.current.find((t) => t.id === id);
    if (!target) return;
    const next = tasksRef.current.map((t) =>
      t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : undefined } : t
    );
    applyTasks(next);
    if (!target.done) {
      const c = completedToday(next);
      if (c > 0 && c % 5 === 0) pushToast(`${c} done today — that's a full tally. Diagonal earned.`);
    }
  };

  const toggleSub = (taskId: string, subId: string) => {
    applyTasks(
      tasksRef.current.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) }
          : t
      )
    );
  };

  const addSub = (taskId: string, text: string) => {
    applyTasks(
      tasksRef.current.map((t) =>
        t.id === taskId ? { ...t, subtasks: [...t.subtasks, { id: uid(), text, done: false }] } : t
      )
    );
  };

  const deleteSub = (taskId: string, subId: string) => {
    applyTasks(
      tasksRef.current.map((t) =>
        t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subId) } : t
      )
    );
  };

  const deleteTask = (id: string) => {
    const snapshot = tasksRef.current;
    const target = snapshot.find((t) => t.id === id);
    applyTasks(snapshot.filter((t) => t.id !== id));
    pushToast(`Deleted “${target?.text ?? "task"}”`, {
      actionLabel: "Undo",
      onAction: () => applyTasks(snapshot),
    });
  };

  const editTask = (id: string, text: string) => {
    applyTasks(tasksRef.current.map((t) => (t.id === id ? { ...t, text } : t)));
  };

  const clearCompleted = () => {
    const snapshot = tasksRef.current;
    const n = snapshot.filter((t) => t.done).length;
    if (!n) return;
    applyTasks(snapshot.filter((t) => !t.done));
    pushToast(`Cleared ${n} done task${n > 1 ? "s" : ""}`, {
      actionLabel: "Undo",
      onAction: () => applyTasks(snapshot),
    });
  };

  const breakDown = async (id: string) => {
    const target = tasksRef.current.find((t) => t.id === id);
    if (!target) return;
    if (!hasPuter()) {
      pushToast("Puter is still loading — try the spark again in a second.");
      return;
    }
    setBusyAI((b) => ({ ...b, [id]: true }));
    try {
      const subs = await breakTaskIntoSubtasks(target.text);
      if (!subs.length) throw new Error("empty");
      applyTasks(
        tasksRef.current.map((t) => {
          if (t.id !== id) return t;
          const have = new Set(t.subtasks.map((s) => s.text.toLowerCase()));
          const fresh = subs.filter((s) => !have.has(s.toLowerCase())).map((s) => ({ id: uid(), text: s, done: false }));
          return { ...t, subtasks: [...t.subtasks, ...fresh] };
        })
      );
      pushToast(`Puter AI broke “${target.text}” into ${subs.length} steps.`);
    } catch {
      pushToast("Couldn't break that down — Puter AI didn't return usable steps.");
    } finally {
      setBusyAI((b) => ({ ...b, [id]: false }));
    }
  };

  /* ---------------- derived ---------------- */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (filter === "open" && t.done) return false;
      if (filter === "done" && !t.done) return false;
      if (tagFilter && !t.tags.includes(tagFilter)) return false;
      if (q && !t.text.toLowerCase().includes(q) && !t.tags.some((tag) => tag.includes(q))) return false;
      return true;
    });
  }, [tasks, filter, tagFilter, search]);

  const groups = BUCKETS.map((b) => ({ ...b, tasks: sortTasks(visible.filter((t) => bucketOf(t) === b.id)) })).filter(
    (g) => g.tasks.length > 0
  );
  const doneList = sortTasks(visible.filter((t) => t.done));

  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    tasks.forEach((t) => t.tags.forEach((tag) => m.set(tag, (m.get(tag) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [tasks]);

  const openCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.length - openCount;
  const doneToday = completedToday(tasks);
  const streak = calcStreak(tasks);
  const dueTodayTotal = tasks.filter((t) => t.due === todayISO()).length;
  const dueTodayDone = tasks.filter((t) => t.due === todayISO() && t.done).length;

  const insertToken = (tok: string) => {
    setDraft((d) => (d ? d.replace(/\s+$/, "") + " " + tok + " " : tok + " "));
    addRef.current?.focus();
  };

  const syncDot =
    sync === "saved" ? "bg-leaf" : sync === "syncing" ? "bg-sun pulse-dot" : sync === "error" ? "bg-coral" : "bg-line2";
  const syncText =
    sync === "saved"
      ? user.signedIn
        ? `synced · @${user.username ?? "you"}`
        : "saved to Puter session"
      : sync === "syncing"
        ? "syncing…"
        : sync === "error"
          ? "sync paused — safe locally"
          : sync === "boot"
            ? "connecting to Puter…"
            : "local only";

  /* ---------------- render ---------------- */
  return (
    <div className="board-bg min-h-dvh font-body text-ink">
      <div className="lg:grid lg:h-dvh lg:grid-cols-[330px_1fr] lg:overflow-hidden">
        <Rail
          now={now}
          doneToday={doneToday}
          streak={streak}
          dueTodayTotal={dueTodayTotal}
          dueTodayDone={dueTodayDone}
          openCount={openCount}
          user={user}
          sync={sync}
          savedAt={savedAt}
          signingIn={signingIn}
          onSignIn={doSignIn}
          onSignOut={doSignOut}
        />

        <main className="flex min-h-dvh flex-col lg:h-dvh lg:min-h-0">
          {/* header */}
          <header className="px-5 pb-4 pt-7 sm:px-8 lg:px-10">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-mute">
                  {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </div>
                <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-tight sm:text-[36px]">
                  {dayPart(now.getHours())}
                  <span className="text-sun">.</span>
                </h1>
                <p className="mt-0.5 text-[13.5px] text-ink2">
                  <b className="text-ink">{openCount}</b> open · <b className="text-ink">{doneToday}</b> done today
                  {dueTodayTotal > 0 && (
                    <span className="text-mute"> · {dueTodayTotal - dueTodayDone} still due today</span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 transition-all focus-within:border-ink/40 focus-within:shadow-[2px_2px_0_0_rgba(15,27,21,0.12)]">
                  <Icon name="search" size={14} className="text-mute" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tasks…"
                    className="w-36 bg-transparent text-[13px] outline-none placeholder:text-mute/80 sm:w-44"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="text-mute hover:text-ink">
                      <Icon name="x" size={12} />
                    </button>
                  )}
                </label>
                <div className="flex rounded-lg border border-line bg-surface p-0.5">
                  {(["all", "open", "done"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded-md px-3 py-1.5 text-[12.5px] font-bold capitalize transition-all ${
                        filter === f ? "bg-ink text-paper shadow-sm" : "text-ink2 hover:text-ink"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setHelpOpen((o) => !o)}
                    className={`grid h-[38px] w-[38px] place-items-center rounded-lg border border-line bg-surface text-[15px] font-bold transition-all hover:border-ink/40 ${helpOpen ? "text-ink" : "text-ink2"}`}
                    aria-label="Quick-add syntax help"
                  >
                    ?
                  </button>
                  {helpOpen && (
                    <>
                      <button className="fixed inset-0 z-10 cursor-default" onClick={() => setHelpOpen(false)} aria-label="Close help" />
                      <div className="anim-pop absolute right-0 top-full z-20 mt-2 w-[300px] rounded-xl border border-ink bg-surface p-4 shadow-[5px_5px_0_0_var(--color-ink)]">
                        <div className="font-display text-[15px] font-extrabold">Quick-add syntax</div>
                        <div className="mt-2.5 space-y-2 text-[12.5px] text-ink2">
                          {[
                            ["#work", "tag the task"],
                            ["!high · !med · !low", "set priority"],
                            ["today · tomorrow", "due date"],
                            ["mon … sun", "next that weekday"],
                            ["3d", "due in 3 days"],
                          ].map(([k, v]) => (
                            <div key={k} className="flex items-center gap-3">
                              <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-ink">{k}</code>
                              <span>{v}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 border-t border-line pt-2.5 text-[11.5px] leading-snug text-mute">
                          Example: <b className="text-ink2">Ship invoice tomorrow !high #work</b>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* quick add */}
          <div className="px-5 sm:px-8 lg:px-10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addTask(draft);
              }}
            >
              <div className="flex items-center gap-3 rounded-xl border-2 border-ink bg-surface px-4 py-3 shadow-[5px_5px_0_0_var(--color-ink)] transition-all focus-within:translate-x-[2px] focus-within:translate-y-[2px] focus-within:shadow-[3px_3px_0_0_var(--color-ink)]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sun text-pine">
                  <Icon name="plus" size={18} />
                </span>
                <input
                  ref={addRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder='Add a task — "Ship invoice tomorrow !high #work"'
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none placeholder:font-normal placeholder:text-mute/80"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="shrink-0 rounded-lg bg-ink px-4 py-2 text-[13.5px] font-bold text-paper transition-all hover:bg-pine3 active:translate-y-px disabled:opacity-30"
                >
                  Add
                </button>
              </div>
            </form>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">try:</span>
              {QUICK_TOKENS.map((tok) => (
                <button
                  key={tok}
                  onClick={() => insertToken(tok)}
                  className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-[11px] font-semibold text-ink2 transition-all hover:-translate-y-px hover:border-ink/40 hover:text-ink"
                >
                  {tok}
                </button>
              ))}
            </div>
          </div>

          {/* tag filter row */}
          {tagCounts.length > 0 && (
            <div className="scroll-slim mt-3 flex gap-1.5 overflow-x-auto px-5 sm:px-8 lg:px-10">
              {tagCounts.map(([tag, n]) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter((t) => (t === tag ? null : tag))}
                  className={`shrink-0 rounded-full px-3 py-1 font-mono text-[11px] font-semibold transition-all ${
                    tagFilter === tag
                      ? "bg-ink text-sun shadow-sm"
                      : "border border-line bg-surface text-ink2 hover:border-ink/40 hover:text-ink"
                  }`}
                >
                  #{tag} <span className={tagFilter === tag ? "text-paper/60" : "text-mute"}>{n}</span>
                </button>
              ))}
            </div>
          )}

          {/* the ledger */}
          <div className="scroll-slim flex-1 space-y-8 overflow-y-auto px-5 py-6 sm:px-8 lg:px-10">
            {tasks.length === 0 && (
              <div className="anim-pop mx-auto mt-6 max-w-md rounded-2xl border-2 border-ink bg-surface p-10 text-center shadow-[7px_7px_0_0_var(--color-ink)]">
                <div className="inline-block text-ink">
                  <TallyGlyph size={64} />
                </div>
                <h3 className="font-display mt-5 text-[28px] font-extrabold tracking-tight">A clean page.</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink2">
                  Add the first thing above — or start with{" "}
                  <button
                    onClick={() => {
                      setDraft("Plan the week tomorrow !med #planning");
                      addRef.current?.focus();
                    }}
                    className="rounded-md bg-sunsoft px-1.5 py-0.5 font-mono text-[12.5px] font-semibold text-[#8a6a00] transition-transform hover:scale-[1.03]"
                  >
                    Plan the week tomorrow !med #planning
                  </button>
                </p>
              </div>
            )}

            {tasks.length > 0 && groups.length === 0 && doneList.length === 0 && (
              <div className="mx-auto max-w-sm rounded-xl border border-dashed border-line2 bg-surface/60 p-8 text-center">
                <Icon name="search" size={22} className="mx-auto text-mute" />
                <p className="mt-2 text-[13.5px] text-ink2">Nothing matches. Loosen a filter or clear the search.</p>
              </div>
            )}

            {groups.map((g) => (
              <section key={g.id}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span className={`h-3 w-3 rounded-[4px] ${g.edge}`} />
                  <h2 className="font-display text-[15px] font-extrabold uppercase tracking-[0.06em]">{g.label}</h2>
                  <span className="font-mono text-[11px] font-semibold text-mute">{g.tasks.length}</span>
                  {g.note && <span className="hidden text-[11.5px] text-mute sm:inline">— {g.note}</span>}
                  <div className="h-px flex-1 bg-line" />
                </div>
                <div className="stagger space-y-2">
                  {g.tasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      busy={!!busyAI[t.id]}
                      onToggle={toggleTask}
                      onToggleSub={toggleSub}
                      onAddSub={addSub}
                      onDeleteSub={deleteSub}
                      onDelete={deleteTask}
                      onEdit={editTask}
                      onBreakDown={breakDown}
                    />
                  ))}
                </div>
              </section>
            ))}

            {doneList.length > 0 && (
              <section>
                <button onClick={() => setShowDone((s) => !s)} className="group mb-2.5 flex w-full items-center gap-2.5 text-left">
                  <span className="h-3 w-3 rounded-[4px] bg-leaf" />
                  <h2 className="font-display text-[15px] font-extrabold uppercase tracking-[0.06em] text-ink2">Done</h2>
                  <span className="font-mono text-[11px] font-semibold text-mute">{doneList.length}</span>
                  <Icon name="chevD" size={14} className={`text-mute transition-transform ${showDone ? "rotate-180" : ""}`} />
                  <div className="h-px flex-1 bg-line" />
                </button>
                {showDone && (
                  <div className="space-y-2">
                    {doneList.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        busy={!!busyAI[t.id]}
                        onToggle={toggleTask}
                        onToggleSub={toggleSub}
                        onAddSub={addSub}
                        onDeleteSub={deleteSub}
                        onDelete={deleteTask}
                        onEdit={editTask}
                        onBreakDown={breakDown}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* footer */}
          <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-surface/90 px-5 py-3 backdrop-blur sm:px-8 lg:px-10">
            <span className="text-[12.5px] text-ink2">
              <b className="text-ink">{openCount}</b> open · <b className="text-ink">{doneCount}</b> done all-time
            </span>
            {doneCount > 0 && (
              <button
                onClick={clearCompleted}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-ink2 transition-all hover:border-coral/50 hover:bg-coralsoft hover:text-coral"
              >
                <Icon name="trash" size={12} /> Clear completed
              </button>
            )}
            <div className="ml-auto flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-mute">
                <span className={`h-1.5 w-1.5 rounded-full ${syncDot}`} />
                {syncText}
              </span>
              <a
                href="https://developer.puter.com"
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1.5 font-mono text-[10.5px] text-mute transition-colors hover:text-ink sm:inline-flex"
              >
                <Icon name="cloud" size={12} /> Powered by Puter
              </a>
            </div>
          </footer>
        </main>
      </div>

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(340px,calc(100vw-40px))] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="anim-toast pointer-events-auto flex items-center gap-3 rounded-xl border border-pine3 bg-pine px-4 py-3 text-paper shadow-[0_12px_30px_-12px_rgba(15,27,21,0.5)]"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sun" />
            <span className="flex-1 text-[13px] leading-snug">{t.text}</span>
            {t.actionLabel && (
              <button
                onClick={() => {
                  t.onAction?.();
                  dismissToast(t.id);
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-sun px-2.5 py-1 text-[12px] font-bold text-pine transition-all hover:brightness-105 active:scale-95"
              >
                <Icon name="undo" size={11} /> {t.actionLabel}
              </button>
            )}
            <button onClick={() => dismissToast(t.id)} className="shrink-0 text-paper/40 transition-colors hover:text-paper">
              <Icon name="x" size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
