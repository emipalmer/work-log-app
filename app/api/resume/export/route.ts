import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getOrCreateResume, resumeToHtml, resumeToPlainText } from "@/lib/resume";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const resume = getOrCreateResume(user.id, user.email);
  return NextResponse.json({
    text: resumeToPlainText(resume),
    html: resumeToHtml(resume),
  });
}
