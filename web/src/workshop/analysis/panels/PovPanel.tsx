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

export interface PovPanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  storyLines: string[];
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
  peekToLine?: (line1Based: number, word?: string) => void;
  clearHoverPeek?: () => void;
}

function povName(p: string): string {
  if (p === "first") return "first person";
  if (p === "second") return "second person";
  if (p === "third") return "third person";
  return "mixed";
}

const MAX_ROWS = 80;

export function PovPanel({
  docStats,
  craft,
  storyLines,
  heavyToolsStale,
  goToLine,
  peekToLine,
  clearHoverPeek,
}: PovPanelProps) {
  const p = craft.pov;
  const [hideNeutral, setHideNeutral] = useState(true);
  const [offOnly, setOffOnly] = useState(false);

  const total = p.totals.first + p.totals.second + p.totals.third;
  const dominant = p.dominant;
  const totalParas = Math.max(1, docStats.totalLines);

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const firstPct = pct(p.totals.first);
  const secondPct = pct(p.totals.second);
  const thirdPct = pct(p.totals.third);

  // Doc map of off-POV paragraphs so the writer sees clustering at a glance.
  const offMarks: DocMapMark[] = useMemo(() => {
    if (dominant === "mixed" || dominant === "unknown") return [];
    const marks: DocMapMark[] = [];
    for (const pl of p.perLine) {
      if (pl.dominant === "none" || pl.dominant === dominant) continue;
      marks.push({
        paragraph: pl.line,
        color: pl.dominant === "second" ? "g" : "e",
        weight: 2,
      });
    }
    return marks;
  }, [p.perLine, dominant]);

  // Build per-paragraph beat rows. Map kinds so dominant POV = primary, off = warn, third = accent.
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
    for (const pl of p.perLine) {
      const f = Math.min(pl.first, cap);
      const s = Math.min(pl.second, cap);
      const t = Math.min(pl.third, cap);
      const totalLine = pl.first + pl.second + pl.third;
      const mapKind = (which: "first" | "second" | "third"): BeatSegment["kind"] => {
        if (dominant === which) return "primary";
        if (dominant === "mixed" || dominant === "unknown") {
          return which === "first" ? "primary" : which === "second" ? "warn" : "accent";
        }
        return which === "second" || (which === "third" && dominant === "first")
          ? "warn"
          : "accent";
      };
      const segments: BeatSegment[] = [
        { kind: mapKind("first"), weight: f },
        { kind: mapKind("second"), weight: s },
        { kind: mapKind("third"), weight: t },
      ];
      // Fit % = share of beats that match the dominant POV.
      let fit: number | null = null;
      if (totalLine > 0 && (dominant === "first" || dominant === "second" || dominant === "third")) {
        const matching =
          dominant === "first" ? pl.first : dominant === "second" ? pl.second : pl.third;
        fit = Math.round((matching / totalLine) * 100);
      }
      const text = (storyLines[pl.line - 1] ?? "").trim();
      const preview = text.length > 80 ? `${text.slice(0, 77)}…` : text;
      out.push({
        paragraph: pl.line,
        segments,
        fitPercent: fit,
        fitLabel: pl.dominant === "none" ? undefined : pl.dominant,
        badge:
          pl.dominant !== "none" && pl.dominant !== dominant
            ? povName(pl.dominant)
            : undefined,
        title: preview
          ? `${preview}\n${pl.first} 1st · ${pl.second} 2nd · ${pl.third} 3rd`
          : `${pl.first} 1st · ${pl.second} 2nd · ${pl.third} 3rd`,
        lineDominant: pl.dominant,
      });
    }
    return out;
  }, [p.perLine, dominant, storyLines]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (hideNeutral && r.lineDominant === "none") return false;
      if (offOnly) {
        if (dominant === "mixed" || dominant === "unknown") return false;
        if (r.lineDominant === "none" || r.lineDominant === dominant) return false;
      }
      return true;
    }).slice(0, MAX_ROWS);
  }, [rows, hideNeutral, offOnly, dominant]);

  return (
    <div
      className="tool-block tool-block-live"
      id="tool-panel-pov"
      role="tabpanel"
      aria-labelledby="tool-tab-pov"
    >
      <LiveSectionTitle>Point of view</LiveSectionTitle>
      {docStats.nonEmptyLines === 0 ? <NoLinesYetHint /> : null}
      {heavyToolsStale ? (
        <p className="tools-stale-hint muted small" role="status" aria-live="polite">
          Tools updating…
        </p>
      ) : null}

      {total === 0 ? (
        <EmptyState title="No POV markers yet">
          <p className="muted small">
            POV is detected from personal pronouns — I/we, you, or he/she/they.
          </p>
        </EmptyState>
      ) : (
        <>
          <CraftFactStrip
            facts={[
              {
                value: `${firstPct}%`,
                label: "1st (I/we)",
                progress: firstPct / 100,
                color: dominant === "first" ? "b" : "a",
              },
              {
                value: `${secondPct}%`,
                label: "2nd (you)",
                progress: secondPct / 100,
                color: dominant === "second" ? "b" : "g",
              },
              {
                value: `${thirdPct}%`,
                label: "3rd (he/she)",
                progress: thirdPct / 100,
                color: dominant === "third" ? "b" : "a",
              },
              {
                value: p.conflicts.length,
                label: p.conflicts.length === 1 ? "off-POV ¶" : "off-POV ¶s",
                color: p.conflicts.length > 0 ? "e" : undefined,
                onActivate:
                  p.conflicts.length > 0
                    ? () => goToLine(p.conflicts[0]!.line)
                    : undefined,
              },
            ]}
            caption={
              dominant === "mixed" || dominant === "unknown"
                ? "Mixed POV — three perspectives appear in roughly equal share."
                : `Reads as ${povName(dominant)}. Hover ticks below to peek at off-POV paragraphs.`
            }
          />

          {offMarks.length > 0 ? (
            <CraftDocMap
              marks={offMarks}
              totalParagraphs={totalParas}
              goToParagraph={goToLine}
              peekParagraph={peekToLine}
              clearPeek={clearHoverPeek}
              hint="Each tick is a paragraph where a different POV pronoun appears."
            />
          ) : null}

          <CraftControls ariaLabel="POV filters">
            <CraftToggle
              checked={hideNeutral}
              onChange={setHideNeutral}
              label="Hide neutral"
            />
            <CraftToggle
              checked={offOnly}
              onChange={setOffOnly}
              label="Off-POV only"
            />
            <span className="muted small craft-controls-legend">
              <span className="craft-beat craft-beat--primary craft-beat--legend" /> dominant
              <span className="craft-beat craft-beat--warn craft-beat--legend" /> off
              <span className="craft-beat craft-beat--accent craft-beat--legend" /> third
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
