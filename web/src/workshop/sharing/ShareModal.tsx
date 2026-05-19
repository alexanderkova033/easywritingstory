import { useState, useCallback } from "react";
import "./ShareModal.css";
import type { SharedPoem } from "./sharing";
import { buildShareUrl } from "./sharing";

interface ShareModalProps {
  poem: SharedPoem;
  onClose: () => void;
  onCopyToDrafts?: () => void;
}

export function ShareModal({ poem, onClose, onCopyToDrafts }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const url = buildShareUrl(poem);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [url]);

  return (
    <div className="share-overlay" role="dialog" aria-modal aria-label="Share poem">
      <div className="share-modal">
        <div className="share-modal-head">
          <h2 className="share-modal-title">Share poem</h2>
          <button type="button" className="share-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="share-desc muted small">
          Anyone with this link can view a read-only copy of your poem. Nothing is stored on a server — the poem is encoded in the URL itself.
        </p>
        {poem.title && (
          <p className="share-poem-title">{poem.title}</p>
        )}
        <div className="share-url-row">
          <input
            type="text"
            className="share-url-input"
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
            aria-label="Share URL"
          />
          <button
            type="button"
            className={`small-btn share-copy-btn${copied ? " is-copied" : ""}`}
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
        {onCopyToDrafts && (
          <div className="share-actions">
            <button type="button" className="small-btn small-btn-primary" onClick={onCopyToDrafts}>
              Save to my drafts
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ViewSharedPoemProps {
  poem: SharedPoem;
  onDismiss: () => void;
  onAddToDrafts: () => void;
}

export function ViewSharedPoem({ poem, onDismiss, onAddToDrafts }: ViewSharedPoemProps) {
  return (
    <div className="share-overlay" role="dialog" aria-modal aria-label="Shared poem">
      <div className="share-modal share-modal-view">
        <div className="share-modal-head">
          <span className="share-modal-badge">Shared poem</span>
          <button type="button" className="share-close-btn" onClick={onDismiss} aria-label="Close">✕</button>
        </div>
        {poem.title && <h2 className="share-view-title">{poem.title}</h2>}
        <pre className="share-view-body">{poem.body}</pre>
        <div className="share-actions">
          <button type="button" className="small-btn" onClick={onDismiss}>Dismiss</button>
          <button type="button" className="small-btn small-btn-primary" onClick={onAddToDrafts}>
            Save to my drafts
          </button>
        </div>
      </div>
    </div>
  );
}
