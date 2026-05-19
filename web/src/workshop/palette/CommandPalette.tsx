import "./CommandPalette.css";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ToolTab } from "@/workshop/shell/workshop-helpers";
import { TOOL_TABS } from "@/workshop/analysis/ToolTabBar";

const RECENT_KEY = "cmdk-recent";
const RECENT_MAX = 3;

function loadRecent(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(id: string): void {
  try {
    const prev = loadRecent().filter((x) => x !== id);
    sessionStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, RECENT_MAX)));
  } catch {}
}

export interface CommandPaletteAction {
  id: string;
  title: string;
  keywords?: string;
  hint?: string;
  icon?: ReactNode;
  run: () => void;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function matches(q: string, a: CommandPaletteAction): boolean {
  if (!q) return true;
  const hay = `${a.title} ${a.keywords ?? ""}`.toLowerCase();
  return hay.includes(q);
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: CommandPaletteAction[];
}

export function CommandPalette(props: CommandPaletteProps) {
  const { open, onClose, actions } = props;
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Build the flat list shown in the palette.
  // When no query: recent items pinned at top (deduplicated), then the rest.
  // When querying: flat filtered list (no recent grouping).
  const { filtered, recentCount } = useMemo(() => {
    const q = norm(query);
    if (q) {
      return { filtered: actions.filter((a) => matches(q, a)), recentCount: 0 };
    }
    const recentActions = recentIds
      .map((id) => actions.find((a) => a.id === id))
      .filter((a): a is CommandPaletteAction => !!a);
    const recentSet = new Set(recentIds);
    const rest = actions.filter((a) => !recentSet.has(a.id));
    return {
      filtered: [...recentActions, ...rest],
      recentCount: recentActions.length,
    };
  }, [actions, query, recentIds]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIdx(0);
    setRecentIds(loadRecent());
    queueMicrotask(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === "Enter") {
        const a = filtered[activeIdx];
        if (!a) return;
        e.preventDefault();
        saveRecent(a.id);
        a.run();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [activeIdx, filtered, onClose, open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-idx="${activeIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  if (!open) return null;

  return (
    <div
      className="cmdk-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="cmdk"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="cmdk-head">
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Type a command…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Command search"
          />
          <button type="button" className="small-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="cmdk-help muted small">
          <span className="cmdk-help-kbd">
            <kbd className="kbd-hint">↑</kbd>/<kbd className="kbd-hint">↓</kbd>{" "}
            to move
          </span>
          <span className="cmdk-help-sep" aria-hidden>
            {" "}
            ·{" "}
          </span>
          <span className="cmdk-help-kbd">
            <kbd className="kbd-hint">Enter</kbd> to run
          </span>
          <span className="cmdk-help-sep" aria-hidden>
            {" "}
            ·{" "}
          </span>
          <span className="cmdk-help-kbd">
            <kbd className="kbd-hint">Esc</kbd> to close
          </span>
        </div>
        <div className="cmdk-list" ref={listRef} role="listbox" aria-label="Commands">
          {filtered.length === 0 ? (
            <div className="cmdk-empty" role="status" aria-live="polite">
              No matches.
            </div>
          ) : (
            filtered.map((a, idx) => (
              <Fragment key={a.id}>
                {/* Group label separators */}
                {idx === 0 && recentCount > 0 && !norm(query) && (
                  <p className="cmdk-group-label" aria-hidden>Recent</p>
                )}
                {idx === recentCount && recentCount > 0 && !norm(query) && (
                  <p className="cmdk-group-label" aria-hidden>All commands</p>
                )}
                <button
                  type="button"
                  className={`cmdk-item ${idx === activeIdx ? "is-active" : ""}`}
                  data-cmd-idx={idx}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => {
                    saveRecent(a.id);
                    a.run();
                    onClose();
                  }}
                  role="option"
                  aria-selected={idx === activeIdx}
                >
                  <span className="cmdk-item-title">{a.title}</span>
                  {a.hint ? <span className="cmdk-item-hint">{a.hint}</span> : null}
                </button>
              </Fragment>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export function toolTabActions(input: {
  openToolTab: (tab: ToolTab) => void;
}): CommandPaletteAction[] {
  return TOOL_TABS.map((t) => ({
    id: `tool:${t.id}`,
    title: `Open Tools: ${t.label}`,
    keywords: `tools tab ${t.id} ${t.label}`,
    run: () => input.openToolTab(t.id),
  }));
}

