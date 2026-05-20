/**
 * Browser-side calls to the /api/* serverless endpoints.
 * The OpenAI key lives on the server — the browser never touches it.
 */

import { parseAiErrorAndNotify } from "../ai-cost/aiBudgetBus";

export interface AnalysisMeta {
  model: string;
  analyzedAt: string;
}

export type Confidence = "high" | "medium" | "low";

export interface AnalysisIssue {
  id: string;
  severity?: "high" | "medium" | "low";
  /** How sure the model is this is actually a problem (vs taste). */
  confidence?: Confidence;
  line_start: number;
  line_end: number;
  excerpt?: string;
  problem_words?: string[];
  /** One-line preview shown when the issue card is collapsed. */
  headline?: string;
  rationale: string;
  improvements: string[];
  /** Concrete rewritten version of the line(s), when provided by the model. */
  rewrite?: string;
}

export interface StrongestLine {
  line: number;
  excerpt: string;
  why: string;
}

export interface ExamGradeComponent {
  name: string;
  mark: number;
  outOf: number;
  comment?: string;
}

export interface ExamGrade {
  /** Spec id, e.g. "igcse-edexcel-coursework". Set by the client, not the model. */
  modeId: string;
  /** Human-readable spec label, e.g. "IGCSE Edexcel — Imaginative Writing (coursework)". */
  modeLabel: string;
  mark: number;
  outOf: number;
  band?: string;
  comment?: string;
  breakdown: ExamGradeComponent[];
}

/**
 * Catalogue of supported exam modes. Mirrors the server-side EXAM_MODES list
 * in api/_exam-modes.ts — keep the ids in sync. Rubric prompts live only on
 * the server (the client doesn't need them).
 */
export interface ExamModeMeta {
  id: string;
  label: string;
  description: string;
  totalMarks: number;
  components: { name: string; outOf: number }[];
}

export const EXAM_MODES: readonly ExamModeMeta[] = [
  {
    id: "igcse-edexcel-coursework",
    label: "IGCSE Edexcel — Imaginative Writing (coursework)",
    description: "Pearson Edexcel IGCSE English Language A, Paper 3 coursework — 40 marks",
    totalMarks: 40,
    components: [
      { name: "Content & Structure (AO4)", outOf: 24 },
      { name: "Style & Accuracy (AO5)",   outOf: 16 },
    ],
  },
  {
    id: "igcse-cambridge-coursework",
    label: "IGCSE Cambridge — Composition (coursework)",
    description: "Cambridge IGCSE 0500 / 0990 Component 3 coursework — 40 marks per assignment",
    totalMarks: 40,
    components: [
      { name: "Content & Structure (W1-W3)", outOf: 16 },
      { name: "Style & Accuracy (W4-W5)",    outOf: 24 },
    ],
  },
  {
    id: "alevel-aqa-nea",
    label: "A-Level AQA — Original Writing (NEA)",
    description: "AQA A-Level English Language 7702, NEA Original Writing piece — 25 marks",
    totalMarks: 25,
    components: [
      { name: "AO5 — Creative & Expressive Writing", outOf: 25 },
    ],
  },
  {
    id: "alevel-edexcel-nea",
    label: "A-Level Edexcel — Crafting Language (NEA)",
    description: "Pearson Edexcel A-Level English Language 9EL0, NEA crafted text — 40 marks",
    totalMarks: 40,
    components: [
      { name: "AO2 — Language methods", outOf: 15 },
      { name: "AO5 — Creativity",       outOf: 25 },
    ],
  },
  {
    id: "alevel-ocr-nea",
    label: "A-Level OCR — Original Writing (NEA)",
    description: "OCR A-Level English Language H470, NEA original writing — 25 marks",
    totalMarks: 25,
    components: [
      { name: "AO2 — Language methods", outOf: 10 },
      { name: "AO5 — Creativity",       outOf: 15 },
    ],
  },
];

export type ExamModeId = (typeof EXAM_MODES)[number]["id"];

export function getExamModeMeta(id: string | undefined | null): ExamModeMeta | null {
  if (!id) return null;
  return EXAM_MODES.find((m) => m.id === id) ?? null;
}

export interface StoryAnalysis {
  meta: AnalysisMeta;
  overall_score: number;
  warm_reaction?: string;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  strongest_line?: StrongestLine;
  overall_direction?: string;
  /** 2-3 sentence holistic read of the story as a whole. */
  overall_feedback?: string;
  /** 2-3 sentences addressed to the writer ("you"), warm/mentor tone. */
  personal_feedback?: string;
  clarifying_question?: string;
  /** Set when the analysis was run in an exam-grading mode. */
  exam_grade?: ExamGrade;
  issues: AnalysisIssue[];
}

export interface LocalAnalysisContext {
  cliches: Array<{ phrase: string; lineNumber: number }>;
  repeatedWords: Array<{ word: string; count: number; lines: number[] }>;
  /** Avg words per sentence, 1 decimal. */
  avgWordsPerSentence?: number;
  /** Population std-dev of words per sentence, 1 decimal. */
  sentenceLengthStdDev?: number;
  /** Flesch-Kincaid grade level, 1 decimal. */
  readingGrade?: number;
  /** Share of total words inside quoted dialogue, 0-1. */
  dialogueFraction?: number;
  /** Total sentence count. */
  sentenceCount?: number;
  /** Total paragraph count (stanza blocks separated by blank lines). */
  paragraphCount?: number;
  /** Longest sentence by word count, with starting line. */
  longestSentence?: { words: number; startLine: number };
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : parseInt(String(n), 10);
  if (!Number.isFinite(v)) return 50;
  return Math.max(1, Math.min(100, Math.round(v)));
}

function parseSeverity(v: unknown): "high" | "medium" | "low" | undefined {
  if (v === "high" || v === "medium" || v === "low") return v;
  return undefined;
}

function parseConfidence(v: unknown): Confidence | undefined {
  if (v === "high" || v === "medium" || v === "low") return v;
  return undefined;
}

function parseStringArray(v: unknown, max: number): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = (v as unknown[])
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, max);
  return out.length > 0 ? out : undefined;
}

function parseExamGrade(v: unknown, mode: ExamModeMeta | null): ExamGrade | undefined {
  if (!mode || !v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const markRaw = typeof o.mark === "number" ? o.mark : parseFloat(String(o.mark));
  if (!Number.isFinite(markRaw)) return undefined;
  const mark = Math.max(0, Math.min(mode.totalMarks, Math.round(markRaw)));
  const breakdownRaw = Array.isArray(o.breakdown) ? (o.breakdown as unknown[]) : [];
  const breakdown: ExamGradeComponent[] = mode.components.map((comp, i) => {
    const entry = (breakdownRaw[i] && typeof breakdownRaw[i] === "object")
      ? breakdownRaw[i] as Record<string, unknown>
      : null;
    const cMarkRaw = entry ? (typeof entry.mark === "number" ? entry.mark : parseFloat(String(entry.mark))) : NaN;
    const cMark = Number.isFinite(cMarkRaw) ? Math.max(0, Math.min(comp.outOf, Math.round(cMarkRaw))) : 0;
    const comment = entry && typeof entry.comment === "string" ? entry.comment.trim() : undefined;
    return { name: comp.name, mark: cMark, outOf: comp.outOf, comment };
  });
  return {
    modeId: mode.id,
    modeLabel: mode.label,
    mark,
    outOf: mode.totalMarks,
    band: typeof o.band === "string" && o.band.trim() ? o.band.trim() : undefined,
    comment: typeof o.comment === "string" && o.comment.trim() ? o.comment.trim() : undefined,
    breakdown,
  };
}

function parseStrongestLine(v: unknown): StrongestLine | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const line = typeof o.line === "number" ? o.line : parseInt(String(o.line), 10);
  if (!Number.isFinite(line) || line < 1) return undefined;
  const excerpt = typeof o.excerpt === "string" ? o.excerpt.trim() : "";
  const why = typeof o.why === "string" ? o.why.trim() : "";
  if (!excerpt && !why) return undefined;
  return { line: Math.round(line), excerpt, why };
}

/** Cap total issues at MAX_ISSUES and roughly balance high/medium/low buckets.
 * Round-robin pick from each severity bucket (high → medium → low) preserving
 * original order within each bucket. Issues with no severity fall into "low". */
const MAX_ISSUES = 5;
function balanceAndCapIssues<T extends { severity?: "high" | "medium" | "low" }>(issues: T[]): T[] {
  if (issues.length <= MAX_ISSUES) return issues;
  const high: T[] = [];
  const medium: T[] = [];
  const low: T[] = [];
  for (const iss of issues) {
    if (iss.severity === "high") high.push(iss);
    else if (iss.severity === "medium") medium.push(iss);
    else low.push(iss);
  }
  const out: T[] = [];
  const buckets = [high, medium, low];
  while (out.length < MAX_ISSUES) {
    let drew = false;
    for (const b of buckets) {
      if (out.length >= MAX_ISSUES) break;
      const next = b.shift();
      if (next) { out.push(next); drew = true; }
    }
    if (!drew) break;
  }
  return out;
}

function parseAnalysis(obj: Record<string, unknown>, examMode: ExamModeMeta | null = null): StoryAnalysis {
  const issuesRaw = Array.isArray(obj.issues) ? obj.issues : [];
  const meta = (obj.meta ?? {}) as Record<string, unknown>;

  return {
    meta: {
      model: typeof meta.model === "string" ? meta.model : "gpt-5-nano",
      analyzedAt:
        typeof meta.analyzedAt === "string" ? meta.analyzedAt : new Date().toISOString(),
    },
    overall_score: clampScore(obj.overall_score),
    warm_reaction: typeof obj.warm_reaction === "string" && obj.warm_reaction.trim()
      ? obj.warm_reaction.trim() : undefined,
    summary: typeof obj.summary === "string" ? obj.summary : undefined,
    strengths: parseStringArray(obj.strengths, 4),
    weaknesses: parseStringArray(obj.weaknesses, 4),
    strongest_line: parseStrongestLine(obj.strongest_line),
    overall_direction: typeof obj.overall_direction === "string" ? obj.overall_direction : undefined,
    overall_feedback: typeof obj.overall_feedback === "string" && obj.overall_feedback.trim()
      ? obj.overall_feedback.trim() : undefined,
    personal_feedback: typeof obj.personal_feedback === "string" && obj.personal_feedback.trim()
      ? obj.personal_feedback.trim() : undefined,
    clarifying_question: typeof obj.clarifying_question === "string" && obj.clarifying_question.trim()
      ? obj.clarifying_question.trim() : undefined,
    exam_grade: parseExamGrade(obj.exam_grade, examMode),
    issues: balanceAndCapIssues(issuesRaw
      .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
      .map((iss, idx) => ({
        id: typeof iss.id === "string" ? iss.id : `issue-${idx + 1}`,
        severity: parseSeverity(iss.severity),
        confidence: parseConfidence(iss.confidence),
        line_start: clampScore(iss.line_start),
        line_end: clampScore(iss.line_end),
        excerpt: typeof iss.excerpt === "string" ? iss.excerpt : undefined,
        problem_words: Array.isArray(iss.problem_words)
          ? (iss.problem_words as unknown[])
              .filter((s): s is string => typeof s === "string")
              .slice(0, 3)
          : undefined,
        headline: typeof iss.headline === "string" && iss.headline.trim()
          ? iss.headline.trim() : undefined,
        rationale: typeof iss.rationale === "string" ? iss.rationale : "",
        improvements: Array.isArray(iss.improvements)
          ? (iss.improvements as unknown[])
              .filter((s): s is string => typeof s === "string")
              .slice(0, 3)
          : [],
        rewrite: typeof iss.rewrite === "string" && iss.rewrite.trim() ? iss.rewrite.trim() : undefined,
      }))),
  };
}

export interface ComparisonChanges {
  summary: string;
  improvements: string[];
  regressions: string[];
  unchanged: string[];
}

export interface StoryComparison extends StoryAnalysis {
  comparison: ComparisonChanges;
}

function parseComparison(obj: Record<string, unknown>, examMode: ExamModeMeta | null = null): StoryComparison {
  const base = parseAnalysis(obj, examMode);
  const c = (obj.comparison ?? {}) as Record<string, unknown>;
  const toStrArr = (v: unknown) =>
    Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : [];
  return {
    ...base,
    comparison: {
      summary: typeof c.summary === "string" ? c.summary : "",
      improvements: toStrArr(c.improvements),
      regressions: toStrArr(c.regressions),
      unchanged: toStrArr(c.unchanged),
    },
  };
}

/**
 * Build a compact line-level diff between two drafts. We send this instead of
 * the entire previous version so the model doesn't pay tokens for unchanged
 * lines. Uses a simple LCS to align lines, then coalesces removed+added pairs
 * into "changed" entries when they touch.
 */
export function buildChangesText(prev: string[], curr: string[]): string {
  const n = prev.length;
  const m = curr.length;
  // dp[i][j] = LCS of prev[i..] and curr[j..]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (prev[i] === curr[j]) dp[i]![j]! = dp[i + 1]![j + 1]! + 1;
      else dp[i]![j]! = Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  type RawOp = { type: "removed"; oldLine: number; oldText: string }
    | { type: "added"; newLine: number; newText: string };
  const ops: RawOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (prev[i] === curr[j]) { i++; j++; continue; }
    if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      ops.push({ type: "removed", oldLine: i + 1, oldText: prev[i]! });
      i++;
    } else {
      ops.push({ type: "added", newLine: j + 1, newText: curr[j]! });
      j++;
    }
  }
  while (i < n) { ops.push({ type: "removed", oldLine: i + 1, oldText: prev[i]! }); i++; }
  while (j < m) { ops.push({ type: "added", newLine: j + 1, newText: curr[j]! }); j++; }

  const lines: string[] = [];
  for (let k = 0; k < ops.length; k++) {
    const o = ops[k]!;
    const next = ops[k + 1];
    if (o.type === "removed" && next?.type === "added") {
      lines.push(`Line ${next.newLine} changed (was line ${o.oldLine}): "${o.oldText}" → "${next.newText}"`);
      k++;
    } else if (o.type === "removed") {
      lines.push(`Line ${o.oldLine} removed: "${o.oldText}"`);
    } else {
      lines.push(`Line ${o.newLine} added: "${o.newText}"`);
    }
  }
  return lines.length === 0 ? "(no line-level changes — same text)" : lines.join("\n");
}

export async function compareStory(
  {
    title,
    lines,
    previousLines,
    previousScores,
    localAnalysis,
    goals,
    writingFocus,
    scoreHistory,
    examMode,
  }: {
    title: string;
    lines: string[];
    previousLines: string[];
    previousScores: { overall_score: number };
    localAnalysis?: LocalAnalysisContext;
    goals?: Record<string, number>;
    writingFocus?: string;
    scoreHistory?: number[];
    examMode?: string | null;
  },
  model = "gpt-5-nano",
  signal?: AbortSignal,
): Promise<StoryComparison> {
  const changesText = buildChangesText(previousLines, lines);
  const examModeMeta = getExamModeMeta(examMode);
  const response = await fetch("/api/compare", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, lines, changesText, previousScores, model, localAnalysis, goals, writingFocus, scoreHistory, examMode: examModeMeta?.id }),
  });

  if (!response.ok) {
    const { message, retryAfterSec } = await parseAiErrorAndNotify(response, "compare");
    const e = new Error(message) as Error & { retryAfterSec?: number };
    if (retryAfterSec !== undefined) e.retryAfterSec = retryAfterSec;
    throw e;
  }

  const data = (await response.json()) as Record<string, unknown>;
  return parseComparison(data, examModeMeta);
}

export type HarshnessLevel = "baby" | "casual" | "student" | "editor" | "critic";

export async function analyzeStory(
  {
    title,
    lines,
    localAnalysis,
    goals,
    harshness,
    writingFocus,
    examMode,
  }: {
    title: string;
    lines: string[];
    localAnalysis?: LocalAnalysisContext;
    goals?: Record<string, number>;
    harshness?: HarshnessLevel;
    writingFocus?: string;
    examMode?: string | null;
  },
  model = "gpt-5-nano",
  signal?: AbortSignal,
): Promise<StoryAnalysis> {
  const examModeMeta = getExamModeMeta(examMode);
  const response = await fetch("/api/analyze", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, lines, model, localAnalysis, goals, harshness, writingFocus, examMode: examModeMeta?.id }),
  });

  if (!response.ok) {
    const { message, retryAfterSec } = await parseAiErrorAndNotify(response, "analyze");
    const e = new Error(message) as Error & { retryAfterSec?: number };
    if (retryAfterSec !== undefined) e.retryAfterSec = retryAfterSec;
    throw e;
  }

  const data = (await response.json()) as Record<string, unknown>;
  return parseAnalysis(data, examModeMeta);
}
