import React, { useEffect, useRef, useState } from "react";
import type { Subtask, Task } from "../lib/tasks";
import { prettyDue, shiftISO, tagColor, todayISO, uid } from "../lib/tasks";
import { Icon } from "./icons";

interface TaskRowProps {
  task: Task;
  onToggle: (id: string) => void;
  onToggleSub: (taskId: string, subId: string) => void;
  onAddSub: (taskId: string, text: string) => void;
  onDeleteSub: (taskId: string, subId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onBreakDown: (id: string) => void;
  busy: boolean;
}

const PRIORITY_META: Record<number, { label: string; cls: string } | undefined> = {
  3: { label: "high", cls: "bg-coralsoft text-coral" },
  2: { label: "med", cls: "bg-amber/15 text-[#8a6400]" },
  1: { label: "low", cls: "bg-sky/12 text-sky" },
};

function ActionBtn({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-md transition-all active:scale-90 ${
        danger ? "text-mute hover:bg-coralsoft hover:text-coral" : "text-mute hover:bg-ink/6 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export default function TaskRow(p: TaskRowProps) {
  const { task } = p;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const [subOpen, setSubOpen] = useState(task.subtasks.length > 0);
  const [subDraft, setSubDraft] = useState("");
  const editRef = useRef<HTMLInputElement>(null);
  const prevSubs = useRef(task.subtasks.length);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  /* auto-reveal when steps appear (e.g. after an AI break-down) */
  useEffect(() => {
    if (task.subtasks.length > prevSubs.current) setSubOpen(true);
    prevSubs.current = task.subtasks.length;
  }, [task.subtasks.length]);

  const saveEdit = () => {
    setEditing(false);
    const t = draft.trim();
    if (t && t !== task.text) p.onEdit(task.id, t);
    else setDraft(task.text);
  };

  const dueTone = task.due
    ? task.due < todayISO()
      ? "bg-coralsoft text-coral"
      : task.due === todayISO()
        ? "bg-sunsoft text-[#8a6a00]"
        : task.due === shiftISO(1)
          ? "bg-leaf/12 text-leaf"
          : "bg-ink/5 text-ink2"
    : "";

  const subsDone = task.subtasks.filter((s) => s.done).length;
  const pm = PRIORITY_META[task.priority];

  return (
    <div
      className={`group anim-fade-up lift relative flex items-start gap-3 rounded-xl border bg-surface px-4 py-3 ${
        task.done ? "border-line/70 opacity-75" : "border-line hover:border-ink/25 hover:shadow-[3px_3px_0_0_rgba(15,27,21,0.07)]"
      }`}
    >
      {/* checkbox */}
      <button
        onClick={() => p.onToggle(task.id)}
        aria-label={task.done ? "Mark as not done" : "Mark as done"}
        className={`mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border-2 transition-all active:scale-90 ${
          task.done ? "border-leaf bg-leaf text-paper" : "border-ink/25 bg-surface hover:border-leaf"
        }`}
      >
        {task.done && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path className="tick-draw" d="M4.5 12.5l5 5L19.5 7" />
          </svg>
        )}
      </button>

      {/* content column */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={editRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") {
                setDraft(task.text);
                setEditing(false);
              }
            }}
            className="w-full rounded-md border border-ink/30 bg-paper px-2 py-1 text-[15px] font-medium outline-none focus:border-ink"
          />
        ) : (
          <button
            onClick={() => p.onToggle(task.id)}
            onDoubleClick={(e) => {
              e.preventDefault();
              setDraft(task.text);
              setEditing(true);
            }}
            className="block w-full text-left"
            title="Click to toggle · double-click to rename"
          >
            <span className={`strike text-[15px] font-medium leading-snug ${task.done ? "strike-on text-mute" : "text-ink"}`}>
              {task.text}
            </span>
          </button>
        )}

        {/* chips */}
        {(task.due || task.priority > 0 || task.tags.length > 0 || task.subtasks.length > 0) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {task.due && (
              <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold ${dueTone}`}>
                <Icon name="calendar" size={11} />
                {prettyDue(task.due)}
                {!task.done && task.due < todayISO() && " · overdue"}
              </span>
            )}
            {pm && (
              <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold ${pm.cls}`}>
                <Icon name="flag" size={10} />
                {pm.label}
              </span>
            )}
            {task.tags.map((tag) => {
              const c = tagColor(tag);
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold"
                  style={{ background: `${c}1c`, color: c }}
                >
                  <Icon name="tag" size={10} />
                  {tag}
                </span>
              );
            })}
            {task.subtasks.length > 0 && (
              <button
                onClick={() => setSubOpen((o) => !o)}
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold transition-colors ${
                  subsDone === task.subtasks.length ? "bg-leaf/12 text-leaf" : "bg-ink/5 text-ink2 hover:bg-ink/10"
                }`}
              >
                <Icon name="layers" size={11} />
                {subsDone}/{task.subtasks.length} steps
                <Icon name="chevD" size={10} className={`transition-transform ${subOpen ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        )}

        {/* subtasks */}
        {subOpen && (task.subtasks.length > 0 || !editing) && (
          <div className="anim-sub mt-2.5 space-y-1 border-l-2 border-line pl-3.5">
            {task.subtasks.map((st: Subtask) => (
              <div key={st.id} className="group/sub flex items-center gap-2.5">
                <button
                  onClick={() => p.onToggleSub(task.id, st.id)}
                  aria-label="Toggle step"
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded border-[1.5px] transition-all active:scale-90 ${
                    st.done ? "border-leaf bg-leaf text-paper" : "border-ink/25 bg-surface hover:border-leaf"
                  }`}
                >
                  {st.done && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4.5 12.5l5 5L19.5 7" />
                    </svg>
                  )}
                </button>
                <button onClick={() => p.onToggleSub(task.id, st.id)} className="min-w-0 flex-1 text-left">
                  <span className={`strike text-[13px] leading-snug ${st.done ? "strike-on text-mute" : "text-ink2"}`}>{st.text}</span>
                </button>
                <button
                  onClick={() => p.onDeleteSub(task.id, st.id)}
                  className="rounded p-0.5 text-mute opacity-0 transition-all hover:text-coral group-hover/sub:opacity-100"
                  aria-label="Remove step"
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
            ))}
            {!task.done && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = subDraft.trim();
                  if (!t) return;
                  p.onAddSub(task.id, t);
                  setSubDraft("");
                }}
                className="flex items-center gap-2"
              >
                <span className="grid h-4 w-4 place-items-center rounded border-[1.5px] border-dashed border-ink/20 text-mute">
                  <Icon name="plus" size={9} />
                </span>
                <input
                  value={subDraft}
                  onChange={(e) => setSubDraft(e.target.value)}
                  placeholder="Add a step…"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-ink2 outline-none placeholder:text-mute/70"
                />
              </form>
            )}
          </div>
        )}
      </div>

      {/* hover actions */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <ActionBtn title="Break down into steps with Puter AI" onClick={() => p.onBreakDown(task.id)}>
          {p.busy ? (
            <span className="spin-slow inline-block h-3.5 w-3.5 rounded-full border-2 border-ink/15 border-t-ink" />
          ) : (
            <Icon name="spark" size={15} />
          )}
        </ActionBtn>
        <ActionBtn
          title="Rename"
          onClick={() => {
            setDraft(task.text);
            setEditing(true);
          }}
        >
          <Icon name="pencil" size={14} />
        </ActionBtn>
        <ActionBtn title="Delete" danger onClick={() => p.onDelete(task.id)}>
          <Icon name="trash" size={14} />
        </ActionBtn>
      </div>
    </div>
  );
}
