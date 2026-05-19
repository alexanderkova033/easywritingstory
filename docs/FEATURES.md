# Features

The workshop is grouped into three buckets in the tools panel: **Overview**, **Language**, **Suggest**. Each maps to a set of tabs.

---

## Overview bucket

| Tab | What it shows |
|-----|---------------|
| **Issues** | AI feedback — overall score, story-level issues with severity dots, harshness selector (gentle → IGCSE examiner), post-analysis chat |
| **Spell** | English spelling check. Strict / permissive modes. Personal dictionary and per-session ignore list. |
| **Lines** | Per-line word & character counts (with bar + outlier flag), secondary syllable count, and a prose-stats strip: Flesch-Kincaid reading grade, average words per sentence, sentence count, dialogue %, longest sentence |
| **Goals** | Word, line, and paragraph targets with story-length presets — Flash 500 / Short 1,000 / IGCSE 1,500 / Long 2,000 |
| **Snapshots** | Manual + automatic revisions (up to 50 per story). Named labels. Side-by-side diff. |

---

## Language bucket

| Tab | What it shows |
|-----|---------------|
| **Repeats** | Repeated and near-repeated words flagged with line numbers and counts |

---

## Suggest bucket

| Tab | What it shows |
|-----|---------------|
| **Suggest / Ideas** | Story concepts, paragraph continuations, structural angles, vivid word choices, and sentence rewrites with a target word count |

---

## Outside the tools panel

| Feature | What it does |
|---|---|
| **AI Theme** | Generate a custom background theme from a text prompt |
| **Theme picker** | 22+ built-in themes (light, dusk, ember, ocean, aurora, snow, candle, ripple, firefly, studio, zenith…) |
| **Reading mode** | Distraction-free reader for finished drafts |
| **Sharing** | Export to DOCX, PDF, image, or generate a shareable link |
| **Selection popover** | Define (single word) + AI rewrite (with target word count) on highlighted text |
| **Command palette** | Keyboard-driven navigation across tabs, drafts, and actions |
| **Hover hints** | Optional inline tooltips for story-craft terms |
| **Format toolbar** | Bold (`**…**`) and underline (`__…__`) markers rendered as decorations |
| **Format marks** | Visual decorations on `**bold**` and `__underline__` syntax |
| **Word lookup** | Optional in-editor definition popover (toggle in Settings) |
| **First-visit hint** | Minimal info strip for new users |
| **Story starters** | 8 opening templates — dialogue / action / sensory place / memory hook / mystery / character gesture / three-beat / blank |

---

## Local-first behaviour

- All stories, snapshots, goals, settings, personal dictionary, and ignore lists live in `localStorage`.
- After first load, the editor and all local tools work without a network connection.
- The library list is virtualized (TanStack Virtual) so even hundreds of drafts scroll smoothly.
- Soft line-wrapping: long sentences flow to the next visual row instead of shrinking the font.

---

## AI behaviour

- **Project-owned key.** Users don't sign up or bring their own OpenAI key — one project key serves all traffic.
- **Explicit only.** No AI request fires while typing. Every call is user-triggered (Analyse / Refine / Suggest / Chat / Insert / Rewrite).
- **Selection-scoped where possible.** Sentence rewrites send only the selected text, not the whole story — the cheapest meaningful AI surface in the app.
- **Endpoints** ([api/](../api/)): `analyze`, `suggest`, `chat`, `compare`, `generate-background`. See [AI_INTEGRATION.md](AI_INTEGRATION.md) for contracts.
- **Spend caps.** Per-IP monthly cap ($3) + global daily kill switch ($3) + per-endpoint cooldowns (analyze: 90s on nano, longer on larger models). See `api/_usage-cap.ts`.
- **Automatic prompt caching.** OpenAI's gpt-5 family caches prefixes >1,024 tokens automatically, so repeated analyses of the same story body pay only for the new tokens.

---

## Mobile + iPad

- Backdrop blur disabled on `(hover: none) and (pointer: coarse)` — solid surfaces for perf.
- Background animations and global filters paused on touch devices.
- CodeMirror's heaviest live-update plugins (full-doc syllable rebuild on every cursor move) are gated off on touch. All decorations (spell, format) still work.
- Mobile tab bar respects `env(safe-area-inset-bottom)`.
- Minimum tap target: 44×44 px.
