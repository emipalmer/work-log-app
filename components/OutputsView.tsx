"use client";

import { useEffect, useState } from "react";
import { ARTIFACT_LABELS, type ArtifactType } from "@/lib/prompts";
import { rangeLabel } from "@/lib/dates";
import Markdown from "./Markdown";

type Artifact = {
  id: number;
  type: ArtifactType;
  content: string;
  start_date: string | null;
  end_date: string | null;
  source_count: number;
  edited: number;
  created_at: string;
};

const BADGE: Record<ArtifactType, string> = {
  resume_bullets: "bg-blue-50 text-blue-700",
  star_stories: "bg-amber-50 text-amber-700",
  brag_doc: "bg-emerald-50 text-emerald-700",
  skills_inventory: "bg-purple-50 text-purple-700",
};

export default function OutputsView() {
  const [artifacts, setArtifacts] = useState<Artifact[] | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/artifacts");
      if (res.ok) setArtifacts((await res.json()).artifacts);
    })();
  }, []);

  async function saveEdit(id: number) {
    const res = await fetch(`/api/artifacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft }),
    });
    if (res.ok) {
      setArtifacts((prev) =>
        prev!.map((a) => (a.id === id ? { ...a, content: draft, edited: 1 } : a)),
      );
      setEditingId(null);
    }
  }

  async function remove(id: number) {
    const res = await fetch(`/api/artifacts/${id}`, { method: "DELETE" });
    if (res.ok) setArtifacts((prev) => prev!.filter((a) => a.id !== id));
  }

  async function copy(a: Artifact) {
    await navigator.clipboard.writeText(a.content);
    setCopiedId(a.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="p-4 max-w-3xl">
      <h1 className="font-bold text-lg mb-4">Generated content</h1>

      {artifacts === null && <p className="text-sm text-gray-400">Loading…</p>}
      {artifacts?.length === 0 && (
        <div className="text-sm text-gray-400 bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
          Nothing saved yet. Generate resume bullets or STAR stories from the{" "}
          <a href="/week" className="text-indigo-600 hover:underline">
            weekly log
          </a>{" "}
          and hit <b>Save</b>.
        </div>
      )}

      <div className="space-y-3">
        {artifacts?.map((a) => {
          const open = openId === a.id;
          const editing = editingId === a.id;
          return (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <button
                onClick={() => setOpenId(open ? null : a.id)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left"
              >
                <span className={`text-[11px] rounded-full px-2 py-0.5 font-medium ${BADGE[a.type]}`}>
                  {ARTIFACT_LABELS[a.type]}
                </span>
                {a.start_date && a.end_date && (
                  <span className="text-xs text-gray-500">{rangeLabel(a.start_date, a.end_date)}</span>
                )}
                {a.edited === 1 && <span className="text-[11px] text-gray-400">(edited)</span>}
                <span className="flex-1" />
                <span className="text-xs text-gray-400">{a.created_at.slice(0, 10)}</span>
                <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
              </button>

              {open && (
                <div className="border-t border-gray-100 px-4 py-3">
                  {editing ? (
                    <>
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={14}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => saveEdit(a.id)}
                          className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-indigo-700"
                        >
                          Save changes
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Markdown text={a.content} />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            setEditingId(a.id);
                            setDraft(a.content);
                          }}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => copy(a)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
                        >
                          {copiedId === a.id ? "Copied ✓" : "Copy"}
                        </button>
                        <button
                          onClick={() => remove(a.id)}
                          className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-xs hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
