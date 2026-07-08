// Minimal Markdown renderer for generated content: headings, bullets, bold,
// italics, and pipe-tables (rendered monospace). No external dependencies.

import { Fragment } from "react";

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  // Split on **bold** first, then _italic_ inside the plain segments.
  const nodes: React.ReactNode[] = [];
  const boldParts = text.split(/\*\*(.+?)\*\*/g);
  boldParts.forEach((part, i) => {
    if (i % 2 === 1) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{part}</strong>);
    } else {
      const italicParts = part.split(/_(.+?)_/g);
      italicParts.forEach((seg, j) => {
        if (j % 2 === 1) {
          nodes.push(<em key={`${keyPrefix}-i${i}-${j}`}>{seg}</em>);
        } else if (seg) {
          nodes.push(<Fragment key={`${keyPrefix}-t${i}-${j}`}>{seg}</Fragment>);
        }
      });
    }
  });
  return nodes;
}

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
          <li key={i}>{inline(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  const flushTable = () => {
    if (table.length === 0) return;
    blocks.push(
      <pre key={`tbl-${blocks.length}`} className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto">
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
          {inline(heading[2], `h-${idx}`)}
        </h3>,
      );
      return;
    }

    if (trimmed === "") return;

    blocks.push(
      <p key={`p-${idx}`} className="leading-relaxed">
        {inline(trimmed, `p-${idx}`)}
      </p>,
    );
  });
  flushList();
  flushTable();

  return <div className="space-y-2 text-sm text-gray-800">{blocks}</div>;
}
