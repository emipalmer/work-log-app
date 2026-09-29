import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { deleteSavedLayout } from "@/lib/workspace";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  if (!deleteSavedLayout(user.id, Number(id))) {
    return NextResponse.json({ error: "Layout not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
