// Minimal Markdown block renderer for generated content: headings, bullets,
// and pipe-tables (rendered monospace). Inline formatting is delegated to the
// shared parser in lib/markdown.ts. No external dependencies.

import { InlineMarkdown } from "./MarkdownInline";

export default function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let table: string[] = [];

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1">
        {list.map((item, i) => (
          <li key={i}><InlineMarkdown text={item} /></li>
        ))}
      </ul>,
    );
    list = [];
  };

  const flushTable = () => {
    if (table.length === 0) return;
    blocks.push(
      <pre key={`tbl-${blocks.length}`} className="text-xs bg-sunken border border-line rounded-lg p-3 overflow-x-auto">
        {table.join("\n")}
      </pre>,
    );
    table = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("|")) {
      flushList();
      table.push(trimmed);
      return;
    }
    flushTable();

    const bullet = trimmed.match(/^(?:[-*]|\d+\.)\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flushList();

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const cls =
        level <= 2
          ? "text-base font-bold mt-4 first:mt-0"
          : "text-sm font-semibold mt-3 first:mt-0";
      blocks.push(
        <h3 key={`h-${idx}`} className={cls}>
          <InlineMarkdown text={heading[2]} />
        </h3>,
      );
      return;
    }

    if (trimmed === "") return;

    blocks.push(
      <p key={`p-${idx}`} className="leading-relaxed">
        <InlineMarkdown text={trimmed} />
      </p>,
    );
  });
  flushList();
  flushTable();

  return <div className="space-y-2 text-sm text-ink">{blocks}</div>;
}
