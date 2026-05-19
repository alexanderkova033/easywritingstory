/**
 * Vercel serverless function — POST /api/analyze
 *
 * Receives { title, lines, localAnalysis?, goals? } from the browser,
 * forwards to OpenAI, and returns the analysis JSON.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRateLimit, getRateLimitRetrySec } from "./_rate-limit";
import { callOpenAI, sendParsedResponse } from "./_openai";
import { cooldownFor, precheckSpend, recordSpend } from "./_usage-cap";
import { gibberishGuard } from "./_gibberish";

const HARSHNESS_PERSONAS: Record<string, string> = {
  baby:    "a kind, encouraging reader who celebrates effort and only mentions one very obvious improvement gently",
  casual:  "a supportive friend who reads short stories casually — warm, encouraging, only notes glaring issues",
  student: "a writing-workshop peer — honest and constructive, balanced praise and critique on character, pacing, voice",
  editor:  "a professional short-fiction editor — direct, specific, and demanding high craft on prose, dialogue, and structure",
  critic:  "a senior IGCSE creative-writing examiner — rigorous against the rubric for content/structure (24) and style/accuracy (16), expecting sophisticated vocabulary, varied sentence forms, and clear narrative arc",
};

function buildSystemPrompt(harshness?: string): string {
  const persona = harshness && harshness in HARSHNESS_PERSONAS
    ? HARSHNESS_PERSONAS[harshness as keyof typeof HARSHNESS_PERSONAS]
    : HARSHNESS_PERSONAS.editor;
  return `You are ${persona}. The user is writing a short story (typically under 2,000 words, often for IGCSE creative writing coursework). Return JSON only (no fences). Keys:
overall_score (int 1-100), warm_reaction (≤14 words, terse), strengths[] (2-3 items, ≤6w each, terse), weaknesses[] (2-3, ≤6w, terse), strongest_line {line:int, why:≤8w}, issues[] (2-5 — mix serious craft problems with smaller nitpicks; pick the most useful across that range).
overall_feedback (string, 1-2 short sentences max, holistic read of the story — voice, pacing, what it lands or misses. Specific, not generic. Keep it tight.).
personal_feedback (string, 1-2 short sentences max, addressed to the writer as "you". One thing they're doing well + one concrete craft move to try next. Warm but brief, no preamble.).
Each issue: id, severity ("high"|"medium"|"low"), line_start, line_end, headline (≤6w), problem_words[] (REQUIRED whenever the issue centers on specific words — weak verb, adverb pile-up, vague noun, telling word, cliché, filler, repetition. List the exact lowercase tokens from the story text that the editor should highlight. Only omit when the issue is purely structural — paragraph break, scene order, missing turn — where no specific word is the culprit.),
  rationale (3-5 full sentences — (1) name the specific craft problem, (2) explain WHY it weakens the writing in this story's context, quoting concrete words/phrases, (3) describe how it lands on the reader (the sensory, emotional, or narrative effect, what gets blurred or lost), (4) when useful, contrast with what a sharper move would do. Do not generalise; speak about THIS passage.),
  improvements[] (2-4 concrete moves the writer can try, each ≤14 words, naming a specific technique or word swap rather than vague advice),
  rewrite? (omit unless you can offer a clearly stronger one-sentence replacement),
  confidence? ("low" only — omit otherwise).
Cover a range of craft angles across issues — character voice, dialogue naturalness, pacing, sensory detail, sentence rhythm, show-don't-tell, tense/POV consistency, diction, cliché. Use local analysis hints (clichés, sentence-length stats, dialogue %, reading grade, repeated words) when present. 1-based line numbers. Keep headline terse; rationale gets full paragraph-length sentences; improvements stay punchy but specific.`;
}

interface LocalAnalysis {
  cliches?: Array<{ phrase: string; lineNumber: number }>;
  repeatedWords?: Array<{ word: string; count: number }>;
  /** Avg words per sentence, 1 decimal. */
  avgWordsPerSentence?: number;
  /** Population std-dev of words/sentence, 1 decimal. */
  sentenceLengthStdDev?: number;
  /** Flesch-Kincaid grade level, 1 decimal. */
  readingGrade?: number;
  /** Share of total words inside quoted dialogue, 0-1. */
  dialogueFraction?: number;
  /** Total sentence count. */
  sentenceCount?: number;
  /** Total paragraph count. */
  paragraphCount?: number;
  /** Longest sentence in words, with starting line. */
  longestSentence?: { words: number; startLine: number };
}

interface GoalsContext {
  minLines?: number;
  maxLines?: number;
  minWords?: number;
  maxWords?: number;
  targetWords?: number;
}

function buildContextHints(local?: LocalAnalysis, goals?: GoalsContext, writingFocus?: string): string {
  const hints: string[] = [];

  if (local?.readingGrade != null) {
    hints.push(`Reading grade (Flesch-Kincaid): ${local.readingGrade}`);
  }
  if (local?.sentenceCount != null && local?.avgWordsPerSentence != null) {
    const stdev = local.sentenceLengthStdDev != null ? `, σ=${local.sentenceLengthStdDev}` : "";
    hints.push(`Sentences: ${local.sentenceCount} (avg ${local.avgWordsPerSentence} w/sent${stdev})`);
  }
  if (local?.longestSentence) {
    hints.push(`Longest sentence: ${local.longestSentence.words} words (starts line ${local.longestSentence.startLine})`);
  }
  if (local?.paragraphCount != null) {
    hints.push(`Paragraphs: ${local.paragraphCount}`);
  }
  if (local?.dialogueFraction != null) {
    hints.push(`Dialogue share: ${Math.round(local.dialogueFraction * 100)}%`);
  }
  if (local?.cliches && local.cliches.length > 0) {
    hints.push(`Detected clichés: ${local.cliches.map((c) => `L${c.lineNumber}: "${c.phrase}"`).join("; ")}`);
  }
  if (local?.repeatedWords && local.repeatedWords.length > 0) {
    const top = local.repeatedWords.slice(0, 6);
    hints.push(`Repeated words: ${top.map((r) => `"${r.word}" ×${r.count}`).join(", ")}`);
  }

  if (goals) {
    const goalParts: string[] = [];
    if (goals.minWords) goalParts.push(`min ${goals.minWords} words`);
    if (goals.maxWords) goalParts.push(`max ${goals.maxWords} words`);
    if (goals.targetWords) goalParts.push(`target ${goals.targetWords} words`);
    if (goals.minLines) goalParts.push(`min ${goals.minLines} lines`);
    if (goals.maxLines) goalParts.push(`max ${goals.maxLines} lines`);
    if (goalParts.length > 0) hints.push(`Author's constraints: ${goalParts.join(", ")}`);
  }

  if (writingFocus && writingFocus.trim()) {
    hints.push(`Author's writing focus for this revision: ${writingFocus.trim()}`);
  }

  return hints.length > 0 ? `\n\n--- Local analysis context ---\n${hints.join("\n")}` : "";
}

function buildPrompt(title: string, lines: string[], local?: LocalAnalysis, goals?: GoalsContext, writingFocus?: string): string {
  const titlePart = title.trim() ? `Title: ${title.trim()}\n\n` : "";
  const numbered = lines.map((l, i) => `${i + 1}: ${l}`).join("\n");
  return `${titlePart}${numbered}${buildContextHints(local, goals, writingFocus)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!(await checkRateLimit(req.headers["x-forwarded-for"]))) {
    const retryAfterSec = await getRateLimitRetrySec(req.headers["x-forwarded-for"]);
    if (retryAfterSec > 0) res.setHeader("Retry-After", String(retryAfterSec));
    return res.status(429).json({
      error: "Too many requests — please wait a moment before analysing again.",
      retryAfterSec,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is not configured with an OpenAI API key." });
  }

  const body = req.body as {
    title?: unknown;
    lines?: unknown;
    model?: unknown;
    localAnalysis?: unknown;
    goals?: unknown;
    harshness?: unknown;
    writingFocus?: unknown;
  };

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return res.status(400).json({ error: "Missing or empty `lines` array in request body." });
  }

  const title = typeof body.title === "string" ? body.title : "";
  const lines = (body.lines as unknown[]).map((l) => String(l ?? ""));
  const model = typeof body.model === "string" ? body.model : "gpt-5-nano";

  const spend = await precheckSpend({
    rawIp: req.headers["x-forwarded-for"],
    endpoint: "analyze",
    cooldownMs: cooldownFor("analyze", model),
  });
  if (!spend.ok) {
    if (spend.retryAfterSec) res.setHeader("Retry-After", String(spend.retryAfterSec));
    return res.status(spend.status).json(spend.body);
  }
  const local = (body.localAnalysis && typeof body.localAnalysis === "object" ? body.localAnalysis : undefined) as LocalAnalysis | undefined;
  const goals = (body.goals && typeof body.goals === "object" ? body.goals : undefined) as GoalsContext | undefined;
  const harshness = typeof body.harshness === "string" ? body.harshness : undefined;
  const writingFocus = typeof body.writingFocus === "string" ? body.writingFocus.slice(0, 500) : undefined;

  const MAX_LINES = 800;
  if (lines.length > MAX_LINES) {
    return res.status(400).json({ error: `Too many lines (max ${MAX_LINES}).` });
  }

  // ~15k chars ≈ 2,500 words — generous headroom over the 2,000-word IGCSE target.
  const MAX_TOTAL_CHARS = 15_000;
  const totalChars = lines.reduce((sum, l) => sum + l.length, 0) + title.length;
  if (totalChars > MAX_TOTAL_CHARS) {
    return res.status(400).json({ error: `Story too long (max ${MAX_TOTAL_CHARS} characters / ~2,500 words).` });
  }

  const gib = await gibberishGuard({
    rawIp: req.headers["x-forwarded-for"],
    text: `${title}\n${lines.join("\n")}`,
    apiKey,
  });
  if (!gib.ok) {
    if (gib.retryAfterSec) res.setHeader("Retry-After", String(gib.retryAfterSec));
    return res.status(gib.status).json(gib.body);
  }

  const result = await callOpenAI(
    apiKey,
    {
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(harshness) },
        { role: "user", content: buildPrompt(title, lines, local, goals, writingFocus) },
      ],
      max_tokens: 4000,
      temperature: 0.4,
      reasoningEffort: "low",
    },
    res,
  );
  if (!result) return;

  await recordSpend(spend.ip, result.model, result.usage.promptTokens, result.usage.completionTokens);
  sendParsedResponse(res, result.content, result.model);
}
