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

export interface AdverbsPanelProps {
  storyId: string;
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
  goToWordInLine: (line1Based: number, word: string) => void;
  peekToLine: (line1Based: number, word?: string) => void;
  clearHoverPeek: () => void;
}

type AdverbsSubTab = "adverbs" | "weasels";

function tierColor(count: number): "e" | "g" | "f" {
  if (count >= 5) return "e";
  if (count >= 2) return "g";
  return "f";
}
function adverbTip(count: number): string {
  if (count >= 5) return "Heavy — try a stronger verb (“ran fast” → “sprinted”).";
  if (count >= 2) return "Used a few times — check whether the verb already says it.";
  return "Occasional use reads fine.";
}
function fillerTip(count: number): string {
  if (count >= 5) return "Heavy — most can be deleted with no loss in meaning.";
  if (count >= 2) return "Used a few times — often these can simply be cut.";
  return "Occasional use reads fine.";
}

export function AdverbsPanel({
  storyId,
  docStats,
  craft,
  heavyToolsStale,
  goToLine,
  goToWordInLine,
  peekToLine,
  clearHoverPeek,
}: AdverbsPanelProps) {
  const a = craft.adverbs;
  const [sub, setSub] = useState<AdverbsSubTab>("adverbs");
  const [filter, setFilter] = useState("");
  const { ignore, restoreAll, isIgnored, countInCategory } =
    useIgnoredCraftItems(storyId);
  const ignoreCategory = sub === "adverbs" ? "adverbs" : "weasels";
  const ignoredCount = countInCategory(ignoreCategory);

  const adverbsByWord = useMemo(() => {
    const map = new Map<string, Array<{ paragraph: number; text: string }>>();
    for (const h of a.adverbHits) {
      const arr = map.get(h.word) ?? [];
      arr.push({ paragraph: h.line, text: h.lineText });
      map.set(h.word, arr);
    }
    return map;
  }, [a.adverbHits]);

  const weaselsByWord = useMemo(() => {
    const map = new Map<string, Array<{ paragraph: number; text: string }>>();
    for (const h of a.weaselHits) {
      const arr = map.get(h.word) ?? [];
      arr.push({ paragraph: h.line, text: h.lineText });
      map.set(h.word, arr);
    }
    return map;
  }, [a.weaselHits]);

  const clusters: CraftCluster[] = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = sub === "adverbs" ? a.topAdverbs : a.topWeasels;
    const byWord = sub === "adverbs" ? adverbsByWord : weaselsByWord;
    const tip = sub === "adverbs" ? adverbTip : fillerTip;
    return list
      .filter((w) => !isIgnored(ignoreCategory, w.word))
      .filter((w) => !q || w.word.toLowerCase().includes(q))
      .map((w) => {
        const occ = byWord.get(w.word) ?? [];
        return {
          key: w.word,
          label: w.word,
          count: w.count,
          color: tierColor(w.count),
          severity: severityFromCount(w.count),
          hint: tip(w.count),
          mentions: occ.map((o) => ({ paragraph: o.paragraph })),
          preview: occ[0] ? { paragraph: occ[0].paragraph, text: occ[0].text } : undefined,
          onReject: () => ignore(ignoreCategory, w.word),
        };
      });
  }, [
    sub,
    a.topAdverbs,
    a.topWeasels,
    adverbsByWord,
    weaselsByWord,
    filter,
    isIgnored,
    ignore,
    ignoreCategory,
  ]);

  const empty = a.adverbTotal === 0 && a.weaselTotal === 0;
  const density = a.adverbPer100;

  let tone: "good" | "warn" | "info" = "info";
  let title = "";
  let metric: string | undefined;
  let metricLabel: string | undefined;
  let hint: string | undefined;
  if (empty) {
    tone = "good";
    title = "Clean — strong verbs doing the work";
    metric = "0";
    metricLabel = "flagged";
  } else if (density >= 4) {
    tone = "warn";
    title = "Heavy adverb use";
    metric = density.toFixed(1);
    metricLabel = "per 100w";
    hint = "A strong verb usually beats verb + adverb.";
  } else if (a.weaselTotal >= 6) {
    tone = "warn";
    title = "Filler words adding noise";
    metric = String(a.weaselTotal);
    metricLabel = "fillers";
    hint = "Words like “very”, “really”, “just” can usually be deleted.";
  } else {
    title = "Light touch";
    metric = density.toFixed(1);
    metricLabel = "per 100w";
    hint = "Looks fine. Tap any chip to jump to that paragraph.";
  }

  return (
    <div
      className="tool-block tool-block-live"
      id="tool-panel-adverbs"
      role="tabpanel"
      aria-labelledby="tool-tab-adverbs"
    >
      <LiveSectionTitle>Adverbs &amp; fillers</LiveSectionTitle>
      {docStats.nonEmptyLines === 0 ? <NoLinesYetHint /> : null}
      {heavyToolsStale ? (
        <p className="tools-stale-hint muted small" role="status" aria-live="polite">
          Tools updating…
        </p>
      ) : null}

      {empty ? (
        <>
          <CraftStatCard tone="good" title={title} metric={metric} metricLabel={metricLabel} hint={hint} />
          <EmptyState title="No adverbs or filler words">
            <p className="muted small">
              No <em>-ly</em> adverbs or weasel words (<em>very</em>, <em>really</em>,{" "}
              <em>just</em>) spotted.
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

          <div className="rep-subtabs" role="tablist" aria-label="Adverb categories">
            <button
              type="button"
              role="tab"
              aria-selected={sub === "adverbs"}
              className={`rep-subtab ${sub === "adverbs" ? "active" : ""}`}
              onClick={() => {
                setSub("adverbs");
                setFilter("");
              }}
            >
              -ly adverbs <span className="rep-subtab-count">{a.adverbTotal}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sub === "weasels"}
              className={`rep-subtab ${sub === "weasels" ? "active" : ""}`}
              onClick={() => {
                setSub("weasels");
                setFilter("");
              }}
            >
              Fillers <span className="rep-subtab-count">{a.weaselTotal}</span>
            </button>
          </div>

          <CraftGroupSection
            label={sub === "adverbs" ? "-ly adverbs" : "Filler words"}
          >
            <CraftFilterField
              value={filter}
              onChange={setFilter}
              ariaLabel={sub === "adverbs" ? "Filter -ly adverbs" : "Filter filler words"}
              placeholder={sub === "adverbs" ? "quickly, suddenly…" : "very, just…"}
            />
            {clusters.length === 0 ? (
              <p className="muted small">
                {filter.trim()
                  ? "No words match this filter."
                  : ignoredCount > 0
                    ? "Everything here is hidden."
                    : sub === "adverbs"
                      ? "No -ly adverbs in this draft."
                      : "No filler words in this draft."}
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
                onClick={() => restoreAll(ignoreCategory)}
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
