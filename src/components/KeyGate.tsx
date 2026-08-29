import { useState } from "react";
import { useSutr } from "../lib/store";
import { MODELS, maskKey } from "../lib/engine";
import { Btn, Icon, Modal, inputCls } from "./ui";

/**
 * First-run reasoning-model handshake. The key is stored in this browser
 * only (localStorage), sent only to the provider you choose, and is never
 * rendered, logged, or included in activity entries.
 */
export default function KeyGate({ open, onClose }: { open: boolean; onClose: () => void }) {
  const h = useSutr();
  const [provider, setProvider] = useState<"claude" | "openai">("claude");
  const [key, setKey] = useState("");
  const [model, setModel] = useState<string>(MODELS.claude[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = (p: "claude" | "openai") => {
    setProvider(p);
    setModel(MODELS[p][0]);
    setErr("");
  };

  const connect = async () => {
    if (key.trim().length < 10) { setErr("That doesn't look like a full API key."); return; }
    setBusy(true); setErr("");
    const ok = await h.connectEngine(provider, key.trim(), model);
    setBusy(false);
    if (ok) { setKey(""); onClose(); }
    else setErr(`Connection failed: ${h.s.engine.error ?? "check the key and model"}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Connect your reasoning model" wide>
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-inksoft">
          Sutr's agents are <b className="text-ink">reasoning agents, not scripts</b> — each one gathers context from your shared
          store, thinks through the specific situation with a real LLM, and produces grounded output it can explain.
          Choose the model that does the thinking:
        </p>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <button onClick={() => pick("claude")}
            className={`rounded-xl border-2 p-3.5 text-left transition-all ${provider === "claude" ? "border-gold bg-gold/8 shadow-sm" : "border-line hover:border-plum/30"}`}>
            <div className="flex items-center justify-between">
              <span className="font-display text-[15px] font-bold">Anthropic Claude</span>
              {provider === "claude" && <Icon name="check" size={15} className="text-[#8a6414]" />}
            </div>
            <p className="mt-1 text-[11.5px] leading-snug text-inksoft">Recommended — matches your stack. claude-sonnet-4-6 for depth, claude-haiku-4-5 for speed. New API accounts often get ~$5 trial credit; verify at console.anthropic.com.</p>
          </button>
          <button onClick={() => pick("openai")}
            className={`rounded-xl border-2 p-3.5 text-left transition-all ${provider === "openai" ? "border-gold bg-gold/8 shadow-sm" : "border-line hover:border-plum/30"}`}>
            <div className="flex items-center justify-between">
              <span className="font-display text-[15px] font-bold">OpenAI</span>
              {provider === "openai" && <Icon name="check" size={15} className="text-[#8a6414]" />}
            </div>
            <p className="mt-1 text-[11.5px] leading-snug text-inksoft">Fine alternative — gpt-4o or gpt-4o-mini (fractions of a cent per call; prepaid minimum ~$5 on platform.openai.com).</p>
          </button>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-[1fr_190px]">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">
              <Icon name="lock" size={11} /> API key — stored in this browser only
            </span>
            <input type="password" className={inputCls} placeholder={provider === "claude" ? "sk-ant-…" : "sk-…"} value={key} onChange={(e) => setKey(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Model</span>
            <select className={inputCls} value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS[provider].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </div>

        {err && (
          <div className="flex items-start gap-2 rounded-lg border border-alert/30 bg-alert/8 p-3 text-[12px] text-alert">
            <Icon name="alert" size={14} className="mt-0.5" /> {err}
          </div>
        )}

        <div className="rounded-xl bg-plum p-4 text-cream">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-goldsoft">What it costs · how it's handled</div>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-cream/85">
            <li className="flex gap-2"><Icon name="check" size={13} className="mt-0.5 shrink-0 text-gold" /> Roughly 1–3¢ per agent call — a full day of agent work is ≈ ₹10–30. Haiku/gpt-4o-mini is cheaper still.</li>
            <li className="flex gap-2"><Icon name="check" size={13} className="mt-0.5 shrink-0 text-gold" /> Your key is saved in this browser and sent directly to {provider === "claude" ? "Anthropic" : "OpenAI"}. No middle server, never displayed, never written to the activity log.</li>
            <li className="flex gap-2"><Icon name="check" size={13} className="mt-0.5 shrink-0 text-gold" /> In production this moves to a server-side env var — same behavior, zero browser exposure.</li>
            <li className="flex gap-2"><Icon name="shield" size={13} className="mt-0.5 shrink-0 text-gold" /> Grounding contract: agents may only cite data that's in your store. If it's missing, they say so — they never fill the gap.</li>
          </ul>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Btn variant="ghost" onClick={onClose}>Skip for now — run on local inference</Btn>
          <Btn variant="gold" onClick={connect} disabled={busy}>
            {busy ? (<><span className="spin-slow inline-block h-3.5 w-3.5 rounded-full border-2 border-plum/30 border-t-plum" /> Testing…</>) : (<><Icon name="key" size={14} /> Connect {provider === "claude" ? "Claude" : "OpenAI"}</>)}
          </Btn>
        </div>
        <p className="text-center font-mono text-[9.5px] uppercase tracking-wide text-inkmute">
          local inference keeps every feature working with transparent rule-based reasoning{key ? ` · ${maskKey(key)}` : ""}
        </p>
      </div>
    </Modal>
  );
}
