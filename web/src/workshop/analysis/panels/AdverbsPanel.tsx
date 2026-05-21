import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftFilterRow,
  CraftFindingBuckets,
  CraftHeadline,
  CraftMetric,
  tierFromCount,
  type CraftFinding,
} from "@/workshop/analysis/tools/CraftCards";
import { LiveSectionTitle } from "../ToolTabBar";

export interface AdverbsPanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

type AdverbsSubTab = "adverbs" | "weasels";

export function AdverbsPanel({
  docStats,
  craft,
  heavyToolsStale,
  goToLine,
}: AdverbsPanelProps) {
  const a = craft.adverbs;
  const [sub, setSub] = useState<AdverbsSubTab>("adverbs");
  const [filter, setFilter] = useState("");

  const adverbSnippets = useMemo(() => {
    const map = new Map<string, { line: number; text: string }[]>();
    for (const h of a.adverbHits) {
      const arr = map.get(h.word) ?? [];
      arr.push({ line: h.line, text: h.lineText });
      map.set(h.word, arr);
    }
    return map;
  }, [a.adverbHits]);

  const weaselSnippets = useMemo(() => {
    const map = new Map<string, { line: number; text: string }[]>();
    for (const h of a.weaselHits) {
      const arr = map.get(h.word) ?? [];
      arr.push({ line: h.line, text: h.lineText });
      map.set(h.word, arr);
    }
    return map;
  }, [a.weaselHits]);

  const findings: CraftFinding[] = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = sub === "adverbs" ? a.topAdverbs : a.topWeasels;
    const snippetsFor = sub === "adverbs" ? adverbSnippets : weaselSnippets;
    return list
      .filter((w) => !q || w.word.toLowerCase().includes(q))
      .map((w) => {
        const tier = tierFromCount(w.count);
        return {
          key: w.word,
          word: w.word,
          count: w.count,
          tier,
          category: sub === "adverbs" ? "-ly adverb" : "filler",
          categoryLabel: sub === "adverbs" ? "Adverb" : "Filler",
          snippets: snippetsFor.get(w.word) ?? [],
          hint:
            sub === "adverbs"
              ? tier === "now"
                ? "Try a stronger verb instead — “ran fast” → “sprinted.”"
                : tier === "soon"
                  ? "Each is fine — check whether the verb already says it."
                  : "Occasional adverbs read fine."
              : tier === "now"
                ? "Most of these can be deleted with no loss in meaning."
                : tier === "soon"
                  ? "Often these can simply be cut — read the line without the word."
                  : "One or two filler words read fine.",
        };
      });
  }, [sub, a.topAdverbs, a.topWeasels, adverbSnippets, weaselSnippets, filter]);

  const empty = a.adverbTotal === 0 && a.weaselTotal === 0;

  const density = a.adverbPer100;
  const densityLabel =
    density >= 4 ? "heavy" : density >= 2 ? "moderate" : "light";

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
    detail = "A strong verb usually beats verb + adverb. Look for the ones you can replace.";
  } else if (a.weaselTotal >= 6) {
    tone = "warn";
    title = `${a.weaselTotal} filler words add noise without meaning.`;
    detail = "Words like “very”, “really”, “just” can usually be deleted with no loss.";
  } else if (density > 0 || a.weaselTotal > 0) {
    title = `Light touch — ${density.toFixed(1)} adverbs per 100 words, ${a.weaselTotal} filler${a.weaselTotal === 1 ? "" : "s"}.`;
    detail = "Looks fine. Skim the lists below for any standout repeats.";
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

          <div className="craft-metric-row">
            <CraftMetric value={a.adverbTotal} label={a.adverbTotal === 1 ? "-ly adverb" : "-ly adverbs"} />
            <CraftMetric value={a.weaselTotal} label={a.weaselTotal === 1 ? "filler" : "fillers"} />
            <CraftMetric
              value={density > 0 ? density.toFixed(1) : "0"}
              label={`per 100 words · ${densityLabel}`}
            />
          </div>

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

          <CraftFilterRow
            value={filter}
            onChange={setFilter}
            ariaLabel={sub === "adverbs" ? "Filter -ly adverbs" : "Filter filler words"}
            placeholder={sub === "adverbs" ? "quickly, suddenly…" : "very, just…"}
          />
          <CraftFindingBuckets
            findings={findings}
            goToLine={goToLine}
            emptyMessage={
              filter.trim()
                ? "No words match this filter."
                : sub === "adverbs"
                  ? "No -ly adverbs in this draft."
                  : "No filler words in this draft."
            }
          />
        </>
      )}
    </div>
  );
}
