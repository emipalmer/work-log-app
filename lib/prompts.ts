export type ArtifactType = "resume_bullets" | "star_stories" | "brag_doc" | "skills_inventory";

export const ARTIFACT_TYPES: ArtifactType[] = [
  "resume_bullets",
  "star_stories",
  "brag_doc",
  "skills_inventory",
];

export const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  resume_bullets: "Resume bullets",
  star_stories: "STAR stories",
  brag_doc: "Brag doc",
  skills_inventory: "Skills inventory",
};

const BASE_SYSTEM = `You are an expert career coach and resume writer. You turn a professional's raw daily work-log entries into polished career content.

Rules:
- Ground every claim in the provided log entries. Never invent accomplishments, metrics, technologies, or outcomes that aren't supported by the logs.
- Where the logs contain concrete numbers, surface them prominently. Where impact is implied but unquantified, phrase it qualitatively — do not fabricate figures.
- Write clean, well-structured Markdown. No preamble before the content and no closing commentary after it.`;

const TYPE_INSTRUCTIONS: Record<ArtifactType, string> = {
  resume_bullets: `Produce achievement-oriented resume bullet points from the logs.
- One line per bullet, starting with a strong action verb.
- Follow the "accomplished X by doing Y, as measured by Z" formula wherever the logs support it.
- Group bullets under short bold project or theme headings.
- Aim for the strongest 6–12 bullets; quality over quantity.`,

  star_stories: `Select the 2–4 most interview-worthy accomplishments in the logs and write each as a STAR story.
- For each story: a short bold title, then "**Situation**", "**Task**", "**Action**", "**Result**" sections.
- Write in the first person, 120–220 words per story, concrete and rehearsable aloud.
- After each story, add one line: "_Good answer for:_" followed by 1–2 behavioral interview questions it addresses.`,

  brag_doc: `Produce a brag document (self-review / accomplishments doc) from the logs.
- Organize by theme (e.g. Shipping & Delivery, Technical Leadership, Collaboration, Growth).
- Under each theme, bullet the accomplishments with their dates so claims are traceable.
- Close with a short "Highlights" section of the 3 strongest items for a performance review.`,

  skills_inventory: `Produce a skills inventory from the logs.
- List each distinct skill, technology, or competency demonstrated in the logs, deduplicated.
- Group into "Technical skills" and "Professional skills".
- For each skill: the skill name in bold, a one-line note of the evidence (what was done, with dates), and a frequency signal (how often it appears).
- Order by frequency and recency, strongest first.`,
};

export function buildSystemPrompt(type: ArtifactType): string {
  return `${BASE_SYSTEM}\n\nTask:\n${TYPE_INSTRUCTIONS[type]}`;
}

export function buildUserMessage(
  start: string,
  end: string,
  entries: { date: string; body: string; project_tag: string | null }[],
): string {
  const formatted = entries
    .map((e) => {
      const project = e.project_tag ? ` — project: ${e.project_tag}` : "";
      return `### ${e.date}${project}\n${e.body.trim()}`;
    })
    .join("\n\n");
  return `Work log entries from ${start} to ${end}:\n\n${formatted}`;
}
