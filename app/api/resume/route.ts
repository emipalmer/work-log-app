import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getOrCreateResume } from "@/lib/resume";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ resume: getOrCreateResume(user.id, user.email) });
}

const HEADER_FIELDS: Record<string, string> = {
  name: "name",
  fullName: "full_name",
  headline: "headline",
  email: "email",
  location: "location",
  links: "links",
  summary: "summary",
};

export async function PATCH(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const resume = getOrCreateResume(user.id, user.email);

  const sets: string[] = [];
  const values: string[] = [];
  for (const [key, column] of Object.entries(HEADER_FIELDS)) {
    if (typeof body?.[key] === "string") {
      sets.push(`${column} = ?`);
      values.push(body[key]);
    }
  }
  if (!sets.length) return NextResponse.json({ error: "No fields to update." }, { status: 400 });

  db.prepare(
    `UPDATE resumes SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
  ).run(...values, resume.id, user.id);

  return NextResponse.json({ resume: getOrCreateResume(user.id, user.email) });
}
