import db from "./db";
import {
  DEFAULT_LAYOUT,
  normalizeLayout,
  type SavedLayout,
  type WorkspaceLayout,
} from "./workspace-types";

export type WorkspaceState = { current: WorkspaceLayout; presets: SavedLayout[] };

export const MAX_SAVED_LAYOUTS = 12;
const MAX_NAME_LENGTH = 40;

export function getWorkspaceState(userId: number): WorkspaceState {
  const pref = db
    .prepare("SELECT workspace_layout FROM user_prefs WHERE user_id = ?")
    .get(userId) as { workspace_layout: string | null } | undefined;

  let current = DEFAULT_LAYOUT;
  if (pref?.workspace_layout) {
    try {
      current = normalizeLayout(JSON.parse(pref.workspace_layout));
    } catch {
      current = DEFAULT_LAYOUT; // stored value corrupt — fall back rather than throw
    }
  }

  const rows = db
    .prepare("SELECT id, name, config FROM saved_layouts WHERE user_id = ? ORDER BY position, id")
    .all(userId) as { id: number; name: string; config: string }[];

  const presets: SavedLayout[] = [];
  for (const row of rows) {
    try {
      presets.push({ id: row.id, name: row.name, config: normalizeLayout(JSON.parse(row.config)) });
    } catch {
      // Skip an unreadable preset instead of failing the whole workspace load.
    }
  }

  return { current, presets };
}

export function setCurrentLayout(userId: number, layout: WorkspaceLayout): WorkspaceLayout {
  const clean = normalizeLayout(layout);
  db.prepare(
    `INSERT INTO user_prefs (user_id, workspace_layout) VALUES (?, ?)
     ON CONFLICT (user_id) DO UPDATE SET
       workspace_layout = excluded.workspace_layout,
       updated_at = datetime('now')`,
  ).run(userId, JSON.stringify(clean));
  return clean;
}

export function createSavedLayout(
  userId: number,
  name: string,
  config: WorkspaceLayout,
): { id: number } | { error: string } {
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  if (!trimmed) return { error: "Give the layout a name." };

  const count = db
    .prepare("SELECT COUNT(*) AS n FROM saved_layouts WHERE user_id = ?")
    .get(userId) as { n: number };
  if (count.n >= MAX_SAVED_LAYOUTS) {
    return { error: `You can save up to ${MAX_SAVED_LAYOUTS} layouts.` };
  }

  const next = db
    .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM saved_layouts WHERE user_id = ?")
    .get(userId) as { pos: number };

  const info = db
    .prepare("INSERT INTO saved_layouts (user_id, name, config, position) VALUES (?, ?, ?, ?)")
    .run(userId, trimmed, JSON.stringify(normalizeLayout(config)), next.pos);

  return { id: Number(info.lastInsertRowid) };
}

export function deleteSavedLayout(userId: number, id: number): boolean {
  return (
    db.prepare("DELETE FROM saved_layouts WHERE id = ? AND user_id = ?").run(id, userId).changes > 0
  );
}
