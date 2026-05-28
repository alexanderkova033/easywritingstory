import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftCharacterArc,
  CraftFilterField,
  CraftGroupSection,
  CraftStatCard,
  colorLetterForIndex,
} from "@/workshop/analysis/tools/CraftCards";
import { buildPhraseRegex, cropAroundMatch, escapeRegex, highlightInLine } from "@/workshop/analysis/tools/helpers";
import { LiveSectionTitle } from "../ToolTabBar";

export interface CharactersPanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  storyLines: string[];
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
  goToWordInLine: (line1Based: number, word: string) => void;
  peekToLine: (line1Based: number, word?: string) => void;
  clearHoverPeek: () => void;
}

export function CharactersPanel({
  docStats,
  craft,
  storyLines,
  heavyToolsStale,
  goToLine,
  goToWordInLine,
  peekToLine,
  clearHoverPeek,
}: CharactersPanelProps) {
  const c = craft.characters;
  const [filter, setFilter] = useState("");
  const totalParas = Math.max(storyLines.length, docStats.totalLines);

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
  let metric: string | undefined;
  let metricLabel: string | undefined;
  let hint: string | undefined;
  if (c.characters.length === 0) {
    title = "No named characters yet";
    hint = "Capitalized names that appear at least twice will show up here.";
  } else if (vanishCount > 0) {
    tone = "warn";
    title = `${vanishCount} vanish${vanishCount === 1 ? "es" : ""} before the ending`;
    metric = String(vanishCount);
    metricLabel = "loose";
    hint = "Appears in the opening third but never returns in the final third — possible loose thread.";
  } else {
    tone = "good";
    title = lead ? `${lead.display} leads` : "All named characters return";
    metric = String(c.characters.length);
    metricLabel = c.characters.length === 1 ? "named" : "cast";
    hint = "Every named character returns by the final third.";
  }

  // Vanishing characters first, then by mention count. Assign a stable color
  // letter from the canonical name's hash so the chip colour matches the arc.
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (a.vanishes !== b.vanishes) return a.vanishes ? -1 : 1;
        return b.count - a.count;
      }),
    [filtered],
  );

  // Stable color per character: based on its position in the sorted full list.
  const colorByName = useMemo(() => {
    const map = new Map<string, ReturnType<typeof colorLetterForIndex>>();
    const ordered = [...c.characters].sort((a, b) => {
      if (a.vanishes !== b.vanishes) return a.vanishes ? -1 : 1;
      return b.count - a.count;
    });
    ordered.forEach((ch, i) => map.set(ch.name, colorLetterForIndex(i)));
    return map;
  }, [c.characters]);

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
          <CraftStatCard tone={tone} title={title} metric={metric} metricLabel={metricLabel} hint={hint} />

          <CraftGroupSection
            label={`Cast · ${c.characters.length}`}
            detail={`${c.totalMentions} mentions · ${totalParas} paragraph${totalParas === 1 ? "" : "s"}`}
          >
            <CraftFilterField
              value={filter}
              onChange={setFilter}
              ariaLabel="Filter characters by name"
              placeholder="Anna, Tom…"
            />

            {sorted.length === 0 ? (
              <p className="muted small">No names match this filter.</p>
            ) : (
              <ul className="craft-cluster-card-list">
                {sorted.map((ch) => {
                  const color = colorByName.get(ch.name) ?? "a";
                  const re = new RegExp(`\\b${escapeRegex(ch.display)}\\b`, "gi");
                  // fall-back if name contains a space (rare)
                  const finalRe = /\s/.test(ch.display) ? buildPhraseRegex(ch.display) : re;
                  const first = ch.mentions[0];
                  return (
                    <li
                      key={ch.name}
                      className={`craft-cluster-card craft-cluster-card-${color}`}
                    >
                      <div className="craft-cluster-card-head">
                        <span className={`craft-cluster-tag rhyme-label-${color}`}>
                          {color.toUpperCase()}
                        </span>
                        <span className="craft-cluster-label">{ch.display}</span>
                        <span className="craft-cluster-count">×{ch.count}</span>
                        {ch.vanishes ? (
                          <span className="craft-cluster-pill craft-cluster-pill--warn">
                            vanishes
                          </span>
                        ) : null}
                      </div>
                      <CraftCharacterArc
                        firstParagraph={ch.firstLine}
                        lastParagraph={ch.lastLine}
                        totalParagraphs={totalParas}
                        appearances={ch.lines}
                        color={color}
                        goToParagraph={goToLine}
                        peekParagraph={peekToLine}
                        clearPeek={clearHoverPeek}
                      />
                      <div className="craft-cluster-chips">
                        {ch.mentions.slice(0, 12).map((m, i) => (
                          <button
                            key={`${m.line}-${i}`}
                            type="button"
                            className={`craft-word-chip rhyme-label-${color}`}
                            onClick={() => goToWordInLine(m.line, ch.display)}
                            onMouseEnter={() => peekToLine(m.line, ch.display)}
                            onMouseLeave={() => clearHoverPeek()}
                            onFocus={() => peekToLine(m.line, ch.display)}
                            onBlur={() => clearHoverPeek()}
                            title={`Paragraph ${m.line} — click to jump, hover to peek`}
                            aria-label={`Jump to “${ch.display}” in paragraph ${m.line}`}
                          >
                            <span className="craft-word-chip-word">¶</span>
                            <span className="craft-word-chip-line">{m.line}</span>
                          </button>
                        ))}
                        {ch.mentions.length > 12 ? (
                          <span className="muted small craft-cluster-overflow">
                            +{ch.mentions.length - 12}
                          </span>
                        ) : null}
                      </div>
                      {first ? (
                        <div className="craft-cluster-preview">
                          <span className="craft-snippet-text">
                            {highlightInLine(
                              cropAroundMatch(storyLines[first.line - 1] ?? "", finalRe, 36),
                              finalRe,
                            )}
                          </span>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </CraftGroupSection>
        </>
      )}
    </div>
  );
}
