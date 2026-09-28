"use client";

import Link from "next/link";

export type Entry = { date: string; body: string; project_tag: string | null };

export default function StatsTile({ entries }: { entries: Record<string, Entry> }) {
  const logged = Object.values(entries).filter((e) => e.body.trim() !== "");
  const words = logged.reduce(
    (sum, e) => sum + e.body.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  const projects = new Set(logged.map((e) => e.project_tag).filter((p): p is string => !!p));

  const stats = [
    { value: `${logged.length}/7`, label: "days" },
    { value: String(words), label: "words" },
    { value: String(projects.size), label: "projects" },
  ];

  return (
    <div className="flex min-h-[112px] flex-col rounded-card border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-ink">Stats</h3>
        <Link href="/stats" className="text-[11px] font-medium text-accent hover:underline">
          Overall ›
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-canvas py-1.5">
            <div className="text-[16px] font-semibold text-ink">{s.value}</div>
            <div className="text-[10px] text-ink-3">{s.label}</div>
          </div>
        ))}
      </div>
      {projects.size > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {[...projects].map((p) => (
            <span key={p} className="rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] text-accent">
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
