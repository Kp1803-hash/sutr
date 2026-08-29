import type { VaultDoc } from "../lib/types";

/**
 * Document Vault Agent — store, auto-tag, retrieve, version, expiry-watch.
 * Every tag is explainable: the agent records *why* it tagged something.
 */

const KEYWORDS: Array<[RegExp, string]> = [
  [/\b(agree|contract|master supply)\b/i, "contract"],
  [/\bnda|non-?disclosure\b/i, "nda"],
  [/\binvoice|receipt|deposit\b/i, "invoice"],
  [/\blicense|licence|permit|certif/i, "license"],
  [/\bbrand|logo|guideline/i, "brand"],
  [/\bchecklist|process|survey|template/i, "process"],
  [/\brenewal|renew|expires?\b/i, "renewal"],
  [/\bvendor|supply|supplier\b/i, "vendor"],
  [/\bcompliance|audit|safety\b/i, "compliance"],
];

const PEOPLE = [
  "VoltEdge Supply",
  "SunPanel Co",
  "Maple Row Realty",
  "Cedar & Sage Spa",
  "Harbor & Vine",
  "Bluebird Dental",
  "Kite Fitness",
  "Northwind Roastery",
  "Willow Creek",
];

export function autoTag(name: string, content: string) {
  const text = `${name} ${content}`;
  const tags = new Set<string>();
  const reasons: string[] = [];

  let type: VaultDoc["type"] = "other";
  for (const [re, tag] of KEYWORDS) {
    if (re.test(text)) {
      tags.add(tag);
      if (tag === "contract" || tag === "invoice" || tag === "license" || tag === "brand" || tag === "process") {
        if (type === "other") {
          type = tag as VaultDoc["type"];
          reasons.push(`type “${tag}” matched the document text`);
        }
      } else {
        reasons.push(`tag “${tag}” matched keywords`);
      }
    }
  }
  if (/\.pdf$/i.test(name)) tags.add("pdf");
  if (/\.docx?$/i.test(name)) tags.add("docx");

  let person: string | undefined;
  for (const p of PEOPLE) {
    if (text.toLowerCase().includes(p.toLowerCase())) {
      person = p;
      tags.add(p.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""));
      reasons.push(`related party “${p}” found in the text`);
      break;
    }
  }

  let expiresAt: string | undefined;
  const m = text.match(/(?:expires?|valid through|renewal)[^\d]{0,40}(\d{1,2})\s?(day|week|month)s?/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const days = m[2].startsWith("day") ? n : m[2].startsWith("week") ? n * 7 : n * 30;
    expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    reasons.push(`expiry parsed from text (“${m[0].trim()}”)`);
  }

  return {
    type,
    tags: [...tags],
    person,
    expiresAt,
    why: reasons.length ? reasons.join("; ") : "no strong keyword matches — filed as “other” for your review",
  };
}

export interface SearchHit {
  doc: VaultDoc;
  score: number;
  reason: string;
}

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

export function searchDocs(query: string, docs: VaultDoc[]): SearchHit[] {
  const q = query.toLowerCase();
  const tokens = q.replace(/[^a-z0-9\s-]/g, "").split(/\s+/).filter((t) => t.length > 2);
  const hits: SearchHit[] = [];

  for (const doc of docs) {
    let score = 0;
    const matched: string[] = [];
    const name = doc.name.toLowerCase();
    const tags = doc.tags.join(" ").toLowerCase();
    const person = (doc.person ?? "").toLowerCase();
    const content = doc.content.toLowerCase();
    for (const t of tokens) {
      if (name.includes(t)) { score += 4; matched.push(`name`); }
      if (tags.includes(t)) { score += 3; matched.push(`tag “${t}”`); }
      if (person.includes(t)) { score += 3; matched.push(`party “${doc.person}”`); }
      if (content.includes(t)) { score += 2; matched.push(`content`); }
      if (doc.type === t) { score += 3; matched.push(`type “${t}”`); }
      const mi = MONTHS.findIndex((m) => t.length >= 4 && m.startsWith(t.slice(0, 4)));
      if (mi >= 0) {
        const inMonth = (iso?: string) => !!iso && new Date(iso).getMonth() === mi;
        if (inMonth(doc.uploadedAt) || inMonth(doc.expiresAt)) {
          score += 2;
          matched.push(`${MONTHS[mi]} date`);
        }
      }
    }
    if (score > 0) {
      hits.push({ doc, score, reason: `matched on ${[...new Set(matched)].slice(0, 3).join(", ")}` });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 4);
}

export function expiringDocs(docs: VaultDoc[], withinDays = 30): VaultDoc[] {
  return docs.filter((doc) => {
    if (!doc.expiresAt) return false;
    const days = (new Date(doc.expiresAt).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= withinDays;
  });
}
