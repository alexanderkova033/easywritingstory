# Demand & delivery priorities (MVP → later)

This document turns [REQUIREMENTS.md](./REQUIREMENTS.md) into **what to build first**. **Current shipped focus:** English-only **local short-story workshop** — multiple drafts, prose tools, snapshots, export, backup — with **optional on-demand AI** feedback. AI is opt-in, selection-scoped where possible, and protected by spend caps.

Stakeholder choices that still apply: website, English only, local story storage, IGCSE creative-writing scope (under 2,000 words).

## Core user flow (current)

1. Pick or create a **draft** in the browser → **local autosave** (story library + per-story snapshots).
2. See live **prose metrics** as you write: word count + target, sentence count, average words/sentence, sentence-length variance, longest sentence, Flesch-Kincaid reading grade, dialogue %, paragraph count, spelling flags, repeated words.
3. Trigger **on-demand AI** when you want it: full-story analysis with selectable harshness, sentence-scoped rewrites in the selection popover, post-analysis chat for follow-ups, or "Refine" to compare against your previous draft.
4. **Export** a single story (.txt / .md / .docx / PDF / image) or **backup** all drafts + snapshots as JSON; **import** backups to merge.

## MoSCoW

### Must (delivered)

- Story editor with title + prose body, **soft-wrap**, local persistence (multiple drafts).
- Word / character / sentence / paragraph counts, line table with jump-to-line.
- Flesch-Kincaid reading grade, sentence-length variance, dialogue %, longest sentence.
- Suggestive English spelling with ignore / personal dictionary (local); permissive vs strict modes.
- Repeated-word detection, cliché scan.
- Story-length presets (Flash 500 / Short 1,000 / IGCSE 1,500 / Long 2,000) with min/max word guards.
- Revision snapshots scoped to the active story; compare and restore.
- Export single story (.txt / .md / .docx / PDF / image); workshop backup import/export (JSON).
- Optional AI: full-story analysis, compare-with-previous, suggestion modes (idea / continue / spark / words / line), post-analysis chat, selection-scoped sentence rewrites. Protected by per-IP and global spend caps + per-endpoint cooldowns.
- Privacy copy: drafts stay in the browser unless the user explicitly triggers AI.
- Story-starter templates (8 openings).

### Should (next)

- More user-facing copy polish (LinesPanel column labels, hover hints, sample stories).
- Senior/student-friendly guide: how to create drafts, save snapshots, export backups.
- IGCSE rubric-explainer mode for AI feedback — surface the content/structure (24) vs style/accuracy (16) split alongside the 1–100 score.
- Streaming AI results so the user sees feedback as it generates (instead of waiting for the full JSON).

### Could

- Phase 3 prose-craft analyses (deferred during the pivot):
  - show-don't-tell detector (telling verbs flagged)
  - sensory-detail counter (five-senses keyword scan)
  - tense-consistency check (mid-paragraph past↔present flips)
  - adverb-density heatmap
  - dialogue-tag variety check
  - opening-hook strength heuristic
- AI-generated title suggestions.
- IndexedDB + CRDT layer for multi-device sync (data model is already serialisable JSON).

### Won't (for now)

- Accounts and cloud sync.
- Real-time multi-user editing.
- Non-English UI and writing tools.
- Community features (comments, sharing for peer feedback, ratings) — separate problem space (identity, moderation, abuse handling).

## Rough phases

| Phase | Focus |
|-------|--------|
| **Done** | Editor + multi-draft library + autosave + prose metrics + spell + repeats + cliché + snapshots + export + backup + on-demand AI + spend caps |
| **Next** | Copy polish, senior-friendly guide, IGCSE rubric view, streaming AI |
| **Later** | Phase 3 craft analyses, AI title suggestions |
| **Future** | Multi-device sync, teacher-assisted classroom mode |

## Success metrics

- Time from open to first useful insight (word count, grade, first AI feedback if requested).
- Story-length targets hit on export (% of stories within ±10% of selected preset).
- Snapshots saved per story (a proxy for revision discipline).
- AI spend per user per month (operator-side cost predictability).

---

*Version: 1.0 (post-story-pivot) — supersedes the poetry-era PRIORITIES.md.*
