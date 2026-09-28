"use client";

import { useState } from "react";
import { ENTRY_KINDS, SECTION_LABEL, type EntryKind, type ResumeEntry } from "@/lib/resume-types";
import { useResume } from "./ResumeProvider";

/** Copy rich HTML (falling back to plain text) so Docs keeps the formatting. */
async function copyRich(html: string, text: string): Promise<void> {
  const clip = navigator.clipboard;
  if (clip && "write" in clip && typeof ClipboardItem !== "undefined") {
    await clip.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
    return;
  }
  await clip.writeText(text);
}

function hasContent(e: ResumeEntry): boolean {
  return !!(e.org.trim() || e.title.trim() || e.bullets.some((b) => b.text.trim()));
}

function SectionRule({ label }: { label: string }) {
  return (
    <div className="mt-4 first:mt-0">
      <h3 className="text-[10.5px] font-semibold tracking-[0.08em] text-accent">{label}</h3>
      <div className="mt-1.5 h-px w-full bg-line-strong" />
    </div>
  );
}

export default function ResumePreviewPanel() {
  const { resume, loading } = useResume();
  const [status, setStatus] = useState<string | null>(null);

  async function runExport(kind: "text" | "gdoc") {
    setStatus(null);
    const res = await fetch("/api/resume/export").catch(() => null);
    if (!res || !res.ok) {
      setStatus("Export failed.");
      return;
    }
    const { text, html } = (await res.json()) as { text: string; html: string };
    try {
      if (kind === "text") {
        await navigator.clipboard.writeText(text);
        setStatus("Plain text copied");
      } else {
        await copyRich(html, text);
        setStatus("Copied — paste into the new doc");
        window.open("https://docs.google.com/document/create", "_blank", "noopener,noreferrer");
      }
    } catch {
      setStatus("Clipboard blocked by the browser");
    }
    setTimeout(() => setStatus(null), 4000);
  }

  if (loading || !resume) {
    return <div className="grid h-full place-items-center text-[13px] text-ink-3">Loading resume…</div>;
  }

  const contact = [resume.email, resume.location, resume.links].map((s) => s.trim()).filter(Boolean);
  const skills = resume.skills.filter((s) => s.items.trim());

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <button onClick={() => runExport("text")} className="btn-ghost !py-1.5">
          Copy as text
        </button>
        <button onClick={() => runExport("gdoc")} className="btn-primary !py-1.5">
          Export to Google Doc
        </button>
        {status && <span className="text-[11.5px] text-ink-2">{status}</span>}
      </div>

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto p-5">
        <article className="mx-auto w-full max-w-[660px] rounded bg-surface px-11 py-10 shadow-[0_6px_24px_rgba(0,0,0,0.10)]">
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.01em] text-ink">
            {resume.fullName.trim() || <span className="text-ink-3">Your name</span>}
          </h1>
          {resume.headline.trim() && (
            <p className="mt-0.5 text-[13.5px] font-medium text-accent">{resume.headline}</p>
          )}
          {contact.length > 0 && (
            <p className="mt-1 text-[11.5px] text-ink-3">{contact.join("  ·  ")}</p>
          )}
          <div className="mt-3 h-px w-full bg-line-strong" />

          {resume.summary.trim() && (
            <p className="mt-3 whitespace-pre-line text-[12px] leading-[18px] text-ink-2">
              {resume.summary}
            </p>
          )}

          {ENTRY_KINDS.map((kind: EntryKind) => {
            const list = resume.entries.filter((e) => e.kind === kind && hasContent(e));
            if (!list.length) return null;
            return (
              <div key={kind}>
                <SectionRule label={SECTION_LABEL[kind]} />
                {list.map((e) => (
                  <div key={e.id} className="mt-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] font-semibold text-ink">{e.org}</span>
                      {e.dates.trim() && (
                        <span className="shrink-0 text-[11.5px] text-ink-3">{e.dates}</span>
                      )}
                    </div>
                    {e.title.trim() && (
                      <p className="text-[12px] font-medium text-ink-2">{e.title}</p>
                    )}
                    {e.bullets.filter((b) => b.text.trim()).length > 0 && (
                      <ul className="mt-1 space-y-1">
                        {e.bullets
                          .filter((b) => b.text.trim())
                          .map((b) => (
                            <li key={b.id} className="flex gap-2 text-[12px] leading-[18px] text-ink-2">
                              <span aria-hidden>•</span>
                              <span>{b.text}</span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {skills.length > 0 && (
            <div>
              <SectionRule label="SKILLS" />
              <div className="mt-2 space-y-1">
                {skills.map((s) => (
                  <div key={s.id} className="flex gap-2 text-[12px] leading-[18px]">
                    <span className="w-[84px] shrink-0 font-semibold text-ink">{s.category}</span>
                    <span className="text-ink-2">{s.items}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!resume.fullName.trim() && !resume.entries.some(hasContent) && (
            <p className="mt-6 text-[12px] text-ink-3">
              Fill in the Editor panel and your resume will build itself here.
            </p>
          )}
        </article>
      </div>
    </div>
  );
}
