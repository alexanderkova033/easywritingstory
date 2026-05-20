import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useHoverHintBinder } from "@/workshop/hints/HoverHintsContext";
import { SavedAgo } from "./components/SavedAgo";
import { SessionTimer } from "./components/SessionTimer";
import type { useStoryWorkshopModel } from "./useStoryWorkshopModel";

type Model = ReturnType<typeof useStoryWorkshopModel>;

type Props = {
  m: Model;
  isFocusMode: boolean;
  setIsFocusMode: (v: boolean) => void;
  setIsLibraryOpen: (v: boolean) => void;
  setMobileTab: (v: "write" | "tools" | "library") => void;
  setMetaOpen: (v: boolean) => void;
  showRhymeScheme: boolean;
  isStatsOpen: boolean;
  setIsStatsOpen: Dispatch<SetStateAction<boolean>>;
  statsPopoverRef: MutableRefObject<HTMLDivElement | null>;
  isBackgroundOpen: boolean;
  setIsBackgroundOpen: Dispatch<SetStateAction<boolean>>;
  setFindMode: (v: "find" | "replace") => void;
  setIsFindOpen: (v: boolean) => void;
  topbarOverflowOpen: boolean;
  setTopbarOverflowOpen: Dispatch<SetStateAction<boolean>>;
  overflowMenuRef: MutableRefObject<HTMLDivElement | null>;
  sessionStartRef: MutableRefObject<number>;
  sessionWordGoal: number | null;
  setSessionWordGoal: (v: number | null) => void;
  showGoalInput: boolean;
  setShowGoalInput: (v: boolean) => void;
  goalInputVal: string;
  setGoalInputVal: (v: string) => void;
  setIsReadingMode: (v: boolean) => void;
  setIsShareOpen: (v: boolean) => void;
  setIsExportOpen: (v: boolean) => void;
  setIsCmdkOpen: (v: boolean) => void;
  setIsShortcutsOpen: (v: boolean) => void;
  resetLayout: () => void;
};

export function WorkshopTopbarHeader(props: Props) {
  const {
    m,
    isFocusMode,
    setIsFocusMode,
    setIsLibraryOpen,
    setMobileTab,
    setMetaOpen,
    showRhymeScheme,
    isStatsOpen,
    setIsStatsOpen,
    statsPopoverRef,
    isBackgroundOpen,
    setIsBackgroundOpen,
    setFindMode,
    setIsFindOpen,
    topbarOverflowOpen,
    setTopbarOverflowOpen,
    overflowMenuRef,
    sessionStartRef,
    sessionWordGoal,
    setSessionWordGoal,
    showGoalInput,
    setShowGoalInput,
    goalInputVal,
    setGoalInputVal,
    setIsReadingMode,
    setIsShareOpen,
    setIsExportOpen,
    setIsCmdkOpen,
    setIsShortcutsOpen,
    resetLayout,
  } = props;

  const hint = useHoverHintBinder();

  return (
    <header
      className={`topbar ${isFocusMode ? "is-focus" : ""}`}
      aria-label="Workshop header"
    >
      <div className="topbar-primary topbar-primary-tiered">
        <div className="topbar-cluster topbar-cluster-brand">
          <div className="brand brand-tiered">
            <h1 className="brand-mark">
              <svg
                className="brand-logo-icon"
                viewBox="0 0 24 24"
                aria-hidden
                focusable="false"
              >
                {/* Bookmark ribbon (behind pages) */}
                <path d="M11 4L11 23L12 21L13 23L13 4Z" fill="#8c2a1c" />
                <path d="M11.5 4.3L11.5 21.4L12 21L12.5 21.4L12.5 4.3Z" fill="#cf4530" opacity="0.95" />
                {/* Left page: back layer, body, top highlight */}
                <path d="M3 6.8C6 5.8 9 5.8 12 7.8L12 19.8C9 17.8 6 17.8 3 18.8Z" fill="#a85515" />
                <path d="M3 6C6 5 9 5 12 7L12 19C9 17 6 17 3 18Z" fill="#f0a85a" />
                <path d="M3 6C6 5 9 5 12 7L12 7.5C9 5.5 6 5.5 3 6.5Z" fill="#fbd99c" opacity="0.75" />
                {/* Right page: back layer, body, top highlight */}
                <path d="M12 7.8C15 5.8 18 4.8 21 4.8L21 16.8C18 16.8 15 17.8 12 19.8Z" fill="#6b3010" />
                <path d="M12 7C15 5 18 4 21 4L21 16C18 16 15 17 12 19Z" fill="#b56b1f" />
                <path d="M12 7C15 5 18 4 21 4L21 4.6C18 4.6 15 5.6 12 7.6Z" fill="#d98c3e" opacity="0.9" />
                {/* Spine line — subtle gutter cue between pages */}
                <path d="M12 7.3L12 18.7" stroke="#3a1a08" strokeWidth="0.5" strokeLinecap="round" opacity="0.4" />
                {/* Text lines — left page (horizontal), right page (curved to match contour) */}
                <path d="M5.2 10L9.8 10M5 12L10 12M5.5 14L9.5 14" stroke="#a85515" strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
                <path d="M14 10C16 9 17.5 8.3 19 8.1" stroke="#f0a85a" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.65" />
                <path d="M14 12C16 11 17.5 10.3 19 10.1" stroke="#f0a85a" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.65" />
                <path d="M14 14C16 13 17.5 12.3 19 12.1" stroke="#f0a85a" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.65" />
              </svg>
              easywriting<span className="brand-product-badge">story</span>
            </h1>
            <div className="topbar-draft-inline">
              <label className="draft-library-label" htmlFor="draft-story-select">
                Draft
              </label>
              <div className="draft-select-wrap">
                <svg
                  className="draft-select-icon"
                  viewBox="0 0 16 16"
                  aria-hidden
                  width="13"
                  height="13"
                >
                  <path
                    d="M3.5 1.5h6L13 5v9a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.5 1.5V5H13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
                <select
                  id="draft-story-select"
                  className="draft-library-select"
                  value={m.activeStoryId}
                  onChange={(e) => m.selectStory(e.target.value)}
                  aria-label="Active draft"
                >
                  {m.storyOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                      {o.archived ? " (archived)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="topbar-draft-icon-btn"
                onClick={() => m.newStory()}
                aria-label="New draft"
                {...hint("New draft")}
              >
                +
              </button>
              <button
                type="button"
                className="topbar-draft-icon-btn"
                onClick={() => setIsLibraryOpen(true)}
                aria-label="Open draft library"
                {...hint("Library: manage all your drafts — create, switch, or archive.")}
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden width="14" height="14">
                  <rect x="2" y="3" width="16" height="2.5" rx="1" fill="currentColor"/>
                  <rect x="2" y="8.75" width="16" height="2.5" rx="1" fill="currentColor"/>
                  <rect x="2" y="14.5" width="10" height="2.5" rx="1" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
          <p className="brand-sub">
            {m.library.stories.length > 1
              ? `${m.library.stories.length} drafts saved · private, local, no account`
              : "Private, local, no account"}
          </p>
        </div>

        {/* Mobile-only story title — centred between brand icon and actions */}
        <button
          type="button"
          className="topbar-mobile-title"
          onClick={() => {
            setMobileTab("write");
            setMetaOpen(true);
            requestAnimationFrame(() => document.getElementById("story-title")?.focus());
          }}
          aria-label="Edit story title"
        >
          {m.title.trim() || "Untitled"}
        </button>

        <div
          className="topbar-cluster topbar-cluster-context"
          role="status"
          aria-live="polite"
          aria-label="Draft stats"
        >
          <div className={`topbar-context-stats${isFocusMode ? " topbar-focus-stats" : ""}`}>
            <span
              className={isFocusMode ? "topbar-focus-stat" : "topbar-context-stat"}
              {...hint("Word count in story body")}
            >
              {m.quickDocStats.totalWords} words
            </span>
            <span className={isFocusMode ? "topbar-focus-sep" : "topbar-context-sep"} aria-hidden>·</span>
            <span
              className={isFocusMode ? "topbar-focus-stat" : "topbar-context-stat"}
              {...hint("Paragraphs (text blocks separated by blank lines)")}
            >
              {m.quickDocStats.stanzaCount} paragraphs
            </span>
            {m.lastAiScore != null && (
              <>
                <span className={isFocusMode ? "topbar-focus-sep" : "topbar-context-sep"} aria-hidden>·</span>
                <span
                  className="topbar-ai-score"
                  {...hint(`Last AI analysis score: ${m.lastAiScore}/10`)}
                >
                  ✦ {m.lastAiScore}
                </span>
              </>
            )}
            {showRhymeScheme && m.rhymeScheme.some((l) => l) && (
              <span
                className="topbar-rhyme-dot"
                aria-label="Rhyme scheme active"
                {...hint("Rhyme scheme visible in editor")}
              />
            )}
          </div>
        </div>

        <div className="topbar-cluster topbar-cluster-status" aria-label="Actions and save" data-tour-id="topbar-actions">
          <span className="topbar-saved topbar-saved-quiet" aria-live="polite">
            <span className={`save-dot ${m.savedFlash ? "is-on" : ""}`} aria-hidden />
            <span className="topbar-saved-label">
              {m.savedFlash ? "Saved" : m.lastSavedAt ? <SavedAgo ts={m.lastSavedAt} /> : null}
            </span>
          </span>

          {!isFocusMode ? (
            <>
              {/* Stats popover */}
              <div className="topbar-stats-wrap" ref={statsPopoverRef}>
                <button
                  type="button"
                  className={`topbar-ghost-btn topbar-stats-btn${isStatsOpen ? " is-selected" : ""}`}
                  onClick={() => setIsStatsOpen((v) => !v)}
                  aria-haspopup="true"
                  aria-expanded={isStatsOpen}
                  aria-label="Story statistics"
                  {...hint("Stats: full word, sentence & paragraph counts")}
                >
                  <svg className="topbar-ghost-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
                    <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" d="M18 20V10M12 20V4M6 20v-6" />
                  </svg>
                </button>
                {isStatsOpen && (
                  <div className="topbar-stats-popover" role="status" aria-label="Story statistics">
                    <div className="tsp-grid">
                      <div className="tsp-row">
                        <span className="tsp-label">Words</span>
                        <span className="tsp-val">{m.docStats.totalWords}</span>
                      </div>
                      <div className="tsp-row">
                        <span className="tsp-label">Characters</span>
                        <span className="tsp-val">{m.docStats.totalChars}</span>
                      </div>
                      <div className="tsp-row">
                        <span className="tsp-label">Paragraphs</span>
                        <span className="tsp-val">{m.docStats.stanzaCount}</span>
                      </div>
                      <div className="tsp-row">
                        <span className="tsp-label">Read-aloud</span>
                        <span className="tsp-val">
                          {m.docStats.totalWords === 0 ? "—" : `${m.docStats.estimatedReadingMinutes} min`}
                        </span>
                      </div>
                      <div className="tsp-row">
                        <span className="tsp-label">Avg words / line</span>
                        <span className="tsp-val">
                          {m.docStats.nonEmptyLines > 0 ? m.docStats.avgWordsPerNonEmptyLine : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Background */}
              <button
                type="button"
                className={`topbar-ghost-btn ${isBackgroundOpen ? "is-selected" : ""}`}
                onClick={() => setIsBackgroundOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={isBackgroundOpen}
                aria-label="Page background"
                {...hint("Background: choose a scene behind the page")}
              >
                <svg className="topbar-ghost-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
                  <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                  <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" d="M3 15l4.5-4.5 3 3 3-3 4.5 4.5" />
                  <circle cx="8" cy="9.5" r="1.25" fill="currentColor" />
                </svg>
              </button>
              {/* Find */}
              <button
                type="button"
                className="topbar-ghost-btn"
                onClick={() => { setFindMode("find"); setIsFindOpen(true); }}
                aria-label="Find in story (⌘F)"
                {...hint("Find text in the story (⌘/Ctrl+F)")}
              >
                <svg className="topbar-ghost-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
                  <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.75"/>
                  <path d="M14.5 14.5L19 19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              </button>
              {/* Overflow ⋯ */}
              <div className="topbar-overflow-wrap" ref={overflowMenuRef}>
                <button
                  type="button"
                  className={`topbar-ghost-btn topbar-overflow-btn ${topbarOverflowOpen ? "is-selected" : ""}`}
                  aria-label="More options"
                  aria-expanded={topbarOverflowOpen}
                  aria-haspopup="menu"
                  onClick={() => setTopbarOverflowOpen((v) => !v)}
                  {...hint("More: session timer, word goal, share, shortcuts")}
                >
                  <svg className="topbar-ghost-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
                    <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="19" cy="12" r="1.5" fill="currentColor"/>
                  </svg>
                </button>
                {topbarOverflowOpen && (
                  <div className="topbar-overflow-menu" role="menu">
                    {/* ── Writing ── */}
                    <span className="topbar-overflow-group-label">Writing</span>
                    <div className="topbar-overflow-section">
                      <span className="topbar-overflow-label">Session</span>
                      <span className="topbar-overflow-value"><SessionTimer startTs={sessionStartRef.current} /></span>
                    </div>
                    <div className="topbar-overflow-section">
                      <span className="topbar-overflow-label">Word goal</span>
                      {sessionWordGoal ? (
                        <button type="button" className="topbar-word-goal topbar-word-goal-menu" onClick={() => { setGoalInputVal(String(sessionWordGoal)); setShowGoalInput(true); setTopbarOverflowOpen(false); }}>
                          <span className="topbar-word-goal-fill" style={{ width: `${Math.min(100, Math.round((m.quickDocStats.totalWords / sessionWordGoal) * 100))}%` }} />
                          <span className="topbar-word-goal-label">{m.quickDocStats.totalWords}/{sessionWordGoal}w</span>
                        </button>
                      ) : showGoalInput ? (
                        <form className="topbar-goal-form" onSubmit={(e) => { e.preventDefault(); const n = parseInt(goalInputVal, 10); if (!isNaN(n) && n > 0) { setSessionWordGoal(n); setShowGoalInput(false); } }}>
                          <input className="topbar-goal-input" type="number" min="1" max="9999" placeholder="e.g. 100" value={goalInputVal} onChange={(e) => setGoalInputVal(e.target.value)} aria-label="Word count goal" autoFocus onBlur={() => { if (!goalInputVal) setShowGoalInput(false); }} onKeyDown={(e) => { if (e.key === "Escape") setShowGoalInput(false); }} />
                          <button type="submit" className="topbar-goal-submit" aria-label="Set goal">✓</button>
                        </form>
                      ) : (
                        <button type="button" className="topbar-overflow-action" onClick={() => { setGoalInputVal(""); setShowGoalInput(true); }}>Set goal</button>
                      )}
                    </div>
                    <hr className="topbar-overflow-divider" />
                    {/* ── View ── */}
                    <span className="topbar-overflow-group-label">View</span>
                    <button type="button" className="topbar-overflow-item" role="menuitem" onClick={() => { setIsFocusMode(true); setTopbarOverflowOpen(false); }}>Focus mode</button>
                    <button type="button" className="topbar-overflow-item" role="menuitem" onClick={() => { setIsReadingMode(true); setTopbarOverflowOpen(false); }}>Reading view</button>
                    <hr className="topbar-overflow-divider" />
                    {/* ── Share ── */}
                    <span className="topbar-overflow-group-label">Share</span>
                    <button type="button" className="topbar-overflow-item" role="menuitem" onClick={() => { setIsShareOpen(true); setTopbarOverflowOpen(false); }}>Share story</button>
                    <button type="button" className="topbar-overflow-item" role="menuitem" onClick={() => { setIsExportOpen(true); setTopbarOverflowOpen(false); }}>Export story</button>
                    <hr className="topbar-overflow-divider" />
                    {/* ── App ── */}
                    <span className="topbar-overflow-group-label">App</span>
                    <button type="button" className="topbar-overflow-item" role="menuitem" onClick={() => { setIsCmdkOpen(true); setTopbarOverflowOpen(false); }}>⌘ Commands</button>
                    <button type="button" className="topbar-overflow-item" role="menuitem" onClick={() => { setIsShortcutsOpen(true); setTopbarOverflowOpen(false); }}>Keyboard shortcuts</button>
                    <button type="button" className="topbar-overflow-item" role="menuitem" onClick={() => { resetLayout(); setTopbarOverflowOpen(false); }}>Reset panel layout</button>
                    <hr className="topbar-overflow-divider" />
                    {/* ── Data ── */}
                    <span className="topbar-overflow-group-label">Data</span>
                    <button type="button" className="topbar-overflow-item" role="menuitem" onClick={() => { void m.exportWorkshopBackup(); setTopbarOverflowOpen(false); }}>Export backup (JSON)</button>
                    <button type="button" className="topbar-overflow-item" role="menuitem" onClick={() => { void m.triggerImportBackup(); setTopbarOverflowOpen(false); }}>Import backup (JSON)</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              className="small-btn topbar-focus-exit-btn"
              onClick={() => setIsFocusMode(false)}
              aria-label="Exit focus mode and show tools"
            >
              Show tools
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
