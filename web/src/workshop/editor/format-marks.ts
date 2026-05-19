/**
 * CodeMirror extension that renders **bold** and __underline__ markers visually,
 * and helpers to toggle those markers around the current selection.
 */
import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

// ---- Decoration classes ---- //
const boldMark = Decoration.mark({ class: "cm-fmt-bold" });
const boldBracket = Decoration.mark({ class: "cm-fmt-bracket" });
const underlineMark = Decoration.mark({ class: "cm-fmt-underline" });
const underlineBracket = Decoration.mark({ class: "cm-fmt-bracket" });

const BOLD_RE = /\*\*(.+?)\*\*/g;
const UNDERLINE_RE = /__(.+?)__/g;

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const entries: Array<{ from: number; to: number; deco: Decoration }> = [];

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.sliceDoc(from, to);

    // Bold
    for (const m of text.matchAll(BOLD_RE)) {
      const start = from + m.index!;
      const end = start + m[0].length;
      const inner = start + 2;
      const innerEnd = end - 2;
      entries.push({ from: start, to: inner, deco: boldBracket });
      entries.push({ from: inner, to: innerEnd, deco: boldMark });
      entries.push({ from: innerEnd, to: end, deco: boldBracket });
    }

    // Underline
    for (const m of text.matchAll(UNDERLINE_RE)) {
      const start = from + m.index!;
      const end = start + m[0].length;
      // Make sure this isn't inside a bold span (starts with ** already handled)
      const inner = start + 2;
      const innerEnd = end - 2;
      entries.push({ from: start, to: inner, deco: underlineBracket });
      entries.push({ from: inner, to: innerEnd, deco: underlineMark });
      entries.push({ from: innerEnd, to: end, deco: underlineBracket });
    }
  }

  // Sort by `from` so builder is fed in order
  entries.sort((a, b) => a.from - b.from || a.to - b.to);
  for (const { from, to, deco } of entries) {
    builder.add(from, to, deco);
  }
  return builder.finish();
}

export const formatMarksExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

export const formatMarksTheme = EditorView.baseTheme({
  ".cm-fmt-bold": { fontWeight: "bold" },
  ".cm-fmt-underline": { textDecoration: "underline" },
  ".cm-fmt-bracket": {
    opacity: "0.32",
    fontWeight: "normal",
    textDecoration: "none",
  },
});

// ---- Toggle helpers ---- //

/** Wraps or unwraps the selection with `open` / `close` markers. */
function toggleWrap(view: EditorView, open: string, close: string) {
  const { state } = view;
  const range = state.selection.main;
  const selected = state.sliceDoc(range.from, range.to);

  if (selected.startsWith(open) && selected.endsWith(close) && selected.length > open.length + close.length) {
    // Unwrap
    const inner = selected.slice(open.length, selected.length - close.length);
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: inner },
      selection: { anchor: range.from, head: range.from + inner.length },
    });
  } else if (selected.length > 0) {
    // Wrap
    const replacement = open + selected + close;
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: replacement },
      selection: {
        anchor: range.from + open.length,
        head: range.from + open.length + selected.length,
      },
    });
  } else {
    // No selection — insert placeholder and put cursor inside
    const placeholder = open + close;
    view.dispatch({
      changes: { from: range.from, insert: placeholder },
      selection: { anchor: range.from + open.length },
    });
  }
  view.focus();
}

export function toggleBold(view: EditorView) {
  toggleWrap(view, "**", "**");
}

export function toggleUnderline(view: EditorView) {
  toggleWrap(view, "__", "__");
}

/** Strip format markers from a string (for plain-text export). */
export function stripFormatMarkers(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1");
}
