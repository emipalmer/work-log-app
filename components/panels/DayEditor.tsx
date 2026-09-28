"use client";

import { useEffect, useRef, useState } from "react";
import { dayOfMonth, mondayOf, monthShort, WEEKDAYS, weekDates } from "@/lib/dates";
import type { Entry } from "./StatsTile";

const CHIPS = [
  { label: "Shipped", insert: "**Shipped:** " },
  { label: "Win", insert: "**Win:** " },
  { label: "Challenge", insert: "**Challenge:** " },
  { label: "Skills used", insert: "**Skills used:** " },
  { label: "Impact / metrics", insert: "**Impact:** " },
];

export default function DayEditor({
  date,
  entry,
  onSave,
  onClose,
}: {
  date: string;
  entry: Entry | undefined;
  onSave: (date: string, body: string, projectTag: string) => Promise<void>;
  onClose: () => void;
}) {
  const [body, setBody] = useState(entry?.body ?? "");
  const [project, setProject] = useState(entry?.project_tag ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const dirty = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef<() => void>(() => {});

  const weekdayIdx = weekDates(mondayOf(date)).indexOf(date);
  const title = `${WEEKDAYS[weekdayIdx]}, ${monthShort(date)} ${dayOfMonth(date)}`;

  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(async () => {
      setStatus("saving");
      await onSave(date, body, project);
      dirty.current = false;
      setStatus("saved");
    }, 800);
    return () => clearTimeout(t);
  }, [body, project, date, onSave]);

  closeRef.current = async () => {
    if (dirty.current) {
      await onSave(date, body, project);
      dirty.current = false;
    }
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function addChip(insert: string) {
    setBody((b) => (b.trim() ? b.replace(/\s*$/, "") + "\n\n" : "") + insert);
    dirty.current = true;
    setStatus("idle");
    textareaRef.current?.focus();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) void closeRef.current();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-[17px] font-bold text-ink">{title}</h2>
          <input
            value={project}
            onChange={(e) => {
              setProject(e.target.value);
              dirty.current = true;
              setStatus("idle");
            }}
            placeholder="Project tag (optional)"
            className="field w-48 !py-1.5"
          />
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => addChip(chip.insert)}
              className="pill border-line bg-canvas text-ink-2 hover:border-accent hover:bg-accent-soft hover:text-accent"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          autoFocus
          rows={10}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            dirty.current = true;
            setStatus("idle");
          }}
          placeholder="What did you do today? Brain-dump freely — wins, blockers, numbers, people you helped, anything worth remembering at review time."
          className="field resize-y leading-relaxed"
        />

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11.5px] text-ink-3">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Autosaves as you type"}
          </span>
          <button onClick={() => void closeRef.current()} className="btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
