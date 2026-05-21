import { useMemo, useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, JumpLineList, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import {
  CraftFilterRow,
  CraftFindingBuckets,
  CraftHeadline,
  CraftMetric,
  tierFromCount,
  type CraftFinding,
} from "@/workshop/analysis/tools/CraftCards";
import { LiveSectionTitle } from "../ToolTabBar";

export interface DialoguePanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

const NEUTRAL = new Set(["said", "says", "saying"]);

export function DialoguePanel({
  docStats,
  craft,
  heavyToolsStale,
  goToLine,
}: DialoguePanelProps) {
  const d = craft.dialogue;
  const [filter, setFilter] = useState("");

  const snippetsByVerb = useMemo(() => {
    const map = new Map<string, { line: number; text: string }[]>();
    for (const o of d.occurrences) {
      const arr = map.get(o.verb) ?? [];
      arr.push({ line: o.line, text: o.lineText });
      map.set(o.verb, arr);
    }
    return map;
  }, [d.occurrences]);

  const fancyVerbs = useMemo(
    () => d.verbCounts.filter((v) => !NEUTRAL.has(v.verb)),
    [d.verbCounts],
  );

  const findings: CraftFinding[] = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return fancyVerbs
      .filter((v) => !q || v.verb.toLowerCase().includes(q))
      .map((v) => {
        const tier = tierFromCount(v.count);
        return {
          key: v.verb,
          word: v.verb,
          count: v.count,
          tier,
          category: "fancy tag",
          categoryLabel: "Fancy tag",
          snippets: snippetsByVerb.get(v.verb) ?? [],
          hint:
            v.count >= 5
              ? "Try swapping a few for action beats — they pull weight without naming an emotion."
              : v.count >= 2
                ? "Used a few times — check whether plain “said” would disappear better."
                : "Once or twice is fine — singular moments can use a louder tag.",
        };
      });
  }, [fancyVerbs, filter, snippetsByVerb]);

  const totalTags = d.saidCount + d.strongTagCount;
  const saidPct = totalTags > 0 ? Math.round((d.saidCount / totalTags) * 100) : 0;
  const fancyHeavy = d.strongTagCount > d.saidCount && totalTags >= 4;

  let headlineTone: "good" | "warn" | "info" = "info";
  let headlineTitle = "";
  let headlineDetail = "";
  if (d.dialogueLineCount === 0) {
    headlineTitle = "No dialogue yet.";
    headlineDetail = "Lines with quoted speech will appear here.";
  } else if (d.unattributed.length > 0) {
    headlineTone = "warn";
    headlineTitle = `${d.unattributed.length} line${d.unattributed.length === 1 ? "" : "s"} of dialogue without a clear speaker.`;
    headlineDetail = `Readers may lose track of who’s talking. ${d.dialogueLineCount} dialogue line${d.dialogueLineCount === 1 ? "" : "s"} total.`;
  } else if (fancyHeavy) {
    headlineTone = "warn";
    headlineTitle = `Loud tags dominate — only ${saidPct}% of speech uses plain “said.”`;
    headlineDetail = `Most editors recommend keeping “said” the workhorse and using fancier verbs sparingly.`;
  } else if (totalTags > 0) {
    headlineTone = "good";
    headlineTitle = `Dialogue reads cleanly — ${saidPct}% use plain “said.”`;
    headlineDetail = `${d.dialogueLineCount} line${d.dialogueLineCount === 1 ? "" : "s"} of speech, all attributed.`;
  } else {
    headlineTitle = `${d.dialogueLineCount} dialogue line${d.dialogueLineCount === 1 ? "" : "s"} — no attribution verbs detected.`;
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
            Wrap a line in quotes to start: <em>“Wait,” she said.</em>
          </p>
        </EmptyState>
      ) : (
        <>
          <CraftHeadline tone={headlineTone} title={headlineTitle} detail={headlineDetail} />

          <div className="craft-metric-row">
            <CraftMetric value={d.dialogueLineCount} label="lines of speech" />
            <CraftMetric value={d.saidCount} label="“said”" />
            <CraftMetric value={d.strongTagCount} label="loud tags" />
            <CraftMetric value={d.unattributed.length} label="untagged" />
          </div>

          {d.unattributed.length > 0 ? (
            <div className="craft-callout craft-callout--warn">
              <p className="craft-callout-title">Untagged speech lines</p>
              <p className="muted small">
                Line{d.unattributed.length === 1 ? " " : "s "}
                <JumpLineList
                  lineNumbers={d.unattributed.slice(0, 20)}
                  goToLine={goToLine}
                />
                {d.unattributed.length > 20
                  ? ` and ${d.unattributed.length - 20} more`
                  : null}
                . Add a tag like <em>she said</em> or a clear action beat.
              </p>
            </div>
          ) : null}

          {fancyVerbs.length > 0 ? (
            <>
              <div className="craft-section-head">
                <h4 className="craft-section-title">Fancy attribution verbs</h4>
                <span className="muted small">grouped by how often each appears</span>
              </div>
              <CraftFilterRow
                value={filter}
                onChange={setFilter}
                ariaLabel="Filter dialogue verbs"
                placeholder="whispered, yelled…"
              />
              <CraftFindingBuckets
                findings={findings}
                goToLine={goToLine}
                emptyMessage="No verbs match this filter."
              />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
