import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (content === "") {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }

  const info = db
    .prepare("UPDATE artifacts SET content = ?, edited = 1 WHERE id = ? AND user_id = ?")
    .run(content, Number(id), user.id);

  if (info.changes === 0) {
    return NextResponse.json({ error: "Artifact not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const info = db
    .prepare("DELETE FROM artifacts WHERE id = ? AND user_id = ?")
    .run(Number(id), user.id);

  if (info.changes === 0) {
    return NextResponse.json({ error: "Artifact not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
