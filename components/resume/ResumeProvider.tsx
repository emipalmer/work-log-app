"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { EntryKind, Resume } from "@/lib/resume-types";

type HeaderPatch = Partial<
  Pick<Resume, "name" | "fullName" | "headline" | "email" | "location" | "links" | "summary">
>;
type EntryPatch = { org?: string; title?: string; dates?: string };

type ResumeContextValue = {
  resume: Resume | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  selectedEntryId: number | null;
  setSelectedEntryId: (id: number | null) => void;
  updateHeader: (patch: HeaderPatch) => void;
  updateEntry: (id: number, patch: EntryPatch) => void;
  updateBullet: (id: number, text: string) => void;
  updateSkill: (id: number, patch: { category?: string; items?: string }) => void;
  addEntry: (kind: EntryKind) => Promise<number | null>;
  removeEntry: (id: number) => Promise<void>;
  addBullet: (entryId: number, text: string) => Promise<void>;
  addBullets: (entryId: number, texts: string[], source: "manual" | "ai") => Promise<void>;
  removeBullet: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const ResumeContext = createContext<ResumeContextValue | null>(null);

export function useResume(): ResumeContextValue {
  const ctx = useContext(ResumeContext);
  if (!ctx) throw new Error("useResume must be used inside <ResumeProvider>");
  return ctx;
}

const SAVE_DELAY = 600;

export default function ResumeProvider({ children }: { children: React.ReactNode }) {
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const refresh = useCallback(async () => {
    const res = await fetch("/api/resume").catch(() => null);
    if (!res) {
      setError("Could not reach the server.");
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not load your resume.");
      return;
    }
    const data = (await res.json()) as { resume: Resume };
    setError(null);
    setResume(data.resume);
    setSelectedEntryId((current) => {
      if (current && data.resume.entries.some((e) => e.id === current)) return current;
      return data.resume.entries.find((e) => e.kind === "experience")?.id ?? null;
    });
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Flush any queued saves if the component unmounts mid-edit.
  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  /** Debounce a PATCH under a stable key so rapid keystrokes collapse. */
  const queueSave = useCallback((key: string, run: () => Promise<Response | null>) => {
    const existing = timers.current.get(key);
    if (existing) clearTimeout(existing);
    setPending((p) => p + 1);
    const timer = setTimeout(async () => {
      timers.current.delete(key);
      const res = await run().catch(() => null);
      if (!res || !res.ok) setError("Some changes could not be saved.");
      else setError(null);
      setPending((p) => Math.max(0, p - 1));
    }, SAVE_DELAY);
    timers.current.set(key, timer);
    // The superseded timer's pending count is released here.
    if (existing) setPending((p) => Math.max(0, p - 1));
  }, []);

  const patchJson = (url: string, body: unknown) =>
    fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const updateHeader = useCallback(
    (patch: HeaderPatch) => {
      setResume((r) => (r ? { ...r, ...patch } : r));
      queueSave("header", () => patchJson("/api/resume", patch));
    },
    [queueSave],
  );

  const updateEntry = useCallback(
    (id: number, patch: EntryPatch) => {
      setResume((r) =>
        r ? { ...r, entries: r.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) } : r,
      );
      queueSave(`entry:${id}`, () => patchJson(`/api/resume/entries/${id}`, patch));
    },
    [queueSave],
  );

  const updateBullet = useCallback(
    (id: number, text: string) => {
      setResume((r) =>
        r
          ? {
              ...r,
              entries: r.entries.map((e) => ({
                ...e,
                bullets: e.bullets.map((b) => (b.id === id ? { ...b, text } : b)),
              })),
            }
          : r,
      );
      queueSave(`bullet:${id}`, () => patchJson(`/api/resume/bullets/${id}`, { text }));
    },
    [queueSave],
  );

  const updateSkill = useCallback(
    (id: number, patch: { category?: string; items?: string }) => {
      setResume((r) =>
        r ? { ...r, skills: r.skills.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : r,
      );
      queueSave(`skill:${id}`, () => patchJson(`/api/resume/skills/${id}`, patch));
    },
    [queueSave],
  );

  const addEntry = useCallback(
    async (kind: EntryKind) => {
      const res = await fetch("/api/resume/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      }).catch(() => null);
      if (!res || !res.ok) {
        setError("Could not add that section.");
        return null;
      }
      const { id } = (await res.json()) as { id: number };
      await refresh();
      setSelectedEntryId(id);
      return id;
    },
    [refresh],
  );

  const removeEntry = useCallback(
    async (id: number) => {
      const res = await fetch(`/api/resume/entries/${id}`, { method: "DELETE" }).catch(() => null);
      if (!res || !res.ok) setError("Could not remove that entry.");
      await refresh();
    },
    [refresh],
  );

  const addBullet = useCallback(
    async (entryId: number, text: string) => {
      const res = await fetch("/api/resume/bullets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, text, source: "manual" }),
      }).catch(() => null);
      if (!res || !res.ok) setError("Could not add that bullet.");
      await refresh();
    },
    [refresh],
  );

  const addBullets = useCallback(
    async (entryId: number, texts: string[], source: "manual" | "ai") => {
      const res = await fetch("/api/resume/bullets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, texts, source }),
      }).catch(() => null);
      if (!res || !res.ok) setError("Could not add that bullet.");
      await refresh();
    },
    [refresh],
  );

  const removeBullet = useCallback(
    async (id: number) => {
      setResume((r) =>
        r
          ? {
              ...r,
              entries: r.entries.map((e) => ({
                ...e,
                bullets: e.bullets.filter((b) => b.id !== id),
              })),
            }
          : r,
      );
      const res = await fetch(`/api/resume/bullets/${id}`, { method: "DELETE" }).catch(() => null);
      if (!res || !res.ok) {
        setError("Could not remove that bullet.");
        await refresh();
      }
    },
    [refresh],
  );

  return (
    <ResumeContext.Provider
      value={{
        resume,
        loading,
        error,
        saving: pending > 0,
        selectedEntryId,
        setSelectedEntryId,
        updateHeader,
        updateEntry,
        updateBullet,
        updateSkill,
        addEntry,
        removeEntry,
        addBullet,
        addBullets,
        removeBullet,
        refresh,
      }}
    >
      {children}
    </ResumeContext.Provider>
  );
}
