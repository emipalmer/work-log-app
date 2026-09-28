import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";
import { DATE_RE } from "@/lib/dates";
import {
  ARTIFACT_TYPES,
  buildSystemPrompt,
  buildUserMessage,
  type ArtifactType,
} from "@/lib/prompts";
import { CLAUDE_MODEL, claudeErrorResponse, getClaudeClient, NO_CREDENTIALS } from "@/lib/claude";

export const maxDuration = 300; // generation can take a while at high effort

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const type = body?.type as ArtifactType;
  const start = typeof body?.start === "string" ? body.start : "";
  const end = typeof body?.end === "string" ? body.end : "";

  if (!ARTIFACT_TYPES.includes(type)) {
    return NextResponse.json({ error: "Unknown output type." }, { status: 400 });
  }
  if (!DATE_RE.test(start) || !DATE_RE.test(end) || start > end) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }

  const entries = db
    .prepare(
      `SELECT date, body, project_tag FROM entries
       WHERE user_id = ? AND date BETWEEN ? AND ? AND trim(body) != ''
       ORDER BY date`,
    )
    .all(user.id, start, end) as { date: string; body: string; project_tag: string | null }[];

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "No log entries in this date range. Write some daily logs first, then generate." },
      { status: 400 },
    );
  }

  const client = getClaudeClient();
  if (!client) return NO_CREDENTIALS;

  try {
    const stream = client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      system: buildSystemPrompt(type),
      messages: [{ role: "user", content: buildUserMessage(start, end, entries) }],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "The model declined to process this content. Try adjusting your log entries." },
        { status: 422 },
      );
    }

    const content = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({ content, type, start, end, sourceCount: entries.length });
  } catch (error) {
    const mapped = claudeErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }
}
