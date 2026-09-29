// Pure list-ordering helpers shared by the resume editor's drag handles and
// its keyboard move controls. No React, no database — just arrays of ids.

/** Move the item at `from` so it ends up at `to`, shifting the rest along. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list;
  const clamped = Math.max(0, Math.min(list.length - 1, to));
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(clamped, 0, item);
  return next;
}

/** `list` with `id` nudged by `delta` slots. Returns `null` when it can't move,
 *  so callers can disable the control rather than send a no-op request. */
export function moveById(list: number[], id: number, delta: number): number[] | null {
  const from = list.indexOf(id);
  if (from === -1) return null;
  const to = from + delta;
  if (to < 0 || to >= list.length) return null;
  return moveItem(list, from, to);
}

/** Reorder `list` to match `ids`, keeping any item `ids` doesn't mention in
 *  place at the end. Used for optimistic updates before the save lands. */
export function applyOrder<T extends { id: number }>(list: T[], ids: number[]): T[] {
  const byId = new Map(list.map((item) => [item.id, item]));
  const ordered: T[] = [];
  for (const id of ids) {
    const item = byId.get(id);
    if (item) {
      ordered.push(item);
      byId.delete(id);
    }
  }
  return [...ordered, ...byId.values()];
}
