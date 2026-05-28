import type { ChangeEvent } from "react";
import type { SpellMode } from "@/workshop/library/local-draft-storage";
import type { SpellHit } from "@/spellcheck/scan";
import type { WorkshopGoals } from "@/workshop/goals/types";
import type { GoalEvaluation } from "@/workshop/goals/metrics";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { ChecklistItem } from "@/workshop/analysis/publication-checklist";
import type { RhymeCluster, StanzaClusterGroup } from "@/workshop/analysis/use-heavy-analysis";
import type {
  RepeatedWord,
  RepetitionAnalysis,
} from "@/workshop/analysis/repeated-words";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import type { RevisionSnapshot } from "@/workshop/library/revision-snapshots";
import type { LineDiffRow } from "@/workshop/library/diff-lines";
// Opaque stubs — meter machinery has been removed; these prop slots are dead
// weight kept on the interface until callers stop passing them.
type LineMeterHint = unknown;
type ManualStressOverrides = Record<string, string>;
import { StuckHelper } from "./StuckHelper";
import type { ClicheHit } from "@/workshop/analysis/cliche-scan";
import {
  RevisionCompareSection,
  type CompareSnapshotOption,
} from "./RevisionCompareSection";
import type { ToolTab } from "@/workshop/shell/workshop-helpers";
import type { RhymeBreadth } from "@/workshop/analysis/use-heavy-analysis";
import { IssuesPanel } from "./panels/IssuesPanel";
import { GoalsPanel } from "./panels/GoalsPanel";
import { RepeatPanel, type RepeatSubTab } from "./panels/RepeatPanel";
import { SpellPanel } from "./panels/SpellPanel";
import { DialoguePanel } from "./panels/DialoguePanel";
import { PovPanel } from "./panels/PovPanel";
import { TensePanel } from "./panels/TensePanel";
import { ShowTellPanel } from "./panels/ShowTellPanel";
import { AdverbsPanel } from "./panels/AdverbsPanel";
import { CharactersPanel } from "./panels/CharactersPanel";
import { ParagraphsPanel } from "./panels/ParagraphsPanel";


export interface WorkshopToolPanelsProps {
  toolTab: ToolTab;
  /** Used to namespace per-story persisted state (e.g. ignored craft items). */
  storyId: string;
  docStats: DocumentStats;
  meterHints: LineMeterHint[];
  goals: WorkshopGoals;
  goalEvaluation: GoalEvaluation;
  publication: { items: ChecklistItem[]; tips: string[] };
  rhymeClusters: RhymeCluster[];
  vowelTailClusters: RhymeCluster[];
  assonanceClusters: RhymeCluster[];
  consonanceClusters: RhymeCluster[];
  stanzaRhymeGroups: StanzaClusterGroup[];
  clicheHits: ClicheHit[];
  repeated: RepeatedWord[];
  repetition: RepetitionAnalysis;
  repeatSubTab: RepeatSubTab;
  setRepeatSubTab: (t: RepeatSubTab) => void;
  craft: StoryCraftAnalysis;
  spellHits: SpellHit[];
  wordlist: Set<string> | null;
  wordlistErr: string | null;
  spellMode: SpellMode;
  onSpellModeChange: (mode: SpellMode) => void;
  goToLine: (line1Based: number) => void;
  goToLineEnd: (line1Based: number) => void;
  /** Select just the matched word range inside a line; falls back to whole-line. */
  goToWordInLine: (line1Based: number, word: string) => void;
  /** Live-scroll the editor to a line on hover/focus — no focus, no cursor move. */
  peekToLine: (line1Based: number, word?: string) => void;
  /** Clear the hover-peek highlight (called on mouseleave / blur). */
  clearHoverPeek: () => void;
  goToSpellHitAt: (hit: SpellHit) => void;
  cycleSpellHit: (delta: number) => void;
  spellNavIndex: number;
  applySpellSuggestion: (hit: SpellHit, replacement: string) => boolean;
  applySpellSuggestionAll: (normalized: string, replacement: string) => boolean;
  spellBump: number;
  refreshSpell: () => void;
  onSpellPersistenceError: (message: string) => void;
  updateGoal: (
    key: keyof WorkshopGoals,
  ) => (e: ChangeEvent<HTMLInputElement>) => void;
  setGoalValue: (key: keyof WorkshopGoals, value: number | undefined) => void;
  setRhymeSchemeGoal: (scheme: string | undefined) => void;
  setRhymeSchemePerStanza: (perStanza: boolean) => void;
  resetGoals: () => void;
  toggleGoalSoft: (key: string) => void;
  applyGoalPreset: (presetKey: string | null) => void;
  revisions: RevisionSnapshot[];
  snapshotLabel: string;
  onSnapshotLabelChange: (v: string) => void;
  onSaveSnapshot: () => void;
  snapshotFlash: "saved" | "duplicate" | null;
  onRestoreRevision: (snap: RevisionSnapshot) => void;
  onDeleteRevision: (id: string) => void;
  onDeleteDuplicateRevisions: () => void;
  duplicateRevisionCount: number;
  /** Open inline word-level diff in the editor against this snapshot. */
  onDiffSnapshot?: (snap: RevisionSnapshot) => void;
  /** ID of snapshot currently shown as inline diff, or null. */
  activeDiffSnapshotId?: string | null;
  compareLeftId: string;
  compareRightId: string;
  onCompareLeftChange: (id: string) => void;
  onCompareRightChange: (id: string) => void;
  compareViewMode: "side" | "diff";
  onCompareViewModeChange: (mode: "side" | "diff") => void;
  compareSnapshotOptions: CompareSnapshotOption[];
  compareLeftBody: string;
  compareRightBody: string;
  compareDiffRows: LineDiffRow[];
  onOpenToolTab: (tab: ToolTab) => void;
  focusStoryTitle: () => void;
  stressLexiconReady: boolean;
  stressLexiconErr: string | null;
  heavyToolsStale: boolean;
  storyTitle: string;
  storyLines: string[];
  onInsertSuggestion?: (text: string) => void;
  onInsertSuggestionAtCursor?: (text: string) => void;
  onInsertWord?: (text: string) => void;
  onReplaceLine?: (lineNum: number, text: string) => void;
  selectedText?: string | null;
  rhymeBreadth: RhymeBreadth;
  onRhymeBreadthChange: (b: RhymeBreadth) => void;
  cursorLine?: number;
  rhymeFinderQuery?: { word: string; bump: number; expand?: boolean };
  onRhymeSuggestionHover?: (word: string | null) => void;
  manualRhymeLinks?: string[];
  onAddManualRhymeLink?: (a: string, b: string) => void;
  onRemoveManualRhymeLink?: (key: string) => void;
  manualRhymeUnlinks?: string[];
  onAddManualRhymeUnlink?: (a: string, b: string) => void;
  onRemoveManualRhymeUnlink?: (key: string) => void;
  stressLexicon: ReadonlyMap<string, string> | null;
  manualStressOverrides: ManualStressOverrides;
  onSetStressOverride: (word: string, pattern: string) => void;
  onRemoveStressOverride: (word: string) => void;
}

export function WorkshopToolPanels(props: WorkshopToolPanelsProps) {
  const { toolTab } = props;

  return (
    <div className="tool-tab-panel" key={toolTab}>
      {toolTab === "issues" ? (
        <IssuesPanel
          wordlist={props.wordlist}
          goalEvaluation={props.goalEvaluation}
          publication={props.publication}
          spellHits={props.spellHits}
          clicheHits={props.clicheHits}
          heavyToolsStale={props.heavyToolsStale}
          goToLine={props.goToLine}
          goToSpellHitAt={props.goToSpellHitAt}
          applySpellSuggestion={props.applySpellSuggestion}
          applySpellSuggestionAll={props.applySpellSuggestionAll}
          refreshSpell={props.refreshSpell}
          onOpenToolTab={props.onOpenToolTab}
          focusStoryTitle={props.focusStoryTitle}
        />
      ) : null}

      {toolTab === "paragraphs" ? (
        <ParagraphsPanel
          docStats={props.docStats}
          storyLines={props.storyLines}
          heavyToolsStale={props.heavyToolsStale}
          goToLine={props.goToLine}
        />
      ) : null}

      {toolTab === "goals" ? (
        <GoalsPanel
          goals={props.goals}
          goalEvaluation={props.goalEvaluation}
          docStats={props.docStats}
          goToLine={props.goToLine}
          setGoalValue={props.setGoalValue}
          setRhymeSchemeGoal={props.setRhymeSchemeGoal}
          setRhymeSchemePerStanza={props.setRhymeSchemePerStanza}
          resetGoals={props.resetGoals}
          toggleGoalSoft={props.toggleGoalSoft}
          applyGoalPreset={props.applyGoalPreset}
        />
      ) : null}

      {toolTab === "repeat" ? (
        <RepeatPanel
          storyId={props.storyId}
          docStats={props.docStats}
          repeated={props.repeated}
          repetition={props.repetition}
          heavyToolsStale={props.heavyToolsStale}
          goToLine={props.goToLine}
          goToWordInLine={props.goToWordInLine}
          peekToLine={props.peekToLine}
          clearHoverPeek={props.clearHoverPeek}
          subTab={props.repeatSubTab}
          setSubTab={props.setRepeatSubTab}
        />
      ) : null}

      {toolTab === "dialogue" ? (
        <DialoguePanel
          storyId={props.storyId}
          docStats={props.docStats}
          craft={props.craft}
          heavyToolsStale={props.heavyToolsStale}
          goToLine={props.goToLine}
          goToWordInLine={props.goToWordInLine}
          peekToLine={props.peekToLine}
          clearHoverPeek={props.clearHoverPeek}
        />
      ) : null}

      {toolTab === "pov" ? (
        <PovPanel
          docStats={props.docStats}
          craft={props.craft}
          storyLines={props.storyLines}
          heavyToolsStale={props.heavyToolsStale}
          goToLine={props.goToLine}
        />
      ) : null}

      {toolTab === "tense" ? (
        <TensePanel
          docStats={props.docStats}
          craft={props.craft}
          storyLines={props.storyLines}
          heavyToolsStale={props.heavyToolsStale}
          goToLine={props.goToLine}
        />
      ) : null}

      {toolTab === "showtell" ? (
        <ShowTellPanel
          storyId={props.storyId}
          docStats={props.docStats}
          craft={props.craft}
          heavyToolsStale={props.heavyToolsStale}
          goToLine={props.goToLine}
          goToWordInLine={props.goToWordInLine}
          peekToLine={props.peekToLine}
          clearHoverPeek={props.clearHoverPeek}
        />
      ) : null}

      {toolTab === "adverbs" ? (
        <AdverbsPanel
          storyId={props.storyId}
          docStats={props.docStats}
          craft={props.craft}
          heavyToolsStale={props.heavyToolsStale}
          goToLine={props.goToLine}
          goToWordInLine={props.goToWordInLine}
          peekToLine={props.peekToLine}
          clearHoverPeek={props.clearHoverPeek}
        />
      ) : null}

      {toolTab === "characters" ? (
        <CharactersPanel
          docStats={props.docStats}
          craft={props.craft}
          storyLines={props.storyLines}
          heavyToolsStale={props.heavyToolsStale}
          goToLine={props.goToLine}
          goToWordInLine={props.goToWordInLine}
          peekToLine={props.peekToLine}
          clearHoverPeek={props.clearHoverPeek}
        />
      ) : null}

      {toolTab === "spell" ? (
        <SpellPanel
          docStats={props.docStats}
          spellHits={props.spellHits}
          wordlist={props.wordlist}
          wordlistErr={props.wordlistErr}
          spellMode={props.spellMode}
          onSpellModeChange={props.onSpellModeChange}
          goToSpellHitAt={props.goToSpellHitAt}
          applySpellSuggestion={props.applySpellSuggestion}
          applySpellSuggestionAll={props.applySpellSuggestionAll}
          spellBump={props.spellBump}
          refreshSpell={props.refreshSpell}
          onSpellPersistenceError={props.onSpellPersistenceError}
          heavyToolsStale={props.heavyToolsStale}
        />
      ) : null}

      {toolTab === "snapshots" ? (
        <div
          className="tool-block tool-block-snapshots"
          id="tool-panel-snapshots"
          role="tabpanel"
          aria-labelledby="tool-tab-snapshots"
        >
          <RevisionCompareSection
            embedInTools
            revisions={props.revisions}
            snapshotLabel={props.snapshotLabel}
            onSnapshotLabelChange={props.onSnapshotLabelChange}
            onSaveSnapshot={props.onSaveSnapshot}
            snapshotFlash={props.snapshotFlash}
            onRestoreRevision={props.onRestoreRevision}
            onDeleteRevision={props.onDeleteRevision}
            onDeleteDuplicates={props.onDeleteDuplicateRevisions}
            duplicateCount={props.duplicateRevisionCount}
            onDiffSnapshot={props.onDiffSnapshot}
            activeDiffSnapshotId={props.activeDiffSnapshotId}
            compareLeftId={props.compareLeftId}
            compareRightId={props.compareRightId}
            onCompareLeftChange={props.onCompareLeftChange}
            onCompareRightChange={props.onCompareRightChange}
            compareViewMode={props.compareViewMode}
            onCompareViewModeChange={props.onCompareViewModeChange}
            compareSnapshotOptions={props.compareSnapshotOptions}
            compareLeftBody={props.compareLeftBody}
            compareRightBody={props.compareRightBody}
            compareDiffRows={props.compareDiffRows}
          />
        </div>
      ) : null}

      {toolTab === "suggest" ? (
        <div
          className="tool-block"
          id="tool-panel-suggest"
          role="tabpanel"
          aria-labelledby="tool-tab-suggest"
        >
          <StuckHelper
            title={props.storyTitle}
            lines={props.storyLines}
            onInsert={props.onInsertSuggestion}
            onInsertAtCursor={props.onInsertSuggestionAtCursor}
            cursorLine={props.cursorLine}
            selectedText={props.selectedText}
          />
        </div>
      ) : null}

    </div>
  );
}
