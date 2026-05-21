import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftConflictCard,
  CraftHeadline,
  DistributionBar,
} from "@/workshop/analysis/tools/CraftCards";
import { LiveSectionTitle } from "../ToolTabBar";

export interface TensePanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  storyLines: string[];
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

export function TensePanel({
  docStats,
  craft,
  storyLines,
  heavyToolsStale,
  goToLine,
}: TensePanelProps) {
  const t = craft.tense;
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
    detail = "Every line that uses a verb stays in the same tense.";
  } else {
    tone = "warn";
    const off = dominant === "past" ? "present" : "past";
    const n = t.conflicts.length;
    title = `Mostly ${dominant} tense — ${n} line${n === 1 ? "" : "s"} slip into ${off}.`;
    detail = `Check the lines below — each leans toward ${off} when the rest of the story is in ${dominant}.`;
  }

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

          {t.conflicts.length > 0 ? (
            <>
              <div className="craft-section-head">
                <h4 className="craft-section-title">Lines that don’t match</h4>
                <span className="muted small">
                  doc reads as <strong>{dominant}</strong>
                </span>
              </div>
              <ul className="craft-finding-list">
                {t.conflicts.slice(0, 30).map((c) => (
                  <CraftConflictCard
                    key={c.line}
                    line={c.line}
                    text={storyLines[c.line - 1] ?? ""}
                    badge={`reads as ${c.dominant}`}
                    detail={`Verbs on this line: ${c.past} past · ${c.present} present`}
                    goToLine={goToLine}
                  />
                ))}
              </ul>
              {t.conflicts.length > 30 ? (
                <p className="muted small">…and {t.conflicts.length - 30} more.</p>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
