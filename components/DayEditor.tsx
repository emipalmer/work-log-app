"use client";

import { useEffect, useRef, useState } from "react";
import { dayOfMonth, monthShort, WEEKDAYS, weekDates, mondayOf } from "@/lib/dates";
import type { Entry } from "./StatsTile";

const CHIPS = [
  { label: "✅ Shipped", insert: "**Shipped:** " },
  { label: "🏆 Win", insert: "**Win:** " },
  { label: "🧗 Challenge", insert: "**Challenge:** " },
  { label: "🛠️ Skills used", insert: "**Skills used:** " },
  { label: "📊 Impact / metrics", insert: "**Impact:** " },
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

  const weekdayIdx = weekDates(mondayOf(date)).indexOf(date);
  const title = `${WEEKDAYS[weekdayIdx]}, ${monthShort(date)} ${dayOfMonth(date)}`;

  // Debounced autosave while typing.
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(async () => {
      setStatus("saving");
      await onSave(date, body, project);
      dirty.current = false;
      setStatus("saved");
    }, 900);
    return () => clearTimeout(t);
  }, [body, project, date, onSave]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, project]);

  async function close() {
    if (dirty.current) {
      await onSave(date, body, project);
      dirty.current = false;
    }
    onClose();
  }

  function addChip(insert: string) {
    setBody((b) => (b.trim() ? b.replace(/\s*$/, "") + "\n\n" : "") + insert);
    dirty.current = true;
    setStatus("idle");
    textareaRef.current?.focus();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) void close();
      }}
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="font-bold text-lg">{title}</h2>
          <input
            value={project}
            onChange={(e) => {
              setProject(e.target.value);
              dirty.current = true;
              setStatus("idle");
            }}
            placeholder="Project tag (optional)"
            className="w-48 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => addChip(chip.insert)}
              className="text-xs rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 hover:bg-indigo-50 hover:border-indigo-300"
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
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
        />

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Autosaves as you type"}
          </span>
          <button
            onClick={() => void close()}
            className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
