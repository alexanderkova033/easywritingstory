/**
 * Vercel serverless function — POST /api/suggest
 *
 * Receives { title, lines, type, context?, targetLine?, cursorLine?, selectedText?, steer?, model? } and returns writing suggestions.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRateLimit } from "./_rate-limit";
import { callOpenAI } from "./_openai";
import { cooldownFor, precheckSpend, recordSpend } from "./_usage-cap";
import { gibberishGuard } from "./_gibberish";

type SuggestType = "idea" | "continue" | "words" | "spark" | "line";

const PROMPTS: Record<SuggestType, string> = {
  idea: `You generate SHORT STORY CONCEPTS for a writer starting from scratch (typically aiming at 500–2,000 words, often IGCSE creative writing). A concept is a specific situation + a central character + a hint of tension or change, woven into 1–2 sentences. Concepts must be CONCRETE and SURPRISING — never abstract themes like "loss" or "growing up." Anchor in a particular place, person, object, or moment, and imply a story arc (something is at stake, something will change).

Return valid JSON: { "suggestions": ["string1", "string2", "string3"] }. Each element is a plain string (NOT an object). No markdown fences.

Good examples:
- "A girl finds her grandmother's diary the morning of the funeral and learns that the version of her grandmother she loved was not entirely true."
- "A boy who delivers newspapers in a small coastal town starts noticing the same car parked outside one house at 4am every Sunday."
- "The night before her father's wedding to a woman she has not met, a teenager decides she will not go, then changes her mind in the doorway."

Bad examples (do NOT produce these):
- "A story about love." (too abstract)
- "Reflections on growing up." (vague theme, no scene or stakes)`,

  continue: `You suggest 3 distinct ways to continue an in-progress short story. Study the story's voice, point of view, tense, pacing, and current direction. Each of the 3 suggestions must take a different APPROACH — vary length, focus (action / interiority / dialogue / sensory detail), and angle. Stay TRUE to the established voice — don't introduce a character, place, or plot element the story hasn't earned.

Return valid JSON: { "suggestions": ["...", "...", "..."] }. Each suggestion is 1–3 sentences of prose. Use real paragraph breaks if needed via "\\n\\n". No markdown fences, no explanations, no labels.

Bad outputs (do NOT produce these):
- A generic moralising closer ("And that was when she understood the meaning of family.").
- Three near-identical sentences.
- A new subplot or character the existing story hasn't established.`,

  words: `The user is writing a short story and wants stronger word choices for a passage or moment. Suggest 6 evocative, specific, story-appropriate words or short phrases (concrete nouns, sharper verbs, vivid adjectives — but few adverbs). Match the existing register: if the prose is plain, don't suggest purple vocabulary; if it's literary, avoid generic options. Avoid clichéd "writing-class" vocabulary ("whisper," "shadow," "soul," "heart") unless the story already uses that register. Return valid JSON: { "suggestions": ["word1", "word2", "word3", "word4", "word5", "word6"] }. No explanations, just the words. No markdown fences.`,

  spark: `The user has a short story in progress and needs a CREATIVE SPARK — a directional jolt to break a rut. You must NOT suggest starting concepts, scenes, or topics (that is the "idea" tool's job). Instead suggest 3 STRUCTURAL or ANGULAR pivots that take what they already have and twist it. Each suggestion is one sentence, written as an imperative or "What if…" prompt.

Valid forms:
- A constraint ("Cut every adverb from the next paragraph and see what survives.")
- A POV swap ("Rewrite the most important scene from the antagonist's point of view.")
- A what-if ("What if the narrator is lying to themselves about why this matters?")
- A reversal ("Open the story with the final image, then work backwards.")
- A structural pivot ("Compress the middle into a single paragraph; expand the smallest moment into a whole scene.")
- A withhold/reveal trick ("Tell the story without ever naming what the main character is afraid of.")

Return valid JSON: { "suggestions": ["...", "...", "..."] }. Each suggestion is 1 sentence, imperative or interrogative. No new themes, scenes, or starting concepts. No markdown fences.

Bad outputs (do NOT produce these):
- "A story about a lost dog." (that's an idea, not a spark)
- "Try writing about your grandmother." (new topic, not a pivot on what exists)
- Anything that doesn't reference, transform, or reframe the existing draft.`,

  line: `The user wants to improve a specific sentence in their short story. Study the story's voice, tense, point of view, and the rhythm of nearby sentences — then suggest 4 distinct rewrites of the target sentence. Each rewrite should take a different approach: vary the rhythm, the image, the verb choice, or the angle, while staying true to the story's overall voice and tense. Keep each to 1 sentence (or rarely 2, if a break of rhythm helps). Return valid JSON: { "suggestions": ["...", "...", "...", "..."] }. No markdown fences. If a target word-count range is specified, fit inside it.`,
};

interface BuildPromptArgs {
  title: string;
  lines: string[];
  context: string;
  targetLine?: string;
  cursorLine?: number;
  selectedText?: string;
  steer?: string;
  wordTarget?: number;
  wordTolerance?: number;
  type: SuggestType;
}

function buildPrompt(args: BuildPromptArgs): string {
  const { title, lines, context, targetLine, cursorLine, selectedText, steer, wordTarget, wordTolerance, type } = args;
  const parts: string[] = [];
  if (title.trim()) parts.push(`Title: ${title.trim()}`);
  if (lines.length > 0) {
    parts.push("Story so far:\n" + lines.map((l, i) => `${i + 1}: ${l}`).join("\n"));
  }
  if (targetLine) parts.push(`Sentence to rewrite: "${targetLine}"`);

  // For "continue", indicate the anchor (selection or cursor line).
  if (type === "continue") {
    if (selectedText && selectedText.trim()) {
      parts.push(`The user has SELECTED this passage as the anchor — continue from immediately after it (not from the end of the story):\n"""\n${selectedText.trim()}\n"""`);
    } else if (cursorLine != null && cursorLine > 0 && cursorLine < lines.length) {
      parts.push(`The user's cursor is at line ${cursorLine}. Continue from immediately after line ${cursorLine}, not from the end of the story. Your suggestions should bridge into line ${cursorLine + 1} naturally.`);
    }
  }

  if (wordTarget != null && wordTarget > 0) {
    if (wordTolerance != null && wordTolerance > 0) {
      const lo = Math.max(1, wordTarget - wordTolerance);
      const hi = wordTarget + wordTolerance;
      parts.push(`Target word range: ${lo}–${hi} words (centered on ${wordTarget}). Each rewrite must fall inside this range.`);
    } else {
      parts.push(`Target word count: ${wordTarget} words. Each rewrite should match this count closely.`);
    }
  }

  if (steer && steer.trim()) parts.push(`Steering: ${steer.trim()}`);
  if (context.trim()) parts.push(`User note: ${context.trim()}`);
  return parts.join("\n\n");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!(await checkRateLimit(req.headers["x-forwarded-for"]))) {
    return res.status(429).json({ error: "Too many requests — please wait a moment." });
  }

  const spend = await precheckSpend({
    rawIp: req.headers["x-forwarded-for"],
    endpoint: "suggest",
    cooldownMs: cooldownFor("suggest"),
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
    type?: unknown;
    context?: unknown;
    targetLine?: unknown;
    cursorLine?: unknown;
    selectedText?: unknown;
    steer?: unknown;
    wordTarget?: unknown;
    wordTolerance?: unknown;
    // Legacy fields kept for backward compatibility with older clients during rollout.
    syllableTarget?: unknown;
    syllableTolerance?: unknown;
    model?: unknown;
  };

  const suggestType = (typeof body.type === "string" ? body.type : "continue") as SuggestType;
  if (!PROMPTS[suggestType]) {
    return res.status(400).json({ error: "Invalid suggestion type." });
  }

  const title = typeof body.title === "string" ? body.title : "";
  const lines = Array.isArray(body.lines) ? (body.lines as unknown[]).map((l) => String(l ?? "")) : [];
  const context = typeof body.context === "string" ? body.context.slice(0, 1000) : "";
  const targetLine = typeof body.targetLine === "string" ? body.targetLine.slice(0, 500) : undefined;
  const cursorLine = typeof body.cursorLine === "number" && body.cursorLine > 0 ? Math.floor(body.cursorLine) : undefined;
  const selectedText = typeof body.selectedText === "string" ? body.selectedText.slice(0, 1000) : undefined;
  const steer = typeof body.steer === "string" ? body.steer.slice(0, 200) : undefined;
  const wordTarget = typeof body.wordTarget === "number" && body.wordTarget > 0
    ? body.wordTarget
    : (typeof body.syllableTarget === "number" && body.syllableTarget > 0 ? body.syllableTarget : undefined);
  const wordTolerance = typeof body.wordTolerance === "number" && body.wordTolerance >= 0
    ? Math.min(20, Math.round(body.wordTolerance))
    : (typeof body.syllableTolerance === "number" && body.syllableTolerance >= 0 ? Math.min(20, Math.round(body.syllableTolerance)) : undefined);
  const model = typeof body.model === "string" ? body.model : "gpt-5-nano";

  const totalChars = lines.reduce((sum, l) => sum + l.length, 0) + title.length;
  if (totalChars > 15_000) {
    return res.status(400).json({ error: "Story too long (max 15,000 characters / ~2,500 words)." });
  }
  if (lines.length > 800) {
    return res.status(400).json({ error: "Too many lines (max 800)." });
  }

  // Skip the gibberish guard for `idea`/`spark` types — the user may have
  // nothing typed at all and is asking for a starting concept.
  if (suggestType !== "idea" && suggestType !== "spark") {
    const guardText = [title, lines.join("\n"), targetLine ?? "", context]
      .filter(Boolean)
      .join("\n");
    if (guardText.length >= 40) {
      const gib = await gibberishGuard({
        rawIp: req.headers["x-forwarded-for"],
        text: guardText,
        apiKey,
      });
      if (!gib.ok) {
        if (gib.retryAfterSec) res.setHeader("Retry-After", String(gib.retryAfterSec));
        return res.status(gib.status).json(gib.body);
      }
    }
  }

  const result = await callOpenAI(
    apiKey,
    {
      model,
      messages: [
        { role: "system", content: PROMPTS[suggestType] },
        {
          role: "user",
          content: buildPrompt({
            title,
            lines,
            context,
            targetLine,
            cursorLine,
            selectedText,
            steer,
            wordTarget,
            wordTolerance,
            type: suggestType,
          }),
        },
      ],
      max_tokens: suggestType === "line" ? 2000 : 1500,
      temperature: 0.85,
      reasoningEffort: "minimal",
    },
    res,
  );

  if (!result) return;

  await recordSpend(spend.ip, result.model, result.usage.promptTokens, result.usage.completionTokens);

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.content);
  } catch {
    return res.status(502).json({ error: "OpenAI returned invalid JSON." });
  }

  // Normalize: if suggestions are objects (e.g. {image, mood, opening}), join their values into a string
  if (
    parsed != null &&
    typeof parsed === "object" &&
    Array.isArray((parsed as Record<string, unknown>).suggestions)
  ) {
    const raw = (parsed as Record<string, unknown>).suggestions as unknown[];
    (parsed as Record<string, unknown>).suggestions = raw.map((s) => {
      if (typeof s === "string") return s;
      if (s != null && typeof s === "object") {
        return Object.values(s as Record<string, unknown>)
          .map((v) => String(v ?? ""))
          .filter(Boolean)
          .join("\n");
      }
      return String(s ?? "");
    });
  }

  return res.status(200).json(parsed);
}
