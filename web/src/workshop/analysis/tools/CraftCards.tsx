import type { ReactNode } from "react";
import { useMemo } from "react";
import { buildPhraseRegex, cropAroundMatch, escapeRegex, highlightInLine } from "./helpers";

export type CraftSeverity = "now" | "soon" | "optional";
export type CraftTone = "warn" | "good" | "info";

export function tierFromCount(count: number): CraftSeverity {
  if (count >= 5) return "now";
  if (count >= 2) return "soon";
  return "optional";
}

// ─── Headline ────────────────────────────────────────────────────────────────

export function CraftHeadline({
  tone = "info",
  title,
  detail,
}: {
  tone?: CraftTone;
  title: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className={`craft-headline craft-headline--${tone}`} role="status">
      <span className={`craft-headline-dot craft-headline-dot--${tone}`} aria-hidden />
      <div className="craft-headline-body">
        <p className="craft-headline-title">{title}</p>
        {detail ? <p className="craft-headline-detail muted small">{detail}</p> : null}
      </div>
    </div>
  );
}

// ─── Stat card (new, more visual replacement for CraftHeadline) ──────────────

function CraftStatIcon({ tone }: { tone: CraftTone }) {
  if (tone === "good") {
    return (
      <svg viewBox="0 0 24 24" className="craft-stat-icon-svg" aria-hidden>
        <path
          d="M5 12.5l4 4 10-10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tone === "warn") {
    return (
      <svg viewBox="0 0 24 24" className="craft-stat-icon-svg" aria-hidden>
        <path d="M12 5v9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="12" cy="18" r="1.4" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="craft-stat-icon-svg" aria-hidden>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Compact visual stat-card. Replaces the verbose CraftHeadline:
 * - Big colour-coded status icon on the left.
 * - Single-line title (no paragraph copy).
 * - Optional KPI badge on the right (e.g. "62%", "3", "1.8/100").
 * - Optional inline progress bar underneath for ratios.
 */
export function CraftStatCard({
  tone = "info",
  title,
  metric,
  metricLabel,
  progress,
  hint,
}: {
  tone?: CraftTone;
  title: ReactNode;
  metric?: ReactNode;
  metricLabel?: ReactNode;
  /** 0..1 progress fraction; rendered as a thin bar underneath. */
  progress?: number;
  /** Optional hover tooltip with more context. */
  hint?: string;
}) {
  return (
    <div
      className={`craft-stat craft-stat--${tone}`}
      role="status"
      title={hint}
    >
      <span className={`craft-stat-icon craft-stat-icon--${tone}`} aria-hidden>
        <CraftStatIcon tone={tone} />
      </span>
      <p className="craft-stat-title">{title}</p>
      {metric != null ? (
        <span className="craft-stat-metric">
          <span className="craft-stat-metric-num">{metric}</span>
          {metricLabel ? (
            <span className="craft-stat-metric-label">{metricLabel}</span>
          ) : null}
        </span>
      ) : null}
      {progress != null ? (
        <span
          className="craft-stat-progress"
          aria-hidden
          style={{ ["--craft-stat-pct" as never]: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%` }}
        />
      ) : null}
    </div>
  );
}

// ─── Severity dots (visual replacement for HEAVY/USED/RARE tags) ─────────────

export type Severity = 1 | 2 | 3;

export function severityFromCount(count: number): Severity {
  if (count >= 5) return 3;
  if (count >= 2) return 2;
  return 1;
}

export function CraftSeverityDots({
  severity,
  ariaLabel,
}: {
  severity: Severity;
  ariaLabel?: string;
}) {
  return (
    <span
      className={`craft-sev craft-sev--${severity}`}
      role="img"
      aria-label={ariaLabel ?? `severity ${severity} of 3`}
    >
      <span className={`craft-sev-dot ${severity >= 1 ? "is-on" : ""}`} />
      <span className={`craft-sev-dot ${severity >= 2 ? "is-on" : ""}`} />
      <span className={`craft-sev-dot ${severity >= 3 ? "is-on" : ""}`} />
    </span>
  );
}

// ─── Distribution bars ───────────────────────────────────────────────────────

export function DistributionBar({
  left,
  right,
}: {
  left: { label: string; value: number; tone?: "primary" | "warn" };
  right: { label: string; value: number; tone?: "primary" | "warn" };
}) {
  const total = left.value + right.value;
  if (total === 0) return null;
  const leftPct = Math.round((left.value / total) * 100);
  const rightPct = 100 - leftPct;
  return (
    <div className="craft-dist">
      <div
        className="craft-dist-bar"
        role="img"
        aria-label={`${left.label}: ${leftPct}%, ${right.label}: ${rightPct}%`}
      >
        <span
          className={`craft-dist-seg craft-dist-seg--${left.tone ?? "primary"}`}
          style={{ width: `${leftPct}%` }}
        >
          <span className="craft-dist-seg-label">{leftPct >= 12 ? `${left.label} ${leftPct}%` : ""}</span>
        </span>
        <span
          className={`craft-dist-seg craft-dist-seg--${right.tone ?? "warn"}`}
          style={{ width: `${rightPct}%` }}
        >
          <span className="craft-dist-seg-label">{rightPct >= 12 ? `${right.label} ${rightPct}%` : ""}</span>
        </span>
      </div>
    </div>
  );
}

export function TripleDistributionBar({
  first,
  second,
  third,
}: {
  first: { label: string; value: number };
  second: { label: string; value: number };
  third: { label: string; value: number };
}) {
  const total = first.value + second.value + third.value;
  if (total === 0) return null;
  const a = Math.round((first.value / total) * 100);
  const b = Math.round((second.value / total) * 100);
  const c = Math.max(0, 100 - a - b);
  return (
    <div className="craft-dist">
      <div
        className="craft-dist-bar"
        role="img"
        aria-label={`${first.label}: ${a}%, ${second.label}: ${b}%, ${third.label}: ${c}%`}
      >
        <span className="craft-dist-seg craft-dist-seg--primary" style={{ width: `${a}%` }}>
          <span className="craft-dist-seg-label">{a >= 12 ? `${first.label} ${a}%` : ""}</span>
        </span>
        <span className="craft-dist-seg craft-dist-seg--warn" style={{ width: `${b}%` }}>
          <span className="craft-dist-seg-label">{b >= 12 ? `${second.label} ${b}%` : ""}</span>
        </span>
        <span className="craft-dist-seg craft-dist-seg--accent" style={{ width: `${c}%` }}>
          <span className="craft-dist-seg-label">{c >= 12 ? `${third.label} ${c}%` : ""}</span>
        </span>
      </div>
    </div>
  );
}

// ─── Controls toolbar (mirrors meter-controls) ───────────────────────────────

export function CraftControls({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <div className="craft-controls" role="group" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function CraftToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
}) {
  return (
    <label className="craft-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function CraftFilterField({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  return (
    <label className="craft-filter-field">
      <span className="craft-filter-label muted small">Filter</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Substring"}
        aria-label={ariaLabel}
      />
    </label>
  );
}

// ─── Paragraph reference ─────────────────────────────────────────────────────

export function ParaPill({
  paragraph,
  goTo,
  peek,
  clearPeek,
  ariaLabel,
}: {
  paragraph: number;
  goTo: (p: number) => void;
  /** Live-scroll the editor to this paragraph on hover/focus, no cursor move. */
  peek?: (p: number) => void;
  clearPeek?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className="craft-para-pill"
      onClick={() => goTo(paragraph)}
      onMouseEnter={() => peek?.(paragraph)}
      onMouseLeave={() => clearPeek?.()}
      onFocus={() => peek?.(paragraph)}
      onBlur={() => clearPeek?.()}
      aria-label={ariaLabel ?? `Jump to paragraph ${paragraph}`}
      title={`Paragraph ${paragraph} — click to jump, hover to peek`}
    >
      ¶&nbsp;{paragraph}
    </button>
  );
}

export function ParaPillList({
  paragraphs,
  goTo,
  peek,
  clearPeek,
}: {
  paragraphs: number[];
  goTo: (p: number) => void;
  peek?: (p: number) => void;
  clearPeek?: () => void;
}) {
  return (
    <div className="craft-para-pill-row">
      {paragraphs.map((p, i) => (
        <ParaPill
          key={`${p}-${i}`}
          paragraph={p}
          goTo={goTo}
          peek={peek}
          clearPeek={clearPeek}
        />
      ))}
    </div>
  );
}

// ─── Cluster cards (mirrors rhyme-cluster-card) ──────────────────────────────

const COLOR_LETTERS = "abcdefghijklmnopqrstuvwxyz" as const;
type ColorLetter = (typeof COLOR_LETTERS)[number];

export function colorLetterForIndex(i: number): ColorLetter {
  return COLOR_LETTERS[i % COLOR_LETTERS.length]!;
}

export interface CraftCluster {
  /** Unique React key. */
  key: string;
  /** Main label (the word, verb, character name…). */
  label: string;
  /** Total count, shown alongside the label. */
  count: number;
  /** Color letter a..z; default rotates by order. */
  color?: ColorLetter;
  /** Short tag text shown in the colored badge (e.g. "verb", "filter", "A"). */
  tag?: string;
  /**
   * Visual severity 1..3 — when set, shows three dots instead of a text tag.
   * Preferred over `tag` for "how often does this appear" kind of indicators.
   */
  severity?: Severity;
  /** Optional one-line hint shown under the chip row. */
  hint?: ReactNode;
  /** Mentions: one chip per occurrence. */
  mentions: Array<{ paragraph: number; surface?: string }>;
  /** Optional snippet to preview the first context. */
  preview?: { paragraph: number; text: string };
  /** Optional onReject — adds × button to dismiss. */
  onReject?: () => void;
}

export function CraftClusterCard({
  cluster,
  goToParagraph,
  goToWord,
  peekParagraph,
  clearPeek,
  totalParagraphs,
}: {
  cluster: CraftCluster;
  goToParagraph: (p: number) => void;
  /** When provided, chips select the matched word range instead of the whole line. */
  goToWord?: (paragraph: number, word: string) => void;
  /** Live-scroll the editor to a paragraph on hover, without moving the cursor.
   *  When `word` is given, the matched word is highlighted in the editor too. */
  peekParagraph?: (paragraph: number, word?: string) => void;
  /** Clear the hover highlight on mouseleave / blur. */
  clearPeek?: () => void;
  /** When provided, renders a CraftSpark above the chips so position is visible. */
  totalParagraphs?: number;
}) {
  const color = cluster.color ?? "a";
  const re = useMemo(
    () => {
      const trimmed = cluster.label.trim();
      if (!trimmed) return new RegExp("(?!)", "g");
      if (/\s/.test(trimmed)) return buildPhraseRegex(trimmed);
      return new RegExp(`\\b${escapeRegex(trimmed)}\\b`, "gi");
    },
    [cluster.label],
  );
  const hintTip =
    cluster.hint && typeof cluster.hint === "string" ? cluster.hint : undefined;
  return (
    <li className={`craft-cluster-card craft-cluster-card-${color}`}>
      <div className="craft-cluster-card-head" title={hintTip}>
        {cluster.severity != null ? (
          <CraftSeverityDots
            severity={cluster.severity}
            ariaLabel={`Appears ${cluster.count} time${cluster.count === 1 ? "" : "s"}`}
          />
        ) : (
          <span className={`craft-cluster-tag rhyme-label-${color}`}>
            {cluster.tag ?? color.toUpperCase()}
          </span>
        )}
        <span className="craft-cluster-label">{cluster.label}</span>
        <span className="craft-cluster-count">×{cluster.count}</span>
        {cluster.onReject ? (
          <button
            type="button"
            className="craft-cluster-reject"
            onClick={cluster.onReject}
            title="Hide this group"
            aria-label={`Hide ${cluster.label}`}
          >
            ×
          </button>
        ) : null}
      </div>
      {totalParagraphs && totalParagraphs > 0 ? (
        <CraftSpark
          mentions={cluster.mentions}
          totalParagraphs={totalParagraphs}
          color={color}
          word={cluster.label}
          goToParagraph={goToParagraph}
          peekParagraph={peekParagraph}
          clearPeek={clearPeek}
        />
      ) : null}
      <div className="craft-cluster-chips">
        {cluster.mentions.map((m, i) => {
          const word = m.surface ?? cluster.label;
          return (
            <button
              key={`${m.paragraph}-${i}`}
              type="button"
              className={`craft-word-chip rhyme-label-${color}`}
              onClick={() =>
                goToWord ? goToWord(m.paragraph, word) : goToParagraph(m.paragraph)
              }
              onMouseEnter={() => peekParagraph?.(m.paragraph, word)}
              onMouseLeave={() => clearPeek?.()}
              onFocus={() => peekParagraph?.(m.paragraph, word)}
              onBlur={() => clearPeek?.()}
              title={`Paragraph ${m.paragraph} — click to jump, hover to peek`}
              aria-label={`Jump to “${word}” in paragraph ${m.paragraph}`}
            >
              <span className="craft-word-chip-word">{word}</span>
              <span className="craft-word-chip-line">{m.paragraph}</span>
            </button>
          );
        })}
      </div>
      {cluster.preview ? (
        <div
          className="craft-cluster-preview"
          onMouseEnter={() => peekParagraph?.(cluster.preview!.paragraph, cluster.label)}
          onMouseLeave={() => clearPeek?.()}
        >
          <ParaPill
            paragraph={cluster.preview.paragraph}
            goTo={goToParagraph}
            peek={(p) => peekParagraph?.(p, cluster.label)}
            clearPeek={clearPeek}
          />
          <span className="craft-snippet-text">
            {highlightInLine(cropAroundMatch(cluster.preview.text, re, 36), re)}
          </span>
        </div>
      ) : null}
    </li>
  );
}

export function CraftClusterCardList({ children }: { children: ReactNode }) {
  return <ul className="craft-cluster-card-list">{children}</ul>;
}

// ─── Grouping (mirrors rhyme-stanza-group) ──────────────────────────────────

export function CraftGroupSection({
  label,
  detail,
  children,
}: {
  label: ReactNode;
  detail?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="craft-group">
      <div className="craft-group-head">
        <span className="craft-group-label">{label}</span>
        {detail ? <span className="craft-group-detail muted small">{detail}</span> : null}
      </div>
      {children}
    </section>
  );
}

// ─── Beat rows (mirrors meter-bar-row) ──────────────────────────────────────

export type BeatKind = "primary" | "warn" | "accent" | "neutral";

export interface BeatSegment {
  kind: BeatKind;
  weight: number;
}

/**
 * Renders per-paragraph rows with a visual beat strip + fit %, modelled on
 * Easy-poems' meter-bar-row. Each beat is a small colored block — primary for
 * the dominant POV/tense, warn for the off colour, accent for the third.
 */
export function CraftBeatList({
  rows,
  goToParagraph,
}: {
  rows: Array<{
    paragraph: number;
    segments: BeatSegment[];
    fitPercent?: number | null;
    fitLabel?: string;
    badge?: ReactNode;
    title?: string;
  }>;
  goToParagraph: (p: number) => void;
}) {
  return (
    <ul className="craft-beat-list" aria-label="Per-paragraph readout">
      {rows.map((row) => {
        const fit = row.fitPercent;
        const fitClass =
          fit == null
            ? "craft-beat-fit--none"
            : fit >= 70
              ? "craft-beat-fit--high"
              : fit >= 40
                ? "craft-beat-fit--mid"
                : "craft-beat-fit--low";
        const hasBeats = row.segments.some((s) => s.weight > 0);
        return (
          <li
            key={row.paragraph}
            className="craft-beat-row"
            tabIndex={0}
            role="button"
            aria-label={`Paragraph ${row.paragraph}, ${row.title ?? ""}`}
            onClick={() => goToParagraph(row.paragraph)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goToParagraph(row.paragraph);
              }
            }}
            title={row.title}
          >
            <span className="craft-beat-para">¶ {row.paragraph}</span>
            <span className="craft-beat-strip" aria-hidden>
              {hasBeats ? (
                row.segments.map((seg, i) =>
                  Array.from({ length: seg.weight }).map((_, j) => (
                    <span
                      key={`${i}-${j}`}
                      className={`craft-beat craft-beat--${seg.kind}`}
                    />
                  )),
                )
              ) : (
                <span className="craft-beat-empty">—</span>
              )}
            </span>
            {row.badge ? <span className="craft-beat-badge">{row.badge}</span> : null}
            <span className={`craft-beat-fit ${fitClass}`}>
              {fit == null ? "—" : `${fit}%`}
              {row.fitLabel ? (
                <span className="craft-beat-fit-label">{row.fitLabel}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Character arc (kept for Cast panel) ────────────────────────────────────

export function CraftCharacterArc({
  firstParagraph,
  lastParagraph,
  totalParagraphs,
  appearances,
  color = "a",
  goToParagraph,
  peekParagraph,
  clearPeek,
}: {
  firstParagraph: number;
  lastParagraph: number;
  totalParagraphs: number;
  appearances: number[];
  color?: ColorLetter;
  goToParagraph: (p: number) => void;
  peekParagraph?: (p: number) => void;
  clearPeek?: () => void;
}) {
  if (totalParagraphs <= 0) return null;
  const denom = Math.max(1, totalParagraphs);
  return (
    <div
      className={`craft-arc rhyme-label-${color}`}
      role="img"
      aria-label={`Appears in paragraphs ${firstParagraph} to ${lastParagraph} of ${totalParagraphs}`}
    >
      <span className="craft-arc-third craft-arc-third--early" />
      <span className="craft-arc-third craft-arc-third--late" />
      <span
        className="craft-arc-span"
        style={{
          left: `${((firstParagraph - 1) / denom) * 100}%`,
          width: `${Math.max(2, ((lastParagraph - firstParagraph + 1) / denom) * 100)}%`,
        }}
      />
      {appearances.map((p, i) => (
        <button
          key={`${p}-${i}`}
          type="button"
          className="craft-arc-tick"
          style={{ left: `${((p - 1) / denom) * 100}%` }}
          onClick={() => goToParagraph(p)}
          onMouseEnter={() => peekParagraph?.(p)}
          onMouseLeave={() => clearPeek?.()}
          onFocus={() => peekParagraph?.(p)}
          onBlur={() => clearPeek?.()}
          aria-label={`Jump to paragraph ${p}`}
          title={`¶ ${p}`}
        />
      ))}
    </div>
  );
}

// ─── Callout ─────────────────────────────────────────────────────────────────

export function CraftCallout({
  tone = "warn",
  title,
  children,
}: {
  tone?: "warn" | "info";
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`craft-callout craft-callout--${tone}`}>
      <p className="craft-callout-title">{title}</p>
      <div className="craft-callout-body">{children}</div>
    </div>
  );
}

// ─── Doc map (paragraph-position strip) ──────────────────────────────────────

export interface DocMapMark {
  paragraph: number;
  /** Color letter so different verbs/words can be told apart in the strip. */
  color?: string;
  /** Optional weight 1..3 — thicker ticks for heavier mentions. */
  weight?: 1 | 2 | 3;
  /** Surface form, used for hover-peek so the editor highlights the right word. */
  word?: string;
}

/**
 * A horizontal strip showing where flagged paragraphs sit in the document.
 * Each mark is clickable and scrubs the editor on hover. Replaces the
 * imperative "Try X" copy with a neutral at-a-glance picture of WHERE.
 */
export function CraftDocMap({
  marks,
  totalParagraphs,
  goToParagraph,
  peekParagraph,
  clearPeek,
  ariaLabel = "Where flags occur in the document",
  hint,
}: {
  marks: DocMapMark[];
  totalParagraphs: number;
  goToParagraph: (p: number) => void;
  peekParagraph?: (p: number, word?: string) => void;
  clearPeek?: () => void;
  ariaLabel?: string;
  hint?: ReactNode;
}) {
  const denom = Math.max(1, totalParagraphs);
  return (
    <div className="craft-docmap" role="img" aria-label={ariaLabel}>
      <div className="craft-docmap-track">
        <span className="craft-docmap-third craft-docmap-third--early" aria-hidden />
        <span className="craft-docmap-third craft-docmap-third--late" aria-hidden />
        {marks.map((m, i) => {
          const left = ((m.paragraph - 1) / denom) * 100;
          const weight = m.weight ?? 1;
          return (
            <button
              key={`${m.paragraph}-${i}`}
              type="button"
              className={`craft-docmap-mark craft-docmap-mark--w${weight} ${m.color ? `rhyme-label-${m.color}` : ""}`}
              style={{ left: `${left}%` }}
              onClick={() => goToParagraph(m.paragraph)}
              onMouseEnter={() => peekParagraph?.(m.paragraph, m.word)}
              onMouseLeave={() => clearPeek?.()}
              onFocus={() => peekParagraph?.(m.paragraph, m.word)}
              onBlur={() => clearPeek?.()}
              aria-label={`Jump to paragraph ${m.paragraph}`}
              title={`¶ ${m.paragraph}`}
            />
          );
        })}
      </div>
      <div className="craft-docmap-axis">
        <span className="craft-docmap-axis-label">start</span>
        <span className="craft-docmap-axis-label">middle</span>
        <span className="craft-docmap-axis-label">end</span>
      </div>
      {hint ? <p className="craft-docmap-hint muted small">{hint}</p> : null}
    </div>
  );
}

// ─── Cluster spark (inline distribution in cluster cards) ────────────────────

/**
 * A condensed strip that shows where each mention falls inside the document.
 * Used inline in cluster cards so the reader sees position without reading
 * line numbers. Hovering a tick scrubs the editor to that paragraph.
 */
export function CraftSpark({
  mentions,
  totalParagraphs,
  color = "a",
  goToParagraph,
  peekParagraph,
  clearPeek,
  word,
}: {
  mentions: Array<{ paragraph: number }>;
  totalParagraphs: number;
  color?: string;
  goToParagraph: (p: number) => void;
  peekParagraph?: (p: number, word?: string) => void;
  clearPeek?: () => void;
  /** Surface word to highlight in the editor on peek. */
  word?: string;
}) {
  if (totalParagraphs <= 0 || mentions.length === 0) return null;
  const denom = Math.max(1, totalParagraphs);
  return (
    <div className={`craft-spark rhyme-label-${color}`} aria-hidden>
      <span className="craft-spark-track" />
      {mentions.map((m, i) => (
        <button
          key={`${m.paragraph}-${i}`}
          type="button"
          className="craft-spark-tick"
          style={{ left: `${((m.paragraph - 1) / denom) * 100}%` }}
          onClick={() => goToParagraph(m.paragraph)}
          onMouseEnter={() => peekParagraph?.(m.paragraph, word)}
          onMouseLeave={() => clearPeek?.()}
          onFocus={() => peekParagraph?.(m.paragraph, word)}
          onBlur={() => clearPeek?.()}
          aria-label={`Jump to paragraph ${m.paragraph}`}
          title={`¶ ${m.paragraph}`}
        />
      ))}
    </div>
  );
}

// ─── Fact strip (neutral, non-judgmental observations) ───────────────────────

export interface CraftFact {
  /** Big number or short value, e.g. "62%" or "12". */
  value: ReactNode;
  /** Label below the value, e.g. "said" or "filter words". */
  label: ReactNode;
  /** Optional 0..1 fraction rendered as a thin bar under the value. */
  progress?: number;
  /** Optional color letter for tint. */
  color?: string;
  /** Optional click to act on the fact (jump, filter…). */
  onActivate?: () => void;
}

/**
 * Replacement for prescriptive stat-cards. Instead of "you should…" copy,
 * it lays out 1–3 facts side by side and lets the writer judge. Click a
 * fact to act on it (e.g. jump to first untagged paragraph).
 */
export function CraftFactStrip({
  facts,
  caption,
}: {
  facts: CraftFact[];
  caption?: ReactNode;
}) {
  if (facts.length === 0) return null;
  return (
    <div className="craft-facts" role="group">
      <div className="craft-facts-row">
        {facts.map((f, i) => {
          const inner = (
            <>
              <span className="craft-fact-value">{f.value}</span>
              <span className="craft-fact-label">{f.label}</span>
              {f.progress != null ? (
                <span
                  className="craft-fact-bar"
                  aria-hidden
                  style={{ ["--craft-fact-pct" as never]: `${Math.round(Math.max(0, Math.min(1, f.progress)) * 100)}%` }}
                />
              ) : null}
            </>
          );
          const className = `craft-fact ${f.color ? `rhyme-label-${f.color}` : ""}`;
          return f.onActivate ? (
            <button
              key={i}
              type="button"
              className={`${className} craft-fact--button`}
              onClick={f.onActivate}
            >
              {inner}
            </button>
          ) : (
            <div key={i} className={className}>
              {inner}
            </div>
          );
        })}
      </div>
      {caption ? <p className="craft-facts-caption muted small">{caption}</p> : null}
    </div>
  );
}
