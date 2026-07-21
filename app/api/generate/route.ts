import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";
import { DATE_RE } from "@/lib/dates";
import {
  ARTIFACT_TYPES,
  buildSystemPrompt,
  buildUserMessage,
  type ArtifactType,
} from "@/lib/prompts";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

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

  let client: Anthropic;
  try {
    client = new Anthropic();
  } catch {
    return NextResponse.json(
      { error: "Claude API credentials are not configured. Add ANTHROPIC_API_KEY to .env.local and restart the server." },
      { status: 503 },
    );
  }

  try {
    const stream = client.messages.stream({
      model: MODEL,
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
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Claude API key is invalid. Check ANTHROPIC_API_KEY in .env.local." },
        { status: 503 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Rate limited by the Claude API. Wait a moment and try again." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return NextResponse.json(
        { error: "Could not reach the Claude API. Check your network connection." },
        { status: 502 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error: ${error.message}` },
        { status: 502 },
      );
    }
    // Client-side SDK errors (e.g. no credentials resolved at request time).
    if (error instanceof Anthropic.AnthropicError) {
      if (/authentication method|api.?key/i.test(error.message)) {
        return NextResponse.json(
          { error: "Claude API credentials are not configured. Add ANTHROPIC_API_KEY to .env.local and restart the server." },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
