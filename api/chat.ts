/**
 * Vercel serverless function — POST /api/chat
 *
 * Receives { title, lines, message, analysisContext? } and returns { reply: string }.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRateLimit, getRateLimitRetrySec } from "./_rate-limit";
import { callOpenAI } from "./_openai";
import { cooldownFor, precheckSpend, recordSpend } from "./_usage-cap";
import { gibberishGuard } from "./_gibberish";

const SYSTEM_PROMPT = `You are a thoughtful short-story editor and writing coach. The user is working on a short story (typically under 2,000 words, often for IGCSE creative writing coursework) and has received AI feedback on it. They want to have a conversation with you about their story — asking questions, getting clarification on feedback, brainstorming, or exploring craft.

Be warm, specific, and constructive. When relevant, quote a phrase or sentence from their story (in single quotes) rather than retyping a whole paragraph. Talk about character, pacing, voice, dialogue, sensory detail, sentence rhythm — the things prose lives on. Keep responses concise — 2–4 sentences unless the question genuinely needs more. Focus on helping the writer grow, not just critiquing.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!(await checkRateLimit(req.headers["x-forwarded-for"]))) {
    const retryAfterSec = await getRateLimitRetrySec(req.headers["x-forwarded-for"]);
    if (retryAfterSec > 0) res.setHeader("Retry-After", String(retryAfterSec));
    return res.status(429).json({
      error: "Too many requests — please wait a moment.",
      retryAfterSec,
    });
  }

  const spend = await precheckSpend({
    rawIp: req.headers["x-forwarded-for"],
    endpoint: "chat",
    cooldownMs: cooldownFor("chat"),
  });
  if (!spend.ok) {
    if (spend.retryAfterSec) res.setHeader("Retry-After", String(spend.retryAfterSec));
    return res.status(spend.status).json(spend.body);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is not configured with an OpenAI API key." });
  }

  const body = req.body as {
    title?: unknown;
    lines?: unknown;
    message?: unknown;
    analysisContext?: unknown;
    history?: unknown;
    model?: unknown;
  };

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const lines = Array.isArray(body.lines) ? (body.lines as unknown[]).map((l) => String(l ?? "")) : [];
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const analysisContext = typeof body.analysisContext === "string" ? body.analysisContext : "";
  const model = typeof body.model === "string" ? body.model : "gpt-5-nano";

  // Cap forwarded history to keep token usage bounded.
  const MAX_HISTORY_TURNS = 6;
  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history = rawHistory
    .map((entry) => entry as { role?: unknown; content?: unknown })
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role as "user" | "assistant", content: (m.content as string).slice(0, 4000) }))
    .slice(-MAX_HISTORY_TURNS);

  if (!message) {
    return res.status(400).json({ error: "No message provided." });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: "Message too long (max 2000 characters)." });
  }
  const totalStoryChars = lines.reduce((sum, l) => sum + l.length, 0) + title.length;
  // ~15k chars ≈ 2,500 words — generous headroom over the 2,000-word target.
  if (totalStoryChars > 15_000) {
    return res.status(400).json({ error: "Story too long (max 15,000 characters / ~2,500 words)." });
  }

  const gib = await gibberishGuard({
    rawIp: req.headers["x-forwarded-for"],
    text: `${message}\n${title}\n${lines.join("\n")}`,
    apiKey,
  });
  if (!gib.ok) {
    if (gib.retryAfterSec) res.setHeader("Retry-After", String(gib.retryAfterSec));
    return res.status(gib.status).json(gib.body);
  }

  // First turn carries the story in the system message; subsequent turns rely
  // on the chat history to reference it. Saves the full story body on every
  // reply after the first.
  const isFirstTurn = history.length < 2;
  const storySection = isFirstTurn && lines.length > 0
    ? `\nStory${title ? ` — "${title}"` : ""}:\n${lines.join("\n")}`
    : "";

  const analysisSection = isFirstTurn && analysisContext
    ? `\nRecent analysis summary:\n${analysisContext}`
    : "";

  const systemContent = `${SYSTEM_PROMPT}${storySection}${analysisSection}`;

  const result = await callOpenAI(
    apiKey,
    {
      model,
      messages: [
        { role: "system", content: systemContent },
        ...history,
        { role: "user", content: message },
      ],
      max_tokens: 1200,
      temperature: 0.7,
      jsonMode: false,
      reasoningEffort: "minimal",
    },
    res,
  );

  if (!result) return;

  await recordSpend(spend.ip, result.model, result.usage.promptTokens, result.usage.completionTokens);
  return res.status(200).json({ reply: result.content });
}
