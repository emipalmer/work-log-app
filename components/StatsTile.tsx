"use client";

import Link from "next/link";

export type Entry = { date: string; body: string; project_tag: string | null };

export default function StatsTile({ entries }: { entries: Record<string, Entry> }) {
  const logged = Object.values(entries).filter((e) => e.body.trim() !== "");
  const words = logged.reduce(
    (sum, e) => sum + e.body.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  const projects = new Set(
    logged.map((e) => e.project_tag).filter((p): p is string => !!p),
  );

  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-700">Stats</h3>
        <Link href="/stats" className="text-xs text-indigo-600 hover:underline">
          Overall →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-gray-50 py-2">
          <div className="text-xl font-bold">{logged.length}<span className="text-sm text-gray-400">/7</span></div>
          <div className="text-[11px] text-gray-500">days logged</div>
        </div>
        <div className="rounded-lg bg-gray-50 py-2">
          <div className="text-xl font-bold">{words}</div>
          <div className="text-[11px] text-gray-500">words</div>
        </div>
        <div className="rounded-lg bg-gray-50 py-2">
          <div className="text-xl font-bold">{projects.size}</div>
          <div className="text-[11px] text-gray-500">projects</div>
        </div>
      </div>
      {projects.size > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {[...projects].map((p) => (
            <span key={p} className="text-[11px] bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5">
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
