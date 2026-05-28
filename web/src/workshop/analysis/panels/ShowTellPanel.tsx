import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftClusterCard,
  CraftClusterCardList,
  CraftFilterField,
  CraftGroupSection,
  CraftStatCard,
  severityFromCount,
  type CraftCluster,
} from "@/workshop/analysis/tools/CraftCards";
import { useIgnoredCraftItems } from "@/workshop/analysis/craft-ignored-storage";
import { LiveSectionTitle } from "../ToolTabBar";

const IGNORE_CATEGORY = "showtell";

export interface ShowTellPanelProps {
  storyId: string;
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
  goToWordInLine: (line1Based: number, word: string) => void;
  peekToLine: (line1Based: number, word?: string) => void;
  clearHoverPeek: () => void;
}

function tierColor(count: number): "e" | "g" | "f" {
  if (count >= 5) return "e";
  if (count >= 2) return "g";
  return "f";
}
function tierTip(count: number): string {
  if (count >= 5) return "Heavy use — cut by showing the sensation directly.";
  if (count >= 2) return "Used a few times — see if any can become a direct image.";
  return "Once or twice is fine.";
}

export function ShowTellPanel({
  storyId,
  docStats,
  craft,
  heavyToolsStale,
  goToLine,
  goToWordInLine,
  peekToLine,
  clearHoverPeek,
}: ShowTellPanelProps) {
  const s = craft.showVsTell;
  const [filter, setFilter] = useState("");
  const { ignore, restoreAll, isIgnored, countInCategory } =
    useIgnoredCraftItems(storyId);
  const ignoredCount = countInCategory(IGNORE_CATEGORY);

  const hitsByWord = useMemo(() => {
    const map = new Map<string, Array<{ paragraph: number; text: string }>>();
    for (const h of s.hits) {
      const arr = map.get(h.word) ?? [];
      arr.push({ paragraph: h.line, text: h.lineText });
      map.set(h.word, arr);
    }
    return map;
  }, [s.hits]);

  const clusters: CraftCluster[] = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return s.byWord
      .filter((w) => !isIgnored(IGNORE_CATEGORY, w.word))
      .filter((w) => !q || w.word.toLowerCase().includes(q))
      .map((w) => {
        const occ = hitsByWord.get(w.word) ?? [];
        return {
          key: w.word,
          label: w.word,
          count: w.count,
          color: tierColor(w.count),
          severity: severityFromCount(w.count),
          hint: tierTip(w.count),
          mentions: occ.map((o) => ({ paragraph: o.paragraph })),
          preview: occ[0] ? { paragraph: occ[0].paragraph, text: occ[0].text } : undefined,
          onReject: () => ignore(IGNORE_CATEGORY, w.word),
        };
      });
  }, [s.byWord, filter, hitsByWord, isIgnored, ignore]);

  const top = s.byWord.slice(0, 2).map((w) => `“${w.word}”`).join(" and ");

  let tone: "good" | "warn" | "info" = "info";
  let title = "";
  let metric: string | undefined;
  let metricLabel: string | undefined;
  let hint: string | undefined;
  if (s.total === 0) {
    tone = "good";
    title = "No filter words";
    metric = "0";
    metricLabel = "filters";
    hint = "Words like felt, knew, noticed distance the reader — this draft skips them.";
  } else if (s.total >= 8) {
    tone = "warn";
    title = top ? `Mostly ${top}` : "Heavy filtering";
    metric = String(s.total);
    metricLabel = "filters";
    hint = "Try showing the sensation: “she felt cold” → “she pulled her coat tighter.”";
  } else {
    title = top ? `Mostly ${top}` : "Some filter words";
    metric = String(s.total);
    metricLabel = `filter${s.total === 1 ? "" : "s"}`;
    hint = "A handful is fine. Tap any chip to jump to that paragraph.";
  }

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
        <>
          <CraftStatCard tone="good" title={title} metric={metric} metricLabel={metricLabel} hint={hint} />
          <EmptyState title="No filter words found">
            <p className="muted small">
              Filter words like <em>felt</em>, <em>knew</em>, and <em>noticed</em>{" "}
              keep readers at arm’s length. None spotted — nice.
            </p>
          </EmptyState>
        </>
      ) : (
        <>
          <CraftStatCard
            tone={tone}
            title={title}
            metric={metric}
            metricLabel={metricLabel}
            hint={hint}
          />

          <CraftGroupSection label={`Filter words · ${s.byWord.length}`}>
            <CraftFilterField
              value={filter}
              onChange={setFilter}
              ariaLabel="Filter show-vs-tell words"
              placeholder="felt, knew…"
            />
            {clusters.length === 0 ? (
              <p className="muted small">
                {ignoredCount > 0
                  ? "No words left — everything you flagged is hidden."
                  : "No words match this filter."}
              </p>
            ) : (
              <CraftClusterCardList>
                {clusters.map((c) => (
                  <CraftClusterCard
                    key={c.key}
                    cluster={c}
                    goToParagraph={goToLine}
                    goToWord={goToWordInLine}
                    peekParagraph={peekToLine}
                    clearPeek={clearHoverPeek}
                  />
                ))}
              </CraftClusterCardList>
            )}
            {ignoredCount > 0 ? (
              <button
                type="button"
                className="craft-restore-link linkish small"
                onClick={() => restoreAll(IGNORE_CATEGORY)}
              >
                Show {ignoredCount} hidden
              </button>
            ) : null}
          </CraftGroupSection>
        </>
      )}
    </div>
  );
}
