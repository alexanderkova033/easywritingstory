import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftBeatList,
  CraftControls,
  CraftStatCard,
  CraftToggle,
  TripleDistributionBar,
  type BeatSegment,
} from "@/workshop/analysis/tools/CraftCards";
import { LiveSectionTitle } from "../ToolTabBar";

export interface PovPanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  storyLines: string[];
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

function povName(p: string): string {
  if (p === "first") return "first person";
  if (p === "second") return "second person";
  if (p === "third") return "third person";
  return "mixed";
}

function povCue(p: string): string {
  if (p === "first") return "I / we / my";
  if (p === "second") return "you / your";
  if (p === "third") return "he / she / they";
  return "";
}

const MAX_ROWS = 80;

export function PovPanel({
  docStats,
  craft,
  storyLines,
  heavyToolsStale,
  goToLine,
}: PovPanelProps) {
  const p = craft.pov;
  const [hideNeutral, setHideNeutral] = useState(true);
  const [offOnly, setOffOnly] = useState(false);

  const total = p.totals.first + p.totals.second + p.totals.third;
  const dominant = p.dominant;
  const dominantTotal =
    dominant === "first"
      ? p.totals.first
      : dominant === "second"
        ? p.totals.second
        : dominant === "third"
          ? p.totals.third
          : 0;
  const dominantPct = total > 0 ? Math.round((dominantTotal / total) * 100) : 0;

  let tone: "good" | "warn" | "info" = "info";
  let title: string;
  let metric: string | undefined;
  let metricLabel: string | undefined;
  let progress: number | undefined;
  let hint: string | undefined;
  if (total === 0) {
    title = "No POV pronouns yet";
    hint = "Detected from I/we, you, and he/she/they.";
  } else if (dominant === "mixed") {
    tone = "warn";
    title = "POV is split — pick one";
    metric = "mixed";
    hint = "Short stories usually pick one POV and hold it the whole way through.";
  } else if (p.conflicts.length === 0) {
    tone = "good";
    title = `Consistent ${povName(dominant)}`;
    metric = `${dominantPct}%`;
    metricLabel = povCue(dominant);
    progress = dominantPct / 100;
  } else {
    tone = "warn";
    const n = p.conflicts.length;
    title = `Mostly ${povName(dominant)} — ${n} slip`;
    metric = String(n);
    metricLabel = "off";
    progress = dominantPct / 100;
    hint = "Each paragraph below shows its pronoun mix and a fit %.";
  }

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
          <CraftStatCard
            tone={tone}
            title={title}
            metric={metric}
            metricLabel={metricLabel}
            progress={progress}
            hint={hint}
          />

          <TripleDistributionBar
            first={{ label: "1st", value: p.totals.first }}
            second={{ label: "2nd", value: p.totals.second }}
            third={{ label: "3rd", value: p.totals.third }}
          />

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
