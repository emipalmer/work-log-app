"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
  ALL_PANELS,
  BUILT_IN_LAYOUTS,
  sameArrangement,
  visiblePanels,
  type PanelId,
  type SavedLayout,
  type WorkspaceLayout,
} from "@/lib/workspace-types";
import PanelFrame from "./PanelFrame";

export type PanelDef = { title: string; meta?: string; content: React.ReactNode };
export type PanelMap = Record<PanelId, PanelDef>;
export type { PanelId };

const SAVE_DELAY = 500;

/** Sizes are strings: v4 reads bare numbers as pixels, strings as percentages. */
function VSeparator() {
  return (
    <Separator className="w-2.5 shrink-0 cursor-col-resize rounded-full bg-transparent transition-colors hover:bg-accent/25" />
  );
}
function HSeparator() {
  return (
    <Separator className="h-2.5 shrink-0 cursor-row-resize rounded-full bg-transparent transition-colors hover:bg-accent/25" />
  );
}

/** Drop stored separator positions whose panels are no longer rendered. */
function pickSizes(
  sizes: Record<string, number> | undefined,
  ids: string[],
): Record<string, number> | undefined {
  if (!sizes) return undefined;
  const out: Record<string, number> = {};
  for (const id of ids) if (typeof sizes[id] === "number") out[id] = sizes[id];
  return Object.keys(out).length === ids.length ? out : undefined;
}

export default function Workspace({
  panels,
  initialLayout,
  initialPresets,
}: {
  panels: PanelMap;
  initialLayout: WorkspaceLayout;
  initialPresets: SavedLayout[];
}) {
  const [layout, setLayout] = useState<WorkspaceLayout>(initialLayout);
  const [presets, setPresets] = useState<SavedLayout[]>(initialPresets);
  const [maximized, setMaximized] = useState<PanelId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  // Persist the arrangement to the account, debounced so dragging a separator
  // doesn't fire a request per frame.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void fetch("/api/workspace/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      })
        .then((res) => setError(res.ok ? null : "Layout could not be saved."))
        .catch(() => setError("Layout could not be saved."));
    }, SAVE_DELAY);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [layout]);

  const shown = visiblePanels(layout);
  const hidden = ALL_PANELS.filter((panel) => !shown.includes(panel));

  const saveSizes = useCallback((axis: "columns" | "rows", sizes: Record<string, number>) => {
    setLayout((current) => ({ ...current, [axis]: sizes }));
  }, []);

  function closePanel(id: PanelId) {
    setMaximized((m) => (m === id ? null : m));
    setLayout((l) => {
      if (l.left === id) {
        // Promote the first right-column panel into the vacated left column.
        const [first, ...rest] = l.right;
        return { ...l, left: first ?? null, right: rest };
      }
      return { ...l, right: l.right.filter((panel) => panel !== id) };
    });
  }

  function restorePanel(id: PanelId) {
    setLayout((l) => (l.left === null ? { ...l, left: id } : { ...l, right: [...l.right, id] }));
  }

  function swapPanels(dragged: string, target: string) {
    setLayout((l) => {
      const order = visiblePanels(l);
      const from = order.indexOf(dragged as PanelId);
      const to = order.indexOf(target as PanelId);
      if (from < 0 || to < 0) return l;
      const next = [...order];
      [next[from], next[to]] = [next[to], next[from]];
      return l.left === null
        ? { ...l, left: null, right: next }
        : { ...l, left: next[0], right: next.slice(1) };
    });
  }

  function moveToColumn(id: PanelId, column: "left" | "right") {
    setLayout((l) => {
      if (column === "left") {
        if (l.left === id) return l;
        const right = l.right.filter((panel) => panel !== id);
        return { ...l, left: id, right: l.left ? [l.left, ...right] : right };
      }
      if (l.left !== id) return l;
      const [first, ...rest] = l.right;
      return { ...l, left: first ?? null, right: first ? [...rest, id] : [id] };
    });
  }

  async function savePreset() {
    // Count-based naming repeats after a delete, so take the lowest free number.
    const taken = new Set(presets.map((preset) => preset.name));
    let n = 1;
    while (taken.has(`My layout ${n}`)) n += 1;
    const name = `My layout ${n}`;
    const res = await fetch("/api/workspace/layouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, config: layout }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res || !res.ok) {
      setError(data?.error ?? "Could not save that layout.");
      return;
    }
    setError(null);
    setPresets((p) => [...p, { id: data.id, name, config: layout }]);
  }

  async function deletePreset(id: number) {
    setPresets((p) => p.filter((preset) => preset.id !== id));
    const res = await fetch(`/api/workspace/layouts/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) setError("Could not delete that layout.");
  }

  function renderPanel(id: PanelId) {
    const def = panels[id];
    return (
      <PanelFrame
        id={id}
        title={def.title}
        meta={def.meta}
        maximized={maximized === id}
        onClose={() => closePanel(id)}
        onToggleMaximize={() => setMaximized((m) => (m === id ? null : id))}
        onDropPanel={swapPanels}
        actions={[
          {
            label: "Move to left column",
            onClick: () => moveToColumn(id, "left"),
            disabled: layout.left === id,
          },
          {
            label: "Move to right column",
            onClick: () => moveToColumn(id, "right"),
            disabled: layout.left !== id,
          },
          {
            label: maximized === id ? "Restore size" : "Expand to full workspace",
            onClick: () => setMaximized((m) => (m === id ? null : id)),
          },
          { label: "Close panel", onClick: () => closePanel(id) },
        ]}
      >
        {def.content}
      </PanelFrame>
    );
  }

  const allPresets = [
    ...BUILT_IN_LAYOUTS.map((b) => ({ key: b.key, name: b.name, config: b.config, id: null })),
    ...presets.map((p) => ({ key: `saved-${p.id}`, name: p.name, config: p.config, id: p.id })),
  ];
  const activeKey = allPresets.find((p) => sameArrangement(p.config, layout))?.key;

  const columnIds = [
    ...(layout.left ? ["col-left"] : []),
    ...(layout.right.length > 0 ? ["col-right"] : []),
  ];
  const rowIds = layout.right.map((id) => `stack-${id}`);

  return (
    <div className="flex h-screen min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2">
        <span className="text-[11.5px] font-medium text-ink-3">Layout</span>
        {allPresets.map((preset) => (
          <span key={preset.key} className="group/preset relative">
            <button
              onClick={() => {
                setMaximized(null);
                setLayout((l) => ({ ...preset.config, columns: l.columns, rows: l.rows }));
              }}
              className={`pill ${
                activeKey === preset.key
                  ? "border-accent bg-accent-soft font-semibold text-accent"
                  : "border-line bg-surface font-medium text-ink-2 hover:bg-canvas"
              }`}
            >
              {preset.name}
            </button>
            {preset.id !== null && (
              <button
                onClick={() => deletePreset(preset.id as number)}
                className="absolute -right-1 -top-1 hidden h-4 w-4 place-items-center rounded-full border border-line bg-surface text-[9px] text-ink-3 hover:text-ink group-hover/preset:grid"
                aria-label={`Delete ${preset.name} layout`}
              >
                ✕
              </button>
            )}
          </span>
        ))}
        <button
          onClick={savePreset}
          className="pill border-line bg-surface font-medium text-ink-2 hover:bg-canvas"
          title="Save the current arrangement as a layout"
          aria-label="Save current layout"
        >
          ＋
        </button>

        <div className="flex-1" />

        {error && <span className="text-[11.5px] text-red-600">{error}</span>}
        {hidden.length === 0 ? (
          <span className="text-[11.5px] text-ink-3">All panels shown</span>
        ) : (
          <>
            <span className="text-[11.5px] text-ink-3">Hidden</span>
            {hidden.map((id) => (
              <button
                key={id}
                onClick={() => restorePanel(id)}
                className="pill border-dashed border-line bg-surface font-medium text-ink-2 hover:border-accent hover:text-accent"
              >
                ＋ {panels[id].title}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 bg-workspace p-2.5">
        {shown.length === 0 ? (
          <div className="grid h-full place-items-center rounded-panel border border-dashed border-line-strong">
            <p className="text-[13px] text-ink-3">
              All panels are closed — restore one from the layout bar above.
            </p>
          </div>
        ) : maximized ? (
          renderPanel(maximized)
        ) : (
          <Group
            orientation="horizontal"
            className="h-full"
            defaultLayout={pickSizes(layout.columns, columnIds)}
            onLayoutChanged={(next, meta) => {
              if (meta.isUserInteraction) saveSizes("columns", meta.requestedLayout ?? next);
            }}
          >
            {layout.left && (
              <Panel id="col-left" defaultSize="44" minSize="22" className="h-full min-h-0">
                {renderPanel(layout.left)}
              </Panel>
            )}
            {layout.left && layout.right.length > 0 && <VSeparator />}
            {layout.right.length > 0 && (
              <Panel id="col-right" defaultSize="56" minSize="24" className="h-full min-h-0">
                <Group
                  orientation="vertical"
                  className="h-full"
                  defaultLayout={pickSizes(layout.rows, rowIds)}
                  onLayoutChanged={(next, meta) => {
                    if (meta.isUserInteraction) saveSizes("rows", meta.requestedLayout ?? next);
                  }}
                >
                  {/* separators must be interleaved between panels, not appended */}
                  {layout.right.map((id, i) => (
                    <Fragment key={id}>
                      {i > 0 && <HSeparator />}
                      <Panel
                        id={`stack-${id}`}
                        defaultSize={`${100 / layout.right.length}`}
                        minSize="12"
                        className="h-full min-h-0"
                      >
                        {renderPanel(id)}
                      </Panel>
                    </Fragment>
                  ))}
                </Group>
              </Panel>
            )}
          </Group>
        )}
      </div>
    </div>
  );
}
