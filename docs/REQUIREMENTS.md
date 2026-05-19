# easywriting-story — Product requirements

## 1. Vision

A focused short-story workshop that gives writers — especially IGCSE creative-writing students — fast, concrete feedback on what their prose is doing right now: how long it is, how varied its sentences are, where it repeats, where it might be unclear, and what an experienced reader would push back on. Local-first by default; AI is opt-in and selection-scoped so cost stays predictable.

## 2. Goals

| Goal | Success signal |
|------|----------------|
| Fast feedback | Local prose metrics update as the user types; AI analysis returns structured feedback in seconds when requested. |
| Actionable improvement | Feedback names concrete issues (weak verb, adverb pile-up, sagging pacing) and 1–3 concrete improvement paths each. |
| Trust | Every AI judgment carries a short rationale the user can disagree with — no opaque scores. |
| Predictable cost | No background AI calls. Selection-scoped rewrites are the cheapest meaningful AI surface. Hard per-IP and global caps. |
| Writing flow | Saves and counters update without breaking concentration. Re-analysis after edits is one click. |

## 3. Stakeholder decisions (locked)

| Topic | Decision |
|--------|-----------|
| **Platform** | Website (browser-first), local-first. |
| **Language** | English only at launch. |
| **Target length** | Stories under 2,000 words. Default presets: Flash 500 / Short 1,000 / IGCSE 1,500 / Long 2,000. |
| **Rating scale** | Overall **1–100** when using AI analysis, paired with concrete strengths/weaknesses/issues — never a bare number. |
| **AI tone** | User-selectable harshness (gentle → IGCSE examiner). All personas direct and constructive, no fluff. |
| **Story storage** | Local only in the browser (story library + snapshots); export and JSON backup supported. |
| **Core loop (no AI)** | Draft → local metrics (word count, reading grade, dialogue, sentence variance, spelling, repeats) → revise → export. |
| **Core loop (with AI)** | Draft → request feedback → revise → re-run for a comparison against the previous draft. |
| **AI stack** | OpenAI via Vercel serverless functions in [`api/`](../api/). Default model `gpt-5-nano`; `gpt-5-mini`/`gpt-5` available per request. |

## 4. Assumptions

- Multiple drafts in one browser (story library); user picks the active draft.
- AI text leaves the device only when the user explicitly triggers an analysis, rewrite, suggestion, or chat message.
- Internationalisation of UI/other languages is out of scope until after English MVP.

## 5. AI integration

See [AI_INTEGRATION.md](./AI_INTEGRATION.md) for endpoint contracts.

- **Provider:** OpenAI.
- **Default model:** `gpt-5-nano`. Upgrade per request to `gpt-5-mini` / `gpt-5`.
- **Proxy:** Vercel serverless functions in [`api/`](../api/). API key never reaches the browser.
- **Contract:** strict JSON responses; line ranges in 1-based indexes; issues carry severity + problem_words + rationale + improvements.
- **Spend caps:** Per-IP monthly cap ($3), global daily kill switch ($3), per-endpoint cooldowns.

## 6. User stories (summary)

- As an IGCSE student, I want to see my **word count against a 1,500-word target** at all times so I can pace my coursework.
- As a writer, I want a **Flesch-Kincaid reading grade** and **sentence-length variance** so I can spot monotonous prose before a marker does.
- As a writer, I want **spelling suggestions** that respect intentional choices (proper nouns, dialect words) — I can add to a personal dictionary.
- As a writer, I want **selection-scoped AI rewrites** of a single sentence — fast, cheap, focused.
- As a writer, I want **full-story AI feedback on demand**, with a tone I can choose (gentle / friend / workshop peer / editor / IGCSE examiner).
- As a writer, I want to **save snapshots** of my drafts and **compare two side by side** without leaving the workshop.
- As a writer, I want **multiple stories** in the same browser and a way to **back them up** so I never lose work.
- As a writer revising after AI feedback, I want a **comparison run** that tells me what improved, what regressed, and what's still flagged.

## 7. Functional requirements

### 7.1 Editor & document model

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Editor with title and prose body (paragraphs separated by blank lines). | Must |
| FR-02 | Autosave to local persistence; recovery if the tab closes. | Must |
| FR-02b | Multiple stories in one browser (library); per-story revision snapshots; import/export workshop backup (JSON). | Must |
| FR-03 | Line-based addressing so AI and tools refer to "line N" consistently. | Must |
| FR-04 | Soft line-wrapping: long sentences flow to the next visual row; the editor never shrinks the font to fit. | Must |
| FR-05 | User may choose page background and font presets (story text vs UI); choices stored locally. | Should |

### 7.2 Spelling and language assistance

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-10 | Suggestive spelling (underlines + suggestions); user can ignore or add to personal dictionary (local). | Must |
| FR-11 | "Permissive" vs "strict" spell profile; no auto-correct without confirmation. | Should |
| FR-12 | English dictionaries and heuristics. | Must |

### 7.3 Prose-quantitative tools

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-20 | Word count and character count (total and per line). | Must |
| FR-21 | Sentence segmentation + per-sentence word counts; average and standard deviation. | Must |
| FR-22 | Flesch-Kincaid reading grade. | Must |
| FR-23 | Dialogue share (% of words inside `"..."`). | Should |
| FR-24 | Paragraph count + per-paragraph word/sentence counts. | Must |
| FR-25 | Repeated-word detection across the whole story, surfaced with line numbers and counts. | Must |
| FR-26 | Cliché scan over a small built-in list. | Should |
| FR-27 | Story-length presets (Flash 500 / Short 1,000 / IGCSE 1,500 / Long 2,000) with min/max guards on word count. | Must |

### 7.4 Interactive AI

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-30 | User explicitly runs analysis (button); no background polling, no on-keystroke calls. | Must |
| FR-31 | Output includes issues tied to lines or spans; severity (high/medium/low); rationale and improvements. | Must |
| FR-32 | Per issue: 3–5 sentence rationale + 2–4 concrete improvement directions; optional one-sentence rewrite. | Must |
| FR-33 | Overall score 1–100 paired with strengths, weaknesses, and the strongest passage. | Must |
| FR-34 | After edits, user can re-run as a comparison; output includes improvements / regressions / unchanged buckets relative to the previous run. | Must |
| FR-35 | Click feedback → jump to line in editor. | Must |
| FR-36 | Selection-scoped sentence rewrite popover (4 variants per call). | Must |
| FR-37 | Post-analysis chat for clarifications and follow-up questions; story body cached in the system message. | Should |
| FR-38 | Story-starter templates: 8 openings covering dialogue / action / sensory / memory / mystery / character / structure / blank. | Should |

### 7.5 Privacy, safety, and content

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-40 | Clear copy: drafts stay local by default; AI actions send title + body to `/api/*`, which forwards to OpenAI. | Must |
| FR-41 | No identifier sent with AI requests; only per-IP keys used for rate-limit/spend accounting. | Must |
| FR-42 | Content-policy refusals surface as friendly errors, not stack traces. | Should |
| FR-43 | AI kill switch via `OPENAI_DISABLED=true` env var with no redeploy. | Must |

## 8. Non-functional requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Analysis latency (story up to 2,000 words) | Under ~10–20 s P95 |
| NFR-02 | Editor responsiveness | Typing stays smooth; heavy work off main thread or debounced |
| NFR-03 | Accessibility | Keyboard nav, readable contrast, screen reader for core panels |
| NFR-04 | Cost predictability | Per-IP monthly cap, global daily kill switch, per-endpoint cooldowns — all enforced server-side |
| NFR-05 | Mobile + iPad | First-class support; minimum tap target 44×44 px; safe-area-respecting tab bar |
| NFR-06 | Future i18n | English-only UI now; avoid hard-coding strings in a way that blocks later translation |

## 9. Out of scope (initial release)

- User accounts and cloud sync.
- Automatic cloud backup (manual JSON backup and per-story export are supported).
- Real-time collaborative co-editing.
- Non-English UI and writing tools.
- Community features (comments, sharing for peer feedback, ratings).
- Custom-trained models on user corpora.

## 10. Open decisions

- Whether to surface IGCSE rubric-specific scoring (content/structure 24 + style/accuracy 16) as a discrete view in addition to the 1–100 overall.
- Whether to add explicit Phase 3 features (show-don't-tell detector, sensory-word counter, tense-consistency check, adverb-density heatmap) into the local toolset.

## 11. Future exploration

- Multi-device sync via IndexedDB + CRDT layer (the data model is already serialisable JSON).
- Optional examiner-rubric explainer view aligned with IGCSE marking criteria.
- Optional teacher-assisted classroom mode (shared starters, no peer-to-peer messaging).

---

*Version: 1.0 (post-story-pivot) — supersedes the poetry-era REQUIREMENTS.md.*
