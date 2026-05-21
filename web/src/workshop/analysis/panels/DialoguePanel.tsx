import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftCallout,
  CraftClusterCard,
  CraftClusterCardList,
  CraftFilterField,
  CraftGroupSection,
  CraftHeadline,
  ParaPillList,
  type CraftCluster,
} from "@/workshop/analysis/tools/CraftCards";
import { LiveSectionTitle } from "../ToolTabBar";

export interface DialoguePanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

const NEUTRAL = new Set(["said", "says", "saying"]);

/** Severity tier → fixed color letter so the palette stays consistent. */
function tierColor(count: number): "e" | "g" | "f" {
  if (count >= 5) return "e"; // red — heavy
  if (count >= 2) return "g"; // amber — moderate
  return "f"; // teal — light
}
function tierTag(count: number): string {
  if (count >= 5) return "HEAVY";
  if (count >= 2) return "USED";
  return "RARE";
}
function tierHint(count: number): string {
  if (count >= 5)
    return "Try swapping a few for action beats — they pull weight without naming an emotion.";
  if (count >= 2)
    return "Used a few times — check whether plain “said” would disappear better.";
  return "Once or twice is fine — singular moments can use a louder tag.";
}

export function DialoguePanel({
  docStats,
  craft,
  heavyToolsStale,
  goToLine,
}: DialoguePanelProps) {
  const d = craft.dialogue;
  const [filter, setFilter] = useState("");

  const occurrencesByVerb = useMemo(() => {
    const map = new Map<
      string,
      Array<{ paragraph: number; surface: string; lineText: string }>
    >();
    for (const o of d.occurrences) {
      const arr = map.get(o.verb) ?? [];
      arr.push({ paragraph: o.line, surface: o.verb, lineText: o.lineText });
      map.set(o.verb, arr);
    }
    return map;
  }, [d.occurrences]);

  const fancyVerbs = useMemo(
    () => d.verbCounts.filter((v) => !NEUTRAL.has(v.verb)),
    [d.verbCounts],
  );

  const clusters: CraftCluster[] = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return fancyVerbs
      .filter((v) => !q || v.verb.toLowerCase().includes(q))
      .map((v) => {
        const occ = occurrencesByVerb.get(v.verb) ?? [];
        return {
          key: v.verb,
          label: v.verb,
          count: v.count,
          color: tierColor(v.count),
          tag: tierTag(v.count),
          hint: tierHint(v.count),
          mentions: occ.map((o) => ({ paragraph: o.paragraph })),
          preview: occ[0]
            ? { paragraph: occ[0].paragraph, text: occ[0].lineText }
            : undefined,
        };
      });
  }, [fancyVerbs, filter, occurrencesByVerb]);

  const totalTags = d.saidCount + d.strongTagCount;
  const saidPct = totalTags > 0 ? Math.round((d.saidCount / totalTags) * 100) : 0;
  const fancyHeavy = d.strongTagCount > d.saidCount && totalTags >= 4;

  let tone: "good" | "warn" | "info" = "info";
  let title = "";
  let detail = "";
  if (d.dialogueLineCount === 0) {
    title = "No dialogue yet.";
    detail = "Paragraphs with quoted speech will appear here.";
  } else if (d.unattributed.length > 0) {
    tone = "warn";
    title = `${d.unattributed.length} speech paragraph${d.unattributed.length === 1 ? "" : "s"} without a clear speaker.`;
    detail = `Readers may lose track of who’s talking. ${d.dialogueLineCount} dialogue paragraph${d.dialogueLineCount === 1 ? "" : "s"} total.`;
  } else if (fancyHeavy) {
    tone = "warn";
    title = `Loud tags dominate — only ${saidPct}% use plain “said.”`;
    detail = "Most editors keep “said” the workhorse and use fancier verbs sparingly.";
  } else if (totalTags > 0) {
    tone = "good";
    title = `Dialogue reads cleanly — ${saidPct}% use plain “said.”`;
    detail = `${d.dialogueLineCount} paragraph${d.dialogueLineCount === 1 ? "" : "s"} of speech, all attributed.`;
  } else {
    title = `${d.dialogueLineCount} dialogue paragraph${d.dialogueLineCount === 1 ? "" : "s"} — no attribution verbs detected.`;
  }

  return (
    <div
      className="tool-block tool-block-live"
      id="tool-panel-dialogue"
      role="tabpanel"
      aria-labelledby="tool-tab-dialogue"
    >
      <LiveSectionTitle>Dialogue</LiveSectionTitle>
      {docStats.nonEmptyLines === 0 ? <NoLinesYetHint /> : null}
      {heavyToolsStale ? (
        <p className="tools-stale-hint muted small" role="status" aria-live="polite">
          Tools updating…
        </p>
      ) : null}

      {d.dialogueLineCount === 0 ? (
        <EmptyState title="No dialogue detected">
          <p className="muted small">
            Wrap a paragraph in quotes to start: <em>“Wait,” she said.</em>
          </p>
        </EmptyState>
      ) : (
        <>
          <CraftHeadline tone={tone} title={title} detail={detail} />

          {d.unattributed.length > 0 ? (
            <CraftCallout title="Untagged speech">
              <p className="muted small">
                Add <em>she said</em> or an action beat so the speaker is clear.
              </p>
              <ParaPillList
                paragraphs={d.unattributed.slice(0, 24)}
                goTo={goToLine}
              />
              {d.unattributed.length > 24 ? (
                <p className="muted small">
                  …and {d.unattributed.length - 24} more.
                </p>
              ) : null}
            </CraftCallout>
          ) : null}

          {fancyVerbs.length > 0 ? (
            <CraftGroupSection
              label="Fancy attribution verbs"
              detail={`${fancyVerbs.length} distinct · color = how often each appears`}
            >
              <CraftFilterField
                value={filter}
                onChange={setFilter}
                ariaLabel="Filter dialogue verbs"
                placeholder="whispered, yelled…"
              />
              {clusters.length === 0 ? (
                <p className="muted small">No verbs match this filter.</p>
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
          ) : null}
        </>
      )}
    </div>
  );
}
