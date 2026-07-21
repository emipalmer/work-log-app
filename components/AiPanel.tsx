"use client";

import { useState } from "react";
import { addDays, rangeLabel } from "@/lib/dates";
import { ARTIFACT_LABELS, type ArtifactType } from "@/lib/prompts";
import Markdown from "./Markdown";

const TYPES: { id: ArtifactType; label: string; icon: string }[] = [
  { id: "resume_bullets", label: "Resume bullets", icon: "📄" },
  { id: "star_stories", label: "STAR stories", icon: "⭐" },
  { id: "brag_doc", label: "Brag doc", icon: "🏆" },
  { id: "skills_inventory", label: "Skills", icon: "🛠️" },
];

const RANGES = [
  { weeks: 1, label: "This week" },
  { weeks: 2, label: "Last 2 weeks" },
  { weeks: 4, label: "Last 4 weeks" },
  { weeks: 12, label: "Last 12 weeks" },
];

type Result = {
  content: string;
  type: ArtifactType;
  start: string;
  end: string;
  sourceCount: number;
};

export default function AiPanel({ monday }: { monday: string }) {
  const [type, setType] = useState<ArtifactType>("resume_bullets");
  const [weeks, setWeeks] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [copied, setCopied] = useState(false);

  const start = addDays(monday, -7 * (weeks - 1));
  const end = addDays(monday, 6);

  async function generate() {
    setLoading(true);
    setError(null);
    setEditing(false);
    setSaveState("idle");
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, start, end }),
    }).catch(() => null);
    setLoading(false);
    if (!res) {
      setError("Network error — is the server running?");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Generation failed.");
      return;
    }
    setResult(data);
    setDraft(data.content);
  }

  async function save() {
    if (!result) return;
    setSaveState("saving");
    const content = editing ? draft : result.content;
    const res = await fetch("/api/artifacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: result.type,
        content,
        startDate: result.start,
        endDate: result.end,
        sourceCount: result.sourceCount,
      }),
    });
    setSaveState(res.ok ? "saved" : "idle");
    if (!res.ok) setError("Could not save. Try again.");
  }

  async function copy() {
    const content = editing ? draft : (result?.content ?? "");
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function finishEditing() {
    if (result) setResult({ ...result, content: draft });
    setEditing(false);
    setSaveState("idle");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-sm text-gray-700 mb-3">✨ AI output</h2>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`rounded-lg border px-2 py-1.5 text-xs font-medium text-left ${
                type === t.id
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {RANGES.map((r) => (
              <option key={r.weeks} value={r.weeks}>
                {r.label} · {rangeLabel(addDays(monday, -7 * (r.weeks - 1)), end)}
              </option>
            ))}
          </select>
          <button
            onClick={generate}
            disabled={loading}
            className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="text-sm text-gray-400 animate-pulse">
            Reading your logs and writing {ARTIFACT_LABELS[type].toLowerCase()}…
          </div>
        )}
        {error && !loading && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}
        {!result && !loading && !error && (
          <div className="text-sm text-gray-400 mt-8 text-center px-4">
            <div className="text-3xl mb-2">✨</div>
            Pick an output type and a date range, then hit <b>Generate</b>. Your
            resume bullets, STAR stories, brag doc, or skills inventory will
            appear here.
          </div>
        )}
        {result && !loading && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">
                {ARTIFACT_LABELS[result.type]} · {result.sourceCount}{" "}
                {result.sourceCount === 1 ? "entry" : "entries"} ·{" "}
                {rangeLabel(result.start, result.end)}
              </span>
            </div>
            {editing ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={18}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <Markdown text={result.content} />
            )}
          </div>
        )}
      </div>

      {result && !loading && (
        <div className="p-3 border-t border-gray-200 flex gap-2">
          {editing ? (
            <button
              onClick={finishEditing}
              className="flex-1 rounded-lg bg-indigo-600 text-white py-1.5 text-xs font-medium hover:bg-indigo-700"
            >
              Done editing
            </button>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex-1 rounded-lg border border-gray-300 py-1.5 text-xs font-medium hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={copy}
                className="flex-1 rounded-lg border border-gray-300 py-1.5 text-xs font-medium hover:bg-gray-50"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
              <button
                onClick={save}
                disabled={saveState !== "idle"}
                className="flex-1 rounded-lg bg-indigo-600 text-white py-1.5 text-xs font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                {saveState === "saved" ? "Saved ✓" : saveState === "saving" ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
