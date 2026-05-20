import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftConflictCard,
  CraftSummary,
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

function tenseLabel(t: string): string {
  if (t === "past") return "past";
  if (t === "present") return "present";
  if (t === "mixed") return "mixed";
  return "—";
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
  const off = dominant === "past" ? "present" : "past";

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
          <CraftSummary
            stats={[
              {
                value: tenseLabel(dominant),
                label: "dominant tense",
                tone: dominant === "mixed" ? "loud" : "craft",
              },
              { value: t.totals.past, label: "past verbs" },
              { value: t.totals.present, label: "present verbs" },
              {
                value: t.conflicts.length,
                label: t.conflicts.length === 1 ? "off-tense line" : "off-tense lines",
                tone: t.conflicts.length > 0 ? "loud" : "default",
              },
            ]}
            hint={
              dominant === "mixed" ? (
                <>
                  Tense use is mixed. Short stories usually pick one and hold it the
                  whole way through.
                </>
              ) : dominant === "past" || dominant === "present" ? (
                <>
                  Mostly <strong>{dominant}</strong>. Watch for stray{" "}
                  <em>{off === "past" ? "past" : "present"}</em> verbs below.
                </>
              ) : null
            }
          />

          <DistributionBar
            left={{ label: "past", value: t.totals.past, tone: dominant === "past" ? "primary" : "warn" }}
            right={{ label: "present", value: t.totals.present, tone: dominant === "present" ? "primary" : "warn" }}
          />

          {t.conflicts.length > 0 ? (
            <>
              <h4 className="rep-pattern-title">
                Off-tense lines{" "}
                <span className="muted small">— {t.conflicts.length}</span>
              </h4>
              <ul className="rep-card-list">
                {t.conflicts.slice(0, 30).map((c) => (
                  <CraftConflictCard
                    key={c.line}
                    line={c.line}
                    text={storyLines[c.line - 1] ?? ""}
                    badge={tenseLabel(c.dominant)}
                    detail={
                      <>
                        {c.past}·past {c.present}·present
                      </>
                    }
                    goToLine={goToLine}
                  />
                ))}
              </ul>
              {t.conflicts.length > 30 ? (
                <p className="muted small">
                  …and {t.conflicts.length - 30} more.
                </p>
              ) : null}
            </>
          ) : dominant === "past" || dominant === "present" ? (
            <p className="muted small">
              ✓ No tense conflicts detected — every line that uses a verb keeps to{" "}
              <strong>{dominant}</strong>.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
