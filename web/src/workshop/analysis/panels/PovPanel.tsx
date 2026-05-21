import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftConflictCard,
  CraftHeadline,
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

export function PovPanel({
  docStats,
  craft,
  storyLines,
  heavyToolsStale,
  goToLine,
}: PovPanelProps) {
  const p = craft.pov;
  const total = p.totals.first + p.totals.second + p.totals.third;

  let tone: "good" | "warn" | "info" = "info";
  let title = "";
  let detail = "";

  if (total === 0) {
    title = "No personal pronouns yet.";
    detail = "POV is detected from I/we, you, and he/she/they.";
  } else if (p.dominant === "mixed") {
    tone = "warn";
    title = "No POV holds a clear majority.";
    detail = "Short stories usually pick one — switching mid-story is jarring.";
  } else if (p.conflicts.length === 0) {
    tone = "good";
    title = `Consistent ${povName(p.dominant)} throughout.`;
    detail = `Cue words: ${povCue(p.dominant)}.`;
  } else {
    tone = "warn";
    const n = p.conflicts.length;
    title = `Mostly ${povName(p.dominant)} — ${n} line${n === 1 ? "" : "s"} slip into another POV.`;
    detail = `Each line below uses pronouns that don’t match the dominant ${povName(p.dominant)} read.`;
  }

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
          <CraftHeadline tone={tone} title={title} detail={detail} />

          <TripleDistributionBar
            first={{ label: "1st", value: p.totals.first }}
            second={{ label: "2nd", value: p.totals.second }}
            third={{ label: "3rd", value: p.totals.third }}
          />

          {p.conflicts.length > 0 ? (
            <>
              <div className="craft-section-head">
                <h4 className="craft-section-title">Lines that don’t match</h4>
                <span className="muted small">
                  doc reads as <strong>{povName(p.dominant)}</strong>
                </span>
              </div>
              <ul className="craft-finding-list">
                {p.conflicts.slice(0, 30).map((c) => (
                  <CraftConflictCard
                    key={c.line}
                    line={c.line}
                    text={storyLines[c.line - 1] ?? ""}
                    badge={`reads as ${povName(c.dominant)}`}
                    detail={`Pronouns on this line: ${c.first} first · ${c.second} second · ${c.third} third`}
                    goToLine={goToLine}
                  />
                ))}
              </ul>
              {p.conflicts.length > 30 ? (
                <p className="muted small">…and {p.conflicts.length - 30} more.</p>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
