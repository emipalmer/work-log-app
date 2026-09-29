// Pure workspace-layout types, shared by the server (persistence) and the
// client (rendering). No database import, so it is safe in client bundles.

export type PanelId = "worklog" | "resume" | "editor" | "ai";
export const ALL_PANELS: PanelId[] = ["worklog", "resume", "editor", "ai"];

/**
 * One panel fills the left column; the rest stack in the right column.
 * `columns`/`rows` hold separator positions keyed by panel id.
 */
export type WorkspaceLayout = {
  left: PanelId | null;
  right: PanelId[];
  columns?: Record<string, number>;
  rows?: Record<string, number>;
};

export type SavedLayout = { id: number; name: string; config: WorkspaceLayout };

export const BUILT_IN_LAYOUTS: { key: string; name: string; config: WorkspaceLayout }[] = [
  {
    key: "log-resume",
    name: "Log + Resume",
    config: { left: "worklog", right: ["resume", "editor"] },
  },
  { key: "focus-resume", name: "Focus: Resume", config: { left: "worklog", right: ["resume"] } },
];

export const DEFAULT_LAYOUT: WorkspaceLayout = BUILT_IN_LAYOUTS[0].config;

function isPanel(value: unknown): value is PanelId {
  return ALL_PANELS.includes(value as PanelId);
}

function normalizeSizes(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, number> = {};
  for (const [key, size] of Object.entries(value as Record<string, unknown>)) {
    if (typeof size === "number" && Number.isFinite(size) && size >= 0) out[key] = size;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Stored JSON is untrusted input: drop unknown panel ids, de-duplicate, and
 * keep the left panel out of the right column. A panel rendered twice would
 * collide on React keys and corrupt the layout.
 */
export function normalizeLayout(raw: unknown): WorkspaceLayout {
  if (!raw || typeof raw !== "object") return DEFAULT_LAYOUT;
  const obj = raw as Record<string, unknown>;

  const left = isPanel(obj.left) ? obj.left : null;
  const hasRight = Array.isArray(obj.right);
  // Neither a usable left panel nor a right column means the value is garbage
  // rather than a deliberately emptied workspace.
  if (!hasRight && left === null) return DEFAULT_LAYOUT;

  const seen = new Set<PanelId>(left ? [left] : []);
  const right: PanelId[] = [];
  if (hasRight) {
    for (const panel of obj.right as unknown[]) {
      if (isPanel(panel) && !seen.has(panel)) {
        seen.add(panel);
        right.push(panel);
      }
    }
  }

  return { left, right, columns: normalizeSizes(obj.columns), rows: normalizeSizes(obj.rows) };
}

/** Preset matching ignores separator positions — only the arrangement counts. */
export function sameArrangement(a: WorkspaceLayout, b: WorkspaceLayout): boolean {
  return (
    a.left === b.left &&
    a.right.length === b.right.length &&
    a.right.every((panel, i) => panel === b.right[i])
  );
}

export function visiblePanels(layout: WorkspaceLayout): PanelId[] {
  return [...(layout.left ? [layout.left] : []), ...layout.right];
}
