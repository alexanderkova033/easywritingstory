import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftFilterRow,
  CraftSummary,
  CraftWordCard,
} from "@/workshop/analysis/tools/CraftCards";
import { LiveSectionTitle } from "../ToolTabBar";

export interface ShowTellPanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

function severityFor(count: number): "low" | "med" | "high" {
  if (count >= 5) return "high";
  if (count >= 2) return "med";
  return "low";
}

export function ShowTellPanel({
  docStats,
  craft,
  heavyToolsStale,
  goToLine,
}: ShowTellPanelProps) {
  const s = craft.showVsTell;
  const [filter, setFilter] = useState("");

  const snippetsByWord = useMemo(() => {
    const map = new Map<string, { line: number; text: string }[]>();
    for (const h of s.hits) {
      const arr = map.get(h.word) ?? [];
      arr.push({ line: h.line, text: h.lineText });
      map.set(h.word, arr);
    }
    return map;
  }, [s.hits]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return s.byWord;
    return s.byWord.filter((w) => w.word.toLowerCase().includes(q));
  }, [s.byWord, filter]);

  return (
    <div
      className="tool-block tool-block-live"
      id="tool-panel-showtell"
      role="tabpanel"
      aria-labelledby="tool-tab-showtell"
    >
      <LiveSectionTitle>Show vs. tell</LiveSectionTitle>
      {docStats.nonEmptyLines === 0 ? <NoLinesYetHint /> : null}
      {heavyToolsStale ? (
        <p className="tools-stale-hint muted small" role="status" aria-live="polite">
          Tools updating…
        </p>
      ) : null}

      {s.total === 0 ? (
        <EmptyState title="No filter words found">
          <p className="muted small">
            Filter words like <em>felt</em>, <em>knew</em>, and <em>noticed</em>{" "}
            distance the reader from your character. None spotted — nice.
          </p>
        </EmptyState>
      ) : (
        <>
          <CraftSummary
            stats={[
              { value: s.total, label: "filter hits", tone: s.total >= 6 ? "loud" : "default" },
              { value: s.byWord.length, label: s.byWord.length === 1 ? "distinct word" : "distinct words" },
            ]}
            hint={
              <>
                Filter words signal <em>telling</em>: “she felt cold” &rarr; “she pulled
                her coat tighter.” Use sparingly when the sensation matters more than the
                source.
              </>
            }
          />

          <h4 className="rep-pattern-title">
            Most-used <span className="muted small">— top {Math.min(s.byWord.length, 10)}</span>
          </h4>
          <CraftFilterRow
            value={filter}
            onChange={setFilter}
            ariaLabel="Filter show-vs-tell words"
            placeholder="felt, knew…"
          />
          {filtered.length === 0 ? (
            <p className="muted small">No words match this filter.</p>
          ) : (
            <ul className="rep-card-list">
              {filtered.slice(0, 10).map((w) => (
                <CraftWordCard
                  key={w.word}
                  title={w.word}
                  count={w.count}
                  severity={severityFor(w.count)}
                  meta="filter word"
                  hint={
                    w.count >= 5
                      ? "Heavy use. Pick the few moments that need filtering — cut the rest."
                      : w.count >= 3
                        ? "A handful — see whether any can be shown directly."
                        : "Occasional filtering is fine."
                  }
                  highlight={w.word}
                  snippets={snippetsByWord.get(w.word) ?? []}
                  goToLine={goToLine}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
