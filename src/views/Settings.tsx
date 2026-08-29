import { useState } from "react";
import { useSutr } from "../lib/store";
import { getStoredKey, maskKey } from "../lib/engine";
import { Btn, Card, Icon, Modal, SectionHead, inputCls } from "../components/ui";

export default function Settings({ onConnectModel }: { onConnectModel: () => void }) {
  const h = useSutr();
  const { s } = h;
  const st = s.settings;
  const [oauthOpen, setOauthOpen] = useState(false);
  const [account, setAccount] = useState("kabir@sutr.in");
  const [newAccess, setNewAccess] = useState("");
  const hasKey = getStoredKey().length > 0;

  const num = (v: string, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ===== reasoning engine ===== */}
      <Card className="p-5">
        <SectionHead kicker="The brain behind every agent" title="Reasoning engine" />
        <div className={`flex items-center gap-3 rounded-lg border p-3.5 ${
          s.engine.provider !== "none" && s.engine.status === "ok" ? "border-gold/40 bg-gold/8" :
          s.engine.status === "error" ? "border-alert/30 bg-alert/6" : "border-line bg-canvas/60"
        }`}>
          <span className={`grid h-9 w-9 place-items-center rounded-lg ${s.engine.provider !== "none" ? "bg-gold/15 text-[#8a6414]" : "bg-ink/6 text-inksoft"}`}>
            <Icon name="brain" size={17} />
          </span>
          <div className="flex-1">
            <div className="text-[13.5px] font-semibold">
              {s.engine.provider === "none" ? "Local inference (no key)" : `${s.engine.provider === "claude" ? "Claude" : "OpenAI"} · ${s.engine.model}`}
            </div>
            <div className="text-[11.5px] text-inksoft">
              {s.engine.provider === "none"
                ? "Transparent rule-based reasoning over the same context pipeline"
                : s.engine.status === "error" ? `Connection error: ${s.engine.error}` : `Key ${maskKey(getStoredKey())} · stored in this browser only`}
            </div>
          </div>
          {hasKey && <Btn size="sm" variant="danger" onClick={() => h.clearEngine()}>Remove key</Btn>}
          <Btn size="sm" variant="gold" onClick={onConnectModel}><Icon name="key" size={13} /> {hasKey ? "Change model" : "Connect model"}</Btn>
        </div>
        <ul className="mt-3 space-y-1.5 text-[12px] text-inksoft">
          <li className="flex items-start gap-2"><Icon name="check" size={13} className="mt-0.5 shrink-0 text-sage" /> Claude recommended (matches your stack); OpenAI is a click away. New Anthropic accounts often get ~$5 trial credit — verify in your console.</li>
          <li className="flex items-start gap-2"><Icon name="check" size={13} className="mt-0.5 shrink-0 text-sage" /> Every agent: retrieve store context → reason with the model → grounded output with a visible trace.</li>
          <li className="flex items-start gap-2"><Icon name="shield" size={13} className="mt-0.5 shrink-0 text-sage" /> Grounding contract: if the data isn't in the store, the agent says so. It never invents stats or planner details.</li>
          <li className="flex items-start gap-2"><Icon name="lock" size={13} className="mt-0.5 shrink-0 text-sage" /> Key lives in this browser; in production it moves to a server-side env var. Never rendered, never logged.</li>
        </ul>
      </Card>

      {/* ===== Gmail ===== */}
      <Card className="p-5">
        <SectionHead kicker="Sales integration · OAuth" title="Gmail connection" />
        <div className={`flex items-center gap-3 rounded-lg border p-3.5 ${st.gmailConnected ? "border-sage/30 bg-sage/8" : "border-line bg-canvas/60"}`}>
          <span className={`grid h-9 w-9 place-items-center rounded-lg ${st.gmailConnected ? "bg-sage/15 text-[#55633f]" : "bg-ink/6 text-inksoft"}`}>
            <Icon name="mail" size={16} />
          </span>
          <div className="flex-1">
            <div className="text-[13.5px] font-semibold">{st.gmailConnected ? st.gmailAccount : "Not connected"}</div>
            <div className="text-[11.5px] text-inksoft">{st.gmailConnected ? "Drafts scope + read scope active" : "Sales drafts in-sandbox until connected"}</div>
          </div>
          {st.gmailConnected
            ? <Btn size="sm" variant="danger" onClick={() => h.disconnectGmail()}>Disconnect</Btn>
            : <Btn size="sm" onClick={() => setOauthOpen(true)}><Icon name="lock" size={13} /> Connect securely</Btn>}
        </div>
        <ul className="mt-3 space-y-1.5 text-[12px] text-inksoft">
          {[
            "Consent happens on Google's screen — your password never touches this app",
            "Scopes: gmail.modify (create drafts) + gmail.readonly (track replies)",
            "No “send” scope is requested — autonomous sending is technically impossible",
            "Revoke anytime: myaccount.google.com → Security → Third-party access",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2"><Icon name="check" size={13} className="mt-0.5 shrink-0 text-sage" /> {t}</li>
          ))}
        </ul>
      </Card>

      {/* ===== Sales rules ===== */}
      <Card className="p-5">
        <SectionHead kicker="The Sales Agent obeys these" title="Outreach rules" />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Cold after (days)</span>
            <input type="number" className={inputCls} defaultValue={st.coldDays} min={1} onBlur={(e) => h.updateSettings({ coldDays: num(e.target.value, st.coldDays) })} />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Follow-up cadence (days)</span>
            <input type="number" className={inputCls} defaultValue={st.cadenceDays} min={1} onBlur={(e) => h.updateSettings({ cadenceDays: num(e.target.value, st.cadenceDays) })} />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Email tone the agent imitates</span>
          <textarea className={`${inputCls} h-28 resize-none`} defaultValue={st.toneSample}
            onBlur={(e) => e.target.value.trim() && h.updateSettings({ toneSample: e.target.value.trim() })} />
        </label>
        <p className="mt-2 text-[11px] text-inksoft">Changes apply to the next draft immediately — agents read rules from the shared store.</p>
      </Card>

      {/* ===== Marketing ===== */}
      <Card className="p-5">
        <SectionHead kicker="The Marketing Agent obeys these" title="Budget & voice" />
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Weekly budget cap (proposals only)</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-inkmute">₹</span>
            <input type="number" className={`${inputCls} pl-7`} defaultValue={st.weeklyBudgetCap} min={1000}
              onBlur={(e) => h.updateSettings({ weeklyBudgetCap: num(e.target.value, st.weeklyBudgetCap) })} />
          </div>
        </label>
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-rose/6 p-3">
          <Icon name="shield" size={14} className="mt-0.5 shrink-0 text-rose" />
          <p className="text-[11.5px] leading-relaxed text-ink/80">
            The agent can <b>propose</b> spends up to this cap. Committing money on Meta/Google always requires your manual
            approval in the ad platform — phase-2 APIs will keep that rule.
          </p>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Brand voice</span>
          <textarea className={`${inputCls} h-20 resize-none`} defaultValue={st.brandVoice}
            onBlur={(e) => e.target.value.trim() && h.updateSettings({ brandVoice: e.target.value.trim() })} />
        </label>
      </Card>

      {/* ===== Ops + Vault access ===== */}
      <Card className="p-5">
        <SectionHead kicker="Handoffs & access control" title="Ops rules · Vault access" />
        <button onClick={() => h.updateSettings({ autoOpsOnWin: !st.autoOpsOnWin })}
          className="flex w-full items-center justify-between rounded-lg border border-line bg-canvas/60 p-3.5 transition-colors hover:border-plum/30">
          <span className="text-left">
            <span className="block text-[13px] font-semibold">Auto-create ops task when Sales closes</span>
            <span className="text-[11.5px] text-inksoft">Closed deal → onboarding task in Operations, instantly</span>
          </span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${st.autoOpsOnWin ? "bg-sage" : "bg-ink/15"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${st.autoOpsOnWin ? "left-[22px]" : "left-0.5"}`} />
          </span>
        </button>

        <div className="mt-4">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Who can open the Vault</div>
          <div className="space-y-1.5">
            {st.vaultAccess.map((p, i) => (
              <div key={p} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
                <Icon name={i === 0 ? "user" : "eye"} size={14} className="text-plum2" />
                <span className="flex-1 text-[12.5px] font-medium">{p}</span>
                {i === 0 ? (
                  <span className="font-mono text-[10px] uppercase text-inkmute">owner · permanent</span>
                ) : (
                  <button onClick={() => h.updateSettings({ vaultAccess: st.vaultAccess.filter((x) => x !== p) })} className="rounded p-1 text-inksoft transition-colors hover:bg-alert/10 hover:text-alert">
                    <Icon name="x" size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input className={inputCls} placeholder="Grant access — name or role" value={newAccess} onChange={(e) => setNewAccess(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newAccess.trim()) { h.updateSettings({ vaultAccess: [...st.vaultAccess, newAccess.trim()] }); setNewAccess(""); } }} />
            <Btn variant="outline" disabled={!newAccess.trim()} onClick={() => { h.updateSettings({ vaultAccess: [...st.vaultAccess, newAccess.trim()] }); setNewAccess(""); }}>
              <Icon name="plus" size={13} /> Grant
            </Btn>
          </div>
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Demo data</div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11.5px] leading-snug text-inksoft">Everything persists in this browser's local store. Reset to a fresh Sutr morning anytime — your reasoning key is kept.</p>
            <Btn size="sm" variant="danger" onClick={() => h.resetDemo()}><Icon name="refresh" size={13} /> Reset demo</Btn>
          </div>
        </div>
      </Card>

      {/* ===== OAuth modal ===== */}
      <Modal open={oauthOpen} onClose={() => setOauthOpen(false)} title="Connect Gmail — sandbox OAuth walkthrough" wide>
        <div className="space-y-4">
          <p className="text-[13px] leading-relaxed text-inksoft">
            In production this redirects to <b className="text-ink">Google's own consent screen</b>. Here's exactly what happens:
          </p>
          <div className="space-y-2.5">
            {[
              { t: "1 · You sign in at Google", d: "Credentials stay on Google's page. This app only receives a temporary authorization code." },
              { t: "2 · Server exchanges the code", d: "A small backend swaps it for tokens and encrypts them at rest. Tokens never enter your browser or this dashboard." },
              { t: "3 · Two scopes, nothing more", d: "gmail.modify — create drafts in your Drafts folder. gmail.readonly — notice when a planner replies. There is deliberately no send scope." },
              { t: "4 · You stay in control", d: "Revoke in one click from your Google account settings; the agent loses drafts access immediately." },
            ].map((step) => (
              <div key={step.t} className="flex items-start gap-3 rounded-lg border border-line bg-canvas/60 p-3.5">
                <Icon name="lock" size={15} className="mt-0.5 shrink-0 text-plum2" />
                <div>
                  <div className="text-[13px] font-semibold">{step.t}</div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-inksoft">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-plum p-3.5 text-cream">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-goldsoft">Sandbox mode</div>
            <p className="mt-1 text-[12.5px] leading-relaxed">
              This demo simulates the connection so you can feel the full flow. Approving a draft logs the exact API call production
              would make (<span className="font-mono text-[11.5px] text-cream/80">users.drafts.create</span>) — nothing touches a real inbox.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.13em] text-inkmute">Account to connect</span>
              <input className={inputCls} value={account} onChange={(e) => setAccount(e.target.value)} />
            </label>
            <Btn variant="gold" onClick={() => { h.connectGmail(account.trim() || account); setOauthOpen(false); }}>
              <Icon name="check" size={14} /> Authorize (sandbox)
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
