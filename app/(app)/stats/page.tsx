import { redirect } from "next/navigation";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";
import { addDays, todayISO, rangeLabel } from "@/lib/dates";
import { ARTIFACT_LABELS, type ArtifactType } from "@/lib/prompts";

export const dynamic = "force-dynamic";

function computeStreaks(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };
  const set = new Set(dates);

  // Current streak: consecutive days ending today or yesterday.
  let current = 0;
  let cursor = set.has(todayISO()) ? todayISO() : addDays(todayISO(), -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  // Longest streak across all history.
  let longest = 0;
  const sorted = [...dates].sort();
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === addDays(sorted[i - 1], 1) ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  longest = Math.max(longest, sorted.length > 0 ? 1 : 0, current);
  return { current, longest };
}

export default async function StatsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const entries = db
    .prepare(
      `SELECT date, body, project_tag FROM entries
       WHERE user_id = ? AND trim(body) != '' ORDER BY date`,
    )
    .all(user.id) as { date: string; body: string; project_tag: string | null }[];

  const artifactCounts = db
    .prepare("SELECT type, COUNT(*) AS n FROM artifacts WHERE user_id = ? GROUP BY type")
    .all(user.id) as { type: ArtifactType; n: number }[];

  const words = entries.reduce(
    (sum, e) => sum + e.body.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  const { current, longest } = computeStreaks(entries.map((e) => e.date));

  const projectCounts = new Map<string, number>();
  for (const e of entries) {
    if (e.project_tag) projectCounts.set(e.project_tag, (projectCounts.get(e.project_tag) ?? 0) + 1);
  }
  const topProjects = [...projectCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const first = entries[0]?.date;
  const last = entries[entries.length - 1]?.date;
  const totalArtifacts = artifactCounts.reduce((s, a) => s + a.n, 0);

  const bigStats = [
    { label: "Total entries", value: entries.length },
    { label: "Words logged", value: words.toLocaleString() },
    { label: "Current streak", value: `${current}d` },
    { label: "Longest streak", value: `${longest}d` },
    { label: "Projects", value: projectCounts.size },
    { label: "Outputs saved", value: totalArtifacts },
  ];

  return (
    <div className="scroll-area h-full overflow-y-auto p-5">
      <div className="mx-auto max-w-3xl">
      <h1 className="font-bold text-lg mb-1">Overall stats</h1>
      <p className="text-xs text-ink-3 mb-4">
        {first && last ? `Logging since ${rangeLabel(first, last).split("–")[0].trim()}` : "No entries yet — start logging from the weekly view."}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {bigStats.map((s) => (
          <div key={s.label} className="bg-surface rounded-xl border border-line shadow-sm p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-ink-2 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {topProjects.length > 0 && (
        <div className="bg-surface rounded-xl border border-line shadow-sm p-4 mb-6">
          <h2 className="font-semibold text-sm text-ink mb-3">Entries by project</h2>
          <div className="space-y-2">
            {topProjects.map(([name, n]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="text-xs w-32 truncate text-ink-2">{name}</span>
                <div className="flex-1 bg-canvas rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-accent-soft0 h-full rounded-full"
                    style={{ width: `${(n / topProjects[0][1]) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-ink-3 w-6 text-right">{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {artifactCounts.length > 0 && (
        <div className="bg-surface rounded-xl border border-line shadow-sm p-4">
          <h2 className="font-semibold text-sm text-ink mb-3">Saved outputs</h2>
          <div className="flex flex-wrap gap-2">
            {artifactCounts.map((a) => (
              <span key={a.type} className="text-xs bg-sunken border border-line rounded-full px-3 py-1">
                {ARTIFACT_LABELS[a.type]} · <b>{a.n}</b>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
      </div>
  );
}
