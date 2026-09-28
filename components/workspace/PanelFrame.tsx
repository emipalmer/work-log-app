"use client";

import { useEffect, useRef, useState } from "react";

export type PanelAction = { label: string; onClick: () => void; disabled?: boolean };

function Grip() {
  return (
    <svg width="9" height="13" viewBox="0 0 9 13" className="shrink-0 text-ink-3" aria-hidden>
      {[1, 5.5, 10].map((y) =>
        [0.5, 4.5].map((x) => <circle key={`${x}-${y}`} cx={x + 1.2} cy={y + 1.2} r="1.2" fill="currentColor" />),
      )}
    </svg>
  );
}

export default function PanelFrame({
  id,
  title,
  meta,
  maximized,
  actions = [],
  onClose,
  onToggleMaximize,
  onDropPanel,
  children,
}: {
  id: string;
  title: string;
  meta?: string;
  maximized: boolean;
  actions?: PanelAction[];
  onClose: () => void;
  onToggleMaximize: () => void;
  onDropPanel: (dragged: string, target: string) => void;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <section
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-panel border bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-colors ${
        dragOver ? "border-accent ring-2 ring-accent/20" : "border-line"
      }`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-worklog-panel")) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const dragged = e.dataTransfer.getData("application/x-worklog-panel");
        if (dragged && dragged !== id) onDropPanel(dragged, id);
      }}
    >
      <header
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-worklog-panel", id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className="flex shrink-0 cursor-grab items-center gap-2 border-b border-line bg-surface px-3 py-2.5 active:cursor-grabbing"
        title="Drag to swap this panel with another"
      >
        <Grip />
        <h2 className="text-[12.5px] font-semibold text-ink">{title}</h2>
        {meta && <span className="truncate text-[11px] text-ink-3">{meta}</span>}
        <div className="flex-1" />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="grid h-6 w-6 place-items-center rounded-md text-ink-3 hover:bg-canvas hover:text-ink-2"
            aria-label={`${title} panel options`}
            aria-expanded={menuOpen}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              {[2, 7, 12].map((x) => <circle key={x} cx={x} cy="7" r="1.2" fill="currentColor" />)}
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg">
              {actions.map((a) => (
                <button
                  key={a.label}
                  disabled={a.disabled}
                  onClick={() => {
                    a.onClick();
                    setMenuOpen(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-[12.5px] text-ink-2 hover:bg-canvas disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onToggleMaximize}
          className="grid h-6 w-6 place-items-center rounded-md text-ink-3 hover:bg-canvas hover:text-ink-2"
          aria-label={maximized ? `Restore ${title} panel` : `Expand ${title} panel`}
          title={maximized ? "Restore" : "Expand"}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <rect x="2" y="2" width="10" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>

        <button
          onClick={onClose}
          className="grid h-6 w-6 place-items-center rounded-md text-ink-3 hover:bg-canvas hover:text-ink"
          aria-label={`Close ${title} panel`}
          title="Close panel"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}
