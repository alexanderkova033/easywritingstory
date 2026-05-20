import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { buildPhraseRegex, escapeRegex, highlightInLine } from "./helpers";

export type CraftSeverity = "low" | "med" | "high";

function severityClass(sev: CraftSeverity): string {
  return sev === "high"
    ? "rep-card-sev-high"
    : sev === "med"
      ? "rep-card-sev-med"
      : "rep-card-sev-low";
}

export function CraftSummary({
  stats,
  hint,
}: {
  stats: Array<{ value: ReactNode; label: string; tone?: "default" | "loud" | "craft" }>;
  hint?: ReactNode;
}) {
  return (
    <div className="rep-summary" role="status" aria-live="polite">
      {stats.map((s, i) => (
        <div
          key={i}
          className={`rep-summary-stat${
            s.tone === "loud"
              ? " rep-summary-loud"
              : s.tone === "craft"
                ? " rep-summary-craft"
                : ""
          }`}
        >
          <span className="rep-summary-value">{s.value}</span>
          <span className="rep-summary-label">{s.label}</span>
        </div>
      ))}
      {hint ? <div className="rep-summary-hint muted small">{hint}</div> : null}
    </div>
  );
}

/** Two-tone horizontal bar showing the share of two competing labels (e.g. past vs present). */
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
        />
        <span
          className={`craft-dist-seg craft-dist-seg--${right.tone ?? "warn"}`}
          style={{ width: `${rightPct}%` }}
        />
      </div>
      <div className="craft-dist-legend muted small">
        <span>
          <strong>{left.label}</strong> {leftPct}% ({left.value})
        </span>
        <span>
          <strong>{right.label}</strong> {rightPct}% ({right.value})
        </span>
      </div>
    </div>
  );
}

/** Three-segment bar for POV (first/second/third). */
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
        <span className="craft-dist-seg craft-dist-seg--primary" style={{ width: `${a}%` }} />
        <span className="craft-dist-seg craft-dist-seg--warn" style={{ width: `${b}%` }} />
        <span className="craft-dist-seg craft-dist-seg--accent" style={{ width: `${c}%` }} />
      </div>
      <div className="craft-dist-legend muted small">
        <span>
          <strong>{first.label}</strong> {a}% ({first.value})
        </span>
        <span>
          <strong>{second.label}</strong> {b}% ({second.value})
        </span>
        <span>
          <strong>{third.label}</strong> {c}% ({third.value})
        </span>
      </div>
    </div>
  );
}

export interface CraftSnippet {
  line: number;
  text: string;
}

/** Card for a single highlighted word/phrase with line snippets. */
export function CraftWordCard({
  title,
  count,
  meta,
  hint,
  snippets,
  highlight,
  severity = "low",
  initialShown = 2,
  goToLine,
}: {
  title: string;
  count: number;
  meta?: ReactNode;
  hint?: ReactNode;
  snippets: CraftSnippet[];
  /** Either a literal word or a phrase to highlight inside each snippet. */
  highlight: string;
  severity?: CraftSeverity;
  initialShown?: number;
  goToLine: (line1Based: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const re = useMemo(() => {
    const trimmed = highlight.trim();
    if (!trimmed) return new RegExp("(?!)", "g");
    if (/\s/.test(trimmed)) return buildPhraseRegex(trimmed);
    return new RegExp(`\\b${escapeRegex(trimmed)}\\b`, "gi");
  }, [highlight]);
  const preview = open ? snippets : snippets.slice(0, initialShown);
  const hasMore = snippets.length > initialShown;
  return (
    <li className={`rep-card ${severityClass(severity)}`}>
      <div className="rep-card-header">
        <span className="rep-card-title">{title}</span>
        <span className="rep-card-count">×{count}</span>
        {meta ? <span className="rep-card-meta muted small">{meta}</span> : null}
      </div>
      {hint ? <p className="craft-card-hint muted small">{hint}</p> : null}
      <ul className="rep-snippets">
        {preview.map((s, i) => (
          <li key={`${s.line}-${i}`} className="rep-snippet">
            <button
              type="button"
              className="rep-line-jump linkish"
              onClick={() => goToLine(s.line)}
              aria-label={`Go to line ${s.line}`}
            >
              L{s.line}
            </button>
            <span className="rep-snippet-text">{highlightInLine(s.text, re)}</span>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          className="rep-show-more linkish small"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Show less" : `Show ${snippets.length - initialShown} more`}
        </button>
      ) : null}
    </li>
  );
}

/** Card for a per-line conflict (POV/tense), highlighting a tag rather than a word. */
export function CraftConflictCard({
  line,
  text,
  badge,
  badgeTone = "warn",
  detail,
  goToLine,
}: {
  line: number;
  text: string;
  badge: string;
  badgeTone?: "warn" | "info";
  detail?: ReactNode;
  goToLine: (line1Based: number) => void;
}) {
  return (
    <li className="rep-card rep-card-sev-med">
      <div className="rep-card-header">
        <button
          type="button"
          className="rep-line-jump linkish"
          onClick={() => goToLine(line)}
          aria-label={`Go to line ${line}`}
        >
          L{line}
        </button>
        <span
          className={`craft-badge craft-badge--${badgeTone}`}
          aria-label={`Detected as ${badge}`}
        >
          {badge}
        </span>
        {detail ? <span className="rep-card-meta muted small">{detail}</span> : null}
      </div>
      <ul className="rep-snippets">
        <li className="rep-snippet">
          <span className="rep-snippet-text">{text}</span>
        </li>
      </ul>
    </li>
  );
}

/** Card for a single named character with first/last appearance and mention snippets. */
export function CraftCharacterCard({
  name,
  count,
  firstLine,
  lastLine,
  vanishes,
  totalLines,
  snippets,
  goToLine,
}: {
  name: string;
  count: number;
  firstLine: number;
  lastLine: number;
  vanishes: boolean;
  totalLines: number;
  snippets: CraftSnippet[];
  goToLine: (line1Based: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const re = useMemo(
    () => new RegExp(`\\b${escapeRegex(name)}\\b`, "gi"),
    [name],
  );
  const initialShown = 2;
  const preview = open ? snippets : snippets.slice(0, initialShown);
  const hasMore = snippets.length > initialShown;
  return (
    <li className={`rep-card ${vanishes ? "rep-card-sev-high" : "rep-card-sev-low"}`}>
      <div className="rep-card-header">
        <span className="rep-card-title">{name}</span>
        <span className="rep-card-count">×{count}</span>
        <span className="rep-card-meta muted small">
          L{firstLine}–L{lastLine}
        </span>
        {vanishes ? (
          <span className="craft-badge craft-badge--warn">vanishes</span>
        ) : null}
      </div>
      <CharacterArc
        firstLine={firstLine}
        lastLine={lastLine}
        totalLines={totalLines}
        lines={snippets.map((s) => s.line)}
      />
      <ul className="rep-snippets">
        {preview.map((s, i) => (
          <li key={`${s.line}-${i}`} className="rep-snippet">
            <button
              type="button"
              className="rep-line-jump linkish"
              onClick={() => goToLine(s.line)}
              aria-label={`Go to line ${s.line}`}
            >
              L{s.line}
            </button>
            <span className="rep-snippet-text">{highlightInLine(s.text, re)}</span>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          className="rep-show-more linkish small"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Show less" : `Show ${snippets.length - initialShown} more`}
        </button>
      ) : null}
    </li>
  );
}

function CharacterArc({
  firstLine,
  lastLine,
  totalLines,
  lines,
}: {
  firstLine: number;
  lastLine: number;
  totalLines: number;
  lines: number[];
}) {
  if (totalLines <= 0) return null;
  const denom = Math.max(1, totalLines);
  return (
    <div
      className="craft-arc"
      role="img"
      aria-label={`Appears between line ${firstLine} and line ${lastLine}`}
    >
      <span
        className="craft-arc-span"
        style={{
          left: `${((firstLine - 1) / denom) * 100}%`,
          width: `${Math.max(2, ((lastLine - firstLine + 1) / denom) * 100)}%`,
        }}
      />
      {lines.map((l, i) => (
        <span
          key={`${l}-${i}`}
          className="craft-arc-tick"
          style={{ left: `${((l - 1) / denom) * 100}%` }}
        />
      ))}
    </div>
  );
}

export function CraftFilterRow({
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
    <div className="rep-controls">
      <label className="tool-filter-field rep-filter">
        <span className="tool-filter-label">Filter</span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Substring"}
          aria-label={ariaLabel}
        />
      </label>
    </div>
  );
}
