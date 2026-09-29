import db from "./db";

export type {
  EntryKind,
  Resume,
  ResumeBullet,
  ResumeEntry,
  ResumeSkill,
} from "./resume-types";
import { ENTRY_KINDS, SECTION_LABEL } from "./resume-types";
import type { EntryKind, Resume, ResumeBullet, ResumeEntry, ResumeSkill } from "./resume-types";
export { ENTRY_KINDS };

type ResumeRow = {
  id: number;
  name: string;
  full_name: string;
  headline: string;
  email: string;
  location: string;
  links: string;
  summary: string;
};

/** The user's resume, creating a seeded scaffold on first access. */
export function getOrCreateResume(userId: number, userEmail = ""): Resume {
  let row = db
    .prepare("SELECT * FROM resumes WHERE user_id = ? ORDER BY id LIMIT 1")
    .get(userId) as ResumeRow | undefined;

  if (!row) {
    const info = db
      .prepare("INSERT INTO resumes (user_id, email) VALUES (?, ?)")
      .run(userId, userEmail);
    const resumeId = Number(info.lastInsertRowid);
    // Seed a scaffold so the editor opens with structure rather than a blank slate.
    db.prepare(
      "INSERT INTO resume_entries (resume_id, kind, org, title, dates, position) VALUES (?, 'experience', '', '', '', 0)",
    ).run(resumeId);
    const skill = db.prepare(
      "INSERT INTO resume_skills (resume_id, category, items, position) VALUES (?, ?, '', ?)",
    );
    skill.run(resumeId, "Technical", 0);
    skill.run(resumeId, "Professional", 1);
    row = db.prepare("SELECT * FROM resumes WHERE id = ?").get(resumeId) as ResumeRow;
  }

  const entries = db
    .prepare(
      `SELECT id, kind, org, title, dates, position FROM resume_entries
       WHERE resume_id = ? ORDER BY kind, position, id`,
    )
    .all(row.id) as Omit<ResumeEntry, "bullets">[];

  const bullets = db
    .prepare(
      `SELECT b.id, b.entry_id, b.text, b.source, b.position FROM resume_bullets b
       JOIN resume_entries e ON e.id = b.entry_id
       WHERE e.resume_id = ? ORDER BY b.position, b.id`,
    )
    .all(row.id) as (ResumeBullet & { entry_id: number })[];

  const byEntry = new Map<number, ResumeBullet[]>();
  for (const b of bullets) {
    const list = byEntry.get(b.entry_id) ?? [];
    list.push({ id: b.id, text: b.text, source: b.source, position: b.position });
    byEntry.set(b.entry_id, list);
  }

  const skills = db
    .prepare(
      "SELECT id, category, items, position FROM resume_skills WHERE resume_id = ? ORDER BY position, id",
    )
    .all(row.id) as ResumeSkill[];

  return {
    id: row.id,
    name: row.name,
    fullName: row.full_name,
    headline: row.headline,
    email: row.email,
    location: row.location,
    links: row.links,
    summary: row.summary,
    entries: entries.map((e) => ({ ...e, bullets: byEntry.get(e.id) ?? [] })),
    skills,
  };
}

/** Verify a resume belongs to the user before mutating it. */
export function assertOwnedResume(resumeId: number, userId: number): boolean {
  const r = db
    .prepare("SELECT 1 AS ok FROM resumes WHERE id = ? AND user_id = ?")
    .get(resumeId, userId);
  return !!r;
}

export function entryOwner(entryId: number): number | null {
  const r = db
    .prepare(
      `SELECT r.user_id AS userId FROM resume_entries e
       JOIN resumes r ON r.id = e.resume_id WHERE e.id = ?`,
    )
    .get(entryId) as { userId: number } | undefined;
  return r ? r.userId : null;
}

export function bulletOwner(bulletId: number): number | null {
  const r = db
    .prepare(
      `SELECT r.user_id AS userId FROM resume_bullets b
       JOIN resume_entries e ON e.id = b.entry_id
       JOIN resumes r ON r.id = e.resume_id WHERE b.id = ?`,
    )
    .get(bulletId) as { userId: number } | undefined;
  return r ? r.userId : null;
}

/** A list of positive integer ids, or null when the body isn't one. */
export function parseIdList(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const ids = raw.map(Number);
  return ids.every((n) => Number.isInteger(n) && n > 0) ? ids : null;
}

/** True when `ids` lists exactly what's stored, in some order. */
function isPermutation(stored: number[], ids: number[]): boolean {
  if (stored.length !== ids.length) return false;
  const remaining = new Set(stored);
  // delete() fails on both an id we don't own and a duplicate of one we do.
  return ids.every((id) => remaining.delete(id));
}

/** Renumber positions to match `ids`.
 *  `ids` has to be a permutation of what's stored: a short list, a duplicate,
 *  or an id from another resume means the client is working from a stale view,
 *  and writing it would scramble the order rather than change it. Returning
 *  false lets the route answer 409 and the client reload. */
export function reorderEntries(resumeId: number, kind: EntryKind, ids: number[]): boolean {
  const stored = db
    .prepare("SELECT id FROM resume_entries WHERE resume_id = ? AND kind = ?")
    .all(resumeId, kind) as { id: number }[];
  if (!isPermutation(stored.map((r) => r.id), ids)) return false;

  const update = db.prepare("UPDATE resume_entries SET position = ? WHERE id = ?");
  db.transaction(() => ids.forEach((id, i) => update.run(i, id)))();
  return true;
}

/** Renumber bullet positions within one entry. See reorderEntries. */
export function reorderBullets(entryId: number, ids: number[]): boolean {
  const stored = db
    .prepare("SELECT id FROM resume_bullets WHERE entry_id = ?")
    .all(entryId) as { id: number }[];
  if (!isPermutation(stored.map((r) => r.id), ids)) return false;

  const update = db.prepare("UPDATE resume_bullets SET position = ? WHERE id = ?");
  db.transaction(() => ids.forEach((id, i) => update.run(i, id)))();
  return true;
}

function section(r: Resume, kind: EntryKind): ResumeEntry[] {
  return r.entries.filter((e) => e.kind === kind);
}

/** True when an entry has any content worth exporting. */
function hasContent(e: ResumeEntry): boolean {
  return !!(e.org.trim() || e.title.trim() || e.bullets.some((b) => b.text.trim()));
}

function headline(e: ResumeEntry): string {
  const left = [e.org.trim(), e.title.trim()].filter(Boolean).join(" — ");
  return e.dates.trim() ? `${left} (${e.dates.trim()})` : left;
}

/** ATS-friendly plain text. */
export function resumeToPlainText(r: Resume): string {
  const out: string[] = [];
  if (r.fullName.trim()) out.push(r.fullName.trim().toUpperCase());
  if (r.headline.trim()) out.push(r.headline.trim());
  const contact = [r.email, r.location, r.links].map((s) => s.trim()).filter(Boolean);
  if (contact.length) out.push(contact.join("  ·  "));

  if (r.summary.trim()) out.push("", "SUMMARY", r.summary.trim());

  for (const kind of ENTRY_KINDS) {
    const list = section(r, kind).filter(hasContent);
    if (!list.length) continue;
    out.push("", SECTION_LABEL[kind]);
    for (const e of list) {
      const h = headline(e);
      if (h) out.push(h);
      for (const b of e.bullets) if (b.text.trim()) out.push(`• ${b.text.trim()}`);
    }
  }

  const skills = r.skills.filter((s) => s.items.trim());
  if (skills.length) {
    out.push("", "SKILLS");
    for (const s of skills) out.push(`${s.category}: ${s.items.trim()}`);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Rich HTML — pasting this into Google Docs preserves the formatting. */
export function resumeToHtml(r: Resume): string {
  const out: string[] = [];
  out.push(`<div style="font-family:Arial,Helvetica,sans-serif;color:#18181b;">`);
  if (r.fullName.trim())
    out.push(`<h1 style="font-size:22pt;margin:0 0 2pt;">${esc(r.fullName.trim())}</h1>`);
  if (r.headline.trim())
    out.push(`<p style="margin:0 0 2pt;color:#5b5bd6;font-weight:600;">${esc(r.headline.trim())}</p>`);
  const contact = [r.email, r.location, r.links].map((s) => s.trim()).filter(Boolean);
  if (contact.length)
    out.push(`<p style="margin:0 0 10pt;color:#68686f;font-size:9.5pt;">${esc(contact.join("  ·  "))}</p>`);
  if (r.summary.trim()) out.push(`<p style="margin:0 0 10pt;">${esc(r.summary.trim())}</p>`);

  const h2 = `style="font-size:10.5pt;letter-spacing:.08em;margin:12pt 0 4pt;border-bottom:1px solid #d9d9de;padding-bottom:2pt;"`;
  for (const kind of ENTRY_KINDS) {
    const list = section(r, kind).filter(hasContent);
    if (!list.length) continue;
    out.push(`<h2 ${h2}>${SECTION_LABEL[kind]}</h2>`);
    for (const e of list) {
      const left = [e.org.trim(), e.title.trim()].filter(Boolean).join(" — ");
      out.push(
        `<p style="margin:6pt 0 2pt;"><strong>${esc(left)}</strong>` +
          (e.dates.trim()
            ? `<span style="color:#68686f;float:right;">${esc(e.dates.trim())}</span>`
            : "") +
          `</p>`,
      );
      const bs = e.bullets.filter((b) => b.text.trim());
      if (bs.length) {
        out.push(`<ul style="margin:0 0 6pt;padding-left:16pt;">`);
        for (const b of bs) out.push(`<li style="margin:0 0 2pt;">${esc(b.text.trim())}</li>`);
        out.push(`</ul>`);
      }
    }
  }

  const skills = r.skills.filter((s) => s.items.trim());
  if (skills.length) {
    out.push(`<h2 ${h2}>SKILLS</h2>`);
    for (const s of skills)
      out.push(
        `<p style="margin:0 0 2pt;"><strong>${esc(s.category)}:</strong> ${esc(s.items.trim())}</p>`,
      );
  }
  out.push(`</div>`);
  return out.join("\n");
}
