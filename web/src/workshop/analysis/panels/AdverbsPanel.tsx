import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftClusterCard,
  CraftClusterCardList,
  CraftFilterField,
  CraftGroupSection,
  CraftHeadline,
  type CraftCluster,
} from "@/workshop/analysis/tools/CraftCards";
import { LiveSectionTitle } from "../ToolTabBar";

export interface AdverbsPanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

type AdverbsSubTab = "adverbs" | "weasels";

function tierColor(count: number): "e" | "g" | "f" {
  if (count >= 5) return "e";
  if (count >= 2) return "g";
  return "f";
}
function tierTag(count: number): string {
  if (count >= 5) return "HEAVY";
  if (count >= 2) return "USED";
  return "RARE";
}
function adverbHint(count: number): string {
  if (count >= 5)
    return "Try a stronger verb instead — “ran fast” → “sprinted.”";
  if (count >= 2)
    return "Each is fine — check whether the verb already says it.";
  return "Occasional adverbs read fine.";
}
function fillerHint(count: number): string {
  if (count >= 5)
    return "Most of these can be deleted with no loss in meaning.";
  if (count >= 2)
    return "Often these can simply be cut — read the line without the word.";
  return "One or two filler words read fine.";
}

export function AdverbsPanel({
  docStats,
  craft,
  heavyToolsStale,
  goToLine,
}: AdverbsPanelProps) {
  const a = craft.adverbs;
  const [sub, setSub] = useState<AdverbsSubTab>("adverbs");
  const [filter, setFilter] = useState("");

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
    const hint = sub === "adverbs" ? adverbHint : fillerHint;
    return list
      .filter((w) => !q || w.word.toLowerCase().includes(q))
      .map((w) => {
        const occ = byWord.get(w.word) ?? [];
        return {
          key: w.word,
          label: w.word,
          count: w.count,
          color: tierColor(w.count),
          tag: tierTag(w.count),
          hint: hint(w.count),
          mentions: occ.map((o) => ({ paragraph: o.paragraph })),
          preview: occ[0] ? { paragraph: occ[0].paragraph, text: occ[0].text } : undefined,
        };
      });
  }, [sub, a.topAdverbs, a.topWeasels, adverbsByWord, weaselsByWord, filter]);

  const empty = a.adverbTotal === 0 && a.weaselTotal === 0;
  const density = a.adverbPer100;

  let tone: "good" | "warn" | "info" = "info";
  let title = "";
  let detail = "";
  if (empty) {
    tone = "good";
    title = "No -ly adverbs or filler words spotted.";
    detail = "Strong verbs and concrete nouns are doing the work — nice.";
  } else if (density >= 4) {
    tone = "warn";
    title = `Heavy adverb use — ${density.toFixed(1)} per 100 words.`;
    detail = "A strong verb usually beats verb + adverb.";
  } else if (a.weaselTotal >= 6) {
    tone = "warn";
    title = `${a.weaselTotal} filler words add noise without meaning.`;
    detail = "Words like “very”, “really”, “just” can usually be deleted.";
  } else {
    title = `Light touch — ${density.toFixed(1)} adverbs per 100 words.`;
    detail = "Looks fine. Tap any chip to jump to that paragraph.";
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
          <CraftHeadline tone="good" title={title} detail={detail} />
          <EmptyState title="No adverbs or filler words">
            <p className="muted small">
              No <em>-ly</em> adverbs or weasel words (<em>very</em>, <em>really</em>,{" "}
              <em>just</em>) spotted.
            </p>
          </EmptyState>
        </>
      ) : (
        <>
          <CraftHeadline tone={tone} title={title} detail={detail} />

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
            detail="Color = how often each appears"
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
                  />
                ))}
              </CraftClusterCardList>
            )}
          </CraftGroupSection>
        </>
      )}
    </div>
  );
}
