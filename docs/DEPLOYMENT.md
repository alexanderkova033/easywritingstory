# Deployment

The app is deployed on Vercel as a static SPA plus Node.js serverless functions.

---

## How it deploys

| Concern | Setup |
|---|---|
| Trigger | Push to `main` |
| Build command | `cd web && npm install && npm run build` (defined in [vercel.json](../vercel.json)) |
| Output directory | `web/dist` |
| API functions | Files under `/api/*.ts` are auto-deployed as Vercel Node.js serverless functions |
| Framework preset | None (`"framework": null`) |
| Rewrites | `/api/*` → function handlers, everything else → `index.html` (SPA fallback) |

---

## Environment variables

Set these in the Vercel project dashboard (Production, Preview, Development as appropriate):

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | yes (for AI features) | Project-owned key. AI panels show "not configured" if missing. |
| `OPENAI_DISABLED` | optional | Set to `true` to disable all AI endpoints without redeploying. Returns `503` from every AI route. |
| `OPENAI_MODEL` | optional | Override default model (current default: `gpt-5-nano`). |
| `KV_REST_API_URL` | recommended in prod | Vercel KV REST endpoint — durable rate-limit + spend counters across cold starts. |
| `KV_REST_API_TOKEN` | recommended in prod | Token for the same KV instance. |

**Never commit `.env` files.** `.gitignore` excludes them; double-check before pushing.

---

## Headers

All responses get security headers via [vercel.json](../vercel.json):

- `Content-Security-Policy` — see [SECURITY.md](../SECURITY.md)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

If you add a third-party script, style, or fetch target, update the CSP in the same PR.

---

## Build invariants

`npm run build` runs:

1. `tsc --noEmit -p tsconfig.json` — type-check.
2. `vite build` — produce hashed static files in `web/dist`.

A red build blocks the deploy.

(The historical `check:cmu-stress` build step was removed when the poetry CMU pronouncing dictionary was deleted.)

---

## Local Vercel dev

```sh
# from repo root, not web/
vercel dev
```

This serves the Vite frontend and the `/api` functions together, mirroring production routing. Required for testing AI endpoints locally.

---

## Rollback

Vercel keeps every previous deploy. To roll back:

1. Open the Vercel dashboard → Deployments.
2. Find the last good deploy.
3. "Promote to Production".

No DB migration concerns — there's no backend database.

---

## Custom domain

Production domain TBD (the placeholder used in `sitemap.xml` is `easywritingstory.vercel.app`; update both the sitemap and the OG / Twitter card URLs in `web/index.html` when a real domain is wired up). DNS configuration lives in the registrar; the Vercel project must list it under Domains with HTTPS auto-provisioned.

---

## Monitoring

- `@vercel/analytics` and `@vercel/speed-insights` provide anonymous Core Web Vitals and page-view metrics.
- Function logs are in the Vercel dashboard under Logs.
- No external APM or error tracking wired up. Consider Sentry if error rates rise.

---

## Cost & abuse controls

- **Spend caps:** `api/_usage-cap.ts` enforces a per-IP monthly cap ($3.00) and a global daily kill switch ($3.00). Both back off to a process-local Map in local dev; persist via Vercel KV in production.
- **Per-endpoint cooldowns:** Analyze and Compare have model-dependent cooldowns (90 s nano, 180 s mini, 240 s gpt-5). Other endpoints share a 5 s default.
- **Rate limit:** per-IP per-minute sliding window in `api/_rate-limit.ts`.
- **Gibberish guard:** a cheap pre-flight check rejects unrecognisable text before the expensive analysis call.
- **Hard payload limits:** every AI endpoint rejects payloads over 15,000 characters (~2,500 words) — comfortably above the 2,000-word IGCSE target.

If costs spike, the fastest mitigation is `OPENAI_DISABLED=true` in the Vercel env (no redeploy needed).
