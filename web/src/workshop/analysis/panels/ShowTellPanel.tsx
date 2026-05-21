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

export interface ShowTellPanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

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
function tierHint(count: number): string {
  if (count >= 5)
    return "Pick the few moments where filtering matters — cut the rest by showing the sensation directly.";
  if (count >= 2)
    return "A handful — see whether any can become a direct image instead.";
  return "One or two filter words usually read fine.";
}

export function ShowTellPanel({
  docStats,
  craft,
  heavyToolsStale,
  goToLine,
}: ShowTellPanelProps) {
  const s = craft.showVsTell;
  const [filter, setFilter] = useState("");

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
      .filter((w) => !q || w.word.toLowerCase().includes(q))
      .map((w) => {
        const occ = hitsByWord.get(w.word) ?? [];
        return {
          key: w.word,
          label: w.word,
          count: w.count,
          color: tierColor(w.count),
          tag: tierTag(w.count),
          hint: tierHint(w.count),
          mentions: occ.map((o) => ({ paragraph: o.paragraph })),
          preview: occ[0] ? { paragraph: occ[0].paragraph, text: occ[0].text } : undefined,
        };
      });
  }, [s.byWord, filter, hitsByWord]);

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
    detail =
      "Filter words signal telling. Try showing the sensation: “she felt cold” → “she pulled her coat tighter.”";
  } else {
    title = `${s.total} filter word${s.total === 1 ? "" : "s"}${top ? ` — ${top}` : ""}.`;
    detail = "A handful is fine. Tap any chip to jump to that paragraph.";
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

          <CraftGroupSection
            label="Filter words"
            detail={`${s.byWord.length} distinct · ${s.total} total · color = how often each appears`}
          >
            <CraftFilterField
              value={filter}
              onChange={setFilter}
              ariaLabel="Filter show-vs-tell words"
              placeholder="felt, knew…"
            />
            {clusters.length === 0 ? (
              <p className="muted small">No words match this filter.</p>
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
