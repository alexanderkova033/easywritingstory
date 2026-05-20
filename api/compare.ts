/**
 * Vercel serverless function — POST /api/compare
 *
 * Receives { title, lines, changesText, previousScores, localAnalysis?, goals? }
 * and asks the model to analyse the current story AND compare it to the previous version.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRateLimit, getRateLimitRetrySec } from "./_rate-limit";
import { callOpenAI, sendParsedResponse } from "./_openai";
import { cooldownFor, precheckSpend, recordSpend } from "./_usage-cap";
import { gibberishGuard } from "./_gibberish";
import { buildExamPromptBlock, getExamMode, type ExamMode } from "./_exam-modes";

const SYSTEM_PROMPT_BASE = `You are an encouraging short-story editor. The user is revising a short story (typically under 2,000 words, often for IGCSE creative writing). You receive a diff (previous → current) plus the previous score. Score the CURRENT version. Return JSON only (no fences). Keys:
overall_score (int 1-100, CURRENT), warm_reaction (≤14w, terse), strengths[] (2-3, ≤6w, terse), weaknesses[] (2-3, ≤6w, terse), strongest_line {line:int, why:≤8w}, issues[] (2-5 — mix serious craft problems with smaller nitpicks; pick the most useful across that range), comparison {improvements:[], regressions:[], unchanged:[]} (0-3 items each, ≤6w, may be empty).
overall_feedback (string, 2-3 full sentences, holistic read of the current draft as a whole — voice, pacing, what it accomplishes, where it lands).
personal_feedback (string, 2-3 full sentences addressed to the writer as "you". Note the revision arc — what improved, what their instincts seem drawn to, one concrete craft move to grow into next. Mentor tone, not rubric).
Each issue: id, severity ("high"|"medium"|"low"), line_start, line_end, headline (≤6w), problem_words?[],
  rationale (3-5 full sentences — (1) name the specific craft problem, (2) explain WHY it weakens the writing in this story's context with concrete words/phrases, (3) describe how it lands on the reader (sensory, emotional, or narrative effect, what gets blurred or lost), (4) when useful, contrast with what a sharper move would do. Speak about THIS passage, not generalities.),
  improvements[] (2-4 concrete moves, each ≤14 words, naming a specific technique or word swap), rewrite?, confidence? ("low" only).
Cover a range of craft angles across issues — character voice, dialogue, pacing, sensory detail, sentence rhythm, show-don't-tell, diction, tense/POV consistency. Headline stays terse; rationale gets paragraph-length detail; improvements stay punchy but specific. Use local analysis hints if provided. 1-based line numbers.`;

function buildSystemPrompt(examMode: ExamMode | null): string {
  return examMode ? `${SYSTEM_PROMPT_BASE}${buildExamPromptBlock(examMode)}` : SYSTEM_PROMPT_BASE;
}

interface LocalAnalysis {
  cliches?: Array<{ phrase: string; lineNumber: number }>;
  repeatedWords?: Array<{ word: string; count: number }>;
  avgWordsPerSentence?: number;
  sentenceLengthStdDev?: number;
  readingGrade?: number;
  dialogueFraction?: number;
  sentenceCount?: number;
  paragraphCount?: number;
  longestSentence?: { words: number; startLine: number };
}

interface GoalsContext {
  minLines?: number;
  maxLines?: number;
  minWords?: number;
  maxWords?: number;
  targetWords?: number;
}

function numbered(lines: string[]): string {
  return lines.map((l, i) => `${i + 1}: ${l}`).join("\n");
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
    changesText?: unknown;
    previousScores?: unknown;
    scoreHistory?: unknown;
    model?: unknown;
    localAnalysis?: unknown;
    goals?: unknown;
    examMode?: unknown;
    writingFocus?: unknown;
  };

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return res.status(400).json({ error: "Missing or empty `lines` array." });
  }
  if (typeof body.changesText !== "string" || !body.changesText.trim()) {
    return res.status(400).json({ error: "Missing `changesText` describing the diff from the previous draft." });
  }

  const MAX_LINES = 800;
  if ((body.lines as unknown[]).length > MAX_LINES) {
    return res.status(400).json({ error: `Too many lines (max ${MAX_LINES}).` });
  }

  const title = typeof body.title === "string" ? body.title : "";
  const lines = (body.lines as unknown[]).map((l) => String(l ?? ""));
  const totalChars = lines.reduce((sum, l) => sum + l.length, 0) + title.length;
  if (totalChars > 15_000) {
    return res.status(400).json({ error: "Story too long (max 15,000 characters / ~2,500 words)." });
  }
  const changesText = (body.changesText as string).slice(0, 8_000);
  const model = typeof body.model === "string" ? body.model : "gpt-5-nano";

  const gib = await gibberishGuard({
    rawIp: req.headers["x-forwarded-for"],
    text: `${title}\n${lines.join("\n")}\n${changesText}`,
    apiKey,
  });
  if (!gib.ok) {
    if (gib.retryAfterSec) res.setHeader("Retry-After", String(gib.retryAfterSec));
    return res.status(gib.status).json(gib.body);
  }

  const spend = await precheckSpend({
    rawIp: req.headers["x-forwarded-for"],
    endpoint: "compare",
    cooldownMs: cooldownFor("compare", model),
  });
  if (!spend.ok) {
    if (spend.retryAfterSec) res.setHeader("Retry-After", String(spend.retryAfterSec));
    return res.status(spend.status).json(spend.body);
  }
  const prevScores = body.previousScores ?? null;
  const local = (body.localAnalysis && typeof body.localAnalysis === "object" ? body.localAnalysis : undefined) as LocalAnalysis | undefined;
  const goals = (body.goals && typeof body.goals === "object" ? body.goals : undefined) as GoalsContext | undefined;
  const writingFocus = typeof body.writingFocus === "string" ? body.writingFocus.slice(0, 500) : undefined;
  const examMode = getExamMode(typeof body.examMode === "string" ? body.examMode : undefined);
  const scoreHistory = Array.isArray(body.scoreHistory)
    ? (body.scoreHistory as unknown[]).filter((v): v is number => typeof v === "number").slice(-10)
    : undefined;

  const titlePart = title.trim() ? `Title: ${title.trim()}\n\n` : "";
  const prevScoreText = prevScores ? `\nPrevious score: ${JSON.stringify(prevScores)}\n` : "";
  const historyText = scoreHistory && scoreHistory.length > 1
    ? `\nScore history (oldest → newest): ${scoreHistory.join(" → ")}\n`
    : "";
  const contextBlock = buildContextHints(local, goals, writingFocus);

  const userMessage = `${titlePart}=== CHANGES from previous draft (line numbers refer to the CURRENT draft below) ===\n${changesText}\n${prevScoreText}${historyText}\n=== CURRENT VERSION ===\n${numbered(lines)}${contextBlock}\n\nNote: only the diff is shown above, not the full previous draft. Score and review the CURRENT version, but use the diff to identify what improved or regressed.`;

  const result = await callOpenAI(
    apiKey,
    {
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(examMode) },
        { role: "user", content: userMessage },
      ],
      max_tokens: 5000,
      temperature: 0.4,
      reasoningEffort: "low",
    },
    res,
  );
  if (!result) return;

  await recordSpend(spend.ip, result.model, result.usage.promptTokens, result.usage.completionTokens);
  sendParsedResponse(res, result.content, result.model);
}
