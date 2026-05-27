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
  CraftStatCard,
  ParaPillList,
  severityFromCount,
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
function tierTip(count: number): string {
  if (count >= 5) return "Heavy use — try swapping a few for plain “said” or action beats.";
  if (count >= 2) return "Used a few times — check whether plain “said” would disappear better.";
  return "Used once or twice — fine.";
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
          severity: severityFromCount(v.count),
          hint: tierTip(v.count),
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
  let metric: string | undefined;
  let metricLabel: string | undefined;
  let progress: number | undefined;
  let hint: string | undefined;
  if (d.dialogueLineCount === 0) {
    title = "No dialogue yet";
  } else if (d.unattributed.length > 0) {
    tone = "warn";
    title = "Some speech is missing a speaker";
    metric = String(d.unattributed.length);
    metricLabel = "untagged";
    hint = "Readers may lose track of who’s talking.";
  } else if (fancyHeavy) {
    tone = "warn";
    title = "Loud tags outweigh plain “said”";
    metric = `${saidPct}%`;
    metricLabel = "said";
    progress = saidPct / 100;
    hint = "Most editors keep “said” the workhorse and use fancier verbs sparingly.";
  } else if (totalTags > 0) {
    tone = "good";
    title = "Dialogue reads cleanly";
    metric = `${saidPct}%`;
    metricLabel = "said";
    progress = saidPct / 100;
    hint = `${d.dialogueLineCount} paragraph${d.dialogueLineCount === 1 ? "" : "s"} of speech, all attributed.`;
  } else {
    title = `${d.dialogueLineCount} dialogue paragraph${d.dialogueLineCount === 1 ? "" : "s"}`;
    metric = "0";
    metricLabel = "tags";
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
          <CraftStatCard
            tone={tone}
            title={title}
            metric={metric}
            metricLabel={metricLabel}
            progress={progress}
            hint={hint}
          />

          {d.unattributed.length > 0 ? (
            <CraftCallout title="Untagged speech">
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
            <CraftGroupSection label={`Attribution verbs · ${fancyVerbs.length}`}>
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
