import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftFilterRow,
  CraftSummary,
  CraftWordCard,
} from "@/workshop/analysis/tools/CraftCards";
import { LiveSectionTitle } from "../ToolTabBar";

export interface AdverbsPanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

type AdverbsSubTab = "adverbs" | "weasels";

function severityFor(count: number): "low" | "med" | "high" {
  if (count >= 5) return "high";
  if (count >= 2) return "med";
  return "low";
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

  const empty = a.adverbTotal === 0 && a.weaselTotal === 0;
  const list = sub === "adverbs" ? a.topAdverbs : a.topWeasels;
  const snippetsFor = sub === "adverbs" ? adverbSnippets : weaselSnippets;
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((w) => w.word.toLowerCase().includes(q));
  }, [list, filter]);

  const densityLabel =
    a.adverbPer100 >= 4
      ? "heavy"
      : a.adverbPer100 >= 2
        ? "moderate"
        : "light";

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
        <EmptyState title="No adverbs or filler words">
          <p className="muted small">
            No <em>-ly</em> adverbs or weasel words (<em>very</em>, <em>really</em>,{" "}
            <em>just</em>) spotted.
          </p>
        </EmptyState>
      ) : (
        <>
          <CraftSummary
            stats={[
              {
                value: a.adverbTotal,
                label: a.adverbTotal === 1 ? "-ly adverb" : "-ly adverbs",
                tone: a.adverbPer100 >= 4 ? "loud" : "default",
              },
              {
                value: a.weaselTotal,
                label: a.weaselTotal === 1 ? "filler" : "fillers",
                tone: a.weaselTotal >= 6 ? "loud" : "default",
              },
              {
                value: a.adverbPer100 > 0 ? a.adverbPer100.toFixed(1) : "0",
                label: "adverbs / 100 words",
                tone: a.adverbPer100 >= 4 ? "loud" : "craft",
              },
            ]}
            hint={
              a.adverbPer100 > 0 ? (
                <>
                  Adverb density is <strong>{densityLabel}</strong>. A strong verb
                  usually beats a verb + adverb (<em>“ran fast”</em> &rarr; <em>“sprinted”</em>).
                </>
              ) : (
                <>Filler words add noise without meaning — most can simply be deleted.</>
              )
            }
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

          {list.length === 0 ? (
            <p className="muted small">
              {sub === "adverbs"
                ? "No -ly adverbs in this draft."
                : "No filler words in this draft."}
            </p>
          ) : (
            <>
              <CraftFilterRow
                value={filter}
                onChange={setFilter}
                ariaLabel={
                  sub === "adverbs"
                    ? "Filter -ly adverbs"
                    : "Filter filler words"
                }
                placeholder={sub === "adverbs" ? "quickly, suddenly…" : "very, just…"}
              />
              {filtered.length === 0 ? (
                <p className="muted small">No words match this filter.</p>
              ) : (
                <ul className="rep-card-list">
                  {filtered.map((w) => (
                    <CraftWordCard
                      key={w.word}
                      title={w.word}
                      count={w.count}
                      severity={severityFor(w.count)}
                      meta={sub === "adverbs" ? "-ly adverb" : "filler"}
                      hint={
                        sub === "adverbs"
                          ? w.count >= 5
                            ? "Heavy. Try replacing each adverb with a stronger verb."
                            : "Each is fine in isolation — check whether the verb already says it."
                          : w.count >= 5
                            ? "Heavy. Most of these can be deleted with no loss."
                            : "Often these can simply be cut."
                      }
                      highlight={w.word}
                      snippets={snippetsFor.get(w.word) ?? []}
                      goToLine={goToLine}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
