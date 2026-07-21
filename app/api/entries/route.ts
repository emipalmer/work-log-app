import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";
import { DATE_RE } from "@/lib/dates";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start") ?? "";
  const end = searchParams.get("end") ?? "";
  if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json({ error: "start and end must be YYYY-MM-DD." }, { status: 400 });
  }

  const entries = db
    .prepare(
      `SELECT date, body, project_tag, updated_at FROM entries
       WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date`,
    )
    .all(user.id, start, end);

  return NextResponse.json({ entries });
}

export async function PUT(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const date = typeof body?.date === "string" ? body.date : "";
  const text = typeof body?.body === "string" ? body.body : "";
  const projectTag =
    typeof body?.projectTag === "string" && body.projectTag.trim() !== ""
      ? body.projectTag.trim()
      : null;

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD." }, { status: 400 });
  }

  db.prepare(
    `INSERT INTO entries (user_id, date, body, project_tag)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, date) DO UPDATE SET
       body = excluded.body,
       project_tag = excluded.project_tag,
       updated_at = datetime('now')`,
  ).run(user.id, date, text, projectTag);

  const entry = db
    .prepare("SELECT date, body, project_tag, updated_at FROM entries WHERE user_id = ? AND date = ?")
    .get(user.id, date);

  return NextResponse.json({ entry });
}
