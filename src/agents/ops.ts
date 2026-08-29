import type { Risk, Severity, State } from "../lib/types";
import { daysUntil, uid } from "../lib/types";

/**
 * Operations Agent — scans the shared store for things about to break.
 * Every risk carries: what, why (explainable), and a recommended next step.
 * High severity escalates immediately; the rest waits for the daily summary.
 */

export interface ScanResult {
  risks: Risk[];
  score: number;
  newCount: number;
  newHigh: Risk[];
  summary: string;
}

export function runScan(state: State): ScanResult {
  const now = new Date().toISOString();
  const found: Risk[] = [];

  // Deadline risks on open tasks
  for (const t of state.tasks.filter((t) => t.status === "open")) {
    const du = daysUntil(t.due);
    if (du <= 3) {
      const sev: Severity = du <= 1 ? "high" : "medium";
      const vendorIssue = state.vendors.find((v) => v.status === "delayed");
      found.push({
        id: uid(),
        key: `task-${t.id}`,
        title: `“${t.title}” due ${du <= 0 ? "today" : `in ${du} day${du === 1 ? "" : "s"}`}`,
        why:
          `The task is open with ${du <= 0 ? "no time left" : `${du} day${du === 1 ? "" : "s"} left`}.` +
          (vendorIssue
            ? ` Compounding factor: ${vendorIssue.name} is on delayed status, so anything depending on their delivery has zero slack.`
            : ` Your historical pattern: tasks left to the due date slip ~40% of the time.`),
        severity: sev,
        recommendation:
          du <= 1
            ? "Do or delegate today. If it slips, tell the affected customer now — earlier is always cheaper."
            : "Move it to tomorrow morning's first block and confirm the owner has everything they need.",
        status: "open",
        category: "Deadlines",
        createdAt: now,
      });
    }
  }

  // Vendor risks
  for (const v of state.vendors.filter((v) => v.status !== "ok")) {
    const affected = state.tasks.filter(
      (t) => t.status === "open" && /inverter|order|supply/i.test(t.title)
    );
    found.push({
      id: uid(),
      key: `vendor-${v.id}`,
      title:
        v.status === "delayed"
          ? `${v.name} is delayed — downstream deliverables exposed`
          : `${v.name} needs watching`,
      why:
        v.status === "delayed"
          ? `${v.name} (${v.category.toLowerCase()}) reported: “${v.note}” ` +
            (affected.length
              ? `${affected.length} open task${affected.length > 1 ? "s" : ""} touch their delivery window, and a closed deal is waiting on it.`
              : "No open task depends on them yet, which is the best time to act.")
          : `Status is “watch”: ${v.note}`,
      severity: v.status === "delayed" ? "high" : "low",
      recommendation:
        v.status === "delayed"
          ? `Source a backup quote from an alternative vendor today and decide within 24h. If the slip exceeds 2 days, notify the customer with a revised date.`
          : "Set a 48-hour check-in; no action needed yet.",
      status: "open",
      category: "Vendors",
      createdAt: now,
    });
  }

  // Closed deals without fulfillment tasks
  for (const l of state.leads.filter((l) => l.stage === "won")) {
    const has = state.tasks.some((t) => t.linkedLeadId === l.id && t.status === "open");
    if (!has) {
      found.push({
        id: uid(),
        key: `deal-${l.id}-fulfillment`,
        title: `${l.company} won but no open fulfillment task`,
        why: `Sales marked ${l.company} won ($${l.value.toLocaleString()}) and the shared store shows no open onboarding/install task linked to it. New-customer momentum is your highest-churn window.`,
        severity: "medium",
        recommendation: "Create the onboarding task now — or flip on “auto-create ops task on win” in Settings so this can't happen again.",
        status: "open",
        category: "Handoffs",
        createdAt: now,
      });
    }
  }

  // Resource load
  const byOwner = new Map<string, number>();
  state.tasks.filter((t) => t.status === "open").forEach((t) => {
    byOwner.set(t.owner, (byOwner.get(t.owner) ?? 0) + 1);
  });
  for (const [owner, count] of byOwner) {
    if (count >= 3) {
      found.push({
        id: uid(),
        key: `load-${owner}`,
        title: `${owner} carries ${count} open tasks — bottleneck forming`,
        why: `${count} open tasks sit with one owner while deadlines cluster this week. Single-owner clusters are how small teams miss dates silently.`,
        severity: "low",
        recommendation: `Move one task to the field crew or defer it explicitly. A deferred task with a date beats a silent one.`,
        status: "open",
        category: "Resourcing",
        createdAt: now,
      });
    }
  }

  // Merge with existing open risks (dedupe by key), keep resolved history
  const openKeys = new Set(state.risks.filter((r) => r.status === "open").map((r) => r.key));
  const fresh = found.filter((r) => !openKeys.has(r.key));
  const stillValid = state.risks.filter(
    (r) => r.status === "open" && found.some((f) => f.key === r.key)
  );
  const resolved = state.risks.filter((r) => r.status === "resolved");
  const risks = [...fresh, ...stillValid, ...resolved].sort(
    (a, b) => sevRank(a.severity) - sevRank(b.severity)
  );

  const open = risks.filter((r) => r.status === "open");
  const score = Math.max(
    20,
    100 - open.reduce((a, r) => a + (r.severity === "high" ? 18 : r.severity === "medium" ? 9 : 4), 0)
  );
  const newHigh = fresh.filter((r) => r.severity === "high");

  return {
    risks,
    score,
    newCount: fresh.length,
    newHigh,
    summary:
      fresh.length === 0
        ? `Health scan complete: no new risks. ${open.length} remain open. Health score ${score}/100.`
        : `Health scan complete: ${fresh.length} new risk${fresh.length > 1 ? "s" : ""}${newHigh.length ? ` (${newHigh.length} high — escalated immediately)` : ""}. Health score ${score}/100.`,
  };
}

const sevRank = (s: Severity) => (s === "high" ? 0 : s === "medium" ? 1 : 2);

export function healthScore(state: State): number {
  const open = state.risks.filter((r) => r.status === "open");
  return Math.max(
    20,
    100 - open.reduce((a, r) => a + (r.severity === "high" ? 18 : r.severity === "medium" ? 9 : 4), 0)
  );
}
