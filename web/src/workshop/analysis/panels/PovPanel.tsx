import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftConflictCard,
  CraftSummary,
  TripleDistributionBar,
} from "@/workshop/analysis/tools/CraftCards";
import { LiveSectionTitle } from "../ToolTabBar";

export interface PovPanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  storyLines: string[];
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

function povLabel(p: string): string {
  if (p === "first") return "1st person";
  if (p === "second") return "2nd person";
  if (p === "third") return "3rd person";
  if (p === "mixed") return "mixed";
  return "—";
}

function povCue(p: string): string {
  if (p === "first") return "I / we / my";
  if (p === "second") return "you / your";
  if (p === "third") return "he / she / they";
  return "—";
}

export function PovPanel({
  docStats,
  craft,
  storyLines,
  heavyToolsStale,
  goToLine,
}: PovPanelProps) {
  const p = craft.pov;
  const total = p.totals.first + p.totals.second + p.totals.third;

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
          <CraftSummary
            stats={[
              {
                value: povLabel(p.dominant),
                label: "dominant POV",
                tone: p.dominant === "mixed" ? "loud" : "craft",
              },
              { value: p.totals.first, label: "1st" },
              { value: p.totals.second, label: "2nd" },
              { value: p.totals.third, label: "3rd" },
              {
                value: p.conflicts.length,
                label: p.conflicts.length === 1 ? "off-POV line" : "off-POV lines",
                tone: p.conflicts.length > 0 ? "loud" : "default",
              },
            ]}
            hint={
              p.dominant === "mixed" ? (
                <>No POV holds a clear majority. Short stories usually stick to one.</>
              ) : p.dominant !== "unknown" ? (
                <>
                  Cue words for <strong>{povLabel(p.dominant)}</strong>:{" "}
                  <em>{povCue(p.dominant)}</em>.
                </>
              ) : null
            }
          />

          <TripleDistributionBar
            first={{ label: "1st", value: p.totals.first }}
            second={{ label: "2nd", value: p.totals.second }}
            third={{ label: "3rd", value: p.totals.third }}
          />

          {p.conflicts.length > 0 ? (
            <>
              <h4 className="rep-pattern-title">
                Off-POV lines{" "}
                <span className="muted small">— {p.conflicts.length}</span>
              </h4>
              <ul className="rep-card-list">
                {p.conflicts.slice(0, 30).map((c) => (
                  <CraftConflictCard
                    key={c.line}
                    line={c.line}
                    text={storyLines[c.line - 1] ?? ""}
                    badge={povLabel(c.dominant)}
                    detail={
                      <>
                        {c.first}·1st {c.second}·2nd {c.third}·3rd
                      </>
                    }
                    goToLine={goToLine}
                  />
                ))}
              </ul>
              {p.conflicts.length > 30 ? (
                <p className="muted small">
                  …and {p.conflicts.length - 30} more.
                </p>
              ) : null}
            </>
          ) : (
            <p className="muted small">
              ✓ No POV conflicts detected — every line that uses a pronoun matches
              the document&apos;s point of view.
            </p>
          )}
        </>
      )}
    </div>
  );
}
