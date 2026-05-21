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

export interface ShowTellPanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
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

  const findings: CraftFinding[] = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return s.byWord
      .filter((w) => !q || w.word.toLowerCase().includes(q))
      .map((w) => {
        const tier = tierFromCount(w.count);
        return {
          key: w.word,
          word: w.word,
          count: w.count,
          tier,
          category: "filter word",
          categoryLabel: "Filter",
          snippets: snippetsByWord.get(w.word) ?? [],
          hint:
            tier === "now"
              ? "Pick the few moments where filtering matters — cut the rest by showing the sensation directly."
              : tier === "soon"
                ? "A handful — see whether any can become a direct image instead."
                : "One or two filter words usually read fine.",
        };
      });
  }, [s.byWord, filter, snippetsByWord]);

  const top = s.byWord.slice(0, 2).map((w) => `“${w.word}”`).join(" and ");

  let tone: "good" | "warn" | "info" = "info";
  let title = "";
  let detail = "";

  if (s.total === 0) {
    tone = "good";
    title = "No filter words spotted.";
    detail = "Words like “felt”, “knew”, “noticed” distance the reader — this draft skips them.";
  } else if (s.total >= 8) {
    tone = "warn";
    title = `${s.total} filter words${top ? ` — mostly ${top}` : ""}.`;
    detail = "Filter words signal telling. Each one can be replaced by showing the sensation directly: “she felt cold” → “she pulled her coat tighter.”";
  } else {
    title = `${s.total} filter word${s.total === 1 ? "" : "s"}${top ? ` — ${top}` : ""}.`;
    detail = "A handful is fine. Look at the ones below and decide which can be shown rather than told.";
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
          <CraftHeadline tone="good" title={title} detail={detail} />
          <EmptyState title="No filter words found">
            <p className="muted small">
              Filter words like <em>felt</em>, <em>knew</em>, and <em>noticed</em>{" "}
              keep readers at arm’s length. None spotted — nice.
            </p>
          </EmptyState>
        </>
      ) : (
        <>
          <CraftHeadline tone={tone} title={title} detail={detail} />

          <div className="craft-metric-row">
            <CraftMetric value={s.total} label="filter hits" />
            <CraftMetric value={s.byWord.length} label={s.byWord.length === 1 ? "distinct word" : "distinct words"} />
          </div>

          <div className="craft-section-head">
            <h4 className="craft-section-title">Most-used filter words</h4>
            <span className="muted small">grouped by how often each appears</span>
          </div>
          <CraftFilterRow
            value={filter}
            onChange={setFilter}
            ariaLabel="Filter show-vs-tell words"
            placeholder="felt, knew…"
          />
          <CraftFindingBuckets
            findings={findings}
            goToLine={goToLine}
            emptyMessage="No words match this filter."
          />
        </>
      )}
    </div>
  );
}
