import { useState } from "react";
import { useHelm } from "../lib/store";
import { AGENTS, timeAgo, type AgentId } from "../lib/types";
import { AgentTag, Card, Icon, Why } from "../components/ui";

export default function Activity() {
  const h = useHelm();
  const { s } = h;
  const [filter, setFilter] = useState<AgentId | "all">("all");
  const list = s.activity.filter((e) => filter === "all" || e.agent === filter);

  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date().toDateString();
    const yest = new Date(Date.now() - 86400000).toDateString();
    if (d.toDateString() === today) return "Today";
    if (d.toDateString() === yest) return "Yesterday";
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };

  let lastDay = "";
  const filters: Array<AgentId | "all"> = ["all", "orchestrator", "sales", "marketing", "ops", "vault"];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${
                filter === f ? "bg-ink text-canvas" : "border border-line bg-surface text-inksoft hover:border-ink/30 hover:text-ink"
              }`}
            >
              {f === "all" ? `All (${s.activity.length})` : AGENTS[f].name.replace(" Agent", "").replace("Document ", "")}
            </button>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-[11.5px] text-inksoft">
          <Icon name="shield" size={13} className="text-ops" />
          Append-only audit trail — agents can't edit their own history
        </p>
      </div>

      <Card className="divide-y divide-line/60">
        {list.map((e) => {
          const showDay = dayLabel(e.at) !== lastDay;
          lastDay = dayLabel(e.at);
          return (
            <div key={e.id}>
              {showDay && (
                <div className="bg-canvas/70 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-inkmute">
                  {dayLabel(e.at)}
                </div>
              )}
              <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-canvas/50">
                <AgentTag agent={e.agent} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-ink/90">{e.text}</p>
                  {e.why && (
                    <div className="mt-1.5">
                      <Why text={e.why} label="Reasoning" />
                    </div>
                  )}
                </div>
                <span className="shrink-0 font-mono text-[10.5px] text-inkmute">
                  {new Date(e.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} · {timeAgo(e.at)}
                </span>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="p-10 text-center">
            <Icon name="pulse" size={26} className="mx-auto text-inkmute" />
            <p className="mt-2 text-[13px] text-inksoft">No events from this agent yet.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
