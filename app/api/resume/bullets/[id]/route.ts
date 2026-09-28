import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";
import { bulletOwner } from "@/lib/resume";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const bulletId = Number(id);
  if (bulletOwner(bulletId) !== user.id) {
    return NextResponse.json({ error: "Bullet not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.text !== "string") {
    return NextResponse.json({ error: "text is required." }, { status: 400 });
  }
  db.prepare("UPDATE resume_bullets SET text = ? WHERE id = ?").run(body.text, bulletId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const bulletId = Number(id);
  if (bulletOwner(bulletId) !== user.id) {
    return NextResponse.json({ error: "Bullet not found." }, { status: 404 });
  }
  db.prepare("DELETE FROM resume_bullets WHERE id = ?").run(bulletId);
  return NextResponse.json({ ok: true });
}
