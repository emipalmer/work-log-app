import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";
import { entryOwner } from "@/lib/resume";

type Params = { params: Promise<{ id: string }> };
const FIELDS: Record<string, string> = { org: "org", title: "title", dates: "dates" };

export async function PATCH(req: Request, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const entryId = Number(id);
  if (entryOwner(entryId) !== user.id) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const sets: string[] = [];
  const values: string[] = [];
  for (const [key, column] of Object.entries(FIELDS)) {
    if (typeof body?.[key] === "string") {
      sets.push(`${column} = ?`);
      values.push(body[key]);
    }
  }
  if (!sets.length) return NextResponse.json({ error: "No fields to update." }, { status: 400 });

  db.prepare(`UPDATE resume_entries SET ${sets.join(", ")} WHERE id = ?`).run(...values, entryId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const entryId = Number(id);
  if (entryOwner(entryId) !== user.id) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }
  db.prepare("DELETE FROM resume_entries WHERE id = ?").run(entryId);
  return NextResponse.json({ ok: true });
}
