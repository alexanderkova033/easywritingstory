import { useEffect, useRef, useState } from "react";
import "./LandingPage.css";
import { getCurrentStreak, getDailyPrompt } from "@/workshop/shell/writing-streak";

// Pool of ambient short-story words. Six visible at a time; each slot cycles
// to the next pool entry when its drift animation iterates, so variety grows
// without increasing on-screen density.
const FLOATER_POOL = [
  "character", "tension", "scene", "voice", "image", "pause",
  "memory", "stranger", "doorway", "secret", "rumour", "silence",
  "fragment", "weather", "thread", "ordinary", "small", "noticed",
  "instead", "afterwards", "kitchen", "footstep",
];

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  const heroRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [previewRevealed, setPreviewRevealed] = useState(false);
  const [streak] = useState(() => getCurrentStreak());
  const [dailyPrompt] = useState(() => getDailyPrompt());
  const [floaters, setFloaters] = useState<string[]>(() => FLOATER_POOL.slice(0, 6));
  const poolCursor = useRef(6);

  const swapFloater = (slot: number) => {
    setFloaters((prev) => {
      const next = [...prev];
      const visible = new Set(prev);
      visible.delete(prev[slot]);
      let pick = FLOATER_POOL[poolCursor.current % FLOATER_POOL.length];
      poolCursor.current += 1;
      // Avoid picking a word already shown in another slot
      let guard = 0;
      while (visible.has(pick) && guard < FLOATER_POOL.length) {
        pick = FLOATER_POOL[poolCursor.current % FLOATER_POOL.length];
        poolCursor.current += 1;
        guard += 1;
      }
      next[slot] = pick;
      return next;
    });
  };

  // Scroll-driven parallax — writes --landing-scroll-y (in px) to root.
  // Aurora layers use it via transform for depth.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      root.style.setProperty("--landing-scroll-y", `${window.scrollY}`);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPreviewRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-root" ref={rootRef}>
      {/* Full-page backdrop: extends behind hero + preview seamlessly */}
      <div className="landing-bg" aria-hidden>
        <span className="landing-bg-grid" />
        <span className="landing-bg-aurora landing-bg-aurora-1" />
        <span className="landing-bg-aurora landing-bg-aurora-2" />
        <span className="landing-bg-aurora landing-bg-aurora-3" />
        <span className="landing-bg-floor" />
      </div>
      {/* Sticky mini-header — appears after hero scrolls out of view */}
      <header className={`landing-sticky-bar${stickyVisible ? " is-visible" : ""}`} aria-hidden={!stickyVisible}>
        <svg className="landing-sticky-logo" viewBox="0 0 24 24" aria-hidden width="20" height="20">
          <path d="M11 4L11 23L12 21L13 23L13 4Z" fill="#8c2a1c" />
          <path d="M11.5 4.3L11.5 21.4L12 21L12.5 21.4L12.5 4.3Z" fill="#cf4530" opacity="0.95" />
          <path d="M3 6.8C6 5.8 9 5.8 12 7.8L12 19.8C9 17.8 6 17.8 3 18.8Z" fill="#a85515" />
          <path d="M3 6C6 5 9 5 12 7L12 19C9 17 6 17 3 18Z" fill="#f0a85a" />
          <path d="M3 6C6 5 9 5 12 7L12 7.5C9 5.5 6 5.5 3 6.5Z" fill="#fbd99c" opacity="0.75" />
          <path d="M12 7.8C15 5.8 18 4.8 21 4.8L21 16.8C18 16.8 15 17.8 12 19.8Z" fill="#6b3010" />
          <path d="M12 7C15 5 18 4 21 4L21 16C18 16 15 17 12 19Z" fill="#b56b1f" />
          <path d="M12 7C15 5 18 4 21 4L21 4.6C18 4.6 15 5.6 12 7.6Z" fill="#d98c3e" opacity="0.9" />
          <path d="M12 7.3L12 18.7" stroke="#3a1a08" strokeWidth="0.5" strokeLinecap="round" opacity="0.4" />
          <path d="M5.2 10L9.8 10M5 12L10 12M5.5 14L9.5 14" stroke="#a85515" strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
          <path d="M14 10C16 9 17.5 8.3 19 8.1" stroke="#f0a85a" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.65" />
          <path d="M14 12C16 11 17.5 10.3 19 10.1" stroke="#f0a85a" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.65" />
          <path d="M14 14C16 13 17.5 12.3 19 12.1" stroke="#f0a85a" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.65" />
        </svg>
        <span className="landing-sticky-name">easywriting <span className="landing-brand-badge">story</span></span>
        <button type="button" className="landing-btn landing-btn-primary landing-sticky-cta" onClick={onEnter}>
          Start writing
        </button>
      </header>

      {/* Hero */}
      <section
        className="landing-hero"
        ref={heroRef}
        data-offscreen={stickyVisible ? "true" : "false"}
      >
        <div className="landing-aurora" aria-hidden>
          <span className="landing-aurora-blob landing-aurora-blob-1" />
          <span className="landing-aurora-blob landing-aurora-blob-2" />
          <span className="landing-aurora-blob landing-aurora-blob-3" />
        </div>
        <div className="landing-floaters" aria-hidden>
          {floaters.map((word, i) => (
            <span
              key={i}
              className={`landing-floater landing-floater-${i + 1}`}
              onAnimationIteration={() => swapFloater(i)}
            >
              {word}
            </span>
          ))}
        </div>
        <svg className="landing-constellation" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {/* Connecting paths (drawn behind nodes) */}
          <path className="lc-link lc-link-1" d="M 180 170 L 410 320" />
          <path className="lc-link lc-link-2" d="M 410 320 L 250 540" />
          <path className="lc-link lc-link-3" d="M 250 540 L 480 680" />
          <path className="lc-link lc-link-4" d="M 1220 200 L 1410 380" />
          <path className="lc-link lc-link-5" d="M 1410 380 L 1180 540" />
          <path className="lc-link lc-link-6" d="M 1180 540 L 1320 760" />
          <path className="lc-link lc-link-7" d="M 410 320 L 1220 200" />
          <path className="lc-link lc-link-8" d="M 480 680 L 1180 540" />
          {/* Nodes */}
          <circle className="lc-dot lc-dot-1" cx="180" cy="170" r="3" />
          <circle className="lc-dot lc-dot-2" cx="410" cy="320" r="4" />
          <circle className="lc-dot lc-dot-3" cx="250" cy="540" r="3" />
          <circle className="lc-dot lc-dot-4" cx="480" cy="680" r="3.5" />
          <circle className="lc-dot lc-dot-5" cx="1220" cy="200" r="3.5" />
          <circle className="lc-dot lc-dot-6" cx="1410" cy="380" r="3" />
          <circle className="lc-dot lc-dot-7" cx="1180" cy="540" r="4" />
          <circle className="lc-dot lc-dot-8" cx="1320" cy="760" r="3" />
        </svg>
        <div className="landing-hero-inner">
          <div className="landing-hero-eyebrow landing-hero-eyebrow-desktop">
            <svg className="landing-hero-logo" viewBox="0 0 24 24" aria-hidden width="22" height="22">
              <path d="M11 4L11 23L12 21L13 23L13 4Z" fill="#8c2a1c" />
              <path d="M11.5 4.3L11.5 21.4L12 21L12.5 21.4L12.5 4.3Z" fill="#cf4530" opacity="0.95" />
              <path d="M3 6.8C6 5.8 9 5.8 12 7.8L12 19.8C9 17.8 6 17.8 3 18.8Z" fill="#a85515" />
              <path d="M3 6C6 5 9 5 12 7L12 19C9 17 6 17 3 18Z" fill="#f0a85a" />
              <path d="M3 6C6 5 9 5 12 7L12 7.5C9 5.5 6 5.5 3 6.5Z" fill="#fbd99c" opacity="0.75" />
              <path d="M12 7.8C15 5.8 18 4.8 21 4.8L21 16.8C18 16.8 15 17.8 12 19.8Z" fill="#6b3010" />
              <path d="M12 7C15 5 18 4 21 4L21 16C18 16 15 17 12 19Z" fill="#b56b1f" />
              <path d="M12 7C15 5 18 4 21 4L21 4.6C18 4.6 15 5.6 12 7.6Z" fill="#d98c3e" opacity="0.9" />
              <path d="M12 7.3L12 18.7" stroke="#3a1a08" strokeWidth="0.5" strokeLinecap="round" opacity="0.4" />
              <path d="M5.2 10L9.8 10M5 12L10 12M5.5 14L9.5 14" stroke="#a85515" strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
              <path d="M14 10C16 9 17.5 8.3 19 8.1" stroke="#f0a85a" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.65" />
              <path d="M14 12C16 11 17.5 10.3 19 10.1" stroke="#f0a85a" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.65" />
              <path d="M14 14C16 13 17.5 12.3 19 12.1" stroke="#f0a85a" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.65" />
            </svg>
            <span className="landing-brand-name">easywriting <span className="landing-brand-badge">story</span></span>
          </div>
          <h1 className="landing-headline">
            Write a short story.<br />
            <span className="landing-headline-accent">See it analysed — live.</span>
          </h1>
          <p className="landing-sub">
            Word count, sentence variety, reading grade, dialogue, spelling — live as you type.
            AI feedback on demand. Built for IGCSE creative writing and stories under 2,000 words.
            No sign-up. Your words stay in your browser.
          </p>

          {/* Live typing demo — mirrors actual editor layout */}
          <div className="landing-demo" aria-hidden>
            <div className="landing-demo-editor">
              <span className="landing-demo-scanline" />
              <span className="landing-demo-grid" />
              <div className="landing-demo-statusbar">
                <span className="landing-demo-live"><span className="landing-demo-livedot" />LIVE</span>
                <span className="landing-demo-status-stack">
                  <span className="landing-demo-status-meta landing-demo-status-analyzing">analysing<span className="landing-demo-dots" aria-hidden /></span>
                  <span className="landing-demo-status-meta landing-demo-status-done">✓ 1,247 words · grade 7.4</span>
                </span>
                <span className="landing-demo-score-pop" aria-label="Word count">
                  <span className="landing-demo-score-label">WORDS</span>
                  <span className="landing-demo-score-num">1247</span>
                </span>
              </div>
              <div className="landing-demo-line">
                <span className="landing-demo-text landing-demo-text-1">The platform sign blinked once and went dark.</span>
                <span className="landing-demo-bar landing-demo-bar-1" />
                <span className="landing-demo-syl landing-demo-syl-1">8w</span>
              </div>
              <div className="landing-demo-line">
                <span className="landing-demo-text landing-demo-text-2">Maya pulled her sleeves over her hands and counted the people left waiting: three.</span>
                <span className="landing-demo-bar landing-demo-bar-2" />
                <span className="landing-demo-syl landing-demo-syl-2">14w</span>
              </div>
              <div className="landing-demo-line">
                <span className="landing-demo-text landing-demo-text-3">An old man with a folded newspaper.</span>
                <span className="landing-demo-bar landing-demo-bar-3" />
                <span className="landing-demo-syl landing-demo-syl-3">7w</span>
              </div>
              <div className="landing-demo-line landing-demo-line-typing">
                <span className="landing-demo-text landing-demo-text-4">A girl in a school blazer too thin for the rain.</span>
                <span className="landing-demo-cursor" />
                <span className="landing-demo-bar landing-demo-bar-4" />
                <span className="landing-demo-syl landing-demo-syl-4">11w</span>
              </div>
            </div>
            <div className="landing-demo-labels">
              <span className="landing-demo-label-tag">Reading grade: 7.4</span>
              <span className="landing-demo-label-tag">Avg sentence: 10w</span>
              <span className="landing-demo-label-tag landing-demo-label-meter">Dialogue: 0%</span>
            </div>
          </div>

          <div className="landing-ctas">
            <button type="button" className="landing-btn landing-btn-primary" onClick={onEnter}>
              <span className="landing-cta-full">Try it free — no account needed →</span>
              <span className="landing-cta-short">Try it free →</span>
            </button>
          </div>
          <p className="landing-hero-reassurance">Free · Private · No sign-up</p>

          {/* Subtle daily prompt + streak strip — only shown if user has used the app before */}
          {(streak.count > 0 || dailyPrompt) && (
            <div className="landing-daily-strip" aria-label="Today's writing nudge">
              <span className="landing-daily-prompt">
                <span className="landing-daily-label">Today</span>
                <span className="landing-daily-text">{dailyPrompt}</span>
              </span>
              {streak.count > 0 && (
                <span className="landing-streak" title={streak.best > streak.count ? `Best: ${streak.best} days` : "Keep going"}>
                  <span className="landing-streak-icon" aria-hidden>·</span>
                  <span className="landing-streak-count">{streak.count}</span>
                  <span className="landing-streak-label">{streak.count === 1 ? "day" : "days"}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Lower zone — visually distinct band: app preview + concepts + footer CTA */}
      <div className="landing-lower">
      {/* App preview mockup */}
      <section
        className="landing-preview"
        id="how-it-works"
        aria-label="App preview"
        ref={previewRef}
        data-revealed={previewRevealed ? "true" : "false"}
      >
        <h2 className="landing-section-title">What it looks like</h2>
        <div className="lp-shell" aria-hidden>
          <span className="lp-shell-scanline" />
          {/* Topbar */}
          <div className="lp-topbar">
            <div className="lp-topbar-left">
              <span className="lp-brand">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                  <path d="M3 6C6 5 9 5 12 7C15 5 18 4 21 4L21 16C18 16 15 17 12 19C9 17 6 17 3 18Z" fill="currentColor" />
                </svg>
                easywriting<span className="lp-brand-badge">story</span>
              </span>
              <span className="lp-draft-pill">
                <span className="lp-draft-tag">DRAFT</span>
                <span className="lp-draft-name">The Last Bus</span>
                <span className="lp-draft-caret">▾</span>
                <span className="lp-draft-plus">+</span>
              </span>
            </div>
            <div className="lp-topbar-right">
              <span className="lp-stat">1,247 words · grade 7.4</span>
              <span className="lp-save"><span className="lp-save-dot" />Saved</span>
              <span className="lp-topbar-icons">
                <span className="lp-tbi">≡</span>
                <span className="lp-tbi">◐</span>
                <span className="lp-tbi">⌕</span>
                <span className="lp-tbi">⋯</span>
              </span>
            </div>
          </div>
          {/* 3-column grid */}
          <div className="lp-grid">
            {/* Rail — icon-only square buttons */}
            <div className="lp-rail">
              {[
                { glyph: "Aa", title: "Style" },
                { glyph: "❏", title: "Library" },
                { glyph: "↑", title: "Export" },
                { glyph: "⛶", title: "Focus" },
                { glyph: "?", title: "Guide", active: true },
              ].map((b) => (
                <div
                  key={b.title}
                  className={`lp-rail-btn${b.active ? " lp-rail-btn-active" : ""}`}
                  title={b.title}
                >
                  <span className="lp-rail-glyph">{b.glyph}</span>
                </div>
              ))}
            </div>
            {/* Editor */}
            <div className="lp-editor">
              {/* Title + Main idea fields side-by-side */}
              <div className="lp-fields">
                <div className="lp-field">
                  <span className="lp-field-label">Title</span>
                  <div className="lp-field-input">The Last Bus</div>
                </div>
                <div className="lp-field">
                  <span className="lp-field-label">Main idea <span className="lp-field-opt">(optional)</span></span>
                  <div className="lp-field-input lp-field-input-placeholder">e.g. a missed connection that changes everything</div>
                </div>
              </div>
              {/* Story header row with format toolbar */}
              <div className="lp-story-header">
                <span className="lp-story-label">Story</span>
                <span className="lp-format-toolbar">
                  <span className="lp-fmt-btn lp-fmt-bold">B</span>
                  <span className="lp-fmt-btn lp-fmt-under">U</span>
                  <span className="lp-fmt-sep" />
                  <span className="lp-fmt-text">Size</span>
                  <span className="lp-fmt-select">Med ▾</span>
                  <span className="lp-fmt-sep" />
                  <span className="lp-fmt-btn lp-fmt-mono">'syl</span>
                  <span className="lp-fmt-btn lp-fmt-mono">AB</span>
                  <span className="lp-fmt-btn lp-fmt-mono">A·A</span>
                  <span className="lp-fmt-sep" />
                  <span className="lp-fmt-btn">¶</span>
                  <span className="lp-fmt-btn lp-fmt-focus">◉</span>
                </span>
              </div>
              {/* Line-numbered poem body */}
              <div className="lp-story-body">
                {[
                  { text: "The platform sign blinked once and went dark.", words: 8 },
                  { text: "Maya pulled her sleeves over her hands and counted the people left waiting: three.", words: 14 },
                  { text: "An old man with a folded newspaper.", words: 7 },
                  { text: "A girl in a school blazer too thin for the rain.", words: 11 },
                  { text: "", words: null },
                  { text: "She told herself it was only a delay.", words: 8 },
                  { text: "It was always only a delay.", words: 6 },
                ].map((row, i) => (
                  <div key={i} className="lp-story-row">
                    <span className="lp-line-num">{i + 1}</span>
                    <span className="lp-rhyme-gutter" aria-hidden />
                    <span className="lp-story-text">{row.text || " "}</span>
                    {row.words != null && (
                      <span className="lp-syl-wrap">
                        <span className="lp-syl-bar" style={{ width: `${Math.min(row.words / 18, 1) * 28}px` }} />
                        <span className="lp-syl">{row.words}w</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Tools panel */}
            <div className="lp-tools">
              <div className="lp-tools-header">
                <span className="lp-tools-title">Tools</span>
                <span className="lp-analyse-btn">+ Analyse</span>
              </div>
              <div className="lp-tools-sections">
                <span className="lp-tsection lp-tsection-active">OVERVIEW</span>
                <span className="lp-tsection">SOUND</span>
                <span className="lp-tsection">SUGGEST</span>
              </div>
              <div className="lp-tools-tabs">
                {[
                  { glyph: "⊙", label: "Queue", active: true },
                  { glyph: "M", label: "Spell" },
                  { glyph: "≡", label: "Lines" },
                  { glyph: "◎", label: "Goals" },
                  { glyph: "◰", label: "Snaps" },
                ].map((t) => (
                  <span key={t.label} className={`lp-ttab${t.active ? " lp-ttab-active" : ""}`}>
                    <span className="lp-ttab-glyph">{t.glyph}</span>
                    <span className="lp-ttab-label">{t.label}</span>
                  </span>
                ))}
              </div>
              <div className="lp-tools-inner">
                <div className="lp-rqueue">
                  <div className="lp-rqueue-title"><span className="lp-rqueue-dot" />Revision queue</div>
                  <div className="lp-rqueue-group">
                    <span className="lp-rqueue-soon">● Soon <span className="lp-rqueue-count">2</span></span>
                  </div>
                  {[
                    { tag: "CHECKLIST", title: "At least one non-empty line", body: "Add your story before publishing.", action: "Lines" },
                    { tag: "CHECKLIST", title: "Title set", body: "Optional for some venues; still useful when sharing.", action: "Add title" },
                  ].map((c, i) => (
                    <div key={i} className="lp-rcard">
                      <span className="lp-rcard-tag">{c.tag}</span>
                      <div className="lp-rcard-body">
                        <span className="lp-rcard-title">{c.title}</span>
                        <span className="lp-rcard-desc">{c.body}</span>
                      </div>
                      <span className="lp-rcard-action">{c.action}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lp-tools-footer">
                <span className="lp-kbd">?</span>shortcuts <span className="lp-kbd lp-kbd-w">⌘K</span>commands
              </div>
            </div>
          </div>
          {/* Bottom AI Analysis panel */}
          <div className="lp-ai">
            <div className="lp-ai-header">
              <span className="lp-ai-title">✦ AI Analysis</span>
              <span className="lp-ai-caret">▴</span>
            </div>
            <div className="lp-ai-controls">
              <span className="lp-ai-toggle"><span className="lp-ai-toggle-thumb">100</span>Score</span>
              <span className="lp-ai-select">Fast ▾</span>
              <span className="lp-ai-chip">♡ Gentle</span>
              <span className="lp-ai-chip lp-ai-chip-active">✦ Honest</span>
              <span className="lp-ai-chip">⚡ Critic</span>
              <span className="lp-ai-read">+ Read story</span>
            </div>
            <div className="lp-ai-desc">
              Reads your story and returns a warm reaction, strengths, weaknesses, the strongest passage, and sentence-level suggestions.
            </div>
          </div>
        </div>
        <p className="landing-preview-caption">Your story · your browser · nothing sent to a server</p>
      </section>

      {/* What we analyse */}
      <section className="landing-concepts">
        <h2 className="landing-section-title">What easywriting-story shows you</h2>
        <div className="landing-concepts-grid">
          <div className="landing-concept">
            <span className="landing-concept-icon" aria-hidden>¶</span>
            <h3>Word count &amp; targets</h3>
            <p>Live word count against story-length presets — Flash 500, Short 1,000, IGCSE 1,500, Long 2,000.</p>
          </div>
          <div className="landing-concept">
            <span className="landing-concept-icon" aria-hidden>◦ ◦ •</span>
            <h3>Sentence variety</h3>
            <p>Average sentence length and variation so you can spot monotonous rhythm before a marker does.</p>
          </div>
          <div className="landing-concept">
            <span className="landing-concept-icon" aria-hidden>↺</span>
            <h3>Repetition &amp; spelling</h3>
            <p>Repeated words flagged, spelling checked against a local dictionary you control.</p>
          </div>
          <div className="landing-concept">
            <span className="landing-concept-icon" aria-hidden>✦</span>
            <h3>AI feedback on demand</h3>
            <p>Selection-scoped rewrites and full-story feedback when you ask — never automatic, never expensive surprises.</p>
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="landing-footer-cta">
        <p className="landing-footer-tagline">
          Whether it's IGCSE coursework or a story you've been meaning to finish — start with a blank page and let the analysis help you tighten it.
        </p>
        <button type="button" className="landing-btn landing-btn-primary landing-btn-lg" onClick={onEnter}>
          Open the workshop — it's free →
        </button>
      </section>
      </div>
    </div>
  );
}
