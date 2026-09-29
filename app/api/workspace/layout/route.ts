import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getWorkspaceState, setCurrentLayout } from "@/lib/workspace";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json(getWorkspaceState(user.id));
}

export async function PUT(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "A layout is required." }, { status: 400 });
  }
  // setCurrentLayout normalizes before writing, so malformed input is dropped
  // rather than persisted.
  return NextResponse.json({ layout: setCurrentLayout(user.id, body.layout ?? body) });
}
