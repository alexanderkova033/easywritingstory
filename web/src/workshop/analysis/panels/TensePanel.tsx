import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftBeatList,
  CraftControls,
  CraftDocMap,
  CraftFactStrip,
  CraftToggle,
  type BeatSegment,
  type DocMapMark,
} from "@/workshop/analysis/tools/CraftCards";
import { LiveSectionTitle } from "../ToolTabBar";

export interface TensePanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  storyLines: string[];
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
  peekToLine?: (line1Based: number, word?: string) => void;
  clearHoverPeek?: () => void;
}

const MAX_ROWS = 80;

export function TensePanel({
  docStats,
  craft,
  storyLines,
  heavyToolsStale,
  goToLine,
  peekToLine,
  clearHoverPeek,
}: TensePanelProps) {
  const t = craft.tense;
  const [hideNeutral, setHideNeutral] = useState(true);
  const [offOnly, setOffOnly] = useState(false);

  const total = t.totals.past + t.totals.present;
  const dominant = t.dominant;
  const totalParas = Math.max(1, docStats.totalLines);
  const pastPct = total > 0 ? Math.round((t.totals.past / total) * 100) : 0;
  const presentPct = total > 0 ? 100 - pastPct : 0;

  const offMarks: DocMapMark[] = useMemo(() => {
    if (dominant === "mixed" || dominant === "unknown") return [];
    const marks: DocMapMark[] = [];
    for (const tl of t.perLine) {
      if (tl.dominant === "none" || tl.dominant === dominant) continue;
      marks.push({
        paragraph: tl.line,
        color: "g",
        weight: 2,
      });
    }
    return marks;
  }, [t.perLine, dominant]);

  const rows = useMemo(() => {
    const out: Array<{
      paragraph: number;
      segments: BeatSegment[];
      fitPercent: number | null;
      fitLabel?: string;
      badge?: string;
      title?: string;
      lineDominant: string;
    }> = [];
    const cap = 6;
    for (const tl of t.perLine) {
      const past = Math.min(tl.past, cap);
      const present = Math.min(tl.present, cap);
      const lineTotal = tl.past + tl.present;
      const pastKind: BeatSegment["kind"] = dominant === "past" ? "primary" : "warn";
      const presKind: BeatSegment["kind"] = dominant === "present" ? "primary" : "warn";
      const segments: BeatSegment[] = [
        { kind: pastKind, weight: past },
        { kind: presKind, weight: present },
      ];
      let fit: number | null = null;
      if (lineTotal > 0 && (dominant === "past" || dominant === "present")) {
        const match = dominant === "past" ? tl.past : tl.present;
        fit = Math.round((match / lineTotal) * 100);
      }
      const text = (storyLines[tl.line - 1] ?? "").trim();
      const preview = text.length > 80 ? `${text.slice(0, 77)}…` : text;
      out.push({
        paragraph: tl.line,
        segments,
        fitPercent: fit,
        fitLabel: tl.dominant === "none" ? undefined : tl.dominant,
        badge:
          tl.dominant !== "none" && tl.dominant !== dominant
            ? `reads as ${tl.dominant}`
            : undefined,
        title: preview
          ? `${preview}\n${tl.past} past · ${tl.present} present`
          : `${tl.past} past · ${tl.present} present`,
        lineDominant: tl.dominant,
      });
    }
    return out;
  }, [t.perLine, dominant, storyLines]);

  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => {
        if (hideNeutral && r.lineDominant === "none") return false;
        if (offOnly) {
          if (dominant === "mixed" || dominant === "unknown") return false;
          if (r.lineDominant === "none" || r.lineDominant === dominant) return false;
        }
        return true;
      })
      .slice(0, MAX_ROWS);
  }, [rows, hideNeutral, offOnly, dominant]);

  return (
    <div
      className="tool-block tool-block-live"
      id="tool-panel-tense"
      role="tabpanel"
      aria-labelledby="tool-tab-tense"
    >
      <LiveSectionTitle>Tense</LiveSectionTitle>
      {docStats.nonEmptyLines === 0 ? <NoLinesYetHint /> : null}
      {heavyToolsStale ? (
        <p className="tools-stale-hint muted small" role="status" aria-live="polite">
          Tools updating…
        </p>
      ) : null}

      {total === 0 ? (
        <EmptyState title="No tense markers yet">
          <p className="muted small">
            Past- and present-tense verbs are detected by common forms (<em>was</em>,{" "}
            <em>is</em>, <em>walked</em>, <em>walks</em>) and the <code>-ed</code>{" "}
            suffix.
          </p>
        </EmptyState>
      ) : (
        <>
          <CraftFactStrip
            facts={[
              {
                value: `${pastPct}%`,
                label: "past",
                progress: pastPct / 100,
                color: dominant === "past" ? "b" : "a",
              },
              {
                value: `${presentPct}%`,
                label: "present",
                progress: presentPct / 100,
                color: dominant === "present" ? "b" : "g",
              },
              {
                value: t.conflicts.length,
                label: t.conflicts.length === 1 ? "off-tense ¶" : "off-tense ¶s",
                color: t.conflicts.length > 0 ? "e" : undefined,
                onActivate:
                  t.conflicts.length > 0
                    ? () => goToLine(t.conflicts[0]!.line)
                    : undefined,
              },
            ]}
            caption={
              dominant === "mixed" || dominant === "unknown"
                ? "Past and present appear in roughly equal share."
                : `Reads as ${dominant} tense. Click a tick to jump.`
            }
          />

          {offMarks.length > 0 ? (
            <CraftDocMap
              marks={offMarks}
              totalParagraphs={totalParas}
              goToParagraph={goToLine}
              peekParagraph={peekToLine}
              clearPeek={clearHoverPeek}
              hint={`Each tick is a paragraph that reads as ${dominant === "past" ? "present" : "past"} instead.`}
            />
          ) : null}

          <CraftControls ariaLabel="Tense filters">
            <CraftToggle
              checked={hideNeutral}
              onChange={setHideNeutral}
              label="Hide neutral"
            />
            <CraftToggle
              checked={offOnly}
              onChange={setOffOnly}
              label="Off-tense only"
            />
            <span className="muted small craft-controls-legend">
              <span className="craft-beat craft-beat--primary craft-beat--legend" /> dominant
              <span className="craft-beat craft-beat--warn craft-beat--legend" /> off
            </span>
          </CraftControls>

          {filteredRows.length === 0 ? (
            <p className="muted small">No paragraphs match these filters.</p>
          ) : (
            <CraftBeatList rows={filteredRows} goToParagraph={goToLine} />
          )}

          {rows.length > filteredRows.length ? (
            <p className="muted small craft-list-footer">
              Showing {filteredRows.length} of {rows.length} paragraphs · adjust
              filters above.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
