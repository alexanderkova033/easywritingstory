import "./InlineRhymeHint.css";
import { useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import type { MutableRefObject } from "react";

interface Props {
  editorViewRef: MutableRefObject<EditorView | null>;
}

function lastWordOf(line: string): string {
  return line.trim().split(/\s+/).pop()?.replace(/[^a-zA-Z'-]/g, "") ?? "";
}

export function InlineRhymeHint({ editorViewRef }: Props) {
  const [rhymes, setRhymes] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const check = () => {
      const view = editorViewRef.current;
      if (!view) return;
      const sel = view.state.selection.main;
      const line = view.state.doc.lineAt(sel.head);
      // Only trigger when cursor is within 2 chars of line end and line has content
      if (!line.text.trim() || sel.head < line.to - 2) {
        setVisible(false);
        return;
      }
      const word = lastWordOf(line.text);
      if (!word || word.length < 2) { setVisible(false); return; }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        try {
          const res = await fetch(
            `https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(word)}&max=6`,
            { signal: ctrl.signal },
          );
          const data: { word: string }[] = await res.json();
          const words = data.map((d) => d.word).filter((w) => w !== word).slice(0, 5);
          if (words.length > 0) { setRhymes(words); setVisible(true); }
          else setVisible(false);
        } catch {
          // AbortError or network — silently hide
          setVisible(false);
        }
      }, 600);
    };

    const view = editorViewRef.current;
    if (!view) return;

    // Listen for cursor moves via CM's update listener
    const ext = view.state.facet;
    void ext; // not using facets — poll via selectionchange on the DOM element
    const el = view.dom;
    el.addEventListener("keyup", check);
    el.addEventListener("click", check);
    return () => {
      el.removeEventListener("keyup", check);
      el.removeEventListener("click", check);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [editorViewRef]);

  if (!visible || rhymes.length === 0) return null;

  return (
    <div className="inline-rhyme-hint" aria-label="Rhyme suggestions" role="note">
      <span className="inline-rhyme-label">Rhymes:</span>
      {rhymes.map((w) => (
        <button
          key={w}
          type="button"
          className="inline-rhyme-word"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            // Insert at cursor position (let user decide — don't auto-replace)
            const view = editorViewRef.current;
            if (!view) return;
            const sel = view.state.selection.main;
            view.dispatch({
              changes: { from: sel.head, to: sel.head, insert: ` ${w}` },
              selection: { anchor: sel.head + w.length + 1 },
            });
            setVisible(false);
          }}
        >
          {w}
        </button>
      ))}
      <button
        type="button"
        className="inline-rhyme-dismiss"
        aria-label="Dismiss rhyme hints"
        onMouseDown={(e) => { e.preventDefault(); setVisible(false); }}
      >
        ×
      </button>
    </div>
  );
}
