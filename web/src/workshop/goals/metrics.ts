import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { WorkshopGoals } from "./types";

/** Legacy poetry-rhyme type, retained as a stub for dead UI that still imports it. */
export interface SchemeLineCompare {
  line: number;
  detected: string;
  expected: string;
  matches: boolean;
  endWord: string;
}

export interface GoalEvaluation {
  /** Warnings for required goals — shown in the issues panel. */
  warnings: string[];
  /** Hints for soft/aspirational goals — shown only in the goals panel. */
  softHints: string[];
  /** Always empty in the story app; retained on the shape for legacy callers. */
  syllableOverLines: number[];
  /** Always null in the story app; retained on the shape for legacy callers. */
  rhymeSchemeMatches: boolean | null;
  /** Always "" in the story app; retained on the shape for legacy callers. */
  detectedSchemeCanonical: string;
  /** Always "" in the story app; retained on the shape for legacy callers. */
  targetSchemeCanonical: string;
  /** Always empty in the story app; retained on the shape for legacy callers. */
  schemePerLine: never[];
}

function isSoft(goals: WorkshopGoals, key: string): boolean {
  return goals.softGoals?.includes(key) ?? false;
}

function metricLabel(metric: "lines" | "paragraphs" | "words"): {
  singular: string;
  plural: string;
  cap: string;
} {
  if (metric === "lines") return { singular: "line", plural: "lines", cap: "Lines" };
  if (metric === "paragraphs") return { singular: "paragraph", plural: "paragraphs", cap: "Paragraphs" };
  return { singular: "word", plural: "words", cap: "Words" };
}

interface MetricBag {
  target: number | undefined;
  min: number | undefined;
  max: number | undefined;
  key: string;
}

function evalMetric(
  current: number,
  metric: "lines" | "paragraphs" | "words",
  bag: MetricBag,
  add: (key: string, msg: string) => void,
): void {
  const labels = metricLabel(metric);
  if (bag.target != null) {
    if (current < bag.target) {
      add(bag.key, `${current} of ${bag.target} ${labels.plural} written.`);
    } else if (current > bag.target) {
      add(
        bag.key,
        `${current} ${labels.plural} — ${current - bag.target} over target of ${bag.target}.`,
      );
    }
    return;
  }
  if (bag.min != null && current < bag.min) {
    add(bag.key, `${labels.cap} ${current} below your minimum of ${bag.min}.`);
  }
  if (bag.max != null && current > bag.max) {
    add(bag.key, `${labels.cap} ${current} above your maximum of ${bag.max}.`);
  }
}

export function evaluateGoals(
  stats: DocumentStats,
  goals: WorkshopGoals,
  /** Unused in the story app — kept for legacy callers; will be removed in the rename pass. */
  _detectedScheme: string[] = [],
): GoalEvaluation {
  const warnings: string[] = [];
  const softHints: string[] = [];

  const addMessage = (key: string, msg: string) => {
    if (isSoft(goals, key)) softHints.push(msg);
    else warnings.push(msg);
  };

  evalMetric(
    stats.nonEmptyLines,
    "lines",
    {
      key: "targetLines",
      target: goals.targetLines,
      min: goals.minLines,
      max: goals.maxLines,
    },
    addMessage,
  );

  evalMetric(
    stats.stanzaCount,
    "paragraphs",
    {
      key: "targetStanzas",
      target: goals.targetStanzas,
      min: goals.minStanzas,
      max: goals.maxStanzas,
    },
    addMessage,
  );

  evalMetric(
    stats.totalWords,
    "words",
    {
      key: "targetWords",
      target: goals.targetWords,
      min: goals.minWords,
      max: goals.maxWords,
    },
    addMessage,
  );

  return {
    warnings,
    softHints,
    syllableOverLines: [],
    rhymeSchemeMatches: null,
    detectedSchemeCanonical: "",
    targetSchemeCanonical: "",
    schemePerLine: [],
  };
}
