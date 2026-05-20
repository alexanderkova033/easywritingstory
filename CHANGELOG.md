# Changelog

All notable user-visible changes to easywriting-story.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/) once a first tagged release exists.

---

## Unreleased — Story pivot

This project began life as **easywriting-story**, a poetry workshop with rhyme, meter, syllable, and form-specific tools. It has been pivoted to **easywriting-story**, a short-story workshop aimed at IGCSE creative-writing coursework and stories under 2,000 words.

### Removed (poetry-only)
- Deleted `web/src/workshop/rhyme/` (rhyme finder, datamuse cache, scheme detection, internal rhymes, rhyme tooltip, manual rhyme links/unlinks storage).
- Deleted `web/src/workshop/meter/` (CMU stress lexicon loader, meter hints, stress-source helpers, manual stress overrides storage).
- Deleted `web/public/cmu-stress.txt` (670 KB CMU pronouncing dictionary) and the `generate-cmu-stress.mjs` / `check-cmu-stress-fresh.mjs` build scripts.
- Deleted `MeterPanel.tsx`, `RhymePanel.tsx`, and their tests.
- Dropped the `cmu-pronouncing-dictionary` npm dependency and the `check:cmu-stress` build step.
- Removed the `Meter` and `Rhyme` tool tabs from `ToolTabBar` and the matching tab values from the `ToolTab` union.
- Removed the `FormCoach` UI (haiku/sonnet line-syllable validator).

### Added (prose-specific)
- New `web/src/workshop/text/` folder for generic word/syllable utilities (kept because they're still needed for spell-check and Flesch-Kincaid).
- New `DocumentStats.prose` field: sentences[] with line attribution, `avgWordsPerSentence`, `sentenceLengthStdDev`, `longestSentence`, `dialogueFraction`, `readingGrade` (Flesch-Kincaid).
- New prose-stats strip at the top of the **Lines** panel showing reading grade, average words per sentence, sentence count, dialogue %, and longest sentence.
- `SILENT_READING_WPM = 250` replacing the old `POETRY_READING_WPM = 130`.
- Story-length form presets: Flash 500 / Short 1,000 / **IGCSE 1,500** / Long 2,000, replacing haiku / limerick / sonnet / villanelle.
- 8 story-starter templates (dialogue / action / sensory place / memory hook / mystery / character gesture / three-beat / blank) replacing the poetry forms in the Templates modal.
- `EditorView.lineWrapping` enabled: long sentences flow to the next visual row instead of shrinking the font.

### Changed (AI)
- All four AI endpoints rewritten for prose: `/api/analyze`, `/api/compare`, `/api/suggest`, `/api/chat`.
- New persona set on `/api/analyze`: gentle reader / friend / workshop peer / fiction editor / **senior IGCSE creative-writing examiner**.
- `/api/suggest` dropped the `rhyme` mode; `idea`/`continue`/`words`/`spark`/`line` reworded for stories. `syllableTarget`/`syllableTolerance` accepted as backward-compat aliases for `wordTarget`/`wordTolerance`.
- `localAnalysis` context shape rewired to send prose metrics (FK grade, sentence stats, dialogue %, paragraphs, repeated words) instead of rhyme scheme + syllables-per-line.
- StuckHelper's `Rhyme` mode replaced with a `Words` mode that calls the existing `words` suggest type.
- Daily writing prompts rewritten as story-oriented prompts.

### Changed (cost discipline)
- Per-IP monthly cap lowered: $5 → **$3**.
- Global daily kill-switch cap lowered: $5 → **$3**.
- Analyze cooldown lengthened: nano 60 s → **90 s**, mini 120 s → 180 s, gpt-5 180 s → 240 s.
- Default fallback cooldown: 120 s → 180 s.
- Max story length on every AI endpoint reduced: 20,000 chars → **15,000 chars** (~2,500 words).

### Changed (branding)
- Top-level package names renamed `easy-stories*` → `easywritingstory*` across the three `package.json` files.
- `web/index.html` title, meta description, OG tags, Twitter card, and noscript fallback rewritten.
- Sitemap + robots.txt URLs swapped for `easywritingstory.vercel.app`.
- Sample workshop content swapped from "The Candle" (story) to "The Last Bus" (story opening).
- Landing page hero, sub, demo content, concept cards, footer CTA all rewritten. Demo now shows word counts + reading grade instead of rhyme badges + syllables.
- Topbar brand badge: `story` → `story`. Logo SVG updated to an open-book icon.
- Workshop UI strings updated throughout: "Ask about your story", "Story font", "Paragraphs" goal label, story-aware tour copy, prose-flavoured sample suggestions.
- README rewritten with IGCSE positioning.
- `docs/FEATURES.md`, `docs/AI_INTEGRATION.md`, `docs/ARCHITECTURE.md`, `docs/REQUIREMENTS.md`, `docs/PRIORITIES.md` rewritten for the story workshop.

### Deferred (no functional impact)
- File renames (`StoryWorkshop.tsx` → `StoryWorkshop.tsx`, `StoryBodyEditor.tsx` → `StoryBodyEditor.tsx`, `useStoryWorkshopModel.ts` → `useStoryWorkshopModel.ts`, etc.).
- Internal identifier sweep (`Story` → `Story` types, `.story-*` CSS class names).
- `easy-stories:*` → `easy-stories:*` localStorage key migration.
- Removal of deprecated rhyme/stanza/syllable fields in `WorkshopGoals` (kept on the type until callers stop reading them).

---

## Pre-pivot history (poetry workshop)

### Network / first-load
- `<link rel="dns-prefetch">` for Datamuse, dictionaryapi.dev, Vercel analytics and insights origins — warms DNS/TLS before the first AI or rhyme/define call.
- Lazy-load `ReadingModeModal`, `ShareModal`, `ViewSharedStory`, and `BackgroundPicker` via `React.lazy`. Each ships its own dynamic chunk; the initial workshop bundle drops ~200–300 KB.
- Tightened Vite `manualChunks` so lazy-loaded modules don't get re-merged into the eager `workshop-tools` chunk.

### Off-main-thread
- New Web Worker (`workshop/analysis/heavy-analysis-worker.ts`) + `useHeavyAnalysis` hook. All heavyLines-derived analyses now run off the main thread, bundled into a single round-trip per heavyBody change: repetition, cliché scan, rough rhyme clusters, vowel-tail / assonance / consonance clusters, full rhyme scheme, stanza groups, internal rhymes. Race protection via monotonic request ids; synchronous main-thread fallback when `Worker` isn't available.
- Editor-visible rhyme scheme (gutter letters + ribbons) stays on the main thread off `lines` for low-latency feedback while typing.

### Refactor
- Extracted helpers, leaf components, goal cards, and repetition cards from `WorkshopToolPanels.tsx` (2728 → 1908 lines) into:
  - `analysis/tools/helpers.tsx` — regex, meter-source labels, jump labels
  - `analysis/tools/shared.tsx` — `EmptyState`, `NumberInput`, `SoftPill`, `JumpLineList`, `NoLinesYetHint`
  - `analysis/tools/GoalCards.tsx` — `MetricGoalCard`, `SyllableCapCard`, `RhymeSchemeCard`
  - `analysis/tools/RepetitionCards.tsx` — `RepeatedWordCard`, `PhraseRepeatCard`, `EdgeRepeatCard`, `RepetitionSummary`
- Per-tab panel branches still inside `WorkshopToolPanels.tsx`; their split deferred to a focused session.

### Performance
- Disable backdrop-filter blur on touch devices for the mobile tab bar, drawer, sidebar, and topbar — eliminates iPad scroll jank.
- Pause always-on background animations and the body-wide saturate/brightness filter on touch devices.
- Gate CodeMirror's per-line font-scaling plugin off on touch — biggest source of typing lag on iPad.
- Skip syllable widget rebuilds on cursor moves (touch only); rebuild still fires on document changes.
- Remove redundant 500ms polling interval in `AiLineRibbons` — scroll/resize/ResizeObserver already cover position updates.
- Add `passive: true` to scroll/resize listeners in `HoverHintsContext`.
- Panel splitter drag: write to CSS variable inside `requestAnimationFrame`; defer React state update + persistence until pointerup. Stops the full workshop tree re-rendering on every pointermove frame.
- Tune debounces: body→React 100→180ms (desktop) / 280ms (touch); spell analysis 320→600ms on touch. Halves render frequency during continuous typing without making feedback feel sluggish.

### Docs
- Split the root `README.md` into focused docs: `CONTRIBUTING.md`, `SECURITY.md`, `docs/FEATURES.md`, `docs/DEPLOYMENT.md`, `CHANGELOG.md`.
- Renamed `design/README.md` to `design/DESIGN.md` to remove the duplicate README name.
- Added GitHub issue templates.
- Corrected stale tool-panel listing (now 3 buckets: Overview / Sound / Suggest).
- Clarified that AI calls use a project-owned OpenAI key (no user signup or BYO key).

### Cleanup
- Removed dead `.topbar-title` CSS block.

---

*Earlier history is recorded in git log.*
