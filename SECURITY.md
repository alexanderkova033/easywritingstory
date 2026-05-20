# Security policy

## Privacy posture

- **Stories never leave the browser** unless the user explicitly triggers AI feedback, export, or sharing.
- **No user accounts.** No backend database. All persistence is `localStorage`.
- **No analytics on story content.** Only anonymous page/session metrics via `@vercel/analytics` and `@vercel/speed-insights`.
- **AI calls** send only the title + story body + a small derived metrics summary. Nothing is stored server-side beyond ephemeral rate-limit / spend counters keyed by anonymised IP.

## AI key handling

- A single project-owned `OPENAI_API_KEY` is set in Vercel environment variables. Users do **not** bring their own key.
- The key lives only inside Vercel serverless functions (`api/`). The browser never sees it.
- One shared key serves all traffic, so rate limiting + per-IP spend caps + a global daily kill switch are essential. See [docs/AI_INTEGRATION.md](docs/AI_INTEGRATION.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- Kill switch: set `OPENAI_DISABLED=true` in Vercel env to disable all AI endpoints immediately, without redeploying.

## Content Security Policy

Defined in [vercel.json](vercel.json). Restricts:

- `script-src` to self + Vercel analytics
- `style-src` to self + Google Fonts
- `connect-src` to self + dictionaryapi.dev + Vercel insights
- `img-src` to self, data:, blob:
- `object-src` to `none`
- `frame-ancestors` blocked via `X-Frame-Options: DENY`

If you add a third-party domain, the CSP must be updated in the same PR.

(The Datamuse origin entry, used by the legacy poetry rhyme finder, can be removed from the CSP — the rhyme tools were deleted in the story pivot. The dictionaryapi.dev allowance is still needed for the word-lookup popover.)

## Rate limiting & spend caps

| Layer | File | Behaviour |
|---|---|---|
| Per-IP per-minute rate limit | [api/_rate-limit.ts](api/_rate-limit.ts) | Sliding window, in-memory per instance unless KV is configured. |
| Per-endpoint cooldown | [api/_usage-cap.ts](api/_usage-cap.ts) | 5 s default; 90 s for analyze on `gpt-5-nano`, 180 s mini, 240 s gpt-5. |
| Per-IP monthly spend cap | same | $3.00. Returns `402` when hit. |
| Global daily spend kill switch | same | $3.00. Returns `503` for all AI endpoints when hit. |
| Gibberish guard | [api/_gibberish.ts](api/_gibberish.ts) | Cheap pre-flight; rejects unrecognisable text with `422`. |

State persists in Vercel KV when `KV_REST_API_URL` + `KV_REST_API_TOKEN` are set; otherwise falls back to a process-local Map (dev only — non-durable across cold starts).

## Headers

Set by Vercel for every response:

| Header | Value |
|---|---|
| `Content-Security-Policy` | see [vercel.json](vercel.json) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

## Reporting a vulnerability

**Do not open a public GitHub issue for security-sensitive reports.**

Email the maintainer privately (see git log for current address) with:
1. A description of the issue and its impact.
2. Steps to reproduce.
3. Whether the issue is already public.

Expected response: acknowledgment within 7 days. Fixes prioritized over feature work.

## Out of scope

- Vulnerabilities in third-party services we link to (dictionaryapi.dev, OpenAI, Vercel platform itself).
- Bugs that require physical access to the user's device.
- Browser-platform issues outside our control (e.g. `localStorage` quota exhaustion).
