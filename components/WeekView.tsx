"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import DayEditor from "./DayEditor";
import StatsTile, { type Entry } from "./StatsTile";
import AiPanel from "./AiPanel";

export default function WeekView() {
  const [monday, setMonday] = useState(() => mondayOf(todayISO()));
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
    <div className="flex flex-col lg:flex-row lg:h-screen">
      {/* Center: top bar + weekly grid */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <h1 className="font-bold text-sm text-gray-700 mr-1">Weekly log</h1>
          <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setMonday((m) => addDays(m, -7))}
              className="px-2.5 py-1 text-sm hover:bg-gray-100"
              title="Previous week"
            >
              ←
            </button>
            <button
              onClick={() => setMonday(mondayOf(todayISO()))}
              className={`px-2.5 py-1 text-xs border-x border-gray-300 hover:bg-gray-100 ${
                currentWeek ? "text-indigo-600 font-semibold" : ""
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setMonday((m) => addDays(m, 7))}
              className="px-2.5 py-1 text-sm hover:bg-gray-100"
              title="Next week"
            >
              →
            </button>
          </div>
          <span className="text-sm text-gray-500">{rangeLabel(monday, addDays(monday, 6))}</span>
          <input
            type="date"
            onChange={(e) => e.target.value && setMonday(mondayOf(e.target.value))}
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-500 bg-white"
            title="Jump to a week"
          />
          <div className="flex-1" />
          <Link href="/stats" className="text-xs text-indigo-600 hover:underline">
            Overall stats
          </Link>
        </header>

        <div className="flex-1 lg:overflow-y-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
            {dates.map((date, i) => {
              const entry = entries[date];
              const hasContent = !!entry && entry.body.trim() !== "";
              const today = isToday(date);
              return (
                <button
                  key={date}
                  onClick={() => setOpenDay(date)}
                  className={`text-left rounded-xl border p-4 min-h-[130px] flex flex-col transition-shadow hover:shadow-md ${
                    today
                      ? "border-indigo-400 bg-white ring-1 ring-indigo-200"
                      : hasContent
                        ? "border-gray-200 bg-white"
                        : "border-dashed border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className={`text-xs font-semibold ${today ? "text-indigo-600" : "text-gray-500"}`}>
                      {WEEKDAYS[i]} {today && "· Today"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {monthShort(date)} {dayOfMonth(date)}
                    </span>
                  </div>
                  {hasContent ? (
                    <>
                      {entry.project_tag && (
                        <span className="self-start text-[11px] bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5 mb-1.5">
                          {entry.project_tag}
                        </span>
                      )}
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-4 whitespace-pre-line">
                        {entry.body}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 mt-2">＋ Log this day</span>
                  )}
                </button>
              );
            })}
            <StatsTile entries={entries} />
          </div>
        </div>
      </main>

      {/* Right: AI output panel */}
      <aside className="lg:w-[400px] xl:w-[440px] shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 lg:h-screen lg:overflow-hidden flex flex-col min-h-[420px]">
        <AiPanel monday={monday} />
      </aside>

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
