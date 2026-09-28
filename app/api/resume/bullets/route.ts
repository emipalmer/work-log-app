import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";
import { entryOwner } from "@/lib/resume";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const entryId = Number(body?.entryId);
  if (!Number.isInteger(entryId) || entryOwner(entryId) !== user.id) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  // A batch (`texts`) comes from accepting AI suggestions, so blanks are dropped.
  // A singular `text` is taken as-is so "Add bullet" can insert an empty row to type into.
  const texts: string[] = Array.isArray(body?.texts)
    ? body.texts.filter((t: unknown) => typeof t === "string" && t.trim() !== "")
    : typeof body?.text === "string"
      ? [body.text]
      : [];
  if (!texts.length) return NextResponse.json({ error: "text is required." }, { status: 400 });

  const source = body?.source === "ai" ? "ai" : "manual";
  const start = db
    .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM resume_bullets WHERE entry_id = ?")
    .get(entryId) as { pos: number };

  const insert = db.prepare(
    "INSERT INTO resume_bullets (entry_id, text, source, position) VALUES (?, ?, ?, ?)",
  );
  const ids = db.transaction((list: string[]) =>
    list.map((t, i) => Number(insert.run(entryId, t.trim(), source, start.pos + i).lastInsertRowid)),
  )(texts);

  return NextResponse.json({ ids }, { status: 201 });
}
