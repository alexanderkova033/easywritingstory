# Architecture Decision Records

This document records the key design decisions in **easywriting-story** and the reasoning behind them.

> Historical note: this project began as **easy-stories**, a poetry workshop. It was pivoted to short-story writing (target: stories under 2,000 words, IGCSE creative writing coursework). Some internal identifiers — file names like `StoryWorkshop.tsx`, classes like `.story-...`, storage keys prefixed `easy-stories:` — still reflect the original name and will be renamed in a follow-up sweep. They have no functional effect.

---

## 1. Offline-first with localStorage

**Decision:** All story data (drafts, snapshots, goals, settings) is stored in the browser's `localStorage`. No automatic sync to any server.

**Why:**
- Privacy-preserving: stories never leave the user's browser unless they explicitly export or use AI feedback.
- Works without a network connection — the writing tools (word count, sentence stats, reading grade, spell check) all run entirely client-side.
- Eliminates the need for user accounts, session management, or a database.

**Trade-offs:**
- Data is scoped to a single browser profile. Clearing site data deletes stories.
- localStorage quota varies by browser (typically 5–10 MB). The app warns at 80% and prompts to export.
- No multi-device sync. The export/import workflow is the intended migration path.

**Where the keys live:** All storage key strings are centralised in [`web/src/shared/storage-keys.ts`](../web/src/shared/storage-keys.ts).

---

## 2. CodeMirror 6 for the editor

**Decision:** Use CodeMirror 6 (`@codemirror/view`, `@uiw/react-codemirror`) as the story body editor instead of a plain `<textarea>`, Monaco, or Ace.

**Why:**
- CodeMirror 6 is designed for programmable editors with custom decorations — exactly what's needed for spell-check highlighting, format marks, and selection-scoped AI rewrite popovers.
- The extension system allows layering decorations without forking editor internals.
- Lighter than Monaco (which is built for IDE use cases) and more actively maintained than Ace.
- First-class TypeScript support and a well-defined extension API.

**Soft-wrap:** `EditorView.lineWrapping` is on. Long sentences flow to the next visual row at the soft-wrap point; the editor never shrinks text to fit a viewport. (An earlier per-line font-scaling plugin existed for poetry where line integrity mattered; it was removed during the story pivot — see commit history for `StoryBodyEditor.tsx`.)

**Trade-offs:**
- Adds ~300 KB to the bundle (gzipped: ~100 KB).
- API surface is large; learning curve for future contributors.
- Virtualisation for very long documents is managed by CodeMirror internally; the workshop targets stories under 2,000 words so this rarely matters.

---

## 3. Client-side prose analysis (zero AI tokens)

**Decision:** Word counts, sentence segmentation, dialogue %, Flesch-Kincaid reading grade, sentence-length variance, repeated-word detection, cliché scan, and spell check all run in the browser via heuristics and local lexicons — no server round-trips.

**Why:**
- Instant feedback as the user types.
- Works offline.
- No AI tokens charged for things a heuristic does well enough.

**Implementation details:**
- **Sentence segmentation + prose metrics** ([`web/src/workshop/analysis/line-stats.ts`](../web/src/workshop/analysis/line-stats.ts)): a sentence-terminator regex with a paragraph-aware fall-through; computes the `prose` field on `DocumentStats` — `sentences[]`, `avgWordsPerSentence`, `sentenceLengthStdDev`, `longestSentence`, `dialogueFraction`, `readingGrade` (Flesch-Kincaid).
- **Syllables** ([`web/src/workshop/text/syllables.ts`](../web/src/workshop/text/syllables.ts)): vowel-counting heuristic with common English rules. Used for Flesch-Kincaid and as a secondary per-line column in the Lines panel.
- **Word tokenisation** ([`web/src/workshop/text/tokenize.ts`](../web/src/workshop/text/tokenize.ts)): shared by spellcheck, repeat detection, and goal evaluation.
- **Repeats + clichés** ([`web/src/workshop/analysis/repeated-words.ts`](../web/src/workshop/analysis/repeated-words.ts), [`cliche-scan.ts`](../web/src/workshop/analysis/cliche-scan.ts)): run inside a Web Worker via [`use-heavy-analysis.ts`](../web/src/workshop/analysis/use-heavy-analysis.ts) so the editor stays responsive.
- **Spell check** ([`web/src/spellcheck/`](../web/src/spellcheck/)): local `wordlist-en.txt` dictionary loaded once on startup, combined with a personal dictionary and per-session ignores stored in localStorage/sessionStorage.

---

## 4. Optional AI via Vercel serverless functions

**Decision:** AI feedback (OpenAI) is gated behind Vercel serverless functions in [`api/`](../api/). The browser never touches the OpenAI API key. **Every AI call is user-initiated** — no background polling, no keystroke analysis.

**Why:**
- Keeps the OpenAI key on the server.
- Cost predictable: explicit-only calls + per-endpoint cooldowns + per-IP monthly cap + global daily kill switch.
- Feature can be disabled by setting `OPENAI_DISABLED=true` without redeploying.

**Selection-scoped where possible:** the sentence-rewrite popover and the AI suggest tab send only the relevant scope (a sentence, or the cursor's local context), not the full story body — the cheapest meaningful AI surface in the app. Full-story analyses go to `/api/analyze` and `/api/compare`, gated by cooldowns.

**Rate limiting + usage caps use Vercel KV.** [`api/_rate-limit.ts`](../api/_rate-limit.ts) and [`api/_usage-cap.ts`](../api/_usage-cap.ts) read and write counters through [`api/_kv.ts`](../api/_kv.ts), which targets Vercel KV when `KV_REST_API_URL` + `KV_REST_API_TOKEN` are present and falls back to a process-local Map in local dev. With KV configured, sliding-window IP limits, per-IP monthly $ caps, and the global daily kill switch all survive cold starts and are shared across concurrent warm containers.

**Common OpenAI call logic** is shared in [`api/_openai.ts`](../api/_openai.ts).

**Prompt caching:** OpenAI's gpt-5 family caches stable prefixes >1,024 tokens automatically. The story body sits in the system message in `/api/chat`, so multi-turn follow-ups pay full price only for the user message + AI reply.

See [AI_INTEGRATION.md](AI_INTEGRATION.md) for endpoint contracts.

### 4a. Two backends in the repo — `api/` is the production path

There are two server-side trees:

- [`api/`](../api/) — Vercel serverless functions. **This is the production path.**
- [`server/`](../server/) — a standalone Express app. Not deployed; useful only for running the API outside Vercel for local debugging.

The two trees are not kept in sync — `server/` is missing rate limiting, usage caps, and most endpoint logic. Treat `api/` as authoritative.

---

## 5. Vite + React 18 + TypeScript

**Decision:** Standard Vite SPA with React 18 and TypeScript in strict mode.

**Why:**
- Vite provides fast HMR during development and tree-shaken, hashed production builds.
- React 18's `useTransition` is used for expensive spell-check recalculations to avoid blocking the editor.
- TypeScript `strict: true` throughout prevents entire categories of bugs at compile time.

**Build output:** Static files in `web/dist/`, deployed to Vercel. The API functions in `api/` are deployed as Vercel Node.js serverless functions.

---

## 6. Per-story revision snapshots (not git-like history)

**Decision:** Each story has a list of named snapshots stored in localStorage. Users save snapshots manually; there is no automatic commit history.

**Why:**
- A full git-like history for every keystroke would quickly exhaust the localStorage quota.
- Writers think in discrete drafts ("first draft", "after rewriting the ending"), not in line-level diffs.
- Named snapshots fit naturally in the UI (compare two snapshots side by side with a diff view).

**Limit:** Up to 50 snapshots per story.

---

## 7. No backend database

**Decision:** There is no server-side database. All persistence is client-side (localStorage) with manual JSON export/import.

**Why:**
- Eliminates operational complexity (no database provisioning, migrations, backups).
- Aligns with the offline-first and privacy-preserving goals.
- The JSON export format is human-readable and versionable.

**Future path:** If multi-device sync becomes a requirement, IndexedDB with a lightweight sync layer (e.g., CRDTs) would be the natural next step — the data model is already serialisable JSON.

---

## 8. Feature-first source layout

**Decision:** `web/src/` is organised by feature rather than by layer.

```
web/src/
  app/                 # Vite entry, error boundary, global CSS
  landing/             # Landing page
  shared/              # Cross-cutting helpers (storage keys, browser-storage)
  spellcheck/          # Dictionary, scan, personal dictionary
  workshop/
    analysis/          # Prose metrics, heavy analysis Web Worker, panels
    appearance/        # Themes, fonts, background generator
    editor/            # CodeMirror editor wrapper, decorations, format toolbar
    goals/             # Goal types, presets, evaluation, ideas notebook
    hints/             # Hover hint context
    library/           # Draft library, snapshots, export
    palette/           # Command palette
    reading/           # Distraction-free reader mode
    sharing/           # Share modal (DOCX / PDF / image / link)
    shell/             # StoryWorkshop (workshop shell), top bar, modals
    text/              # Generic word + syllable utilities (formerly under meter/)
    tour/              # First-visit tour
    vocabulary/        # Word-lookup popover
    voice/             # Read-aloud button
```

**Why:**
- Co-locates related logic, types, and tests.
- Makes it obvious which module owns each domain concept.
- Reduces cross-cutting imports; each feature exposes a clean public surface.

**Cross-cutting utilities** live in `web/src/shared/`.
