import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { buildPhraseRegex, escapeRegex, highlightInLine } from "./helpers";

export type CraftSeverity = "now" | "soon" | "optional";
export type CraftTone = "warn" | "good" | "info";

/** Tier label thresholds used across word/verb-style panels. */
export function tierFromCount(count: number): CraftSeverity {
  if (count >= 5) return "now";
  if (count >= 2) return "soon";
  return "optional";
}

const TIER_LABEL: Record<CraftSeverity, string> = {
  now: "Heavy use",
  soon: "Worth a look",
  optional: "Occasional",
};

const TIER_HINT: Record<CraftSeverity, string> = {
  now: "Used many times — most readers will notice the pattern.",
  soon: "Used a few times — check whether each one earns its keep.",
  optional: "Used once or twice — usually fine.",
};

/** One-line plain-English summary that leads every Craft panel. */
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

/** Two-tone horizontal bar showing the share of two competing labels. */
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
          <strong>{left.label}</strong> {leftPct}% <span className="craft-dist-num">({left.value})</span>
        </span>
        <span>
          <strong>{right.label}</strong> {rightPct}% <span className="craft-dist-num">({right.value})</span>
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
          <strong>{first.label}</strong> {a}% <span className="craft-dist-num">({first.value})</span>
        </span>
        <span>
          <strong>{second.label}</strong> {b}% <span className="craft-dist-num">({second.value})</span>
        </span>
        <span>
          <strong>{third.label}</strong> {c}% <span className="craft-dist-num">({third.value})</span>
        </span>
      </div>
    </div>
  );
}

export interface CraftSnippet {
  line: number;
  text: string;
}

export interface CraftFinding {
  key: string;
  word: string;
  count: number;
  tier: CraftSeverity;
  category: string;
  /** Optional human-readable category badge (e.g. "filler"); defaults to category. */
  categoryLabel?: string;
  snippets: CraftSnippet[];
  hint?: ReactNode;
}

/** Renders findings grouped into severity buckets, using IssuesPanel's queue look. */
export function CraftFindingBuckets({
  findings,
  goToLine,
  emptyMessage,
  initialShownPerCard = 2,
  primaryActionLabel = "Jump",
}: {
  findings: CraftFinding[];
  goToLine: (line1Based: number) => void;
  emptyMessage?: ReactNode;
  initialShownPerCard?: number;
  primaryActionLabel?: string;
}) {
  const buckets = useMemo(() => {
    const out: Record<CraftSeverity, CraftFinding[]> = {
      now: [],
      soon: [],
      optional: [],
    };
    for (const f of findings) out[f.tier].push(f);
    return out;
  }, [findings]);

  if (findings.length === 0) {
    return emptyMessage ? <p className="muted small">{emptyMessage}</p> : null;
  }

  return (
    <div className="queue-buckets craft-buckets">
      {(["now", "soon", "optional"] as CraftSeverity[]).map((tier) => {
        const list = buckets[tier];
        if (list.length === 0) return null;
        return (
          <section key={tier} className={`queue-bucket queue-bucket-${tier}`}>
            <header className="queue-bucket-head">
              <span className={`queue-sev-dot queue-sev-dot-${tier}`} aria-hidden />
              <h4 className="tool-subheading queue-bucket-title">
                {TIER_LABEL[tier]}
                <span className="queue-bucket-count">{list.length}</span>
              </h4>
              <span className="craft-bucket-hint muted small">{TIER_HINT[tier]}</span>
            </header>
            <ul className="craft-finding-list">
              {list.map((f) => (
                <CraftFindingCard
                  key={f.key}
                  finding={f}
                  goToLine={goToLine}
                  initialShown={initialShownPerCard}
                  primaryActionLabel={primaryActionLabel}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function CraftFindingCard({
  finding,
  goToLine,
  initialShown,
  primaryActionLabel,
}: {
  finding: CraftFinding;
  goToLine: (line1Based: number) => void;
  initialShown: number;
  primaryActionLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const re = useMemo(() => {
    const trimmed = finding.word.trim();
    if (!trimmed) return new RegExp("(?!)", "g");
    if (/\s/.test(trimmed)) return buildPhraseRegex(trimmed);
    return new RegExp(`\\b${escapeRegex(trimmed)}\\b`, "gi");
  }, [finding.word]);
  const preview = open ? finding.snippets : finding.snippets.slice(0, initialShown);
  const hasMore = finding.snippets.length > initialShown;
  const firstLine = finding.snippets[0]?.line;

  return (
    <li className={`queue-item queue-item-craft queue-item-tier-${finding.tier}`}>
      <div className="queue-item-header">
        <span className="queue-cat queue-cat-craft" title={finding.categoryLabel ?? finding.category}>
          {finding.categoryLabel ?? finding.category}
        </span>
        {firstLine != null ? (
          <button
            type="button"
            className="queue-line-link"
            onClick={() => goToLine(firstLine)}
            title={`Jump to line ${firstLine}`}
          >
            L{firstLine}
          </button>
        ) : null}
      </div>
      <div className="queue-body">
        <div className="queue-title-row">
          <span className="queue-title">
            <strong className="craft-word">{finding.word}</strong>{" "}
            <span className="craft-finding-count">×{finding.count}</span>
          </span>
        </div>
        {finding.hint ? <p className="queue-detail muted small">{finding.hint}</p> : null}
        {preview.length > 0 ? (
          <ul className="craft-finding-snippets">
            {preview.map((s, i) => (
              <li key={`${s.line}-${i}`} className="craft-finding-snippet">
                <button
                  type="button"
                  className="craft-snippet-jump linkish"
                  onClick={() => goToLine(s.line)}
                  aria-label={`Go to line ${s.line}`}
                >
                  L{s.line}
                </button>
                <span className="craft-snippet-text">{highlightInLine(s.text, re)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {hasMore ? (
          <button
            type="button"
            className="linkish small craft-snippet-more"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Show less" : `Show ${finding.snippets.length - initialShown} more`}
          </button>
        ) : null}
      </div>
      {firstLine != null ? (
        <button
          type="button"
          className="small-btn queue-primary-btn"
          onClick={() => goToLine(firstLine)}
        >
          {primaryActionLabel}
        </button>
      ) : null}
    </li>
  );
}

/** Conflict card for POV/tense — single-line preview with a labelled badge. */
export function CraftConflictCard({
  line,
  text,
  badge,
  detail,
  goToLine,
}: {
  line: number;
  text: string;
  badge: string;
  detail?: ReactNode;
  goToLine: (line1Based: number) => void;
}) {
  return (
    <li className="queue-item queue-item-craft queue-item-tier-now">
      <div className="queue-item-header">
        <span className="queue-cat queue-cat-craft" title={`Reads as ${badge}`}>
          {badge}
        </span>
        <button
          type="button"
          className="queue-line-link"
          onClick={() => goToLine(line)}
          title={`Jump to line ${line}`}
        >
          L{line}
        </button>
      </div>
      <div className="queue-body">
        <div className="queue-title-row">
          <span className="craft-snippet-text craft-conflict-text">{text || <em>(empty line)</em>}</span>
        </div>
        {detail ? <p className="queue-detail muted small">{detail}</p> : null}
      </div>
      <button
        type="button"
        className="small-btn queue-primary-btn"
        onClick={() => goToLine(line)}
      >
        Jump
      </button>
    </li>
  );
}

/** Character card: name, mention count, appearance arc, jump action. */
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
  const re = useMemo(
    () => new RegExp(`\\b${escapeRegex(name)}\\b`, "gi"),
    [name],
  );
  const firstSnippet = snippets[0];
  return (
    <li
      className={`queue-item queue-item-craft ${vanishes ? "queue-item-tier-now" : "queue-item-tier-optional"}`}
    >
      <div className="queue-item-header">
        <span className="queue-cat queue-cat-craft">
          {vanishes ? "Vanishes" : "Recurring"}
        </span>
        <button
          type="button"
          className="queue-line-link"
          onClick={() => goToLine(firstLine)}
          title={`Jump to first mention (line ${firstLine})`}
        >
          L{firstLine}
        </button>
      </div>
      <div className="queue-body">
        <div className="queue-title-row">
          <span className="queue-title">
            <strong className="craft-word">{name}</strong>{" "}
            <span className="craft-finding-count">×{count}</span>
          </span>
          <span className="muted small craft-character-range">
            line {firstLine} → line {lastLine}
          </span>
        </div>
        <CharacterArc
          firstLine={firstLine}
          lastLine={lastLine}
          totalLines={totalLines}
          lines={snippets.map((s) => s.line)}
        />
        {vanishes ? (
          <p className="queue-detail muted small">
            Appears in the first third but never returns in the last third — possible
            loose thread.
          </p>
        ) : null}
        {firstSnippet ? (
          <ul className="craft-finding-snippets">
            <li className="craft-finding-snippet">
              <button
                type="button"
                className="craft-snippet-jump linkish"
                onClick={() => goToLine(firstSnippet.line)}
                aria-label={`Go to line ${firstSnippet.line}`}
              >
                L{firstSnippet.line}
              </button>
              <span className="craft-snippet-text">{highlightInLine(firstSnippet.text, re)}</span>
            </li>
          </ul>
        ) : null}
      </div>
      <button
        type="button"
        className="small-btn queue-primary-btn"
        onClick={() => goToLine(firstLine)}
      >
        Jump
      </button>
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
      aria-label={`Appears between line ${firstLine} and line ${lastLine} of ${totalLines}`}
    >
      <span className="craft-arc-third craft-arc-third--early" />
      <span className="craft-arc-third craft-arc-third--late" />
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

/** Inline metric label like "12 / 100 words" used in headline detail rows. */
export function CraftMetric({
  value,
  label,
}: {
  value: ReactNode;
  label: string;
}) {
  return (
    <span className="craft-metric">
      <span className="craft-metric-value">{value}</span>
      <span className="craft-metric-label muted small">{label}</span>
    </span>
  );
}
