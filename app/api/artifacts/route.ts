import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";
import { ARTIFACT_TYPES, type ArtifactType } from "@/lib/prompts";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const artifacts = db
    .prepare(
      `SELECT id, type, content, start_date, end_date, source_count, edited, created_at
       FROM artifacts WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
    )
    .all(user.id);

  return NextResponse.json({ artifacts });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const type = body?.type as ArtifactType;
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!ARTIFACT_TYPES.includes(type) || content === "") {
    return NextResponse.json({ error: "type and content are required." }, { status: 400 });
  }

  const info = db
    .prepare(
      `INSERT INTO artifacts (user_id, type, content, start_date, end_date, source_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      user.id,
      type,
      content,
      typeof body?.startDate === "string" ? body.startDate : null,
      typeof body?.endDate === "string" ? body.endDate : null,
      Number.isInteger(body?.sourceCount) ? body.sourceCount : 0,
    );

  return NextResponse.json({ id: Number(info.lastInsertRowid) }, { status: 201 });
}
