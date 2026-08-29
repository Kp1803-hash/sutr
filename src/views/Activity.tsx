import { useState } from "react";
import { useSutr } from "../lib/store";
import { AGENTS, isToday, timeAgo, type AgentId } from "../lib/types";
import { AgentTag, Card, EngineChip, Icon, ReasoningPanel } from "../components/ui";

export default function Activity() {
  const h = useSutr();
  const { s } = h;
  const [filter, setFilter] = useState<AgentId | "all" | "reasoned">("all");
  const list = s.activity.filter((e) => filter === "all" || (filter === "reasoned" ? !!e.reasoning : e.agent === filter));
  const filters: Array<AgentId | "all" | "reasoned"> = ["all", "reasoned", "orchestrator", "sales", "marketing", "ops", "vault"];
  const reasoned = s.activity.filter((e) => e.reasoning).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${
                filter === f ? "bg-plum text-cream" : "border border-line bg-surface text-inksoft hover:border-plum/40 hover:text-plum"
              }`}>
              {f === "all" ? `All (${s.activity.length})` : f === "reasoned" ? `With reasoning (${reasoned})` : AGENTS[f].name.replace("Document ", "")}
            </button>
          ))}
        </div>
        <span className="font-mono text-[10.5px] text-inksoft">append-only · this is how you check the agents reason, not guess</span>
      </div>

      {s.engine.provider === "none" && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-plum/20 bg-plum/5 px-4 py-3">
          <Icon name="brain" size={15} className="mt-0.5 shrink-0 text-plum2" />
          <p className="text-[12px] leading-relaxed text-ink/80">
            Running on <b>transparent local inference</b> — the same context-retrieval flow, with rule-based reasoning shown in full.
            Connect Claude or OpenAI in Settings to upgrade every agent to LLM reasoning with live thinking traces.
          </p>
        </div>
      )}

      <div className="stagger space-y-2.5">
        {list.map((e) => (
          <Card key={e.id} className={`p-4 ${!isToday(e.at) ? "opacity-85" : ""}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${AGENTS[e.agent].dot}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <AgentTag agent={e.agent} size="sm" />
                  <span className="font-mono text-[10px] text-inkmute">{timeAgo(e.at)}</span>
                  {e.reasoning && <EngineChip engine={e.reasoning.engine} />}
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink/90">{e.text}</p>
                {e.reasoning && (
                  <div className="mt-2">
                    <ReasoningPanel r={e.reasoning} />
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="p-10 text-center">
            <Icon name="clock" size={26} className="mx-auto text-inkmute" />
            <p className="mt-2 text-[13px] text-inksoft">Nothing here yet — the agents are quiet on this filter.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
