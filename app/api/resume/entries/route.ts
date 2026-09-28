import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";
import { ENTRY_KINDS, getOrCreateResume, type EntryKind } from "@/lib/resume";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const kind = body?.kind as EntryKind;
  if (!ENTRY_KINDS.includes(kind)) {
    return NextResponse.json({ error: "Unknown section." }, { status: 400 });
  }

  const resume = getOrCreateResume(user.id, user.email);
  const next = db
    .prepare(
      "SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM resume_entries WHERE resume_id = ? AND kind = ?",
    )
    .get(resume.id, kind) as { pos: number };

  const info = db
    .prepare(
      "INSERT INTO resume_entries (resume_id, kind, org, title, dates, position) VALUES (?, ?, '', '', '', ?)",
    )
    .run(resume.id, kind, next.pos);

  return NextResponse.json({ id: Number(info.lastInsertRowid) }, { status: 201 });
}
