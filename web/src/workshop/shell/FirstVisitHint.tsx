import "./FirstVisitHint.css";
import { useCallback, useState } from "react";
import { FIRST_VISIT_HINT_STORAGE_KEY, readFirstVisitHintDismissed } from "./firstVisitHintStorage";

export function FirstVisitHint({
  onOpenGuide,
  onSuggest,
}: {
  onDismissed?: () => void;
  onOpenGuide?: () => void;
  onSuggest?: () => void;
}) {
  const [visible, setVisible] = useState(() => !readFirstVisitHintDismissed());

  const dismiss = useCallback(() => {
    try { localStorage.setItem(FIRST_VISIT_HINT_STORAGE_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="welcome-banner welcome-banner-minimal" role="banner">
      <div className="welcome-minimal-body">
        <span className="welcome-leaf" aria-hidden>❧</span>
        <div className="welcome-minimal-text">
          <strong>Start writing</strong> — or{" "}
          {onSuggest ? (
            <button type="button" className="linkish welcome-guide-inline" onClick={() => { onSuggest(); dismiss(); }}>
              get a poem idea ✦
            </button>
          ) : (
            "open the Suggest tab for ideas"
          )}
          {". "}
          Rhyme scheme, rhythm, and syllable counts appear on the right as you type.
          {onOpenGuide && (
            <>{" "}<button type="button" className="linkish welcome-guide-inline" onClick={() => { onOpenGuide(); dismiss(); }}>
              Tour →
            </button></>
          )}
        </div>
        <button
          type="button"
          className="welcome-minimal-dismiss"
          onClick={dismiss}
          aria-label="Dismiss welcome"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
