# AI integration

Server-side OpenAI calls live under [`api/`](../api/) as Vercel serverless functions. The browser never sees an API key; every call is user-triggered (no background polling).

## Stack

| Piece | Choice |
|---|---|
| Provider | **OpenAI** |
| Default model | **`gpt-5-nano`** (cheapest tier — fine for stories ≤ 2,000 words) |
| Upgrade path | `gpt-5-mini` / `gpt-5` via the per-request `model` field if a critique needs more nuance |
| Transport | HTTPS **POST** from the browser to `/api/*` on the same origin (Vercel) |
| Response shape | JSON validated server-side |

## Endpoints

All endpoints accept JSON via `POST`, return JSON, and share a small set of cross-cutting concerns documented at the bottom of this file (rate limits, spend caps, cooldowns, gibberish guard).

### `POST /api/analyze`

One-shot critique of a story.

**Request:**
```json
{
  "title": "string (optional)",
  "lines": ["line 1", "line 2", "..."],
  "model": "gpt-5-nano",
  "harshness": "baby|casual|student|editor|critic",
  "writingFocus": "optional 1-sentence focus the writer wants critiqued",
  "goals": {
    "minWords": 1200, "maxWords": 1800, "targetWords": 1500,
    "minLines": 0,    "maxLines": 0
  },
  "localAnalysis": {
    "cliches":          [{ "phrase": "...", "lineNumber": 1 }],
    "repeatedWords":    [{ "word": "...", "count": 3, "lines": [2, 7, 14] }],
    "avgWordsPerSentence":  12.4,
    "sentenceLengthStdDev": 5.1,
    "readingGrade":         7.4,
    "dialogueFraction":     0.18,
    "sentenceCount":        92,
    "paragraphCount":       12,
    "longestSentence":      { "words": 43, "startLine": 18 }
  }
}
```

- `lines`: max 800 (configured in `api/analyze.ts`).
- Total characters across title + lines: max **15,000** (~2,500 words — generous headroom over the 2,000-word IGCSE target).
- `harshness` chooses the persona — `critic` is a senior IGCSE creative-writing examiner judging against the rubric for content/structure (24) and style/accuracy (16).

**Response (the model returns this verbatim as JSON, no fences):**

```json
{
  "overall_score": 73,
  "warm_reaction": "Tense opening; ending drifts.",
  "strengths": ["dialogue feels lived-in", "specific sensory detail"],
  "weaknesses": ["repeated adverbs", "weak verb choices"],
  "strongest_line": { "line": 12, "why": "anchors mood in concrete object" },
  "issues": [
    {
      "id": "issue-1",
      "severity": "medium",
      "line_start": 18,
      "line_end": 18,
      "headline": "Adverb pile-up",
      "problem_words": ["quickly", "suddenly", "loudly"],
      "rationale": "Three adverbs in two sentences blur the action ...",
      "improvements": ["replace adverbs with stronger verbs", "let dialogue stand alone"],
      "rewrite": "He shut the door."
    }
  ],
  "overall_feedback": "Holistic 1–2 sentences.",
  "personal_feedback": "Mentor 1–2 sentences addressed to the writer."
}
```

### `POST /api/compare`

Revision-aware critique. Accepts a diff of the previous draft + the current full text, scores the current version, and reports `comparison: { improvements, regressions, unchanged }`.

Request adds: `changesText` (the diff, ≤ 8,000 chars), optional `previousScores`, optional `scoreHistory[]`. Limits and `localAnalysis` shape match `/api/analyze`.

### `POST /api/suggest`

Suggestion generator with five modes:

| `type` | Returns |
|---|---|
| `idea` | 3 story concepts (situation + character + hint of tension) |
| `continue` | 3 ways to continue the story from cursor / selection |
| `words` | 6 vivid, register-matched word choices |
| `spark` | 3 structural / angular pivots on the existing draft |
| `line` | 4 rewrites of a target sentence (optional `wordTarget` + `wordTolerance`) |

Backward-compat: `syllableTarget` / `syllableTolerance` are accepted as aliases for `wordTarget` / `wordTolerance` during the rollout.

Response is always `{ "suggestions": ["...", "...", ...] }`.

### `POST /api/chat`

Conversational follow-up to a recent analysis. Accepts `{ title, lines, message, analysisContext?, history?, model? }`. Returns `{ "reply": "string" }`. The full story body is sent in the system message only on the first turn; subsequent turns rely on chat history to keep token usage flat. OpenAI's automatic prompt caching on gpt-5 prefixes > 1,024 tokens means the cached story body re-uses cache hits across rapid follow-ups.

### `POST /api/generate-background`

Generates a custom background palette + image from a text prompt. Unchanged from the poetry version of the project.

---

## Cross-cutting concerns

All endpoints flow through the same guards in [`api/_rate-limit.ts`](../api/_rate-limit.ts), [`api/_usage-cap.ts`](../api/_usage-cap.ts), and [`api/_gibberish.ts`](../api/_gibberish.ts).

### Rate limit

Per-IP per minute, in-memory.

### Spend cap

- **Per-IP monthly cap:** $3.00 (300¢)
- **Global daily kill switch:** $3.00 (300¢) — when hit, all AI endpoints return `503`
- **Per-IP per-endpoint cooldown:**
  - `analyze` / `compare`: 90 s (nano), 180 s (mini), 240 s (gpt-5)
  - everything else: 5 s

State lives in Vercel KV when configured, falls back to a process-local Map in local dev.

### Gibberish guard

A cheap guard call to OpenAI checks whether the submitted text is recognisable English (or recognisable as a story-in-progress) before the expensive analysis call. Returns 422 on rejection so users with nonsense input don't burn budget.

### Errors

`{ "error": string, "retryAfterSec"?: number, "reason"?: string }`.

| Status | Meaning |
|--------|---------|
| `400` | Missing/invalid body, payload too large, unknown suggest type |
| `422` | Gibberish guard rejected the input |
| `429` | Cooldown or rate limit hit. `Retry-After` header set. |
| `402` | Per-IP monthly cap reached |
| `500` | `OPENAI_API_KEY` missing |
| `503` | Global daily cap reached, or `OPENAI_DISABLED=true` kill switch on |
| `502` | Upstream OpenAI error, or model returned invalid JSON |
| `504` | OpenAI / function timeout |

---

## Environment variables (Vercel)

| Var | Purpose |
|---|---|
| `OPENAI_API_KEY` | Required. Project-owned key. |
| `OPENAI_DISABLED` | Set to `true` to flip the AI kill switch without redeploying. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Required in production for durable rate-limit + spend counters. Without KV the limits work per-instance only. |

## Privacy

- Drafts stay in `localStorage` until the user explicitly triggers an AI action.
- For AI actions, the title + body (and the local analysis summary above) are sent to the same-origin `/api/*` endpoint, which forwards to OpenAI.
- No user identifier is sent. Per-IP keys are used only for rate-limit/spend accounting and stored only in KV with TTLs aligned to the limit window (day/month).
- See [SECURITY.md](../SECURITY.md) for full privacy posture.
