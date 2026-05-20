import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, JumpLineList, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftFilterRow,
  CraftSummary,
  CraftWordCard,
} from "@/workshop/analysis/tools/CraftCards";
import { LiveSectionTitle } from "../ToolTabBar";

export interface DialoguePanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

export function DialoguePanel({
  docStats,
  craft,
  heavyToolsStale,
  goToLine,
}: DialoguePanelProps) {
  const d = craft.dialogue;
  const [filter, setFilter] = useState("");

  const filteredVerbs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return d.verbCounts;
    return d.verbCounts.filter((v) => v.verb.toLowerCase().includes(q));
  }, [d.verbCounts, filter]);

  const snippetsByVerb = useMemo(() => {
    const map = new Map<string, { line: number; text: string }[]>();
    for (const o of d.occurrences) {
      const arr = map.get(o.verb) ?? [];
      arr.push({ line: o.line, text: o.lineText });
      map.set(o.verb, arr);
    }
    return map;
  }, [d.occurrences]);

  const saidRatio = d.saidCount + d.strongTagCount > 0
    ? Math.round((d.saidCount / (d.saidCount + d.strongTagCount)) * 100)
    : 0;

  return (
    <div
      className="tool-block tool-block-live"
      id="tool-panel-dialogue"
      role="tabpanel"
      aria-labelledby="tool-tab-dialogue"
    >
      <LiveSectionTitle>Dialogue</LiveSectionTitle>
      {docStats.nonEmptyLines === 0 ? <NoLinesYetHint /> : null}
      {heavyToolsStale ? (
        <p className="tools-stale-hint muted small" role="status" aria-live="polite">
          Tools updating…
        </p>
      ) : null}

      {d.dialogueLineCount === 0 ? (
        <EmptyState title="No dialogue detected">
          <p className="muted small">
            Lines with quoted speech will show their attribution verbs here. Try
            wrapping a line in quotes: <em>“Wait,” she said.</em>
          </p>
        </EmptyState>
      ) : (
        <>
          <CraftSummary
            stats={[
              { value: d.dialogueLineCount, label: d.dialogueLineCount === 1 ? "line w/ speech" : "lines w/ speech" },
              { value: d.saidCount, label: "“said”", tone: "default" },
              { value: d.strongTagCount, label: "loud tags", tone: d.strongTagCount > d.saidCount ? "loud" : "default" },
              { value: d.unattributed.length, label: "untagged", tone: d.unattributed.length > 0 ? "loud" : "default" },
            ]}
            hint={
              d.saidCount + d.strongTagCount > 0 ? (
                <>
                  <strong>{saidRatio}%</strong> of attributed lines use plain{" "}
                  <em>said</em>. Most editors recommend keeping it the workhorse.
                </>
              ) : null
            }
          />

          {d.unattributed.length > 0 ? (
            <div className="craft-callout">
              <h4 className="rep-pattern-title">
                Lines without a clear tag{" "}
                <span className="muted small">— {d.unattributed.length}</span>
              </h4>
              <p className="muted small">
                Readers may lose track of who&apos;s speaking on line
                {d.unattributed.length === 1 ? " " : "s "}
                <JumpLineList
                  lineNumbers={d.unattributed.slice(0, 20)}
                  goToLine={goToLine}
                />
                {d.unattributed.length > 20
                  ? ` and ${d.unattributed.length - 20} more`
                  : null}
                .
              </p>
            </div>
          ) : null}

          {d.verbCounts.length > 0 ? (
            <>
              <h4 className="rep-pattern-title">
                Attribution verbs{" "}
                <span className="muted small">
                  — {d.verbCounts.length} distinct
                </span>
              </h4>
              <CraftFilterRow
                value={filter}
                onChange={setFilter}
                ariaLabel="Filter dialogue verbs"
                placeholder="whispered, yelled…"
              />
              {filteredVerbs.length === 0 ? (
                <p className="muted small">No verbs match this filter.</p>
              ) : (
                <ul className="rep-card-list">
                  {filteredVerbs.map((v) => (
                    <CraftWordCard
                      key={v.verb}
                      title={v.verb}
                      count={v.count}
                      severity={v.severity}
                      meta={
                        v.verb === "said" || v.verb === "says"
                          ? "invisible tag"
                          : "fancy tag"
                      }
                      hint={
                        v.count >= 4
                          ? "Heavy use. Consider swapping a few for an action beat."
                          : v.count >= 2
                            ? "Used a few times — fine, just keep an eye out."
                            : "Occasional use is fine."
                      }
                      highlight={v.verb}
                      snippets={snippetsByVerb.get(v.verb) ?? []}
                      goToLine={goToLine}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
