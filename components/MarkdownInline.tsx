import { Fragment } from "react";
import { parseInline, toPreviewLines } from "@/lib/markdown";

/** Renders bold / italic / code within a single line of text. */
export function InlineMarkdown({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((token, i) => {
        switch (token.kind) {
          case "bold":
            return (
              <strong key={i} className="font-semibold text-ink">
                <InlineMarkdown text={token.value} />
              </strong>
            );
          case "italic":
            return (
              <em key={i}>
                <InlineMarkdown text={token.value} />
              </em>
            );
          case "code":
            return (
              <code key={i} className="rounded bg-canvas px-1 py-0.5 font-mono text-[0.92em]">
                {token.value}
              </code>
            );
          default:
            return <Fragment key={i}>{token.value}</Fragment>;
        }
      })}
    </>
  );
}

/**
 * Compact multi-line preview for day cards. Renders as one inline flow with
 * <br> separators so the caller's `line-clamp-*` can still truncate it.
 */
export function MarkdownPreview({
  text,
  className,
  maxLines = 6,
}: {
  text: string;
  className?: string;
  maxLines?: number;
}) {
  const lines = toPreviewLines(text, maxLines);
  if (lines.length === 0) return null;

  return (
    <p className={className}>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.bullet && <span aria-hidden="true">• </span>}
          <InlineMarkdown text={line.content} />
        </Fragment>
      ))}
    </p>
  );
}
