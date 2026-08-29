/* Task model + quick-add parser.
   Syntax: "Ship invoice tomorrow !high #work"
   → due tomorrow, priority high, tag #work, text "Ship invoice" */

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  completedAt?: number;
  due?: string; // local YYYY-MM-DD
  priority: 0 | 1 | 2 | 3; // none, low, med, high
  tags: string[];
  subtasks: Subtask[];
}

export type BucketId = "overdue" | "today" | "tomorrow" | "later" | "anytime" | "done";

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayISO = () => isoDate(new Date());

export const shiftISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoDate(d);
};

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export interface ParsedQuick {
  text: string;
  due?: string;
  priority: 0 | 1 | 2 | 3;
  tags: string[];
}

export function parseQuick(raw: string): ParsedQuick {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const kept: string[] = [];
  const tags: string[] = [];
  let due: string | undefined;
  let priority: 0 | 1 | 2 | 3 = 0;

  for (const tok of tokens) {
    const low = tok.toLowerCase().replace(/[.,;]$/, "");
    if (low.startsWith("#") && low.length > 1) {
      tags.push(low.slice(1).replace(/[^a-z0-9_-]/g, ""));
      continue;
    }
    if (low === "!high" || low === "!h") { priority = 3; continue; }
    if (low === "!med" || low === "!medium" || low === "!m") { priority = Math.max(priority, 2) as 2 | 3; continue; }
    if (low === "!low" || low === "!l") { priority = Math.max(priority, 1) as 1 | 2 | 3; continue; }
    if (low === "today" || low === "tonight") { due = due ?? todayISO(); continue; }
    if (low === "tomorrow" || low === "tmr") { due = due ?? shiftISO(1); continue; }
    const wd = WEEKDAYS.indexOf(low);
    if (wd >= 0) {
      const today = new Date().getDay();
      let diff = (wd - today + 7) % 7;
      if (diff === 0) diff = 7;
      due = due ?? shiftISO(diff);
      continue;
    }
    const dm = low.match(/^(\d+)d$/);
    if (dm) { due = due ?? shiftISO(Math.min(365, parseInt(dm[1], 10))); continue; }
    kept.push(tok);
  }

  return { text: kept.join(" ").trim(), due, priority, tags: [...new Set(tags.filter(Boolean))] };
}

export function makeTask(partial: Partial<Task> & { text: string }): Task {
  return {
    done: false,
    createdAt: Date.now(),
    priority: 0,
    tags: [],
    subtasks: [],
    ...partial,
    id: partial.id ?? uid(),
    text: partial.text,
  };
}

export function bucketOf(t: Task): BucketId {
  if (t.done) return "done";
  if (!t.due) return "anytime";
  const today = todayISO();
  if (t.due < today) return "overdue";
  if (t.due === today) return "today";
  if (t.due === shiftISO(1)) return "tomorrow";
  return "later";
}

export function sortTasks(list: Task[]): Task[] {
  return [...list].sort(
    (a, b) =>
      b.priority - a.priority ||
      (a.due ?? "9999-99").localeCompare(b.due ?? "9999-99") ||
      a.createdAt - b.createdAt
  );
}

export function prettyDue(iso: string): string {
  if (iso === todayISO()) return "today";
  if (iso === shiftISO(1)) return "tomorrow";
  if (iso === shiftISO(-1)) return "yesterday";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function dayPart(hour: number): string {
  if (hour < 5) return "Night shift";
  if (hour < 12) return "Morning push";
  if (hour < 17) return "Afternoon stretch";
  if (hour < 22) return "Evening wrap-up";
  return "Night shift";
}

export function completedToday(tasks: Task[]): number {
  const t = todayISO();
  return tasks.filter((x) => x.completedAt && isoDate(new Date(x.completedAt)) === t).length;
}

export function calcStreak(tasks: Task[]): number {
  const days = new Set(
    tasks.filter((t) => t.completedAt).map((t) => isoDate(new Date(t.completedAt as number)))
  );
  let streak = 0;
  const d = new Date();
  if (!days.has(isoDate(d))) d.setDate(d.getDate() - 1);
  while (days.has(isoDate(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export const TAG_PALETTE = ["#c2492f", "#b07d10", "#1e7a50", "#4e7fd9", "#8a5bb5", "#c2587e", "#0e8c8c", "#6b7f2e"];

export function tagColor(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}
