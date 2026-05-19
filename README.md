# easywriting-story

**A quiet place to write a short story.** Private. Local. No account.

Browser-based short-story workshop, aimed at IGCSE creative writing coursework and short fiction under 2,000 words. Draft on the left; word count, sentence variety, reading grade, dialogue share, repetition, and spelling update beside you. Optional AI feedback on demand. Nothing leaves your browser unless you ask it to.

**Live:** *(domain TBD — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))*

---

## Highlights

- **Local-first** — drafts, snapshots, goals, and personal dictionary live in `localStorage`. Works offline after first load.
- **Prose-specific tools** — word count, sentence length & variance, Flesch-Kincaid reading grade, dialogue share, repetition, English spelling.
- **IGCSE-friendly targets** — story-length presets (Flash 500w / Short 1,000w / IGCSE 1,500w / Long 2,000w).
- **Optional AI** — selection-scoped sentence rewrites, on-demand feedback (selectable severity), idea sparks. Project-owned key, no user signup.
- **Calm UI** — no popups, no nags. AI is never automatic — it speaks only when asked, to keep token costs predictable.

Full tool list: [docs/FEATURES.md](docs/FEATURES.md).

---

## Quick start

```sh
cd web
npm install      # postinstall syncs the word list
npm run dev      # Vite dev server on localhost:5173
```

Build, test, AI dev setup, and conventions: [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/FEATURES.md](docs/FEATURES.md) | Full feature list grouped by tool bucket |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Design decisions and rationale |
| [docs/AI_INTEGRATION.md](docs/AI_INTEGRATION.md) | OpenAI endpoint contracts and prompt design |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Product requirements |
| [docs/PRIORITIES.md](docs/PRIORITIES.md) | Roadmap and priorities |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel build, env vars, CSP |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev setup, commit conventions, PR flow |
| [SECURITY.md](SECURITY.md) | Privacy posture, AI key handling, reporting issues |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [design/DESIGN.md](design/DESIGN.md) | UX principles, IA, design tokens |

> The docs above were originally written for the poetry workshop this project forked from; some sections still reference rhyme/meter/syllable features that have been removed. They will be revised in a follow-up pass.

---

## Tech stack

React 18 · TypeScript (strict) · Vite 6 · CodeMirror 6 · Vercel serverless · OpenAI · `localStorage` (no DB).

---

## License

See [LICENSE](LICENSE).
