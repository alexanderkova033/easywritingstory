import { EditorView, ViewPlugin, WidgetType, keymap, placeholder, gutter, GutterMarker, type ViewUpdate } from "@codemirror/view";
import { StateEffect, StateField, EditorState, Transaction, RangeSet, RangeSetBuilder, type Range } from "@codemirror/state";
import { Decoration, type DecorationSet } from "@codemirror/view";
import { lineFocusExtension, setLineFocusMode, type LineFocusMode } from "@/workshop/editor/line-focus-extension";
import { typewriterExtension, setTypewriterEnabled } from "@/workshop/editor/typewriter-extension";
import { diffOverlayField, setDiffSnapshot } from "@/workshop/editor/diff-overlay";
import "@/workshop/editor/diff-overlay.css";
import { highlightSelectionMatches, search } from "@codemirror/search";
import { countSyllablesInLine } from "@/workshop/text/syllables";
import type { MutableRefObject } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import CodeMirror, { ExternalChange } from "@uiw/react-codemirror";
import { basicSetup } from "@uiw/codemirror-extensions-basic-setup";
import {
  bindSpellContext,
  storyEditorTheme,
  storySpellExtensions,
  spellSyncFacet,
} from "@/workshop/editor/spell-highlight";
import {
  formatMarksExtension,
  formatMarksTheme,
} from "@/workshop/editor/format-marks";
import type { SpellMode } from "@/workshop/library/local-draft-storage";

// Touch devices (iOS Safari, Android Chrome, iPad) struggle with the heaviest
// live-update decoration plugins. Detect once at module load; matchMedia result
// is stable for the session and avoids recomputing extensions per render.
const IS_TOUCH_DEVICE: boolean =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

// ---- Syllable count + rhythm bar widgets ----
class SyllableWidget extends WidgetType {
  constructor(readonly count: number, readonly pct: number) { super(); }
  eq(other: SyllableWidget) { return other.count === this.count && other.pct === this.pct; }
  toDOM() {
    const wrap = document.createElement("span");
    wrap.className = "cm-syllable-wrap";
    wrap.setAttribute("aria-hidden", "true");

    const bar = document.createElement("span");
    bar.className = "cm-rhythm-bar";
    bar.style.setProperty("--bar-pct", `${this.pct}%`);

    const num = document.createElement("span");
    num.className = "cm-syllable-count";
    num.textContent = `${this.count}`;

    wrap.append(bar, num);
    return wrap;
  }
  ignoreEvent() { return true; }
}

function activeLineNumber(view: EditorView): number {
  if (!view.hasFocus) return -1;
  return view.state.doc.lineAt(view.state.selection.main.head).number;
}

const syllableCountPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    private lastActiveLine = -2;
    // Per-line text cache — typing on one line reuses every other line's
    // memoised count instead of recomputing all N lines per keystroke. Combined
    // with the module-level lineCache in syllables.ts, a steady-state rebuild
    // for a 50-line story is N hash lookups, not N word-tokenisations.
    private lineTexts: string[] = [];
    private lineCounts: number[] = [];
    constructor(view: EditorView) {
      this.lastActiveLine = activeLineNumber(view);
      this.decorations = this.build(view);
    }
    update(update: ViewUpdate) {
      // Touch: skip selectionSet/focusChanged — they fire on every tap and the
      // only side effect is hiding the active-line widget. Worth the trade-off
      // to keep typing fluid on iPad. Doc changes still rebuild.
      if (IS_TOUCH_DEVICE) {
        if (update.docChanged) this.decorations = this.build(update.view);
        return;
      }
      if (update.docChanged) {
        this.decorations = this.build(update.view);
        return;
      }
      if (update.selectionSet || update.focusChanged) {
        // Only rebuild when the active line actually changed; cursor moves on
        // the same line don't affect which widget is filtered out.
        const next = activeLineNumber(update.view);
        if (next === this.lastActiveLine) return;
        this.decorations = this.build(update.view);
      }
    }
    build(view: EditorView): DecorationSet {
      const sel = view.state.selection.main;
      const activeLineNo = view.hasFocus
        ? view.state.doc.lineAt(sel.head).number
        : -1;
      this.lastActiveLine = activeLineNo;
      const doc = view.state.doc;
      const lineCount = doc.lines;
      // Resize per-line caches and recompute only lines whose text changed.
      if (this.lineTexts.length !== lineCount) {
        this.lineTexts.length = lineCount;
        this.lineCounts.length = lineCount;
      }
      const counts: { lineNo: number; to: number; count: number }[] = [];
      let maxCount = 1;
      for (let i = 1; i <= lineCount; i++) {
        const line = doc.line(i);
        const text = line.text;
        const idx = i - 1;
        let count: number;
        if (this.lineTexts[idx] === text) {
          count = this.lineCounts[idx]!;
        } else {
          count = text.trim() ? countSyllablesInLine(text) : 0;
          this.lineTexts[idx] = text;
          this.lineCounts[idx] = count;
        }
        if (count <= 0) continue;
        if (count > maxCount) maxCount = count;
        counts.push({ lineNo: i, to: line.to, count });
      }
      const decos = counts
        .filter(({ lineNo }) => lineNo !== activeLineNo)
        .map(({ to, count }) =>
          Decoration.widget({
            widget: new SyllableWidget(count, Math.round((count / maxCount) * 100)),
            side: 1,
          }).range(to),
        );
      return Decoration.set(decos);
    }
  },
  { decorations: (v) => v.decorations },
);

/** Facet must change on the same render as spellMode (not only after a spellBump effect). */
function spellFacetValue(spellBump: number, spellMode: SpellMode): number {
  return spellBump * 2 + (spellMode === "strict" ? 1 : 0);
}

const setLineFlash = StateEffect.define<DecorationSet>();
const clearLineFlash = StateEffect.define<void>();

const lineFlashField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setLineFlash)) next = e.value;
      if (e.is(clearLineFlash)) next = Decoration.none;
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const setIssueHighlight = StateEffect.define<DecorationSet>();
const clearIssueHighlight = StateEffect.define<void>();

const issueHighlightField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setIssueHighlight)) next = e.value;
      if (e.is(clearIssueHighlight)) next = Decoration.none;
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Hover-peek highlight — line tint + matched-word underline shown while the
// user hovers a chip in the tools panel. Cleared when the cursor leaves.
const setHoverHighlight = StateEffect.define<DecorationSet>();
const clearHoverHighlight = StateEffect.define<void>();

const hoverHighlightField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setHoverHighlight)) next = e.value;
      if (e.is(clearHoverHighlight)) next = Decoration.none;
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Repeat-tool persistent highlights — shown whenever the Repeats tool is open.
// Content depends on the active subtab (words / phrases / patterns). Hue comes
// from the group's colour index; severity controls intensity. Cleared when the
// tool closes or the array empties.
const setRepeatHighlights = StateEffect.define<DecorationSet>();
const clearRepeatHighlights = StateEffect.define<void>();

const repeatHighlightField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setRepeatHighlights)) next = e.value;
      if (e.is(clearRepeatHighlights)) next = Decoration.none;
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Module-level group→positions map kept in sync with the active repeat marks.
// Click-to-cycle uses this so it can jump even to a sibling whose DOM hasn't
// been rendered yet (CodeMirror viewport-windows decorations for long docs).
const repeatGroupPositions: { map: Map<string, Array<{ from: number; to: number }>> } = {
  map: new Map(),
};

function cssAttrEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Bring the matching card in the Repeats tool panel into view and give it a
// brief flash. Looks up by `data-repeat-card-id` (set in RepetitionCards), so
// no React plumbing is needed — the panel and the editor share the DOM.
function revealRepeatCard(group: string) {
  if (typeof document === "undefined") return;
  const sel = `[data-repeat-card-id="${cssAttrEscape(group)}"]`;
  let card: HTMLElement | null;
  try { card = document.querySelector<HTMLElement>(sel); }
  catch { return; }
  if (!card) return;
  try {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
    });
  } catch { /* ignore */ }
  card.classList.add("rep-card-jumped");
  setTimeout(() => card!.classList.remove("rep-card-jumped"), 900);
}

function setActiveRepeatGroup(view: EditorView, group: string | null) {
  const root = view.contentDOM;
  const prev = root.querySelectorAll<HTMLElement>(".cm-repeat-mark-sibling-active");
  prev.forEach((el) => el.classList.remove("cm-repeat-mark-sibling-active"));
  if (!group) return;
  const sel = `.cm-repeat-mark[data-repeat-group="${cssAttrEscape(group)}"]`;
  const all = root.querySelectorAll<HTMLElement>(sel);
  all.forEach((el) => el.classList.add("cm-repeat-mark-sibling-active"));
}

function cycleRepeatSibling(
  view: EditorView,
  group: string,
  fromPos: number,
  dir: 1 | -1,
) {
  const arr = repeatGroupPositions.map.get(group);
  if (!arr || arr.length < 2) return;
  // Find current index by exact match first, then nearest position.
  let curIdx = arr.findIndex((e) => e.from === fromPos);
  if (curIdx === -1) {
    const after = arr.findIndex((e) => e.from > fromPos);
    curIdx = after === -1 ? arr.length - 1 : Math.max(0, after - 1);
  }
  const nextIdx = (curIdx + dir + arr.length) % arr.length;
  const next = arr[nextIdx]!;
  try {
    view.dispatch({ effects: EditorView.scrollIntoView(next.from, { y: "center" }) });
  } catch { /* ignore out-of-range */ }
  revealRepeatCard(group);
  // After scroll, the destination span exists; brief flash so the eye lands.
  requestAnimationFrame(() => {
    const sel = `.cm-repeat-mark[data-repeat-group="${cssAttrEscape(group)}"]`;
    const cands = Array.from(view.contentDOM.querySelectorAll<HTMLElement>(sel));
    for (const el of cands) {
      let pos: number;
      try { pos = view.posAtDOM(el); } catch { continue; }
      if (pos === next.from) {
        el.classList.add("cm-repeat-mark-jumped");
        setTimeout(() => el.classList.remove("cm-repeat-mark-jumped"), 700);
        break;
      }
    }
  });
}

const repeatInteractionExtension = EditorView.domEventHandlers({
  mousedown(event, _view) {
    // Plain click keeps CodeMirror's default caret placement so the user can
    // edit a flagged word normally. The cycle gesture is Alt+click, which we
    // suppress here so the caret doesn't move before the jump.
    if (!event.altKey) return false;
    const target = event.target as HTMLElement | null;
    if (!target) return false;
    const mark = target.closest(".cm-repeat-mark") as HTMLElement | null;
    if (!mark) return false;
    event.preventDefault();
    return true;
  },
  click(event, view) {
    if (!event.altKey) return false;
    const target = event.target as HTMLElement | null;
    if (!target) return false;
    const mark = target.closest(".cm-repeat-mark") as HTMLElement | null;
    if (!mark) return false;
    const group = mark.getAttribute("data-repeat-group");
    if (!group) return false;
    let fromPos: number;
    try { fromPos = view.posAtDOM(mark); } catch { return false; }
    cycleRepeatSibling(view, group, fromPos, event.shiftKey ? -1 : 1);
    return true;
  },
  mouseover(event, view) {
    const target = event.target as HTMLElement | null;
    if (!target) return false;
    const mark = target.closest(".cm-repeat-mark") as HTMLElement | null;
    if (!mark) return false;
    setActiveRepeatGroup(view, mark.getAttribute("data-repeat-group"));
    return false;
  },
  mouseout(event, view) {
    const related = (event as MouseEvent).relatedTarget as HTMLElement | null;
    if (related && related.closest(".cm-repeat-mark")) return false;
    setActiveRepeatGroup(view, null);
    return false;
  },
});

// Strongest-line decoration — subtle gold accent for the best line in the story.
const setStrongestLine = StateEffect.define<DecorationSet>();
const clearStrongestLine = StateEffect.define<void>();

const strongestLineField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setStrongestLine)) next = e.value;
      if (e.is(clearStrongestLine)) next = Decoration.none;
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Persistent (always-on) highlights for all AI issues after analysis
const setPersistentIssueDecos = StateEffect.define<DecorationSet>();
const clearPersistentIssueDecos = StateEffect.define<void>();

const persistentIssueDecosField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setPersistentIssueDecos)) next = e.value;
      if (e.is(clearPersistentIssueDecos)) next = Decoration.none;
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ---- Issue gutter markers ---- //
class SeverityDot extends GutterMarker {
  constructor(readonly sev: string) { super(); }
  eq(other: SeverityDot) { return other.sev === this.sev; }
  toDOM() {
    const el = document.createElement("span");
    el.className = `cm-issue-dot cm-issue-dot-${this.sev}`;
    el.setAttribute("aria-hidden", "true");
    return el;
  }
}

// Gutter dots are anchored at line.from positions and mapped through doc
// changes so they follow the line as the user types — line-number-keyed
// storage made the dots drift away from the line they were marking.
const setIssueGutter = StateEffect.define<Array<{ pos: number; sev: string }>>();
const clearIssueGutter = StateEffect.define<void>();

const issueGutterField = StateField.define<RangeSet<GutterMarker>>({
  create() { return RangeSet.empty; },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(clearIssueGutter)) next = RangeSet.empty;
      if (e.is(setIssueGutter)) {
        const builder = new RangeSetBuilder<GutterMarker>();
        const sorted = [...e.value].sort((a, b) => a.pos - b.pos);
        for (const { pos, sev } of sorted) {
          builder.add(pos, pos, new SeverityDot(sev));
        }
        next = builder.finish();
      }
    }
    return next;
  },
});

// Module-level handler ref so the gutter extension (defined once) can call
// the latest React callback. Only one editor instance runs at a time.
const gutterDotClickHandler: { fn: ((line: number) => void) | null } = { fn: null };
const applyRewriteHandler: { fn: ((line: number) => boolean) | null } = { fn: null };

const applyRewriteKeymap = keymap.of([
  {
    key: "Alt-Enter",
    run(view) {
      const fn = applyRewriteHandler.fn;
      if (!fn) return false;
      const lineNo = view.state.doc.lineAt(view.state.selection.main.from).number;
      return fn(lineNo);
    },
  },
]);

const issueGutterExtension = gutter({
  class: "cm-issue-gutter",
  markers: (view) => view.state.field(issueGutterField),
  initialSpacer: () => new SeverityDot("low"),
  domEventHandlers: {
    click(view, line) {
      const set = view.state.field(issueGutterField);
      let hit = false;
      set.between(line.from, line.from, () => { hit = true; });
      if (!hit) return false;
      const lineNo = view.state.doc.lineAt(line.from).number;
      gutterDotClickHandler.fn?.(lineNo);
      return true;
    },
  },
});

// ---- Craft-signal gutter markers (POV/tense slips, filter words, adverbs) ---
class CraftDot extends GutterMarker {
  constructor(readonly kind: string, readonly weight: number) { super(); }
  eq(other: CraftDot) { return other.kind === this.kind && other.weight === this.weight; }
  toDOM() {
    const el = document.createElement("span");
    const tier = this.weight >= 3 ? "high" : this.weight >= 2 ? "med" : "low";
    el.className = `cm-craft-dot cm-craft-dot-${tier}`;
    el.dataset.kind = this.kind;
    el.setAttribute("aria-hidden", "true");
    el.title = craftDotLabel(this.kind, this.weight);
    return el;
  }
}

function craftDotLabel(kind: string, weight: number) {
  const what =
    kind === "pov"
      ? "POV slip"
      : kind === "tense"
        ? "Tense slip"
        : kind === "showtell"
          ? "Filter word"
          : kind === "adverb"
            ? "Adverb / filler"
            : kind === "dialogue"
              ? "Untagged speech"
              : "Craft signal";
  return weight > 1 ? `${what} (×${weight})` : what;
}

const setCraftGutter = StateEffect.define<Array<{ pos: number; kind: string; weight: number }>>();
const clearCraftGutter = StateEffect.define<void>();

const craftGutterField = StateField.define<RangeSet<GutterMarker>>({
  create() { return RangeSet.empty; },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(clearCraftGutter)) next = RangeSet.empty;
      if (e.is(setCraftGutter)) {
        const builder = new RangeSetBuilder<GutterMarker>();
        const sorted = [...e.value].sort((a, b) => a.pos - b.pos);
        for (const { pos, kind, weight } of sorted) {
          builder.add(pos, pos, new CraftDot(kind, weight));
        }
        next = builder.finish();
      }
    }
    return next;
  },
});

const craftGutterExtension = gutter({
  class: "cm-craft-gutter",
  markers: (view) => view.state.field(craftGutterField),
  initialSpacer: () => new CraftDot("pov", 1),
});

// ---- Rhyme scheme letter gutter (A/B/A/B per line) ---- //
class SchemeLetterMarker extends GutterMarker {
  constructor(readonly letter: string, readonly colorIdx: number) { super(); }
  eq(other: SchemeLetterMarker) { return other.letter === this.letter && other.colorIdx === this.colorIdx; }
  toDOM() {
    const el = document.createElement("span");
    el.className = `cm-rhyme-scheme cm-rhyme-scheme-${this.colorIdx % 6}`;
    el.textContent = this.letter;
    return el;
  }
}

const setSchemeLetters = StateEffect.define<string[]>();
const clearSchemeLetters = StateEffect.define<void>();

const schemeLetterField = StateField.define<RangeSet<GutterMarker>>({
  create() { return RangeSet.empty; },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(clearSchemeLetters)) next = RangeSet.empty;
      if (e.is(setSchemeLetters)) {
        const builder = new RangeSetBuilder<GutterMarker>();
        const labels = e.value;
        const doc = tr.state.doc;
        const colorMap = new Map<string, number>();
        for (let i = 0; i < labels.length && i < doc.lines; i++) {
          const label = labels[i];
          if (!label) continue;
          if (!colorMap.has(label)) colorMap.set(label, colorMap.size);
          const line = doc.line(i + 1);
          builder.add(line.from, line.from, new SchemeLetterMarker(label, colorMap.get(label)!));
        }
        next = builder.finish();
      }
    }
    return next;
  },
});

// ---- Rhyme end-word highlights (line → scheme letter colour key) ---- //
const setRhymeEndDecos = StateEffect.define<Array<{ line: number; colorKey: string }>>();
const clearRhymeEndDecos = StateEffect.define<void>();

const rhymeEndField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(clearRhymeEndDecos)) { next = Decoration.none; }
      if (e.is(setRhymeEndDecos)) {
        const decos: Range<Decoration>[] = [];
        const doc = tr.state.doc;
        for (const { line, colorKey } of e.value) {
          if (line < 1 || line > doc.lines) continue;
          const docLine = doc.line(line);
          const text = docLine.text;
          const re = /[a-zA-Z']+/g;
          let last: { start: number; end: number } | null = null;
          let m: RegExpExecArray | null;
          while ((m = re.exec(text)) !== null) {
            last = { start: m.index, end: m.index + m[0].length };
          }
          if (!last) continue;
          const safeKey = /^[a-z]$|^hover$/.test(colorKey) ? colorKey : "x";
          const cls = `cm-rhyme-end cm-rhyme-end-${safeKey}`;
          decos.push(Decoration.mark({ class: cls }).range(docLine.from + last.start, docLine.from + last.end));
        }
        decos.sort((a, b) => a.from - b.from || a.to - b.to);
        try { next = Decoration.set(decos, true); } catch { next = Decoration.none; }
      }
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ---- Internal-rhyme highlights (word ranges within a line) ---- //
const setInternalRhymeDecos = StateEffect.define<Array<{ line: number; ranges: Array<{ start: number; end: number }> }>>();
const clearInternalRhymeDecos = StateEffect.define<void>();

const internalRhymeField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(clearInternalRhymeDecos)) { next = Decoration.none; }
      if (e.is(setInternalRhymeDecos)) {
        const decos: Range<Decoration>[] = [];
        const doc = tr.state.doc;
        for (const { line, ranges } of e.value) {
          if (line < 1 || line > doc.lines) continue;
          const docLine = doc.line(line);
          for (const r of ranges) {
            const from = docLine.from + r.start;
            const to = docLine.from + r.end;
            if (to <= from || to > docLine.to) continue;
            decos.push(Decoration.mark({ class: "cm-rhyme-internal" }).range(from, to));
          }
        }
        decos.sort((a, b) => a.from - b.from || a.to - b.to);
        try { next = Decoration.set(decos, true); } catch { next = Decoration.none; }
      }
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ---- Word-level problem highlights ---- //
const setWordHighlights = StateEffect.define<Array<{ words: string[]; lineStart: number; lineEnd: number; severity?: string }>>();
const clearWordHighlights = StateEffect.define<void>();

const wordHighlightField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(clearWordHighlights)) { next = Decoration.none; }
      if (e.is(setWordHighlights)) {
        const decos: Range<Decoration>[] = [];
        const doc = tr.state.doc;
        for (const { words, lineStart, lineEnd, severity } of e.value) {
          if (!words.length) continue;
          const cls = severity === "high"
            ? "cm-word-issue cm-word-issue-high"
            : severity === "medium"
              ? "cm-word-issue cm-word-issue-medium"
              : "cm-word-issue cm-word-issue-low";
          const startLine = Math.max(1, lineStart);
          const endLine = Math.min(doc.lines, lineEnd);
          for (let n = startLine; n <= endLine; n++) {
            const line = doc.line(n);
            const text = line.text.toLowerCase();
            for (const word of words) {
              const needle = word.toLowerCase();
              let pos = 0;
              while (pos < text.length) {
                const idx = text.indexOf(needle, pos);
                if (idx === -1) break;
                decos.push(Decoration.mark({ class: cls }).range(line.from + idx, line.from + idx + needle.length));
                pos = idx + needle.length;
              }
            }
          }
        }
        decos.sort((a, b) => a.from - b.from || a.to - b.to);
        try { next = Decoration.set(decos, true); } catch { next = Decoration.none; }
      }
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export interface StoryBodyEditorProps {
  value: string;
  /** Increment when `value` was set by the workshop (not from the debounced editor pipeline). */
  bodySyncNonce: number;
  onLiveBody: (value: string) => void;
  editorViewRef: MutableRefObject<EditorView | null>;
  wordlist: Set<string> | null;
  spellMode: SpellMode;
  spellBump: number;
  jumpLine?: number | null;
  jumpBump?: number;
  /** Scroll a line into view WITHOUT moving the cursor or focusing. */
  peekLine?: number | null;
  peekBump?: number;
  /**
   * Live highlight shown while the user hovers a panel chip. The whole line
   * gets a tint; if `word` is provided, that token also gets a stronger pulse.
   * Set to null to clear (e.g. on mouseleave).
   */
  hoverHighlight?: { line: number; word?: string } | null;
  /** Subtly highlight the strongest line in the story (from AI analysis). */
  strongestLine?: number | null;
  issueHighlight?: [number, number, string?] | null;
  /** Persistent dim highlights for all AI issue line ranges after analysis. */
  persistentIssueHighlights?: Array<[number, number, string?]>;
  /** Per-line syllable counts at end of each line (CodeMirror widgets). */
  showLineSyllables?: boolean;
  /** Dim non-active lines very subtly (typewriter focus mode).
   *  Boolean kept for back-compat: true → "line", false → "off". */
  lineFocusMode?: boolean | LineFocusMode;
  /** Keep the caret near vertical center of the viewport while typing. */
  typewriterScroll?: boolean;
  /** Called when user selects text; null means selection cleared. */
  onSelectionText?: (text: string | null, rect: DOMRect | null) => void;
  /** Severity dot markers in the gutter for lines with AI issues. */
  issueGutterMarkers?: Array<[number, number, string?]>;
  /**
   * Craft-signal markers (POV/tense slips, filter words, heavy adverbs, untagged
   * speech). Rendered in a separate gutter from the AI dots so they read as
   * "machine-detected craft signals" vs. "AI editor's flagged issues".
   */
  craftGutterSignals?: Array<{ line: number; kind: string; weight: number }>;
  /**
   * Persistent repeat-tool highlights. Each entry tints a character range using
   * the colour assigned to its `groupId` (siblings share the colour) with
   * intensity from `severity`. Hovering one glows the siblings; clicking
   * cycles to the next occurrence in the same group. Empty/undefined clears.
   */
  repeatHighlights?: Array<{
    line: number;
    start: number;
    end: number;
    severity: "low" | "med" | "high";
    kind: "word" | "phrase" | "pattern";
    groupId: string;
    colorIndex: number;
    siblingIndex: number;
    siblingCount: number;
  }>;
  /** Called when the user clicks a severity dot in the gutter. */
  onGutterDotClick?: (line: number) => void;
  /** Called when the cursor parks on a different line for ~400ms. */
  onCursorLineChange?: (line: number) => void;
  /** Alt+Enter on a flagged line — apply that issue's rewrite if available. */
  onApplyRewriteAtCursor?: (line: number) => boolean;
  /** Word-level problem highlights from AI issues. */
  wordHighlights?: Array<{ words: string[]; lineStart: number; lineEnd: number; severity?: string }>;
  /** Per-line rhyme end-word highlights — colors the last word in each listed line by cluster index. */
  rhymeEndHighlights?: Array<{ line: number; colorKey: string }>;
  /** Internal-rhyme highlights — subtle marks on word ranges that rhyme with another word in the same line. */
  internalRhymes?: Array<{ line: number; ranges: Array<{ start: number; end: number }> }>;
  /** Per-line rhyme scheme letters (A/B/A/B…). Empty string skips a line. Only rendered when present. */
  rhymeSchemeLabels?: string[] | null;
  /** Receives a getter so callers can read the current cursor line synchronously. */
  cursorLineGetterRef?: MutableRefObject<(() => number) | null>;
  /** When set, render an inline word-level diff against this snapshot body. Null/undefined disables. */
  diffSnapshotBody?: string | null;
  id?: string;
  "aria-describedby"?: string;
}

export function StoryBodyEditor(props: StoryBodyEditorProps) {
  bindSpellContext(() => ({
    dict: props.wordlist,
    mode: props.spellMode,
  }));

  const lastBodySyncNonce = useRef(props.bodySyncNonce);
  const [localValue, setLocalValue] = useState(() => props.value);

  useLayoutEffect(() => {
    if (props.bodySyncNonce !== lastBodySyncNonce.current) {
      lastBodySyncNonce.current = props.bodySyncNonce;
      setLocalValue(props.value);
    }
  }, [props.bodySyncNonce, props.value]);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!props.jumpBump) return;
    const view = props.editorViewRef.current;
    const n = props.jumpLine;
    if (!view || !n || n < 1) return;
    try {
      const line = view.state.doc.line(n);
      const deco = Decoration.line({ class: "cm-line-flash" }).range(line.from);
      view.dispatch({ effects: setLineFlash.of(Decoration.set([deco])) });
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => {
        try {
          view.dispatch({ effects: clearLineFlash.of(undefined) });
        } catch {
          /* ignore */
        }
      }, 900);
    } catch {
      // line out of range
    }
  }, [props.editorViewRef, props.jumpBump, props.jumpLine]);

  // peekLine: smooth-scroll a line into the vertical center of the editor
  // WITHOUT focusing or moving the cursor. Unlike CodeMirror's built-in
  // scrollIntoView (instant snap), this animates via the browser's native
  // smooth scroll on the scrollDOM so sweeping the cursor across panel chips
  // glides between targets instead of jittering.
  useEffect(() => {
    if (!props.peekBump) return;
    const view = props.editorViewRef.current;
    const n = props.peekLine;
    if (!view || !n || n < 1) return;
    try {
      const line = view.state.doc.line(n);
      const coords = view.coordsAtPos(line.from);
      if (!coords) return;
      const scrollDOM = view.scrollDOM;
      const rect = scrollDOM.getBoundingClientRect();
      const lineMid = (coords.top + coords.bottom) / 2;
      const viewMid = rect.top + rect.height / 2;
      const delta = lineMid - viewMid;
      if (Math.abs(delta) < 2) return;
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scrollDOM.scrollBy({
        top: delta,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    } catch { /* ignore */ }
  }, [props.editorViewRef, props.peekBump, props.peekLine]);

  // Hover-peek highlight: tint the target line and underline the matched word
  // while the user hovers a panel chip. Cleared when hoverHighlight becomes
  // null (mouseleave / focus blur).
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    const hh = props.hoverHighlight;
    if (!hh || !hh.line || hh.line < 1) {
      try { view.dispatch({ effects: clearHoverHighlight.of(undefined) }); }
      catch { /* ignore */ }
      return;
    }
    try {
      const lineCount = view.state.doc.lines;
      const lineNo = Math.max(1, Math.min(hh.line, lineCount));
      const line = view.state.doc.line(lineNo);
      const decos: Range<Decoration>[] = [
        Decoration.line({ class: "cm-hover-peek-line" }).range(line.from),
      ];
      const word = hh.word?.trim();
      if (word) {
        const escaped = word.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
        const re = /\s/.test(word)
          ? new RegExp(escaped.replace(/\\\s+/g, "\\s+"), "i")
          : new RegExp(`\\b${escaped}\\b`, "i");
        const m = re.exec(line.text);
        if (m) {
          const from = line.from + m.index;
          const to = from + m[0].length;
          decos.push(
            Decoration.mark({ class: "cm-hover-peek-word" }).range(from, to),
          );
        }
      }
      view.dispatch({ effects: setHoverHighlight.of(Decoration.set(decos, true)) });
    } catch { /* ignore */ }
  }, [props.editorViewRef, props.hoverHighlight]);

  // Strongest-line decoration: subtle gold accent on the best line.
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    const n = props.strongestLine;
    if (!n || n < 1) {
      try { view.dispatch({ effects: clearStrongestLine.of(undefined) }); } catch { /* ignore */ }
      return;
    }
    try {
      const lineCount = view.state.doc.lines;
      if (n > lineCount) {
        view.dispatch({ effects: clearStrongestLine.of(undefined) });
        return;
      }
      const line = view.state.doc.line(n);
      const deco = Decoration.line({ class: "cm-line-strongest" }).range(line.from);
      view.dispatch({ effects: setStrongestLine.of(Decoration.set([deco])) });
    } catch { /* ignore */ }
  }, [props.editorViewRef, props.strongestLine]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  // Persistent line-bg highlight intentionally disabled — it tinted entire
  // line ranges around every issue and made the editor feel cluttered. Issues
  // are surfaced via the gutter severity dots and the word-level highlights.
  // The hover/active issue still fires the strong `setIssueHighlight` effect.
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    try { view.dispatch({ effects: clearPersistentIssueDecos.of(undefined) }); } catch { /* ignore */ }
  }, [props.editorViewRef, props.persistentIssueHighlights]);

  // Gutter severity dots
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    const markers = props.issueGutterMarkers;
    if (!markers || markers.length === 0) {
      try { view.dispatch({ effects: clearIssueGutter.of(undefined) }); } catch { /* ignore */ }
      return;
    }
    // Paint a single dot at line_start per issue — multi-line ranges should
    // not blanket every adjacent line with markers.
    const dotMap = new Map<number, string>();
    const sevOrder = (s?: string) => s === "high" ? 2 : s === "medium" ? 1 : 0;
    const entries: Array<{ pos: number; sev: string }> = [];
    try {
      const lineCount = view.state.doc.lines;
      for (const [start, , sev] of markers) {
        if (start < 1 || start > lineCount) continue;
        const existing = dotMap.get(start);
        if (!existing || sevOrder(sev) > sevOrder(existing)) dotMap.set(start, sev ?? "low");
      }
      for (const [lineNo, sev] of dotMap) {
        const line = view.state.doc.line(lineNo);
        entries.push({ pos: line.from, sev });
      }
    } catch { /* ignore */ }
    try {
      view.dispatch({ effects: setIssueGutter.of(entries) });
    } catch { /* ignore */ }
  }, [props.editorViewRef, props.issueGutterMarkers]);

  // Word-level highlights
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    const wh = props.wordHighlights;
    if (!wh || wh.length === 0) {
      try { view.dispatch({ effects: clearWordHighlights.of(undefined) }); } catch { /* ignore */ }
      return;
    }
    try { view.dispatch({ effects: setWordHighlights.of(wh) }); } catch { /* ignore */ }
  }, [props.editorViewRef, props.wordHighlights]);

  // Craft-signal gutter dots (POV/tense slips, filter words, heavy adverbs).
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    const signals = props.craftGutterSignals;
    if (!signals || signals.length === 0) {
      try { view.dispatch({ effects: clearCraftGutter.of(undefined) }); } catch { /* ignore */ }
      return;
    }
    const entries: Array<{ pos: number; kind: string; weight: number }> = [];
    try {
      const lineCount = view.state.doc.lines;
      // Pick the most severe signal per line (highest weight, then a fixed
      // priority order). Lots of light signals on one line still surface as a
      // single dot rather than blanket the gutter.
      const byLine = new Map<number, { kind: string; weight: number }>();
      const kindPriority: Record<string, number> = {
        dialogue: 5,
        pov: 4,
        tense: 3,
        showtell: 2,
        adverb: 1,
      };
      for (const s of signals) {
        if (s.line < 1 || s.line > lineCount) continue;
        const cur = byLine.get(s.line);
        if (!cur) {
          byLine.set(s.line, { kind: s.kind, weight: s.weight });
          continue;
        }
        // Aggregate weight (caps at 5), keep the highest-priority kind.
        const merged = Math.min(5, cur.weight + s.weight);
        const winner =
          (kindPriority[s.kind] ?? 0) > (kindPriority[cur.kind] ?? 0)
            ? s.kind
            : cur.kind;
        byLine.set(s.line, { kind: winner, weight: merged });
      }
      for (const [lineNo, { kind, weight }] of byLine) {
        const line = view.state.doc.line(lineNo);
        entries.push({ pos: line.from, kind, weight });
      }
    } catch { /* ignore */ }
    try {
      view.dispatch({ effects: setCraftGutter.of(entries) });
    } catch { /* ignore */ }
  }, [props.editorViewRef, props.craftGutterSignals]);

  // Repeat-tool highlights — persistent severity-tinted marks for every
  // occurrence of the active Repeats subtab. Each mark carries the group's
  // colour class and `data-repeat-group` attribute so the click/hover handlers
  // can find and act on sibling occurrences.
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    const rh = props.repeatHighlights;
    if (!rh || rh.length === 0) {
      repeatGroupPositions.map = new Map();
      try { view.dispatch({ effects: clearRepeatHighlights.of(undefined) }); } catch { /* ignore */ }
      return;
    }
    try {
      const doc = view.state.doc;
      const lineCount = doc.lines;
      const decos: Range<Decoration>[] = [];
      const groupMap = new Map<string, Array<{ from: number; to: number }>>();
      for (const r of rh) {
        if (r.line < 1 || r.line > lineCount) continue;
        const line = doc.line(r.line);
        const lineLen = line.to - line.from;
        const a = Math.max(0, Math.min(r.start, lineLen));
        const b = Math.max(a, Math.min(r.end, lineLen));
        if (b <= a) continue;
        const colorIdx = ((r.colorIndex % 6) + 6) % 6;
        const cls =
          `cm-repeat-mark cm-repeat-mark-${r.severity} cm-repeat-mark-${r.kind} cm-repeat-mark-c${colorIdx}`;
        const title =
          r.siblingCount > 1
            ? `${r.siblingIndex + 1} of ${r.siblingCount} — Alt+click to jump to next (Shift+Alt+click for previous)`
            : undefined;
        const attributes: Record<string, string> = { "data-repeat-group": r.groupId };
        if (title) attributes.title = title;
        const from = line.from + a;
        const to = line.from + b;
        decos.push(Decoration.mark({ class: cls, attributes }).range(from, to));
        let arr = groupMap.get(r.groupId);
        if (!arr) { arr = []; groupMap.set(r.groupId, arr); }
        arr.push({ from, to });
      }
      // Sort each group's positions for stable cycling. Decoration array must
      // also be sorted for RangeSet construction; mark order doesn't matter.
      for (const arr of groupMap.values()) arr.sort((a, b) => a.from - b.from);
      repeatGroupPositions.map = groupMap;
      decos.sort((a, b) => a.from - b.from || a.to - b.to);
      view.dispatch({ effects: setRepeatHighlights.of(Decoration.set(decos, true)) });
    } catch { /* ignore */ }
  }, [props.editorViewRef, props.repeatHighlights]);

  // Rhyme end-word highlights
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    const rh = props.rhymeEndHighlights;
    if (!rh || rh.length === 0) {
      try { view.dispatch({ effects: clearRhymeEndDecos.of(undefined) }); } catch { /* ignore */ }
      return;
    }
    try { view.dispatch({ effects: setRhymeEndDecos.of(rh) }); } catch { /* ignore */ }
  }, [props.editorViewRef, props.rhymeEndHighlights]);

  // Internal-rhyme decorations
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    const ir = props.internalRhymes;
    if (!ir || ir.length === 0) {
      try { view.dispatch({ effects: clearInternalRhymeDecos.of(undefined) }); } catch { /* ignore */ }
      return;
    }
    try { view.dispatch({ effects: setInternalRhymeDecos.of(ir) }); } catch { /* ignore */ }
  }, [props.editorViewRef, props.internalRhymes]);

  // Rhyme scheme letters in gutter
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    const labels = props.rhymeSchemeLabels;
    if (!labels || labels.length === 0) {
      try { view.dispatch({ effects: clearSchemeLetters.of(undefined) }); } catch { /* ignore */ }
      return;
    }
    try { view.dispatch({ effects: setSchemeLetters.of(labels) }); } catch { /* ignore */ }
  }, [props.editorViewRef, props.rhymeSchemeLabels]);

  // Issue highlight: strong background on hovered/active AI issue lines + scroll into view
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    const range = props.issueHighlight;
    if (!range) {
      try { view.dispatch({ effects: clearIssueHighlight.of(undefined) }); } catch { /* ignore */ }
      return;
    }
    try {
      const [startLine, endLine, sev] = range;
      const sevClass = sev === "high"
        ? "cm-line-issue-highlight cm-line-issue-high"
        : sev === "medium"
          ? "cm-line-issue-highlight cm-line-issue-medium"
          : "cm-line-issue-highlight cm-line-issue-low";
      const decos = [];
      const lineCount = view.state.doc.lines;
      for (let n = startLine; n <= Math.min(endLine, lineCount); n++) {
        const line = view.state.doc.line(n);
        decos.push(Decoration.line({ class: sevClass }).range(line.from));
      }
      view.dispatch({
        effects: setIssueHighlight.of(Decoration.set(decos)),
      });
    } catch { /* line out of range */ }
  }, [props.editorViewRef, props.issueHighlight]);

  const showSyllables = props.showLineSyllables !== false;

  // Sync line-focus mode into the CM state field when the prop changes
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    const raw = props.lineFocusMode;
    const mode: LineFocusMode = raw === true ? "line" : raw === false || raw == null ? "off" : raw;
    try { view.dispatch({ effects: setLineFocusMode.of(mode) }); } catch { /* ignore */ }
  }, [props.editorViewRef, props.lineFocusMode]);

  // Sync typewriter scroll state.
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    try { view.dispatch({ effects: setTypewriterEnabled.of(props.typewriterScroll ?? false) }); } catch { /* ignore */ }
  }, [props.editorViewRef, props.typewriterScroll]);

  // Sync diff overlay: dispatch new snapshot body or clear when null/undefined.
  useEffect(() => {
    const view = props.editorViewRef.current;
    if (!view) return;
    const body = props.diffSnapshotBody ?? null;
    try { view.dispatch({ effects: setDiffSnapshot.of(body) }); } catch { /* ignore */ }
  }, [props.editorViewRef, props.diffSnapshotBody]);

  // Forward latest gutter-dot click callback to the module-level extension.
  useEffect(() => {
    gutterDotClickHandler.fn = props.onGutterDotClick ?? null;
    return () => { gutterDotClickHandler.fn = null; };
  }, [props.onGutterDotClick]);

  useEffect(() => {
    applyRewriteHandler.fn = props.onApplyRewriteAtCursor ?? null;
    return () => { applyRewriteHandler.fn = null; };
  }, [props.onApplyRewriteAtCursor]);

  // Pause ambient body animations while the editor is focused. CSS rule in
  // index.css gates on `html.is-editor-typing` so only the heavy backdrops
  // pause on touch — discrete UI animations still run.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest(".cm-editor")) {
        document.documentElement.classList.add("is-editor-typing");
      }
    };
    const onFocusOut = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest(".cm-editor")) {
        document.documentElement.classList.remove("is-editor-typing");
      }
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.documentElement.classList.remove("is-editor-typing");
    };
  }, []);

  // Expose a synchronous cursor-line getter so callers can decide whether to
  // peek/jump based on where the cursor already is.
  useEffect(() => {
    if (!props.cursorLineGetterRef) return;
    props.cursorLineGetterRef.current = () => {
      const view = props.editorViewRef.current;
      if (!view) return -1;
      try {
        const sel = view.state.selection.main;
        return view.state.doc.lineAt(sel.from).number;
      } catch { return -1; }
    };
    return () => { if (props.cursorLineGetterRef) props.cursorLineGetterRef.current = null; };
  }, [props.editorViewRef, props.cursorLineGetterRef]);

  const extensions = useMemo(
    () => [
      // Prevent story-load/suggestion-apply transactions from polluting undo history.
      // react-codemirror marks external value changes with ExternalChange; we intercept
      // them and annotate addToHistory=false so Ctrl+Z can't undo past the loaded state.
      EditorState.transactionExtender.of((tr) =>
        tr.annotation(ExternalChange) ? { annotations: Transaction.addToHistory.of(false) } : null
      ),
      // Soft-wrap long lines instead of shrinking the font. Prose lines run
      // long; for story writing the user expects text to flow to the next
      // visual row, not get squeezed.
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ spellcheck: "false" }),
      spellSyncFacet.of(spellFacetValue(props.spellBump, props.spellMode)),
      search({ top: true }),
      highlightSelectionMatches(),
      lineFlashField,
      strongestLineField,
      issueHighlightField,
      hoverHighlightField,
      repeatHighlightField,
      repeatInteractionExtension,
      persistentIssueDecosField,
      issueGutterField,
      issueGutterExtension,
      craftGutterField,
      craftGutterExtension,
      schemeLetterField,
      wordHighlightField,
      rhymeEndField,
      internalRhymeField,
      diffOverlayField,
      applyRewriteKeymap,
      ...lineFocusExtension,
      ...typewriterExtension,
      placeholder("Start writing…"),
      ...(showSyllables ? [syllableCountPlugin] : []),
      ...storySpellExtensions,
      formatMarksExtension,
      formatMarksTheme,
      ...basicSetup({
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLineGutter: false,
      }),
      storyEditorTheme,
    ],
    [props.spellBump, props.spellMode, showSyllables],
  );

  const selectionCallbackRef = useRef(props.onSelectionText);
  selectionCallbackRef.current = props.onSelectionText;
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cursorLineCallbackRef = useRef(props.onCursorLineChange);
  cursorLineCallbackRef.current = props.onCursorLineChange;
  const cursorLineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCursorLineRef = useRef<number>(-1);

  return (
    <div className={`story-cm-wrap${props.diffSnapshotBody ? " is-diff-mode" : ""}`} id={props.id}>
      <CodeMirror
        aria-describedby={props["aria-describedby"]}
        value={localValue}
        height="auto"
        theme="none"
        basicSetup={false}
        extensions={extensions}
        onChange={(v) => {
          // Don't setLocalValue here: localValue is only used to feed
          // external resyncs (bodySyncNonce). CodeMirror owns the doc
          // internally during typing, so updating React state on every
          // keystroke caused a full StoryBodyEditor rerender per char.
          props.onLiveBody(v);
        }}
        onCreateEditor={(view) => {
          props.editorViewRef.current = view;
        }}
        onUpdate={(update) => {
          // Debounced cursor-line tracker — fires when the cursor parks on a
          // different line for ~400ms, lets parent open the matching issue.
          if (cursorLineCallbackRef.current && (update.docChanged || update.selectionSet)) {
            const sel = update.state.selection.main;
            if (sel.empty) {
              const lineNo = update.state.doc.lineAt(sel.from).number;
              if (lineNo !== lastCursorLineRef.current) {
                lastCursorLineRef.current = lineNo;
                if (cursorLineTimerRef.current) clearTimeout(cursorLineTimerRef.current);
                cursorLineTimerRef.current = setTimeout(() => {
                  cursorLineCallbackRef.current?.(lineNo);
                }, 400);
              }
            }
          }
          if (!selectionCallbackRef.current) return;
          const sel = update.state.selection.main;
          if (!sel.empty) {
            const text = update.state.sliceDoc(sel.from, sel.to).trim();
            if (text.length >= 1 && update.selectionSet) {
              if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
              const view = update.view;
              const to = sel.to;
              selectionTimerRef.current = setTimeout(() => {
                const coords = view.coordsAtPos(to);
                if (coords) {
                  const rect = new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top);
                  selectionCallbackRef.current?.(text, rect);
                }
              }, 200);
            }
          } else if (update.selectionSet) {
            if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
            selectionCallbackRef.current(null, null);
          }
        }}
      />
    </div>
  );
}
