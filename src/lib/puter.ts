/* Puter.js integration layer.
   - Cloud persistence via puter.kv (key-value store)
   - Account via puter.auth (sign-in / sign-out)
   - AI via puter.ai.chat (free, user-pays model — no API keys anywhere)
   - Local-first: localStorage always mirrors the list, so the app works
     instantly, offline, and before the SDK finishes loading. */

import type { Task } from "./tasks";

export const KV_KEY = "tally.tasks.v1";
export const LOCAL_KEY = "tally.local.v1";

type Puter = {
  auth: {
    isSignedIn(): Promise<boolean>;
    signIn(): Promise<unknown>;
    signOut(): Promise<void>;
    getUser(): Promise<{ username?: string } | undefined>;
  };
  kv: {
    set(key: string, value: string): Promise<unknown>;
    get(key: string): Promise<unknown>;
    del(key: string): Promise<unknown>;
  };
  ai: {
    chat(prompt: string, opts?: Record<string, unknown>): Promise<unknown>;
  };
};

declare global {
  interface Window {
    puter?: Puter;
  }
}

export interface CloudUser {
  signedIn: boolean;
  username?: string;
}

export type SyncState = "boot" | "local" | "syncing" | "saved" | "error";

export function hasPuter(): boolean {
  return typeof window !== "undefined" && !!window.puter?.kv;
}

export function waitForPuter(timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const tick = () => {
      if (hasPuter()) return resolve(true);
      if (Date.now() - t0 > timeoutMs) return resolve(false);
      window.setTimeout(tick, 60);
    };
    tick();
  });
}

export async function getCloudUser(): Promise<CloudUser> {
  try {
    const p = window.puter;
    if (!p) return { signedIn: false };
    const signedIn = await p.auth.isSignedIn();
    if (!signedIn) return { signedIn: false };
    const u = await p.auth.getUser();
    return { signedIn: true, username: u?.username };
  } catch {
    return { signedIn: false };
  }
}

export async function signIn(): Promise<CloudUser> {
  const p = window.puter;
  if (!p) return { signedIn: false };
  await p.auth.signIn();
  return getCloudUser();
}

export async function signOut(): Promise<void> {
  try {
    await window.puter?.auth.signOut();
  } catch {
    /* already out */
  }
}

export interface CloudLoadResult {
  ok: boolean;
  tasks: Task[] | null;
}

export async function cloudLoad(): Promise<CloudLoadResult> {
  const p = window.puter;
  if (!p?.kv) return { ok: false, tasks: null };
  try {
    const raw = await p.kv.get(KV_KEY);
    if (!raw) return { ok: true, tasks: null };
    const parsed: unknown = JSON.parse(String(raw));
    return { ok: true, tasks: Array.isArray(parsed) ? (parsed as Task[]) : null };
  } catch {
    return { ok: false, tasks: null };
  }
}

export async function cloudSave(tasks: Task[]): Promise<void> {
  const p = window.puter;
  if (!p?.kv) throw new Error("Puter KV unavailable");
  await p.kv.set(KV_KEY, JSON.stringify(tasks));
}

/** Ask Puter AI to break a task into concrete subtasks. Throws on failure. */
export async function breakTaskIntoSubtasks(text: string): Promise<string[]> {
  const p = window.puter;
  if (!p?.ai) throw new Error("Puter AI unavailable");
  const resp = await p.ai.chat(
    `You are a pragmatic task planner. Break the following task into 3 to 5 short, concrete, actionable subtasks. Reply with ONLY a JSON array of strings — no commentary, no markdown fences.\n\nTask: "${text}"`
  );
  const raw =
    typeof resp === "string"
      ? resp
      : ((resp as { message?: { content?: string } })?.message?.content ?? String(resp));
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) throw new Error("Unparseable AI reply");
  const arr: unknown = JSON.parse(m[0]);
  if (!Array.isArray(arr)) throw new Error("Unexpected AI reply shape");
  return arr
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

/* ---------- local-first mirror ---------- */

export function loadLocal(): Task[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Task[]) : [];
  } catch {
    return [];
  }
}

export function saveLocal(tasks: Task[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(tasks));
  } catch {
    /* storage full or blocked — cloud still has it */
  }
}

/** Union two task lists by id; on collision keep the more recently touched copy. */
export function mergeTasks(a: Task[], b: Task[]): Task[] {
  const map = new Map<string, Task>();
  const stamp = (t: Task) => t.completedAt ?? t.createdAt;
  for (const t of [...a, ...b]) {
    const existing = map.get(t.id);
    if (!existing || stamp(t) >= stamp(existing)) map.set(t.id, t);
  }
  return [...map.values()];
}
