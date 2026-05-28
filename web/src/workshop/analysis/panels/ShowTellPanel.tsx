import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftClusterCard,
  CraftClusterCardList,
  CraftDocMap,
  CraftFactStrip,
  CraftFilterField,
  CraftGroupSection,
  severityFromCount,
  type CraftCluster,
  type DocMapMark,
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
  const totalParas = Math.max(1, docStats.totalLines);

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
          mentions: occ.map((o) => ({ paragraph: o.paragraph })),
          preview: occ[0] ? { paragraph: occ[0].paragraph, text: occ[0].text } : undefined,
          onReject: () => ignore(IGNORE_CATEGORY, w.word),
        };
      });
  }, [s.byWord, filter, hitsByWord, isIgnored, ignore]);

  const top = s.byWord[0];
  const wordsPer100 =
    docStats.totalWords > 0
      ? Math.round((s.total / docStats.totalWords) * 1000) / 10
      : 0;

  const docMarks: DocMapMark[] = useMemo(() => {
    const marks: DocMapMark[] = [];
    for (const h of s.hits) {
      marks.push({
        paragraph: h.line,
        color: tierColor(hitsByWord.get(h.word)?.length ?? 1),
        word: h.word,
        weight: 1,
      });
    }
    return marks;
  }, [s.hits, hitsByWord]);

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
          <CraftFactStrip
            facts={[
              { value: 0, label: "filter words" },
              { value: s.byWord.length, label: "unique" },
              { value: wordsPer100, label: "per 100w" },
            ]}
            caption="Filter words like felt, knew, noticed — none in this draft."
          />
          <EmptyState title="No filter words found">
            <p className="muted small">
              Words like <em>felt</em>, <em>knew</em>, <em>noticed</em> place
              the reader at a small remove from the sensation.
            </p>
          </EmptyState>
        </>
      ) : (
        <>
          <CraftFactStrip
            facts={[
              { value: s.total, label: s.total === 1 ? "filter word" : "filter words" },
              { value: s.byWord.length, label: "unique" },
              { value: wordsPer100, label: "per 100w" },
              top
                ? {
                    value: `“${top.word}”`,
                    label: `${top.count}×`,
                    color: tierColor(top.count),
                    onActivate: () => {
                      const first = hitsByWord.get(top.word)?.[0];
                      if (first) goToWordInLine(first.paragraph, top.word);
                    },
                  }
                : { value: "—", label: "top word" },
            ]}
            caption={
              top
                ? `Most common: “${top.word}”. Click to jump to its first paragraph.`
                : undefined
            }
          />

          {docMarks.length > 0 ? (
            <CraftDocMap
              marks={docMarks}
              totalParagraphs={totalParas}
              goToParagraph={goToLine}
              peekParagraph={peekToLine}
              clearPeek={clearHoverPeek}
              hint="One tick per filter-word occurrence. Hover to peek, click to jump."
            />
          ) : null}

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
                  ? "No words left — everything you hid is below."
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
                    totalParagraphs={totalParas}
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
