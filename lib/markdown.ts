// Small inline-Markdown parser shared by the block renderer and the compact
// card previews. Deliberately not a full CommonMark implementation — it covers
// the syntax the app actually produces (chips emit **bold**) plus the common
// things people type by hand.

export type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "code"; value: string };

// Order matters: ** must be tried before * at the same position.
// Underscore forms require non-word boundaries so snake_case_identifiers and
// file__names survive untouched.
const INLINE = new RegExp(
  [
    "`([^`\\n]+)`", // `code`
    "\\*\\*(?=\\S)([\\s\\S]*?\\S)\\*\\*", // **bold**
    "(?<!\\w)__(?=\\S)([\\s\\S]*?\\S)__(?!\\w)", // __bold__
    "\\*(?=\\S)([^*\\n]*?\\S)\\*", // *italic*
    "(?<!\\w)_(?=\\S)([^_\\n]*?\\S)_(?!\\w)", // _italic_
  ].join("|"),
  "g",
);

export function parseInline(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  INLINE.lastIndex = 0;

  let m: RegExpExecArray | null;
  while ((m = INLINE.exec(input)) !== null) {
    if (m.index > last) tokens.push({ kind: "text", value: input.slice(last, m.index) });

    const [full, code, boldStar, boldUnderscore, italicStar, italicUnderscore] = m;
    if (code !== undefined) tokens.push({ kind: "code", value: code });
    else if (boldStar !== undefined) tokens.push({ kind: "bold", value: boldStar });
    else if (boldUnderscore !== undefined) tokens.push({ kind: "bold", value: boldUnderscore });
    else if (italicStar !== undefined) tokens.push({ kind: "italic", value: italicStar });
    else tokens.push({ kind: "italic", value: italicUnderscore });

    last = m.index + full.length;
    // Zero-length matches would loop forever; the patterns all require content,
    // but guard anyway.
    if (full.length === 0) INLINE.lastIndex += 1;
  }
  if (last < input.length) tokens.push({ kind: "text", value: input.slice(last) });
  return tokens;
}

/** Markdown with the markers removed — for titles, tooltips and search. */
export function stripInline(input: string): string {
  return parseInline(input)
    .map((t) => (t.kind === "text" || t.kind === "code" ? t.value : stripInline(t.value)))
    .join("");
}

export type PreviewLine = { content: string; bullet: boolean };

/**
 * Flatten a log entry into compact lines for a card preview: blank lines and
 * table rows are dropped, headings become bold, and list markers are recorded
 * so the renderer can draw a real bullet instead of a stray dash.
 */
export function toPreviewLines(body: string, maxLines = 6): PreviewLine[] {
  const out: PreviewLine[] = [];

  for (const raw of body.split("\n")) {
    if (out.length >= maxLines) break;
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("|")) continue; // table rows read as noise when truncated
    if (/^([-*_])\1{2,}$/.test(line)) continue; // horizontal rules

    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      out.push({ content: `**${heading[1]}**`, bullet: false });
      continue;
    }
    const bullet = line.match(/^(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      out.push({ content: bullet[1], bullet: true });
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      out.push({ content: quote[1], bullet: false });
      continue;
    }
    out.push({ content: line, bullet: false });
  }

  return out;
}
