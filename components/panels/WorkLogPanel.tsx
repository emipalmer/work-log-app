"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  dayOfMonth,
  isToday,
  mondayOf,
  monthShort,
  rangeLabel,
  todayISO,
  weekDates,
  WEEKDAYS,
} from "@/lib/dates";
import { MarkdownPreview } from "@/components/MarkdownInline";
import DayEditor from "./DayEditor";
import StatsTile, { type Entry } from "./StatsTile";

export default function WorkLogPanel({
  monday,
  setMonday,
}: {
  monday: string;
  setMonday: (updater: string | ((m: string) => string)) => void;
}) {
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [openDay, setOpenDay] = useState<string | null>(null);
  const dates = useMemo(() => weekDates(monday), [monday]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/entries?start=${monday}&end=${addDays(monday, 6)}`);
    if (!res.ok) return;
    const data = await res.json();
    const map: Record<string, Entry> = {};
    for (const e of data.entries as Entry[]) map[e.date] = e;
    setEntries(map);
  }, [monday]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveEntry = useCallback(async (date: string, body: string, projectTag: string) => {
    const res = await fetch("/api/entries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, body, projectTag }),
    });
    if (res.ok) {
      const { entry } = await res.json();
      setEntries((prev) => ({ ...prev, [date]: entry }));
    }
  }, []);

  const currentWeek = mondayOf(todayISO()) === monday;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <div className="flex items-center overflow-hidden rounded-lg border border-line">
          <button
            onClick={() => setMonday((m) => addDays(m, -7))}
            className="px-2.5 py-1 text-[13px] text-ink-2 hover:bg-canvas"
            aria-label="Previous week"
          >
            ‹
          </button>
          <button
            onClick={() => setMonday(mondayOf(todayISO()))}
            className={`border-x border-line px-2.5 py-1 text-[12px] hover:bg-canvas ${
              currentWeek ? "font-semibold text-accent" : "text-ink-2"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setMonday((m) => addDays(m, 7))}
            className="px-2.5 py-1 text-[13px] text-ink-2 hover:bg-canvas"
            aria-label="Next week"
          >
            ›
          </button>
        </div>
        <span className="text-[12.5px] text-ink-2">{rangeLabel(monday, addDays(monday, 6))}</span>
        <input
          type="date"
          onChange={(e) => e.target.value && setMonday(mondayOf(e.target.value))}
          className="rounded-lg border border-line bg-surface px-2 py-1 text-[11.5px] text-ink-3"
          aria-label="Jump to a week"
        />
      </div>

      <div className="scroll-area @container min-h-0 flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-1 gap-2.5 @[440px]:grid-cols-2">
          {dates.map((date, i) => {
            const entry = entries[date];
            const hasContent = !!entry && entry.body.trim() !== "";
            const today = isToday(date);
            return (
              <button
                key={date}
                onClick={() => setOpenDay(date)}
                className={`flex min-h-[112px] flex-col rounded-card border p-3 text-left transition hover:shadow-md ${
                  today
                    ? "border-accent bg-surface ring-1 ring-accent/25"
                    : hasContent
                      ? "border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      : "border-dashed border-line-strong bg-sunken"
                }`}
              >
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span
                    className={`text-[11.5px] font-semibold ${today ? "text-accent" : "text-ink-2"}`}
                  >
                    {WEEKDAYS[i]}
                    {today && " · Today"}
                  </span>
                  <span className="text-[11px] text-ink-3">
                    {monthShort(date)} {dayOfMonth(date)}
                  </span>
                </div>
                {hasContent ? (
                  <>
                    {entry.project_tag && (
                      <span className="mb-1.5 self-start rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-medium text-accent">
                        {entry.project_tag}
                      </span>
                    )}
                    <MarkdownPreview
                      text={entry.body}
                      maxLines={5}
                      className="line-clamp-4 text-[11.5px] leading-[16px] text-ink-2"
                    />
                  </>
                ) : (
                  <span className="mt-1 text-[11.5px] text-ink-3">＋ Log this day</span>
                )}
              </button>
            );
          })}
          <StatsTile entries={entries} />
        </div>
      </div>

      {openDay && (
        <DayEditor
          key={openDay}
          date={openDay}
          entry={entries[openDay]}
          onSave={saveEntry}
          onClose={() => setOpenDay(null)}
        />
      )}
    </div>
  );
}
