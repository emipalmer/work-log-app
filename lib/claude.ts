import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

/** Construct a client, or null when no credentials are configured. */
export function getClaudeClient(): Anthropic | null {
  try {
    return new Anthropic();
  } catch {
    return null;
  }
}

export const NO_CREDENTIALS = NextResponse.json(
  {
    error:
      "Claude API credentials are not configured. Add ANTHROPIC_API_KEY to .env.local and restart the server.",
  },
  { status: 503 },
);

/**
 * Map SDK failures onto user-facing responses. Returns null for errors we
 * don't recognise so the caller can rethrow.
 */
export function claudeErrorResponse(error: unknown): NextResponse | null {
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
    return NextResponse.json({ error: `Claude API error: ${error.message}` }, { status: 502 });
  }
  // Credentials resolve lazily at request time. Depending on the call path the
  // SDK surfaces that as a plain Error rather than an AnthropicError, so match
  // on the message instead of the class.
  if (error instanceof Error && /resolve authentication method|api.?key/i.test(error.message)) {
    return NO_CREDENTIALS;
  }
  if (error instanceof Anthropic.AnthropicError) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return null;
}
