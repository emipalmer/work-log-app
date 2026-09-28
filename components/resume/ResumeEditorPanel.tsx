"use client";

import { useState } from "react";
import { addDays, mondayOf, rangeLabel, todayISO } from "@/lib/dates";
import {
  ENTRY_KINDS,
  ORG_LABEL,
  SECTION_TITLE,
  TITLE_LABEL,
  type EntryKind,
} from "@/lib/resume-types";
import { useResume } from "./ResumeProvider";

type Tab = "header" | EntryKind | "skills";
const TABS: { id: Tab; label: string }[] = [
  { id: "header", label: "Header" },
  ...ENTRY_KINDS.map((k) => ({ id: k as Tab, label: SECTION_TITLE[k] })),
  { id: "skills", label: "Skills" },
];

const RANGES = [
  { weeks: 1, label: "This week" },
  { weeks: 2, label: "Last 2 weeks" },
  { weeks: 4, label: "Last 4 weeks" },
  { weeks: 12, label: "Last 12 weeks" },
];

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className={className} aria-hidden>
      <path d="M6 0l1.3 4.7L12 6l-4.7 1.3L6 12l-1.3-4.7L0 6l4.7-1.3z" fill="currentColor" />
    </svg>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}

export default function ResumeEditorPanel() {
  const {
    resume,
    loading,
    error,
    saving,
    selectedEntryId,
    setSelectedEntryId,
    updateHeader,
    updateEntry,
    updateBullet,
    updateSkill,
    addEntry,
    removeEntry,
    addBullet,
    addBullets,
    removeBullet,
  } = useResume();

  const [tab, setTab] = useState<Tab>("experience");
  const [weeks, setWeeks] = useState(4);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [suggestError, setSuggestError] = useState<string | null>(null);

  if (loading || !resume) {
    return <div className="grid h-full place-items-center text-[13px] text-ink-3">Loading editor…</div>;
  }

  const monday = mondayOf(todayISO());
  const start = addDays(monday, -7 * (weeks - 1));
  const end = addDays(monday, 6);

  const isEntryTab = (ENTRY_KINDS as string[]).includes(tab);
  const entries = isEntryTab ? resume.entries.filter((e) => e.kind === tab) : [];
  const active = entries.find((e) => e.id === selectedEntryId) ?? entries[0] ?? null;

  async function runSuggest() {
    if (!active) return;
    setSuggesting(true);
    setSuggestError(null);
    setSuggestions(null);
    const res = await fetch("/api/resume/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: active.id, start, end }),
    }).catch(() => null);
    setSuggesting(false);
    if (!res) {
      setSuggestError("Network error — is the server running?");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSuggestError(data.error ?? "Could not draft bullets.");
      return;
    }
    setSuggestions(data.bullets ?? []);
    setChosen(new Set((data.bullets ?? []).map((_: string, i: number) => i)));
  }

  async function acceptSuggestions() {
    if (!active || !suggestions) return;
    const picked = suggestions.filter((_, i) => chosen.has(i));
    if (picked.length) await addBullets(active.id, picked, "ai");
    setSuggestions(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Tabs + suggest */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setSuggestions(null);
            }}
            className={`pill ${
              tab === t.id
                ? "border-accent bg-accent-soft font-semibold text-accent"
                : "border-line bg-surface font-medium text-ink-2 hover:bg-canvas"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        {saving && <span className="text-[11px] text-ink-3">Saving…</span>}
        {error && <span className="text-[11px] text-red-600">{error}</span>}
        {isEntryTab && active && (
          <button
            onClick={runSuggest}
            disabled={suggesting}
            className="pill border-accent bg-accent-soft font-semibold text-accent hover:bg-accent-soft/70 disabled:opacity-60"
          >
            <Sparkle />
            {suggesting ? "Drafting…" : "Suggest from logs"}
          </button>
        )}
      </div>

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "header" && (
          <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
            <Labeled label="Full name">
              <input
                className="field"
                value={resume.fullName}
                placeholder="Mia Anne Palmer"
                onChange={(e) => updateHeader({ fullName: e.target.value })}
              />
            </Labeled>
            <Labeled label="Headline / title">
              <input
                className="field"
                value={resume.headline}
                placeholder="Software Engineer"
                onChange={(e) => updateHeader({ headline: e.target.value })}
              />
            </Labeled>
            <Labeled label="Email">
              <input
                className="field"
                value={resume.email}
                placeholder="you@example.com"
                onChange={(e) => updateHeader({ email: e.target.value })}
              />
            </Labeled>
            <Labeled label="Location">
              <input
                className="field"
                value={resume.location}
                placeholder="Remote · US"
                onChange={(e) => updateHeader({ location: e.target.value })}
              />
            </Labeled>
            <div className="sm:col-span-2">
              <Labeled label="Links">
                <input
                  className="field"
                  value={resume.links}
                  placeholder="github.com/you · linkedin.com/in/you"
                  onChange={(e) => updateHeader({ links: e.target.value })}
                />
              </Labeled>
            </div>
            <div className="sm:col-span-2">
              <Labeled label="Summary">
                <textarea
                  className="field min-h-[76px] resize-y leading-relaxed"
                  value={resume.summary}
                  placeholder="Two lines on what you do and the impact you have."
                  onChange={(e) => updateHeader({ summary: e.target.value })}
                />
              </Labeled>
            </div>
          </div>
        )}

        {isEntryTab && (
          <div>
            {/* Entry selector */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {entries.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEntryId(e.id)}
                  className={`pill max-w-[220px] ${
                    active?.id === e.id
                      ? "border-accent bg-accent-soft font-medium text-accent"
                      : "border-line bg-surface text-ink-2 hover:bg-canvas"
                  }`}
                >
                  <span className="truncate">{e.org.trim() || e.title.trim() || "Untitled"}</span>
                </button>
              ))}
              <button
                onClick={() => addEntry(tab as EntryKind)}
                className="pill border-dashed border-line bg-surface font-medium text-ink-2 hover:border-accent hover:text-accent"
              >
                ＋ Add {SECTION_TITLE[tab as EntryKind].replace(/s$/, "").toLowerCase()}
              </button>
            </div>

            {!active ? (
              <p className="text-[12.5px] text-ink-3">
                Nothing here yet — add your first {SECTION_TITLE[tab as EntryKind].toLowerCase()} entry.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(240px,300px)_1fr]">
                <div className="space-y-3">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Labeled label={ORG_LABEL[active.kind]}>
                      <input
                        className="field"
                        value={active.org}
                        onChange={(e) => updateEntry(active.id, { org: e.target.value })}
                      />
                    </Labeled>
                    <Labeled label="Dates">
                      <input
                        className="field w-[116px]"
                        value={active.dates}
                        placeholder="2024 – Now"
                        onChange={(e) => updateEntry(active.id, { dates: e.target.value })}
                      />
                    </Labeled>
                  </div>
                  <Labeled label={TITLE_LABEL[active.kind]}>
                    <input
                      className="field"
                      value={active.title}
                      onChange={(e) => updateEntry(active.id, { title: e.target.value })}
                    />
                  </Labeled>
                  <button
                    onClick={() => removeEntry(active.id)}
                    className="text-[12px] font-medium text-ink-3 hover:text-red-600"
                  >
                    Delete this entry
                  </button>
                </div>

                <div>
                  <p className="mb-1.5 text-[11.5px] font-medium text-ink-2">Achievements</p>
                  <div className="space-y-2">
                    {active.bullets.map((b) => (
                      <div
                        key={b.id}
                        className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${
                          b.source === "ai"
                            ? "border-accent-line bg-accent-soft"
                            : "border-line bg-surface"
                        }`}
                      >
                        {b.source === "ai" && (
                          <span className="mt-1 text-accent" title="Drafted from your logs">
                            <Sparkle />
                          </span>
                        )}
                        <textarea
                          rows={2}
                          className="min-h-[38px] flex-1 resize-y bg-transparent text-[12px] leading-[17px] text-ink-2 outline-none"
                          value={b.text}
                          onChange={(e) => updateBullet(b.id, e.target.value)}
                        />
                        <button
                          onClick={() => removeBullet(b.id)}
                          className="mt-0.5 text-ink-3 hover:text-red-600"
                          aria-label="Remove bullet"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => addBullet(active.id, "")}
                    className="mt-2 text-[12px] font-medium text-accent hover:underline"
                  >
                    ＋ Add bullet
                  </button>

                  {/* AI review tray */}
                  {(suggestions || suggestError) && (
                    <div className="mt-3 rounded-lg border border-accent-line bg-accent-soft p-3">
                      {suggestError ? (
                        <p className="text-[12px] text-red-600">{suggestError}</p>
                      ) : suggestions && suggestions.length === 0 ? (
                        <p className="text-[12px] text-ink-2">
                          No bullets came back for {rangeLabel(start, end)}.
                        </p>
                      ) : (
                        <>
                          <p className="mb-2 text-[12px] font-medium text-ink">
                            Drafted from your logs · {rangeLabel(start, end)}
                          </p>
                          <div className="space-y-1.5">
                            {suggestions?.map((s, i) => (
                              <label key={i} className="flex cursor-pointer items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={chosen.has(i)}
                                  onChange={(e) => {
                                    const next = new Set(chosen);
                                    if (e.target.checked) next.add(i);
                                    else next.delete(i);
                                    setChosen(next);
                                  }}
                                  className="mt-0.5 accent-[color:var(--color-accent)]"
                                />
                                <span className="text-[12px] leading-[17px] text-ink-2">{s}</span>
                              </label>
                            ))}
                          </div>
                          <div className="mt-2.5 flex gap-2">
                            <button onClick={acceptSuggestions} className="btn-primary !py-1.5">
                              Add {chosen.size} to resume
                            </button>
                            <button
                              onClick={() => setSuggestions(null)}
                              className="btn-ghost !py-1.5"
                            >
                              Discard
                            </button>
                          </div>
                        </>
                      )}
                      {!suggestError && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[11px] text-ink-3">Range</span>
                          <select
                            value={weeks}
                            onChange={(e) => setWeeks(Number(e.target.value))}
                            className="rounded-md border border-line bg-surface px-2 py-1 text-[11.5px]"
                          >
                            {RANGES.map((r) => (
                              <option key={r.weeks} value={r.weeks}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "skills" && (
          <div className="max-w-2xl space-y-3">
            {resume.skills.map((s) => (
              <div key={s.id} className="grid grid-cols-[140px_1fr] gap-2">
                <Labeled label="Category">
                  <input
                    className="field"
                    value={s.category}
                    onChange={(e) => updateSkill(s.id, { category: e.target.value })}
                  />
                </Labeled>
                <Labeled label="Skills (comma separated)">
                  <input
                    className="field"
                    value={s.items}
                    placeholder="React, TypeScript, PostgreSQL"
                    onChange={(e) => updateSkill(s.id, { items: e.target.value })}
                  />
                </Labeled>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
