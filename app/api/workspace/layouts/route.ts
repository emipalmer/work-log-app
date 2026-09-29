import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createSavedLayout } from "@/lib/workspace";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";
  if (!body?.config || typeof body.config !== "object") {
    return NextResponse.json({ error: "A layout config is required." }, { status: 400 });
  }

  const result = createSavedLayout(user.id, name, body.config);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}
