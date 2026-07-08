import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession, SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) destroySession(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...{ httpOnly: true, sameSite: "lax" as const, path: "/" }, maxAge: 0 });
  return res;
}
