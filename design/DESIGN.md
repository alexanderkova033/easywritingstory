# Design

UX and visual design artifacts for easywriting-story. Engineering, design, and stakeholders share this folder.

---

## Folder structure

| Folder | Purpose |
|--------|---------|
| `flows/` | User flows: first-visit, draft → analyse → revise, snapshot compare, AI suggest loop |
| `wireframes/` | Low-fi layouts (workshop shell, tools panel, mobile tab bar, reading mode) |
| `mockups/` | Hi-fi screens — Figma exports or links |
| `components/` | Design tokens (color, type, spacing), component specs |
| `themes/` | Theme palettes (light, dusk, aurora, ocean, ember, etc.) and AI-generated backdrop swatches |
| `research/` | Student / writer interviews, competitive review, usability notes |

Add a `_index.md` inside each subfolder listing the artifacts and their status.

---

## Product principles

1. **Quiet by default.** No suggestion, popup, or animation that interrupts the writer mid-sentence. Tools live beside the editor and only speak when asked.
2. **Privacy is visible.** Local-only storage is a feature, not a footnote. The UI must signal "this is on your machine" without nagging.
3. **Prose-specific.** Word count, sentence length variance, reading grade, dialogue %, and repeats are first-class — not bolted-on add-ons.
4. **AI is a guest, not a host.** AI feedback is opt-in, gated by spend caps, and clearly marked as machine output. The writer's voice leads.
5. **Cost is honest.** Selection-scoped rewrites are the default cheap AI surface; full-story analysis is a deliberate, less-frequent action with a visible cooldown.
6. **Calm aesthetics.** Long-form drift backgrounds, soft contrast, generous line-height. The page should feel like a notebook, not a dashboard.

---

## Current information architecture

```
Landing
 └─ "A quiet place to write a short story"
    └─ Open workshop → Workshop shell
                        ├─ Topbar (draft picker, search, share, snapshots, settings)
                        ├─ Editor (CodeMirror with soft-wrap, format toolbar, selection popover)
                        ├─ Tools panel (3 buckets):
                        │     Overview  → Issues, Spell, Lines, Goals, Snapshots
                        │     Language  → Repeats
                        │     Suggest   → Ideas / continue / spark / words / line rewrite
                        ├─ Mobile tab bar (collapsed tools, bottom)
                        └─ Modals: Library, Snapshots, Compare, Share,
                                   Reading mode, Settings, Style, Theme,
                                   Story starters
```

The **Lines** panel inside Overview leads with a prose-stats strip (reading grade, average words per sentence, sentence count, dialogue %, longest sentence) above the per-line table.

---

## Open design questions

- **AI surface.** Tools panel + selection popover + post-analysis chat — three entry points. Risk of fragmentation; should one be canonical?
- **Reading mode entry.** Currently a topbar button. Worth a keyboard shortcut + hint?
- **First-visit guidance.** SpotlightTour vs single info strip — current `FirstVisitHint` is the strip. Confirm with research before adding back the tour.
- **Language bucket vs Overview.** With Repeats as the sole inhabitant of the Language bucket, consider folding it into Overview or expanding the bucket with planned Phase 3 analyses (show-don't-tell, sensory-detail counter, tense consistency).
- **IGCSE rubric view.** Should AI analysis surface the IGCSE marking split (content/structure 24 + style/accuracy 16) explicitly, in addition to the 1–100 score?

---

## Design tokens (current)

Defined in `web/src/app/index.css` as CSS custom properties:

- **Color:** `--bg`, `--surface`, `--surface-2`, `--text`, `--muted`, `--accent`, `--accent-soft`, `--border`
- **Ambient layers:** `--ambient-a/b/c`, `--after-corner`, `--after-zenith-*`
- **Font:** `--font-ui` (system sans), `--font-story` (serif — used for story body; will be renamed `--font-story` in the deferred identifier sweep), `--font-mono`
- **Radius:** `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`
- **Themes:** 22+ named themes (light, dusk, ember, ocean, aurora, snow, candle, ripple, firefly, studio, zenith…)

Any new theme must define every `--ambient-*` and `--after-*` variable plus an `animation:` for the backdrop layer.

---

## Mobile + iPad guidance

- Backdrop blur is disabled on `(hover: none) and (pointer: coarse)` — use opaque surfaces.
- Background animations stop on touch devices (perf — see [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)).
- Tap targets: minimum 44×44 px.
- Mobile tab bar respects `env(safe-area-inset-bottom)`.

---

## External tools

- **Figma:** add share link here when ready, plus naming convention (`Workshop / Editor-default`, `Workshop / Tools-issues`, etc.).
- **Screenshots:** keep under `mockups/screens/` with date prefix (`2026-05-20-tools-panel.png`).

---

*This README is the index. Add artifacts as design progresses; keep links here.*
