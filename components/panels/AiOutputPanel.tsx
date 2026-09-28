"use client";

import { useState } from "react";
import { addDays, rangeLabel } from "@/lib/dates";
import { ARTIFACT_LABELS, type ArtifactType } from "@/lib/prompts";
import Markdown from "@/components/Markdown";

const TYPES: { id: ArtifactType; label: string }[] = [
  { id: "resume_bullets", label: "Resume bullets" },
  { id: "star_stories", label: "STAR stories" },
  { id: "brag_doc", label: "Brag doc" },
  { id: "skills_inventory", label: "Skills" },
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

export default function AiOutputPanel({ monday }: { monday: string }) {
  const [type, setType] = useState<ArtifactType>("star_stories");
  const [weeks, setWeeks] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [copied, setCopied] = useState(false);

  const start = addDays(monday, -7 * (weeks - 1));
  const end = addDays(monday, 6);

  async function generate() {
    setLoading(true);
    setError(null);
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
  }

  async function save() {
    if (!result) return;
    setSaveState("saving");
    const res = await fetch("/api/artifacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: result.type,
        content: result.content,
        startDate: result.start,
        endDate: result.end,
        sourceCount: result.sourceCount,
      }),
    });
    setSaveState(res.ok ? "saved" : "idle");
    if (!res.ok) setError("Could not save. Try again.");
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2.5 border-b border-line p-3">
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`pill ${
                type === t.id
                  ? "border-accent bg-accent-soft font-semibold text-accent"
                  : "border-line bg-surface font-medium text-ink-2 hover:bg-canvas"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="field flex-1 !py-1.5 !text-[12px]"
          >
            {RANGES.map((r) => (
              <option key={r.weeks} value={r.weeks}>
                {r.label} · {rangeLabel(addDays(monday, -7 * (r.weeks - 1)), end)}
              </option>
            ))}
          </select>
          <button onClick={generate} disabled={loading} className="btn-primary !py-1.5">
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto p-3">
        {loading && (
          <p className="animate-pulse text-[12.5px] text-ink-3">
            Reading your logs and writing {ARTIFACT_LABELS[type].toLowerCase()}…
          </p>
        )}
        {error && !loading && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-[12.5px] text-red-600">
            {error}
          </p>
        )}
        {!result && !loading && !error && (
          <p className="mt-6 text-center text-[12.5px] text-ink-3">
            Pick an output type and range, then <b>Generate</b>. STAR stories and brag docs land here;
            resume bullets can go straight into the Resume panel.
          </p>
        )}
        {result && !loading && (
          <>
            <p className="mb-2 text-[11px] text-ink-3">
              {ARTIFACT_LABELS[result.type]} · {result.sourceCount}{" "}
              {result.sourceCount === 1 ? "entry" : "entries"} · {rangeLabel(result.start, result.end)}
            </p>
            <Markdown text={result.content} />
          </>
        )}
      </div>

      {result && !loading && (
        <div className="flex shrink-0 gap-2 border-t border-line p-2.5">
          <button onClick={copy} className="btn-ghost flex-1 !py-1.5">
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <button
            onClick={save}
            disabled={saveState !== "idle"}
            className="btn-primary flex-1 !py-1.5"
          >
            {saveState === "saved" ? "Saved ✓" : saveState === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
