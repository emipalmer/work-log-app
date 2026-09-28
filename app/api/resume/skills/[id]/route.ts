import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const skillId = Number(id);
  const owner = db
    .prepare(
      `SELECT r.user_id AS userId FROM resume_skills s
       JOIN resumes r ON r.id = s.resume_id WHERE s.id = ?`,
    )
    .get(skillId) as { userId: number } | undefined;
  if (!owner || owner.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const sets: string[] = [];
  const values: string[] = [];
  if (typeof body?.items === "string") { sets.push("items = ?"); values.push(body.items); }
  if (typeof body?.category === "string") { sets.push("category = ?"); values.push(body.category); }
  if (!sets.length) return NextResponse.json({ error: "No fields to update." }, { status: 400 });

  db.prepare(`UPDATE resume_skills SET ${sets.join(", ")} WHERE id = ?`).run(...values, skillId);
  return NextResponse.json({ ok: true });
}
