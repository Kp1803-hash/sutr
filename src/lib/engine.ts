/* Sutr reasoning engine — direct Claude / OpenAI calls with a strict
   grounding contract. Keys live only in this browser (localStorage),
   are sent only to the chosen provider, and are never rendered or logged. */

import type { Reasoning } from "./types";

const K = "sutr.key.v1";
const P = "sutr.provider.v1";

export const getStoredKey = () => localStorage.getItem(K) ?? "";
export const getStoredProvider = (): "claude" | "openai" =>
  (localStorage.getItem(P) as "claude" | "openai") || "claude";
export const saveKey = (k: string) => (k ? localStorage.setItem(K, k) : localStorage.removeItem(K));
export const saveProvider = (p: "claude" | "openai") => localStorage.setItem(P, p);
export const maskKey = (k: string) => (k.length < 12 ? "••••••" : `${k.slice(0, 7)}…${k.slice(-4)}`);

export const MODELS = {
  claude: ["claude-sonnet-4-6", "claude-haiku-4-5"],
  openai: ["gpt-4o", "gpt-4o-mini"],
} as const;

const GROUNDING = `
GROUNDING CONTRACT (non-negotiable):
1. Use ONLY facts present in the data below (or facts explicitly marked as stored industry priors).
2. If data needed for a judgment is missing, say exactly what is missing — never invent stats, names, or details.
3. Cite specific records — planner names, numbers, dates, documents — in every claim you make.
4. Think step by step, weighing THIS specific situation, not generic best practice.`;

export function buildPrompt(system: string, context: Record<string, unknown>, task: string) {
  const user =
    `## LIVE DATA FROM SUTR'S SHARED CONTEXT STORE\n` +
    "```json\n" + JSON.stringify(context, null, 1) + "\n```\n\n" +
    `## YOUR TASK\n${task}\n${GROUNDING}`;
  return { system, user };
}

interface ClaudeBlock { type: string; thinking?: string; text?: string; }

export async function callLLM(
  provider: "claude" | "openai",
  model: string,
  key: string,
  system: string,
  context: Record<string, unknown>,
  task: string
): Promise<{ text: string; steps: string[]; tokens: number; ms: number }> {
  const { system: sys, user } = buildPrompt(system, context, task);
  const t0 = performance.now();

  if (provider === "claude") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1400,
        system: sys,
        messages: [{ role: "user", content: user }],
        thinking: { type: "adaptive" },
      }),
    });
    if (!res.ok) throw new Error(await errorText(res));
    const json = await res.json();
    const blocks: ClaudeBlock[] = json.content ?? [];
    const steps = blocks.filter((b) => b.type === "thinking" && b.thinking).map((b) => b.thinking!.trim()).filter(Boolean);
    const text = blocks.filter((b) => b.type === "text" && b.text).map((b) => b.text!.trim()).join("\n");
    if (!text) throw new Error("Claude returned no text.");
    return { text, steps, tokens: json.usage?.output_tokens ?? 0, ms: Math.round(performance.now() - t0) };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(await errorText(res));
  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("OpenAI returned no text.");
  return { text, steps: [], tokens: json.usage?.completion_tokens ?? 0, ms: Math.round(performance.now() - t0) };
}

async function errorText(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return j?.error?.message ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

/** Collect the concrete records from `context` that actually appear in the output. */
export function extractCitations(text: string, context: Record<string, unknown>): string[] {
  const found = new Set<string>();
  const lower = text.toLowerCase();
  const walk = (v: unknown, depth = 0) => {
    if (depth > 4 || found.size > 14) return;
    if (typeof v === "string") {
      if (v.length > 3 && v.length < 60 && lower.includes(v.toLowerCase())) found.add(v);
      return;
    }
    if (typeof v === "number") {
      const s = v.toLocaleString("en-IN");
      if (lower.includes(String(v)) || lower.includes(s)) found.add(s.startsWith("₹") ? s : String(v));
      return;
    }
    if (Array.isArray(v)) return v.forEach((x) => walk(x, depth + 1));
    if (v && typeof v === "object") return Object.values(v).forEach((x) => walk(x, depth + 1));
  };
  walk(context);
  return [...found].slice(0, 10);
}

export function parseSteps(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter((l) => l.length > 12)
    .slice(0, 8);
}

export function makeReasoning(
  engine: Reasoning["engine"],
  steps: string[],
  dataCited: string[],
  tokens?: number,
  ms?: number
): Reasoning {
  return {
    engine,
    steps: steps.length ? steps : ["(no trace captured)"],
    dataCited,
    tokens,
    ms,
  };
}
