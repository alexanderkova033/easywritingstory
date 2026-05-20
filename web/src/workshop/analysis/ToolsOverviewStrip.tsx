import type { QuickDocumentStats } from "@/workshop/analysis/line-stats";
import type { GoalEvaluation } from "@/workshop/goals/metrics";
import type { ToolTab } from "@/workshop/shell/workshop-helpers";
import { useHoverHintBinder } from "@/workshop/hints/HoverHintsContext";

export interface ToolsOverviewStripProps {
  /** Open checklist rows + goal warnings + spelling flags (Issues tab). */
  issuesQueueCount: number;
  quickDocStats: QuickDocumentStats;
  spellHitCount: number;
  wordlistReady: boolean;
  goalEvaluation: GoalEvaluation;
  repeatCount: number;
  checklistOpenCount: number;
  heavyToolsStale: boolean;
  activeTab: ToolTab;
  onOpenTab: (tab: ToolTab) => void;
  onOpenExport?: () => void;
}

export function ToolsOverviewStrip(props: ToolsOverviewStripProps) {
  const hint = useHoverHintBinder();
  const {
    issuesQueueCount,
    quickDocStats: docStats,
    spellHitCount,
    wordlistReady,
    goalEvaluation,
    repeatCount,
    checklistOpenCount,
    heavyToolsStale,
    activeTab,
    onOpenTab,
    onOpenExport,
  } = props;

  void heavyToolsStale;
  void docStats;

  const goalIssue = goalEvaluation.warnings.length > 0;
  const spellIssue = wordlistReady && spellHitCount > 0;
  const checklistIssue = checklistOpenCount > 0;

  const issuesIssue = issuesQueueCount > 0;

  const issuesPillHint = issuesIssue
    ? `${issuesQueueCount} item(s) in revision queue (checklist, goals, spelling)`
    : "Revision queue clear — open Issues tab";

  return (
    <div className="tools-overview-wrap">
    <div
      className="tools-overview-strip tools-overview-strip-minimal"
      role="toolbar"
      aria-label="Quick open: jump to a tool by stat"
    >
      <button
        type="button"
        className={`tools-overview-pill ${activeTab === "issues" ? "is-current" : ""} ${issuesIssue ? "has-attn" : ""}`}
        onClick={() => onOpenTab("issues")}
        {...hint(issuesPillHint)}
      >
        <span className="tools-overview-pill-k">
          {issuesIssue ? issuesQueueCount : "✓"}
        </span>
        <span className="tools-overview-pill-l">issues</span>
      </button>
      <button
        type="button"
        className={`tools-overview-pill ${activeTab === "spell" ? "is-current" : ""} ${spellIssue ? "has-attn" : ""}`}
        onClick={() => onOpenTab("spell")}
        {...hint(
          !wordlistReady
            ? "Dictionary loading…"
            : spellHitCount > 0
              ? `${spellHitCount} spelling flags — open Spell tab`
              : "No spelling flags — open Spell tab",
        )}
      >
        <span className="tools-overview-pill-k">
          {!wordlistReady ? "…" : spellHitCount}
        </span>
        <span className="tools-overview-pill-l">spell</span>
      </button>
      <button
        type="button"
        className={`tools-overview-pill ${activeTab === "repeat" ? "is-current" : ""} ${repeatCount > 0 ? "has-attn is-muted-attn" : ""}`}
        onClick={() => onOpenTab("repeat")}
        {...hint(
          repeatCount > 0
            ? `${repeatCount} repeated words (top list) — open Repeats tab`
            : "No repeats flagged — open Repeats tab",
        )}
      >
        <span className="tools-overview-pill-k">{repeatCount}</span>
        <span className="tools-overview-pill-l">repeats</span>
      </button>
      <button
        type="button"
        className={`tools-overview-pill ${activeTab === "goals" ? "is-current" : ""} ${goalIssue ? "has-attn" : ""}`}
        onClick={() => onOpenTab("goals")}
        {...hint(
          goalIssue
            ? `${goalEvaluation.warnings.length} goal warning(s) — open Goals tab`
            : "Goals on target — open Goals tab",
        )}
      >
        <span className="tools-overview-pill-k">
          {goalIssue ? goalEvaluation.warnings.length : "OK"}
        </span>
        <span className="tools-overview-pill-l">goals</span>
      </button>
      <button
        type="button"
        className={`tools-overview-pill ${checklistIssue ? "has-attn" : ""}`}
        onClick={() => onOpenExport?.()}
        {...hint(
          checklistIssue
            ? `${checklistOpenCount} checklist item(s) open — review before export`
            : "Publication checklist clear — open Export",
        )}
      >
        <span className="tools-overview-pill-k">
          {checklistIssue ? checklistOpenCount : "✓"}
        </span>
        <span className="tools-overview-pill-l">ready</span>
      </button>
    </div>
</div>
  );
}
