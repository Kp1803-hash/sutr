import { useState } from "react";
import { useHelm } from "../lib/store";
import { AGENTS, timeAgo, type AgentId } from "../lib/types";
import { AgentTag, Btn, Card, Icon } from "../components/ui";

const KIND_ICON: Record<string, string> = {
  digest: "helm",
  alert: "alert",
  sales: "mail",
  idea: "spark",
  doc: "file",
};

export default function Inbox() {
  const h = useHelm();
  const { s } = h;
  const [filter, setFilter] = useState<AgentId | "all">("all");
  const unread = s.notices.filter((n) => !n.read).length;
  const list = s.notices.filter((n) => filter === "all" || n.agent === filter);
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
              {f === "all" ? `All (${s.notices.length})` : AGENTS[f].name.replace(" Agent", "").replace("Document ", "")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-inksoft">{unread} unread</span>
          <Btn size="sm" variant="outline" onClick={() => h.markAllRead()} disabled={unread === 0}>
            <Icon name="check" size={13} /> Mark all read
          </Btn>
        </div>
      </div>

      <div className="stagger space-y-2.5">
        {list.map((n) => (
          <Card
            key={n.id}
            className={`lift relative overflow-hidden p-4 ${!n.read ? "border-ink/20 shadow-sm" : "opacity-80"}`}
          >
            {!n.read && <span className={`absolute inset-y-0 left-0 w-1 ${AGENTS[n.agent].dot}`} />}
            <div className="flex items-start gap-3.5">
              <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${AGENTS[n.agent].soft} ${AGENTS[n.agent].text}`}>
                <Icon name={KIND_ICON[n.kind]} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`text-[14px] leading-tight ${n.read ? "font-medium text-ink/80" : "font-semibold"}`}>{n.title}</h3>
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-sales" />}
                  <span className="font-mono text-[10.5px] text-inkmute">{timeAgo(n.at)}</span>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-inksoft">{n.body}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <AgentTag agent={n.agent} size="sm" />
                  {n.actionView && (
                    <Btn
                      size="sm"
                      variant={n.read ? "ghost" : "outline"}
                      onClick={() => {
                        h.markRead(n.id);
                        h.go(n.actionView!);
                      }}
                    >
                      {n.actionLabel ?? "Open"} <Icon name="chevR" size={12} />
                    </Btn>
                  )}
                  {!n.read && (
                    <Btn size="sm" variant="ghost" onClick={() => h.markRead(n.id)}>
                      Mark read
                    </Btn>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="p-10 text-center">
            <Icon name="inbox" size={28} className="mx-auto text-inkmute" />
            <p className="mt-2 text-[13px] text-inksoft">Nothing from this agent yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
