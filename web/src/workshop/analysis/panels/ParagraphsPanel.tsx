import { useMemo, useState, type KeyboardEvent } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import { PARAGRAPHS_TABLE_MAX } from "@/workshop/analysis/tools/helpers";
import { NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import { LiveSectionTitle } from "../ToolTabBar";

export interface ParagraphsPanelProps {
  docStats: DocumentStats;
  storyLines: string[];
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

export function ParagraphsPanel({
  docStats,
  storyLines,
  heavyToolsStale,
  goToLine,
}: ParagraphsPanelProps) {
  const [goField, setGoField] = useState("");

  const previewOf = (startLine: number, endLine: number): string => {
    for (let i = startLine; i <= endLine; i++) {
      const t = (storyLines[i - 1] ?? "").trim();
      if (t.length > 0) return t;
    }
    return "";
  };

  const maxWords = useMemo(() => {
    let max = 0;
    for (const s of docStats.stanzaStats) {
      if (s.words > max) max = s.words;
    }
    return max || 1;
  }, [docStats.stanzaStats]);

  const wordOutlierBounds = useMemo(() => {
    const nums = docStats.stanzaStats
      .map((s) => s.words)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    if (nums.length < 4) return null;
    const q = (p: number) => {
      const i = (nums.length - 1) * p;
      const lo = Math.floor(i);
      const hi = Math.ceil(i);
      return nums[lo]! + (nums[hi]! - nums[lo]!) * (i - lo);
    };
    const q1 = q(0.25);
    const q3 = q(0.75);
    const iqr = q3 - q1;
    if (iqr < 1) return null;
    return { lo: q1 - 1.5 * iqr, hi: q3 + 1.5 * iqr };
  }, [docStats.stanzaStats]);

  return (
    <div
      className="tool-block tool-block-live"
      id="tool-panel-paragraphs"
      role="tabpanel"
      aria-labelledby="tool-tab-paragraphs"
    >
      <LiveSectionTitle>Paragraph table</LiveSectionTitle>
      {docStats.nonEmptyLines === 0 ? <NoLinesYetHint /> : null}
      {heavyToolsStale ? (
        <p
          className="tools-stale-hint muted small"
          role="status"
          aria-live="polite"
        >
          Paragraph counts match your text in a moment.
        </p>
      ) : null}
      <form
        className="lines-go-form"
        onSubmit={(e) => {
          e.preventDefault();
          const n = parseInt(goField.trim(), 10);
          if (!Number.isFinite(n) || n < 1) return;
          goToLine(n);
        }}
      >
        <label className="lines-go-label">
          Go to line
          <input
            id="go-line-input-paragraphs"
            value={goField}
            onChange={(e) => setGoField(e.target.value)}
            inputMode="numeric"
            placeholder="#"
            aria-label="Go to line number"
          />
        </label>
        <button type="submit" className="small-btn">
          Go
        </button>
      </form>
      <div className="table-wrap table-wrap-draft">
        <table
          className="line-table line-table-draft"
          title="Per-paragraph stats; click a row to jump in the editor."
        >
          <caption className="sr-only">
            Per paragraph: paragraph number, opening text preview, and word
            count. Activate a row to move the cursor to the start of that
            paragraph.
          </caption>
          <thead>
            <tr>
              <th scope="col">
                <abbr title="Paragraph number">¶</abbr>
              </th>
              <th scope="col" className="line-table-preview-th">Opens with</th>
              <th scope="col" className="line-table-syll-th">
                <abbr title="Word count with bar relative to longest paragraph">
                  Words
                </abbr>
              </th>
            </tr>
          </thead>
          <tbody>
            {docStats.stanzaStats.slice(0, PARAGRAPHS_TABLE_MAX).map((s) => {
              const preview = previewOf(s.startLine, s.endLine);
              const previewShort =
                preview.length > 42
                  ? preview.slice(0, 42).trimEnd() + "…"
                  : preview;
              const barPct = Math.max(
                4,
                Math.round((s.words / maxWords) * 100),
              );
              const outlier =
                wordOutlierBounds != null &&
                (s.words < wordOutlierBounds.lo ||
                  s.words > wordOutlierBounds.hi);
              return (
                <tr
                  key={s.stanzaIndex}
                  className={`line-table-data-row line-table-row-jump${outlier ? " is-syll-outlier" : ""}`}
                  tabIndex={0}
                  aria-label={`Paragraph ${s.stanzaIndex} at line ${s.startLine}: ${s.words} words${outlier ? " (length outlier)" : ""}. Open in editor.`}
                  onClick={() => goToLine(s.startLine)}
                  onKeyDown={(e: KeyboardEvent<HTMLTableRowElement>) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goToLine(s.startLine);
                    }
                  }}
                >
                  <td className="line-table-metric line-table-line-num">
                    {s.stanzaIndex}
                  </td>
                  <td
                    className="line-table-preview"
                    title={preview || "(blank paragraph)"}
                  >
                    {previewShort || (
                      <span className="line-table-preview-blank">·</span>
                    )}
                  </td>
                  <td className="line-table-metric line-table-syll-cell">
                    <span className="line-table-syll-bar-wrap" aria-hidden>
                      <span
                        className="line-table-syll-bar"
                        style={{ width: `${barPct}%` }}
                      />
                    </span>
                    <span className="line-table-syll-num">
                      {s.words}
                      {outlier ? (
                        <span
                          className="line-table-syll-flag"
                          aria-hidden
                          title="Paragraph length outlier vs. rest of the story"
                        >
                          !
                        </span>
                      ) : null}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {docStats.stanzaStats.length > PARAGRAPHS_TABLE_MAX ? (
        <p className="muted small">
          Showing first {PARAGRAPHS_TABLE_MAX} of {docStats.stanzaStats.length}{" "}
          paragraphs.
        </p>
      ) : null}
    </div>
  );
}
