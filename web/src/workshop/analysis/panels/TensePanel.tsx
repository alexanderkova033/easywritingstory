import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftBeatList,
  CraftControls,
  CraftHeadline,
  CraftToggle,
  DistributionBar,
  type BeatSegment,
} from "@/workshop/analysis/tools/CraftCards";
import { LiveSectionTitle } from "../ToolTabBar";

export interface TensePanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  storyLines: string[];
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

const MAX_ROWS = 80;

export function TensePanel({
  docStats,
  craft,
  storyLines,
  heavyToolsStale,
  goToLine,
}: TensePanelProps) {
  const t = craft.tense;
  const [hideNeutral, setHideNeutral] = useState(true);
  const [offOnly, setOffOnly] = useState(false);

  const total = t.totals.past + t.totals.present;
  const dominant = t.dominant;

  let tone: "good" | "warn" | "info" = "info";
  let title = "";
  let detail = "";
  if (total === 0) {
    title = "No verbs detected yet.";
    detail = "Past- and present-tense verbs are spotted by common forms and -ed suffixes.";
  } else if (dominant === "mixed") {
    tone = "warn";
    title = "Tense is mixed.";
    detail = "Short stories usually pick one tense and hold it the whole way through.";
  } else if (t.conflicts.length === 0) {
    tone = "good";
    title = `Consistent ${dominant} tense throughout.`;
    detail = "Every paragraph that uses a verb stays in the same tense.";
  } else {
    tone = "warn";
    const off = dominant === "past" ? "present" : "past";
    const n = t.conflicts.length;
    title = `Mostly ${dominant} tense — ${n} paragraph${n === 1 ? "" : "s"} slip into ${off}.`;
    detail = "Each paragraph below shows its past/present mix and a fit %.";
  }

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
          <CraftHeadline tone={tone} title={title} detail={detail} />

          <DistributionBar
            left={{ label: "past", value: t.totals.past, tone: dominant === "past" ? "primary" : "warn" }}
            right={{ label: "present", value: t.totals.present, tone: dominant === "present" ? "primary" : "warn" }}
          />

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
