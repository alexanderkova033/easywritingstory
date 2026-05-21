import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftCharacterCard,
  CraftFilterRow,
  CraftHeadline,
  CraftMetric,
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
  const lead = c.characters[0];

  let tone: "good" | "warn" | "info" = "info";
  let title = "";
  let detail = "";

  if (c.characters.length === 0) {
    title = "No named characters detected yet.";
    detail = "Capitalized names that appear at least twice will show up here.";
  } else if (vanishCount > 0) {
    tone = "warn";
    title = `${vanishCount} character${vanishCount === 1 ? "" : "s"} vanish${vanishCount === 1 ? "es" : ""} before the ending.`;
    detail = `Appears in the first third but never returns in the last third — possible loose thread.`;
  } else {
    tone = "good";
    title = lead
      ? `${c.characters.length} named character${c.characters.length === 1 ? "" : "s"} — ${lead.display} is the lead (${lead.count} mentions).`
      : `${c.characters.length} named character${c.characters.length === 1 ? "" : "s"}.`;
    detail = "Every named character returns by the final third.";
  }

  // Sorted: vanishing characters first (more urgent), then by mention count.
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (a.vanishes !== b.vanishes) return a.vanishes ? -1 : 1;
        return b.count - a.count;
      }),
    [filtered],
  );

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
            Capitalized names mentioned at least twice will appear here. Words that
            also appear lowercase (<em>She</em>, <em>The</em>) are filtered out
            automatically.
          </p>
        </EmptyState>
      ) : (
        <>
          <CraftHeadline tone={tone} title={title} detail={detail} />

          <div className="craft-metric-row">
            <CraftMetric value={c.characters.length} label={c.characters.length === 1 ? "named character" : "named characters"} />
            <CraftMetric value={c.totalMentions} label="total mentions" />
            <CraftMetric
              value={vanishCount}
              label={vanishCount === 1 ? "vanishes" : "vanish"}
            />
          </div>

          <CraftFilterRow
            value={filter}
            onChange={setFilter}
            ariaLabel="Filter characters by name"
            placeholder="Anna, Tom…"
          />

          {sorted.length === 0 ? (
            <p className="muted small">No names match this filter.</p>
          ) : (
            <ul className="craft-finding-list">
              {sorted.map((ch) => (
                <CraftCharacterCard
                  key={ch.name}
                  name={ch.display}
                  count={ch.count}
                  firstLine={ch.firstLine}
                  lastLine={ch.lastLine}
                  vanishes={ch.vanishes}
                  totalLines={totalLines}
                  snippets={ch.mentions.slice(0, 6).map((m) => ({
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
