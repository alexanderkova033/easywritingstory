import { EditorView } from "@codemirror/view";

export interface FocusOpts {
  /**
   * When true (default), scroll the target into the vertical center of the
   * editor viewport instead of CodeMirror's "minimum movement" default.
   * Centring matches what users expect when they jump from a side panel —
   * the target lands where their eye is already focused.
   */
  center?: boolean;
}

function centerEffect(pos: number) {
  return EditorView.scrollIntoView(pos, { y: "center" });
}

/** Place the cursor at the start of a logical line in a CodeMirror 6 view
 * (1-based line numbers). No selection — jumps land as a caret so users can
 * start typing immediately without overwriting the line. */
export function focusLineInEditor(
  view: EditorView,
  line1Based: number,
  opts: FocusOpts = {},
): void {
  const doc = view.state.doc;
  const n = Math.max(1, Math.min(line1Based, doc.lines));
  const line = doc.line(n);
  const center = opts.center !== false;
  view.dispatch({
    selection: { anchor: line.from, head: line.from },
    effects: center ? centerEffect(line.from) : undefined,
    scrollIntoView: !center,
  });
  view.focus();
}

/** Select a character range in the document (0-based offsets, end-exclusive). */
export function focusCharacterRangeInEditor(
  view: EditorView,
  from: number,
  to: number,
  opts: FocusOpts = {},
): void {
  const doc = view.state.doc;
  const len = doc.length;
  const a = Math.max(0, Math.min(from, len));
  const b = Math.max(0, Math.min(to, len));
  const center = opts.center !== false;
  view.dispatch({
    selection: { anchor: a, head: b },
    effects: center ? centerEffect(a) : undefined,
    scrollIntoView: !center,
  });
  view.focus();
}

/** Select only the last word on a line (1-based). Falls back to the full line if the line has no word characters. */
export function focusLastWordInLine(
  view: EditorView,
  line1Based: number,
  opts: FocusOpts = {},
): void {
  const doc = view.state.doc;
  const n = Math.max(1, Math.min(line1Based, doc.lines));
  const line = doc.line(n);
  const text = line.text;
  const re = /[a-zA-Z']+/g;
  let last: { start: number; end: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    last = { start: m.index, end: m.index + m[0].length };
  }
  const center = opts.center !== false;
  if (!last) {
    view.dispatch({
      selection: { anchor: line.from, head: line.to },
      effects: center ? centerEffect(line.from) : undefined,
      scrollIntoView: !center,
    });
  } else {
    view.dispatch({
      selection: {
        anchor: line.from + last.start,
        head: line.from + last.end,
      },
      effects: center ? centerEffect(line.from + last.start) : undefined,
      scrollIntoView: !center,
    });
  }
  view.focus();
}
