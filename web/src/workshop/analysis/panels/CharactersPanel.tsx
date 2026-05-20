import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftCharacterCard,
  CraftFilterRow,
  CraftSummary,
} from "@/workshop/analysis/tools/CraftCards";
import { LiveSectionTitle } from "../ToolTabBar";

export interface CharactersPanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  storyLines: string[];
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

export function CharactersPanel({
  docStats,
  craft,
  storyLines,
  heavyToolsStale,
  goToLine,
}: CharactersPanelProps) {
  const c = craft.characters;
  const [filter, setFilter] = useState("");
  const totalLines = Math.max(storyLines.length, docStats.totalLines);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return c.characters;
    return c.characters.filter(
      (ch) =>
        ch.name.toLowerCase().includes(q) ||
        ch.display.toLowerCase().includes(q),
    );
  }, [c.characters, filter]);

  const vanishCount = c.characters.filter((ch) => ch.vanishes).length;

  return (
    <div
      className="tool-block tool-block-live"
      id="tool-panel-characters"
      role="tabpanel"
      aria-labelledby="tool-tab-characters"
    >
      <LiveSectionTitle>Cast</LiveSectionTitle>
      {docStats.nonEmptyLines === 0 ? <NoLinesYetHint /> : null}
      {heavyToolsStale ? (
        <p className="tools-stale-hint muted small" role="status" aria-live="polite">
          Tools updating…
        </p>
      ) : null}

      {c.characters.length === 0 ? (
        <EmptyState title="No characters detected yet">
          <p className="muted small">
            Capitalized names mentioned at least twice will appear here, with the
            lines they show up on. Words that also appear lowercase (<em>She</em>,{" "}
            <em>The</em>) are filtered out automatically.
          </p>
        </EmptyState>
      ) : (
        <>
          <CraftSummary
            stats={[
              { value: c.characters.length, label: c.characters.length === 1 ? "character" : "characters" },
              { value: c.totalMentions, label: "mentions" },
              {
                value: vanishCount,
                label: vanishCount === 1 ? "vanishes" : "vanish",
                tone: vanishCount > 0 ? "loud" : "default",
              },
            ]}
            hint={
              vanishCount > 0 ? (
                <>
                  {vanishCount === 1 ? "One name appears" : `${vanishCount} names appear`}{" "}
                  in the first third but never return in the last third — a possible
                  loose thread.
                </>
              ) : (
                <>Every named character returns by the final third — good.</>
              )
            }
          />

          <CraftFilterRow
            value={filter}
            onChange={setFilter}
            ariaLabel="Filter characters by name"
            placeholder="Anna, Tom…"
          />

          {filtered.length === 0 ? (
            <p className="muted small">No names match this filter.</p>
          ) : (
            <ul className="rep-card-list">
              {filtered.map((ch) => (
                <CraftCharacterCard
                  key={ch.name}
                  name={ch.display}
                  count={ch.count}
                  firstLine={ch.firstLine}
                  lastLine={ch.lastLine}
                  vanishes={ch.vanishes}
                  totalLines={totalLines}
                  snippets={ch.mentions
                    .slice(0, 8)
                    .map((m) => ({
                      line: m.line,
                      text: storyLines[m.line - 1] ?? "",
                    }))}
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
