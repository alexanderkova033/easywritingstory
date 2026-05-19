import "./MobileActionBar.css";

type MobileTab = "write" | "tools" | "library";

interface MobileActionBarProps {
  isFocusMode: boolean;
  activeTab: MobileTab;
  wordCount: number;
  isAnalyzing: boolean;
  onTab: (tab: MobileTab) => void;
  onAnalyse: () => void;
}

export type { MobileTab };

export function MobileActionBar({ isFocusMode, activeTab, wordCount, isAnalyzing, onTab, onAnalyse }: MobileActionBarProps) {
  if (isFocusMode) return null;

  return (
    <nav className="mob-tabbar" aria-label="Navigation">
      <button
        type="button"
        className={`mob-tab ${activeTab === "write" ? "mob-tab-active" : ""}`}
        onClick={() => onTab("write")}
        aria-pressed={activeTab === "write"}
      >
        <svg className="mob-tab-icon" viewBox="0 0 24 24" aria-hidden fill="none">
          <path d="M12 20h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="mob-tab-label">
          Write
          {activeTab === "write" && wordCount > 0 && (
            <span className="mob-tab-wordcount"> · {wordCount}w</span>
          )}
        </span>
      </button>

      <button
        type="button"
        className={`mob-tab ${activeTab === "tools" ? "mob-tab-active" : ""}`}
        onClick={() => onTab("tools")}
        aria-pressed={activeTab === "tools"}
      >
        <svg className="mob-tab-icon" viewBox="0 0 24 24" aria-hidden fill="none">
          <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="mob-tab-label">Tools</span>
      </button>

      <button
        type="button"
        className={`mob-tab ${activeTab === "library" ? "mob-tab-active" : ""}`}
        onClick={() => onTab("library")}
        aria-pressed={activeTab === "library"}
      >
        <svg className="mob-tab-icon" viewBox="0 0 24 24" aria-hidden fill="none">
          <path d="M5 19V6.5A2.5 2.5 0 017.5 4H20v14.5A1.5 1.5 0 0118.5 20H7.5A2.5 2.5 0 015 17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 7h9M8 10h9M8 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <span className="mob-tab-label">Library</span>
      </button>

      {/* Analyse — pill action button, not a nav tab */}
      <button
        type="button"
        className={`mob-tab mob-tab-analyse${isAnalyzing ? " is-analysing" : ""}`}
        onClick={() => {
          navigator.vibrate?.(8);
          onAnalyse();
        }}
        aria-label={isAnalyzing ? "Analysing poem…" : "Analyse poem with AI"}
        disabled={isAnalyzing}
      >
        {isAnalyzing
          ? <span className="mob-analyse-spinner" aria-hidden />
          : (
            <svg className="mob-tab-icon" viewBox="0 0 24 24" aria-hidden fill="none">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          )
        }
        <span className="mob-tab-label">{isAnalyzing ? "Analysing…" : "Analyse"}</span>
      </button>
    </nav>
  );
}
