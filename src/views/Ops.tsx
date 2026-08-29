import { useState } from "react";
import { useHelm } from "../lib/store";
import { daysUntil, timeAgo } from "../lib/types";
import { healthScore } from "../agents/ops";
import { Btn, Card, Dial, Icon, SectionHead, Sev, inputCls } from "../components/ui";

export default function Ops() {
  const h = useHelm();
  const { s } = h;
  const [scanning, setScanning] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [task, setTask] = useState({ title: "", owner: "Alex", dueDays: "3" });

  const open = s.risks.filter((r) => r.status === "open");
  const resolved = s.risks.filter((r) => r.status === "resolved");
  const score = healthScore(s);

  const scan = () => {
    setScanning(true);
    setTimeout(() => {
      h.runOpsScan();
      setScanning(false);
    }, 650);
  };

  const addTask = () => {
    if (!task.title.trim()) return;
    h.addTask({ title: task.title.trim(), owner: task.owner.trim() || "Alex", dueDays: Number(task.dueDays) || 3 });
    setTask({ title: "", owner: "Alex", dueDays: "3" });
  };

  return (
    <div>
      {/* ============ Health + rules ============ */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="flex items-center gap-5 p-5">
          <Dial score={score} />
          <div className="flex-1">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-inkmute">Operations health</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-inksoft">
              Weighted from {open.length} open risk{open.length === 1 ? "" : "s"}: high −18, medium −9, low −4.
            </p>
            <button
              onClick={scan}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ops px-3.5 py-2 text-[13px] font-semibold text-canvas transition-all hover:brightness-110 active:scale-95"
            >
              <Icon name="refresh" size={14} className={scanning ? "spin-slow" : ""} />
              {scanning ? "Scanning shared store…" : "Run health scan"}
            </button>
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Icon name="bolt" size={15} className="text-alert" />
            <span className="font-display text-[14px] font-semibold">How escalation works</span>
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            {[
              { t: "High severity", d: "Escalated to your inbox the moment it's found — never waits for the daily summary.", cls: "text-alert", icon: "alert" },
              { t: "Medium / low", d: "Bundled into the daily ops summary with a recommended next step for each.", cls: "text-warn", icon: "clock" },
              { t: "Explainable", d: "Every flag shows what, why, and what to do — ask “why?” in chat for more.", cls: "text-ops", icon: "spark" },
            ].map((r) => (
              <div key={r.t} className="rounded-lg bg-canvas/60 p-3">
                <div className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${r.cls}`}>
                  <Icon name={r.icon} size={13} /> {r.t}
                </div>
                <p className="mt-1 text-[11.5px] leading-snug text-inksoft">{r.d}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ============ Risk register ============ */}
      <SectionHead
        kicker={`Risk register · ${open.length} open`}
        title="What could break — before it does"
        right={resolved.length ? (
          <Btn size="sm" variant="ghost" onClick={() => setShowResolved(!showResolved)}>
            {showResolved ? "Hide" : "Show"} {resolved.length} resolved <Icon name="chevD" size={12} className={showResolved ? "rotate-180 transition-transform" : "transition-transform"} />
          </Btn>
        ) : undefined}
      />
      <div className="stagger mb-7 space-y-3">
        {open.map((r) => (
          <Card key={r.id} className={`lift overflow-hidden ${r.severity === "high" ? "border-alert/40" : ""}`}>
            <div className="flex items-start gap-4 p-4">
              <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                r.severity === "high" ? "bg-alert/10 text-alert" : r.severity === "medium" ? "bg-warn/10 text-warn" : "bg-ink/5 text-inksoft"
              }`}>
                <Icon name="alert" size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Sev s={r.severity} />
                  {r.escalated && (
                    <span className="flex items-center gap-1 rounded-full bg-alert px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-canvas">
                      <Icon name="bolt" size={10} /> Escalated immediately
                    </span>
                  )}
                  <span className="font-mono text-[10px] uppercase tracking-wide text-inkmute">{r.category} · {timeAgo(r.createdAt)}</span>
                </div>
                <h3 className="mt-1.5 font-display text-[15px] font-semibold leading-snug">{r.title}</h3>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg bg-canvas/70 p-3">
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-inkmute">Why it's a risk</div>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink/85">{r.why}</p>
                  </div>
                  <div className="rounded-lg bg-ops/6 p-3">
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ops">Recommended next step</div>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink/85">{r.recommendation}</p>
                  </div>
                </div>
              </div>
              <Btn size="sm" variant="outline" onClick={() => h.resolveRisk(r.id)}>
                <Icon name="check" size={13} /> Resolve
              </Btn>
            </div>
          </Card>
        ))}
        {open.length === 0 && (
          <Card className="p-10 text-center">
            <Icon name="gauge" size={28} className="mx-auto text-ops" />
            <p className="mt-2 text-[13.5px] font-medium text-ops">Register clear — nothing at risk right now.</p>
            <p className="text-[12px] text-inksoft">The agent keeps scanning tasks, vendors, and closed-deal handoffs.</p>
          </Card>
        )}
        {showResolved &&
          resolved.map((r) => (
            <Card key={r.id} className="p-4 opacity-60">
              <div className="flex items-center gap-2.5">
                <Icon name="check" size={15} className="text-ops" />
                <span className="text-[13px] font-medium line-through decoration-ink/30">{r.title}</span>
                <span className="ml-auto font-mono text-[10.5px] text-inkmute">resolved · kept for audit</span>
              </div>
            </Card>
          ))}
      </div>

      {/* ============ Tasks + vendors ============ */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionHead kicker="Tracked automatically for deadline drift" title="Tasks & deadlines" />
          <Card className="divide-y divide-line/70">
            {s.tasks.map((t) => {
              const du = daysUntil(t.due);
              const late = t.status === "open" && du <= 1;
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas/60">
                  <button
                    onClick={() => h.toggleTask(t.id)}
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all active:scale-90 ${
                      t.status === "done" ? "border-ops bg-ops text-canvas" : "border-line bg-surface hover:border-ops"
                    }`}
                  >
                    {t.status === "done" && <Icon name="check" size={12} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[13px] font-medium ${t.status === "done" ? "text-inkmute line-through" : ""}`}>{t.title}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wide text-inkmute">
                      {t.owner}{t.linkedLeadId && <span className="ml-2 rounded bg-sales/10 px-1.5 py-px text-sales">linked to closed deal</span>}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold ${
                    t.status === "done" ? "bg-ink/5 text-inkmute" : late ? "bg-alert/10 text-alert" : du <= 3 ? "bg-warn/10 text-warn" : "bg-ink/5 text-inksoft"
                  }`}>
                    {t.status === "done" ? "done" : du < 0 ? `${-du}d overdue` : du === 0 ? "due today" : `due in ${du}d`}
                  </span>
                </div>
              );
            })}
          </Card>
          <div className="mt-3 flex flex-wrap gap-2">
            <input className={`${inputCls} min-w-[220px] flex-1`} placeholder="New task — Ops will watch its deadline" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addTask()} />
            <input className={`${inputCls} w-28`} placeholder="Owner" value={task.owner} onChange={(e) => setTask({ ...task, owner: e.target.value })} />
            <select className={`${inputCls} w-32`} value={task.dueDays} onChange={(e) => setTask({ ...task, dueDays: e.target.value })}>
              <option value="1">Due tomorrow</option>
              <option value="3">In 3 days</option>
              <option value="7">In a week</option>
              <option value="14">In 2 weeks</option>
            </select>
            <Btn onClick={addTask} disabled={!task.title.trim()}><Icon name="plus" size={14} /> Add</Btn>
          </div>
        </div>

        <div className="lg:col-span-2">
          <SectionHead kicker="Feed it vendor status — it maps exposure" title="Vendor watch" />
          <div className="space-y-3">
            {s.vendors.map((v) => (
              <Card key={v.id} className="lift p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[13.5px] font-semibold">{v.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wide text-inkmute">{v.category} · checked {timeAgo(v.lastCheckedAt)}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${
                    v.status === "ok" ? "bg-ops/10 text-ops" : v.status === "watch" ? "bg-warn/12 text-warn" : "bg-alert/10 text-alert"
                  }`}>
                    {v.status}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-snug text-inksoft">{v.note}</p>
                <div className="mt-2.5 flex gap-1.5">
                  {(["ok", "watch", "delayed"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => h.setVendor(v.id, st)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                        v.status === st ? "bg-ink text-canvas" : "bg-ink/5 text-inksoft hover:bg-ink/10"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          <p className="mt-3 rounded-lg border border-dashed border-line bg-canvas/50 p-3 text-[11.5px] leading-relaxed text-inksoft">
            <b className="text-ink">No integration needed yet:</b> type or upload status manually. Later, connect your
            project tool and the agent watches it directly.
          </p>
        </div>
      </div>
    </div>
  );
}
