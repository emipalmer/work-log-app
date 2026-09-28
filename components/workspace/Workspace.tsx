"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import PanelFrame from "./PanelFrame";

export type PanelId = "worklog" | "resume" | "editor" | "ai";
export type PanelDef = { title: string; meta?: string; content: React.ReactNode };
export type PanelMap = Record<PanelId, PanelDef>;

/** One panel in the left column; the rest stack in the right column. */
export type Layout = { left: PanelId | null; right: PanelId[] };

type Preset = { id: string; label: string; layout: Layout; custom?: boolean };

const BUILT_IN: Preset[] = [
  { id: "log-resume", label: "Log + Resume", layout: { left: "worklog", right: ["resume", "editor"] } },
  { id: "focus-resume", label: "Focus: Resume", layout: { left: "worklog", right: ["resume"] } },
];

const ALL_PANELS: PanelId[] = ["worklog", "resume", "editor", "ai"];
const LAYOUT_KEY = "worklog:layout";
const PRESETS_KEY = "worklog:presets";

function visiblePanels(l: Layout): PanelId[] {
  return [...(l.left ? [l.left] : []), ...l.right];
}
function sameLayout(a: Layout, b: Layout): boolean {
  return a.left === b.left && a.right.length === b.right.length && a.right.every((p, i) => p === b.right[i]);
}

/** Sizes are strings: v4 reads bare numbers as pixels, strings as percentages. */
function VSeparator() {
  return (
    <Separator className="w-2.5 shrink-0 cursor-col-resize rounded-full bg-transparent transition-colors hover:bg-accent/25 data-[dragging]:bg-accent/40" />
  );
}
function HSeparator() {
  return (
    <Separator className="h-2.5 shrink-0 cursor-row-resize rounded-full bg-transparent transition-colors hover:bg-accent/25 data-[dragging]:bg-accent/40" />
  );
}

export default function Workspace({ panels }: { panels: PanelMap }) {
  const [layout, setLayout] = useState<Layout>(BUILT_IN[0].layout);
  const [custom, setCustom] = useState<Preset[]>([]);
  const [maximized, setMaximized] = useState<PanelId | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore from localStorage after mount so SSR markup matches the default.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Layout;
        const valid = (p: unknown): p is PanelId => ALL_PANELS.includes(p as PanelId);
        if (parsed && Array.isArray(parsed.right)) {
          setLayout({
            left: valid(parsed.left) ? parsed.left : null,
            right: parsed.right.filter(valid),
          });
        }
      }
      const rawPresets = localStorage.getItem(PRESETS_KEY);
      if (rawPresets) setCustom(JSON.parse(rawPresets) as Preset[]);
    } catch {
      /* corrupt or unavailable storage — fall back to defaults */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch {
      /* storage unavailable — layout simply won't persist */
    }
  }, [layout, hydrated]);

  const persistPresets = useCallback((next: Preset[]) => {
    setCustom(next);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const shown = visiblePanels(layout);
  const hidden = ALL_PANELS.filter((p) => !shown.includes(p));
  const presets = [...BUILT_IN, ...custom];

  function closePanel(id: PanelId) {
    setMaximized((m) => (m === id ? null : m));
    setLayout((l) => {
      if (l.left === id) {
        // Promote the first right-column panel into the vacated left column.
        const [first, ...rest] = l.right;
        return { left: first ?? null, right: rest };
      }
      return { ...l, right: l.right.filter((p) => p !== id) };
    });
  }

  function restorePanel(id: PanelId) {
    setLayout((l) => (l.left === null ? { ...l, left: id } : { ...l, right: [...l.right, id] }));
  }

  function swapPanels(a: string, b: string) {
    const dragged = a as PanelId;
    const target = b as PanelId;
    setLayout((l) => {
      const order = visiblePanels(l);
      const i = order.indexOf(dragged);
      const j = order.indexOf(target);
      if (i < 0 || j < 0) return l;
      const next = [...order];
      [next[i], next[j]] = [next[j], next[i]];
      return l.left === null ? { left: null, right: next } : { left: next[0], right: next.slice(1) };
    });
  }

  function moveToColumn(id: PanelId, column: "left" | "right") {
    setLayout((l) => {
      if (column === "left") {
        if (l.left === id) return l;
        const right = l.right.filter((p) => p !== id);
        // The displaced left panel moves to the top of the right column.
        return { left: id, right: l.left ? [l.left, ...right] : right };
      }
      if (l.left !== id) return l;
      const [first, ...rest] = l.right;
      return { left: first ?? null, right: first ? [...rest, id] : [id] };
    });
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
          { label: "Move to left column", onClick: () => moveToColumn(id, "left"), disabled: layout.left === id },
          { label: "Move to right column", onClick: () => moveToColumn(id, "right"), disabled: layout.left !== id },
          { label: maximized === id ? "Restore size" : "Expand to full workspace", onClick: () => setMaximized((m) => (m === id ? null : id)) },
          { label: "Close panel", onClick: () => closePanel(id) },
        ]}
      >
        {def.content}
      </PanelFrame>
    );
  }

  const activePreset = presets.find((p) => sameLayout(p.layout, layout));

  return (
    <div className="flex h-screen min-h-0 flex-1 flex-col">
      {/* Saved-layout bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2">
        <span className="text-[11.5px] font-medium text-ink-3">Layout</span>
        {presets.map((p) => {
          const active = activePreset?.id === p.id;
          return (
            <span key={p.id} className="group/preset relative">
              <button
                onClick={() => {
                  setMaximized(null);
                  setLayout(p.layout);
                }}
                className={`pill ${
                  active
                    ? "border-accent bg-accent-soft font-semibold text-accent"
                    : "border-line bg-surface font-medium text-ink-2 hover:bg-canvas"
                }`}
              >
                {p.label}
              </button>
              {p.custom && (
                <button
                  onClick={() => persistPresets(custom.filter((c) => c.id !== p.id))}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 place-items-center rounded-full border border-line bg-surface text-[9px] text-ink-3 group-hover/preset:grid hover:text-ink"
                  aria-label={`Delete ${p.label} layout`}
                >
                  ✕
                </button>
              )}
            </span>
          );
        })}
        <button
          onClick={() =>
            persistPresets([
              ...custom,
              {
                id: `custom-${Date.now()}`,
                label: `My layout ${custom.length + 1}`,
                layout,
                custom: true,
              },
            ])
          }
          className="pill border-line bg-surface font-medium text-ink-2 hover:bg-canvas"
          title="Save the current arrangement as a layout"
        >
          ＋
        </button>

        <div className="flex-1" />

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

      {/* Panel canvas */}
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
          <Group orientation="horizontal" className="h-full">
            {layout.left && (
              <Panel key={`left-${layout.left}`} defaultSize="44" minSize="22" className="h-full min-h-0">
                {renderPanel(layout.left)}
              </Panel>
            )}
            {layout.left && layout.right.length > 0 && <VSeparator />}
            {layout.right.length > 0 && (
              <Panel key="right-column" defaultSize="56" minSize="24" className="h-full min-h-0">
                <Group orientation="vertical" className="h-full">
                  {/* separators must be interleaved between panels, not appended */}
                  {layout.right.map((id, i) => (
                    <Fragment key={id}>
                      {i > 0 && <HSeparator />}
                      <Panel
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
