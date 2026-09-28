import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";
import { DATE_RE } from "@/lib/dates";
import { entryOwner } from "@/lib/resume";
import { CLAUDE_MODEL, claudeErrorResponse, getClaudeClient, NO_CREDENTIALS } from "@/lib/claude";

export const maxDuration = 300;

const SYSTEM = `You are an expert resume writer. You turn a professional's raw daily work-log entries into resume achievement bullets for one specific role.

Rules:
- Ground every bullet in the supplied log entries. Never invent accomplishments, metrics, technologies, or outcomes the logs don't support.
- Start each bullet with a strong action verb and follow "accomplished X by doing Y, measured by Z" wherever the logs supply a number.
- Where impact is implied but unquantified, stay qualitative rather than fabricating figures.
- One sentence per bullet. No leading bullet characters, no markdown, no trailing period-free fragments.
- Return between 3 and 5 of the strongest bullets, ordered strongest first.`;

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const entryId = Number(body?.entryId);
  const start = typeof body?.start === "string" ? body.start : "";
  const end = typeof body?.end === "string" ? body.end : "";

  if (!Number.isInteger(entryId) || entryOwner(entryId) !== user.id) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }
  if (!DATE_RE.test(start) || !DATE_RE.test(end) || start > end) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }

  const entry = db
    .prepare("SELECT org, title FROM resume_entries WHERE id = ?")
    .get(entryId) as { org: string; title: string };

  const logs = db
    .prepare(
      `SELECT date, body, project_tag FROM entries
       WHERE user_id = ? AND date BETWEEN ? AND ? AND trim(body) != ''
       ORDER BY date`,
    )
    .all(user.id, start, end) as { date: string; body: string; project_tag: string | null }[];

  if (logs.length === 0) {
    return NextResponse.json(
      { error: "No log entries in this date range. Write some daily logs first." },
      { status: 400 },
    );
  }

  const client = getClaudeClient();
  if (!client) return NO_CREDENTIALS;

  const role = [entry.org, entry.title].filter((s) => s && s.trim()).join(" — ");
  const formatted = logs
    .map((l) => `### ${l.date}${l.project_tag ? ` — project: ${l.project_tag}` : ""}\n${l.body.trim()}`)
    .join("\n\n");

  try {
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              bullets: {
                type: "array",
                description: "Between 3 and 5 resume achievement bullets.",
                items: { type: "string" },
              },
            },
            required: ["bullets"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content:
            (role ? `Role these bullets are for: ${role}\n\n` : "") +
            `Work log entries from ${start} to ${end}:\n\n${formatted}`,
        },
      ],
    });

    if (message.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "The model declined to process this content." },
        { status: 422 },
      );
    }

    const text = message.content.find((b) => b.type === "text")?.text ?? "";
    let bullets: string[] = [];
    try {
      const parsed = JSON.parse(text) as { bullets?: unknown };
      if (Array.isArray(parsed.bullets)) {
        bullets = parsed.bullets.filter((b): b is string => typeof b === "string" && b.trim() !== "");
      }
    } catch {
      return NextResponse.json(
        { error: "Could not read the model's response. Try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ bullets, sourceCount: logs.length, start, end });
  } catch (error) {
    const mapped = claudeErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }
}
