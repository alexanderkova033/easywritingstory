import type { ReactNode } from "react";
import { useMemo } from "react";
import { buildPhraseRegex, escapeRegex, highlightInLine } from "./helpers";

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
  ariaLabel,
}: {
  paragraph: number;
  goTo: (p: number) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className="craft-para-pill"
      onClick={() => goTo(paragraph)}
      aria-label={ariaLabel ?? `Jump to paragraph ${paragraph}`}
      title={`Paragraph ${paragraph}`}
    >
      ¶&nbsp;{paragraph}
    </button>
  );
}

export function ParaPillList({
  paragraphs,
  goTo,
}: {
  paragraphs: number[];
  goTo: (p: number) => void;
}) {
  return (
    <div className="craft-para-pill-row">
      {paragraphs.map((p, i) => (
        <ParaPill key={`${p}-${i}`} paragraph={p} goTo={goTo} />
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
}: {
  cluster: CraftCluster;
  goToParagraph: (p: number) => void;
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
  return (
    <li className={`craft-cluster-card craft-cluster-card-${color}`}>
      <div className="craft-cluster-card-head">
        <span className={`craft-cluster-tag rhyme-label-${color}`}>
          {cluster.tag ?? color.toUpperCase()}
        </span>
        <span className="craft-cluster-label">{cluster.label}</span>
        <span className="craft-cluster-count">×{cluster.count}</span>
        {cluster.onReject ? (
          <button
            type="button"
            className="craft-cluster-reject"
            onClick={cluster.onReject}
            title="Dismiss this group"
            aria-label={`Dismiss ${cluster.label}`}
          >
            ×
          </button>
        ) : null}
      </div>
      {cluster.hint ? (
        <p className="craft-cluster-hint muted small">{cluster.hint}</p>
      ) : null}
      <div className="craft-cluster-chips">
        {cluster.mentions.map((m, i) => (
          <button
            key={`${m.paragraph}-${i}`}
            type="button"
            className={`craft-word-chip rhyme-label-${color}`}
            onClick={() => goToParagraph(m.paragraph)}
            title={`Paragraph ${m.paragraph}`}
            aria-label={`Jump to paragraph ${m.paragraph}`}
          >
            <span className="craft-word-chip-word">{m.surface ?? cluster.label}</span>
            <span className="craft-word-chip-line">{m.paragraph}</span>
          </button>
        ))}
      </div>
      {cluster.preview ? (
        <div className="craft-cluster-preview">
          <ParaPill paragraph={cluster.preview.paragraph} goTo={goToParagraph} />
          <span className="craft-snippet-text">
            {highlightInLine(cluster.preview.text, re)}
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
}: {
  firstParagraph: number;
  lastParagraph: number;
  totalParagraphs: number;
  appearances: number[];
  color?: ColorLetter;
  goToParagraph: (p: number) => void;
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
