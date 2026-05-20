import { useState, useCallback } from "react";
import "./ShareModal.css";
import type { SharedStory } from "./sharing";
import { buildShareUrl } from "./sharing";

interface ShareModalProps {
  story: SharedStory;
  onClose: () => void;
  onCopyToDrafts?: () => void;
}

export function ShareModal({ story, onClose, onCopyToDrafts }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const url = buildShareUrl(story);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [url]);

  return (
    <div className="share-overlay" role="dialog" aria-modal aria-label="Share story">
      <div className="share-modal">
        <div className="share-modal-head">
          <h2 className="share-modal-title">Share story</h2>
          <button type="button" className="share-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="share-desc muted small">
          Anyone with this link can view a read-only copy of your story. Nothing is stored on a server — the story is encoded in the URL itself.
        </p>
        {story.title && (
          <p className="share-story-title">{story.title}</p>
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

interface ViewSharedStoryProps {
  story: SharedStory;
  onDismiss: () => void;
  onAddToDrafts: () => void;
}

export function ViewSharedStory({ story, onDismiss, onAddToDrafts }: ViewSharedStoryProps) {
  return (
    <div className="share-overlay" role="dialog" aria-modal aria-label="Shared story">
      <div className="share-modal share-modal-view">
        <div className="share-modal-head">
          <span className="share-modal-badge">Shared story</span>
          <button type="button" className="share-close-btn" onClick={onDismiss} aria-label="Close">✕</button>
        </div>
        {story.title && <h2 className="share-view-title">{story.title}</h2>}
        <pre className="share-view-body">{story.body}</pre>
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
