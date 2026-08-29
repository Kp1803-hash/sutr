import { useMemo, useRef, useState } from "react";
import { useSutr } from "../lib/store";
import type { UploadInput } from "../lib/store";
import type { VaultDoc } from "../lib/types";
import { daysUntil, timeAgo } from "../lib/types";
import { expiringDocs, searchDocs } from "../agents/vault";
import { Btn, Card, Icon, Modal, SectionHead, inputCls } from "../components/ui";

const TYPE_ICON: Record<string, string> = {
  contract: "file", invoice: "file", brand: "spark", research: "search", spec: "gauge", agreement: "shield", pitch: "megaphone", other: "file",
};

const simContent = (name: string) =>
  `OCR extraction (simulated) for ${name.replace(/\.[a-z0-9]+$/i, "")}: keywords were parsed from the extracted text layer so this document is searchable by content — type, related party, dates — not just its filename.`;

export default function Vault() {
  const h = useSutr();
  const { s } = h;
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => (q.trim() ? searchDocs(q, s.docs) : []), [q, s.docs]);
  const expiring = expiringDocs(s.docs);
  const doc = s.docs.find((d) => d.id === detail);

  const handleFiles = (files: FileList | null, mode: "new" | "replace") => {
    if (!files || files.length === 0) return;
    Promise.all(
      Array.from(files).map(async (f): Promise<UploadInput> => {
        let content = simContent(f.name);
        if (/\.(txt|md|csv)$/i.test(f.name)) {
          try { content = await f.text(); } catch { /* keep simulated */ }
        }
        return { name: f.name, size: f.size, content };
      })
    ).then((ups) => {
      if (mode === "replace" && detail) h.replaceDoc(detail, ups[0]);
      else h.uploadDocs(ups);
    });
  };

  const expiryBadge = (d: VaultDoc) => {
    if (!d.expiresAt) return null;
    const du = daysUntil(d.expiresAt);
    if (du < 0) return <span className="rounded-full bg-alert/10 px-2 py-0.5 text-[10.5px] font-semibold text-alert">expired</span>;
    if (du <= 30) return <span className="rounded-full bg-warn/12 px-2 py-0.5 text-[10.5px] font-semibold text-warn">expires in {du}d</span>;
    return <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10.5px] font-medium text-inksoft">expires in {du}d</span>;
  };

  return (
    <div>
      {/* search + upload + access */}
      <div className="mb-5 grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative">
            <Icon name="search" size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-inkmute" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Ask in natural language — “the vendor agreement with Bloom & Baroque”, “show me the pitch deck”, “Meragi comparison research”…'
              className="w-full rounded-xl border border-line bg-surface py-3.5 pl-11 pr-4 text-[14px] shadow-sm outline-none transition-all placeholder:text-inkmute focus:border-plum/40 focus:ring-2 focus:ring-plum/10"
            />
          </div>
          <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.13em] text-inkmute">
            searches names · auto-tags · extracted text · parties · dates — with the match reason on every hit
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files, "new"); e.target.value = ""; }} />
          <Btn className="justify-center py-3" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={15} /> Upload documents
          </Btn>
          <div className="flex items-center gap-2 rounded-lg border border-plum/20 bg-plum/5 px-3 py-2">
            <Icon name="lock" size={14} className="shrink-0 text-plum2" />
            <p className="text-[11px] leading-snug text-ink/80">
              Access-controlled: <b>{s.settings.vaultAccess.join(", ")}</b>. Manage in Settings.
            </p>
          </div>
        </div>
      </div>

      {/* expiry strip */}
      {expiring.length > 0 && (
        <div className="anim-fade-up mb-5 flex flex-wrap items-center gap-2.5 rounded-lg border border-warn/30 bg-warn/8 px-4 py-2.5">
          <Icon name="clock" size={15} className="text-warn" />
          <span className="text-[12.5px] font-medium">Expiry watch (nightly sweep):</span>
          {expiring.map((d) => (
            <button key={d.id} onClick={() => setDetail(d.id)} className="rounded-full bg-surface px-2.5 py-1 text-[11.5px] font-medium shadow-sm transition-transform hover:scale-105">
              {d.name.split("—")[0].trim()} · {daysUntil(d.expiresAt!)}d
            </button>
          ))}
        </div>
      )}

      {q.trim() ? (
        <div>
          <SectionHead kicker={`${hits.length} match${hits.length === 1 ? "" : "es"} · ranked`} title={`Results for “${q}”`} right={<Btn size="sm" variant="ghost" onClick={() => setQ("")}>Clear</Btn>} />
          <div className="stagger space-y-2.5">
            {hits.map((hit) => (
              <Card key={hit.doc.id} className="lift p-4">
                <button className="flex min-w-0 flex-1 items-center gap-4 text-left" onClick={() => setDetail(hit.doc.id)}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-plum/8 text-plum2">
                    <Icon name={TYPE_ICON[hit.doc.type]} size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{hit.doc.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#8a6414]">
                      <Icon name="spark" size={11} /> {hit.reason}
                    </span>
                  </span>
                  <span className="hidden shrink-0 flex-wrap justify-end gap-1 sm:flex">
                    {hit.doc.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-full bg-ink/5 px-2 py-0.5 text-[10.5px] text-inksoft">{t}</span>
                    ))}
                  </span>
                </button>
              </Card>
            ))}
            {hits.length === 0 && (
              <Card className="p-10 text-center">
                <Icon name="search" size={26} className="mx-auto text-inkmute" />
                <p className="mt-2 text-[13px] text-inksoft">No matches in names, tags, content, parties, or dates — and the Vault won't guess. Try a party (“WIPA”), a type (“pitch”), or a subject.</p>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div>
          <SectionHead kicker={`${s.docs.length} documents · auto-tagged with reasons on upload`} title="The library" />
          <div className="stagger grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {s.docs.map((d) => (
              <button key={d.id} onClick={() => setDetail(d.id)} className="text-left">
                <Card className="lift h-full p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-plum/8 text-plum2">
                      <Icon name={TYPE_ICON[d.type]} size={17} />
                    </span>
                    {expiryBadge(d)}
                  </div>
                  <div className="mt-2.5 truncate text-[13.5px] font-semibold" title={d.name}>{d.name}</div>
                  <div className="font-mono text-[9.5px] uppercase tracking-wide text-inkmute">
                    {d.type} · {d.person ?? "no party"} · v{d.versions.length} · {timeAgo(d.uploadedAt)}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-inksoft">{d.summary}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {d.tags.slice(0, 4).map((t) => (
                      <span key={t} className="rounded-full bg-ink/5 px-2 py-0.5 text-[10.5px] text-inksoft">{t}</span>
                    ))}
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* detail modal */}
      <Modal open={!!doc} onClose={() => setDetail(null)} title={doc?.name ?? ""} wide>
        {doc && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-plum/8 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-plum2">{doc.type}</span>
              {expiryBadge(doc)}
              {doc.versions.length > 1 && (
                <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-medium text-inksoft">v{doc.versions.length} — history kept</span>
              )}
              <span className="ml-auto font-mono text-[10.5px] text-inkmute">{(doc.size / 1024).toFixed(0)} KB · uploaded {timeAgo(doc.uploadedAt)}</span>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-line bg-canvas/60 p-3.5">
                <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-inkmute">Why these tags</div>
                <p className="mt-1 text-[12.5px] leading-relaxed">{doc.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {doc.tags.map((t) => (
                    <span key={t} className="rounded-full bg-plum/8 px-2 py-0.5 text-[10.5px] font-medium text-plum2">{t}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-line bg-canvas/60 p-3.5">
                <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-inkmute">Extracted content (searchable)</div>
                <p className="mt-1 line-clamp-5 text-[12.5px] leading-relaxed text-ink/85">{doc.content}</p>
                {doc.person && <div className="mt-2 font-mono text-[10.5px] text-inksoft">Related party: <b>{doc.person}</b></div>}
              </div>
            </div>

            <div className="mt-3">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-inkmute">Version history</div>
              <div className="mt-1.5 space-y-1.5">
                {[...doc.versions].reverse().map((v) => (
                  <div key={v.v} className="flex items-center gap-3 rounded-lg border border-line/70 bg-surface px-3 py-2">
                    <span className="grid h-6 w-8 place-items-center rounded bg-ink/5 font-mono text-[10.5px] font-semibold">v{v.v}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{v.name}</span>
                    <span className="hidden text-[11.5px] text-inksoft sm:block">{v.note}</span>
                    <span className="font-mono text-[10.5px] text-inkmute">{timeAgo(v.at)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <input ref={replaceRef} type="file" className="hidden" onChange={(e) => { handleFiles(e.target.files, "replace"); e.target.value = ""; }} />
                <Btn variant="outline" size="sm" onClick={() => replaceRef.current?.click()}>
                  <Icon name="upload" size={13} /> Replace file (keeps history)
                </Btn>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] text-inksoft">
                <Icon name="lock" size={12} className="text-plum2" /> visible to {s.settings.vaultAccess.length} {s.settings.vaultAccess.length === 1 ? "person" : "people"} only
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
