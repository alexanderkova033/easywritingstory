import { useState } from "react";
import type { DocumentStats } from "@/workshop/analysis/line-stats";
import type { StoryCraftAnalysis } from "@/workshop/analysis/story-craft";
import { EmptyState, JumpLineList, NoLinesYetHint } from "@/workshop/analysis/tools/shared";
import { LiveSectionTitle } from "../ToolTabBar";

export interface CraftPanelProps {
  docStats: DocumentStats;
  craft: StoryCraftAnalysis;
  heavyToolsStale: boolean;
  goToLine: (line1Based: number) => void;
}

type CraftSubTab =
  | "dialogue"
  | "pov"
  | "tense"
  | "showtell"
  | "adverbs"
  | "characters";

const SUB_TABS: { id: CraftSubTab; label: string; count: (c: StoryCraftAnalysis) => number }[] = [
  { id: "dialogue",   label: "Dialogue",   count: (c) => c.dialogue.occurrences.length },
  { id: "pov",        label: "POV",        count: (c) => c.pov.conflicts.length },
  { id: "tense",      label: "Tense",      count: (c) => c.tense.conflicts.length },
  { id: "showtell",   label: "Show vs tell", count: (c) => c.showVsTell.total },
  { id: "adverbs",    label: "Adverbs",    count: (c) => c.adverbs.adverbTotal + c.adverbs.weaselTotal },
  { id: "characters", label: "Characters", count: (c) => c.characters.characters.length },
];

export function CraftPanel({
  docStats,
  craft,
  heavyToolsStale,
  goToLine,
}: CraftPanelProps) {
  const [sub, setSub] = useState<CraftSubTab>("dialogue");

  return (
    <div
      className="tool-block tool-block-live"
      id="tool-panel-craft"
      role="tabpanel"
      aria-labelledby="tool-tab-craft"
    >
      <LiveSectionTitle>Craft</LiveSectionTitle>
      {docStats.nonEmptyLines === 0 ? <NoLinesYetHint /> : null}
      {heavyToolsStale ? (
        <p className="tools-stale-hint muted small" role="status" aria-live="polite">
          Tools updating…
        </p>
      ) : null}

      <div className="rep-subtabs" role="tablist" aria-label="Craft categories">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={sub === t.id}
            className={`rep-subtab ${sub === t.id ? "active" : ""}`}
            onClick={() => setSub(t.id)}
          >
            {t.label} <span className="rep-subtab-count">{t.count(craft)}</span>
          </button>
        ))}
      </div>

      {sub === "dialogue" ? <DialogueSection craft={craft} goToLine={goToLine} /> : null}
      {sub === "pov" ? <PovSection craft={craft} goToLine={goToLine} /> : null}
      {sub === "tense" ? <TenseSection craft={craft} goToLine={goToLine} /> : null}
      {sub === "showtell" ? <ShowTellSection craft={craft} goToLine={goToLine} /> : null}
      {sub === "adverbs" ? <AdverbsSection craft={craft} goToLine={goToLine} /> : null}
      {sub === "characters" ? <CharactersSection craft={craft} goToLine={goToLine} /> : null}
    </div>
  );
}

// ─── Dialogue ───────────────────────────────────────────────────────────────

function DialogueSection({
  craft,
  goToLine,
}: {
  craft: StoryCraftAnalysis;
  goToLine: (n: number) => void;
}) {
  const d = craft.dialogue;
  if (d.dialogueLineCount === 0) {
    return (
      <EmptyState title="No dialogue detected">
        <p className="muted small">
          Lines with quoted speech will show their attribution verbs here.
        </p>
      </EmptyState>
    );
  }
  return (
    <div className="craft-section">
      <p className="muted small">
        {d.dialogueLineCount} dialogue line{d.dialogueLineCount === 1 ? "" : "s"} ·
        {" "}{d.saidCount} <em>said</em> · {d.strongTagCount} other tag
        {d.strongTagCount === 1 ? "" : "s"}
      </p>

      {d.verbCounts.length > 0 ? (
        <>
          <h4 className="rep-pattern-title">Attribution verbs</h4>
          <ul className="rep-card-list">
            {d.verbCounts.map((v) => (
              <li key={v.verb} className={`rep-card rep-card--${v.severity}`}>
                <div className="rep-card-head">
                  <strong>{v.verb}</strong>
                  <span className="rep-card-count">×{v.count}</span>
                </div>
                <p className="muted small">
                  {v.count >= 3
                    ? "Used often — consider varying or replacing with action beats."
                    : "Occasional use is fine."}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {d.unattributed.length > 0 ? (
        <p className="muted small">
          Dialogue without a clear tag on line
          {d.unattributed.length === 1 ? " " : "s "}
          <JumpLineList lineNumbers={d.unattributed.slice(0, 20)} goToLine={goToLine} />
          {d.unattributed.length > 20 ? ` and ${d.unattributed.length - 20} more` : null}
          .
        </p>
      ) : null}
    </div>
  );
}

// ─── POV ────────────────────────────────────────────────────────────────────

function PovSection({
  craft,
  goToLine,
}: {
  craft: StoryCraftAnalysis;
  goToLine: (n: number) => void;
}) {
  const p = craft.pov;
  const total = p.totals.first + p.totals.second + p.totals.third;
  if (total === 0) {
    return (
      <EmptyState title="No POV markers yet">
        <p className="muted small">
          POV is detected from personal pronouns (I/we, you, he/she/they).
        </p>
      </EmptyState>
    );
  }
  return (
    <div className="craft-section">
      <p className="muted small">
        Dominant POV: <strong>{povLabel(p.dominant)}</strong>
        {" "}— first {p.totals.first} · second {p.totals.second} · third {p.totals.third}
      </p>
      {p.dominant === "mixed" ? (
        <p className="muted small">
          No POV holds a clear majority. Most short stories stick to one.
        </p>
      ) : null}
      {p.conflicts.length > 0 ? (
        <>
          <h4 className="rep-pattern-title">
            Off-POV lines <span className="muted small">— {p.conflicts.length}</span>
          </h4>
          <ul className="rep-card-list">
            {p.conflicts.slice(0, 30).map((c) => (
              <li key={c.line} className="rep-card rep-card--med">
                <div className="rep-card-head">
                  <button
                    type="button"
                    className="linkish line-jump-inline"
                    onClick={() => goToLine(c.line)}
                  >
                    Line {c.line}
                  </button>
                  <span className="rep-card-count">{povLabel(c.dominant)}</span>
                </div>
                <p className="muted small">
                  first {c.first} · second {c.second} · third {c.third}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted small">No POV conflicts detected.</p>
      )}
    </div>
  );
}

function povLabel(p: string): string {
  if (p === "first") return "first person";
  if (p === "second") return "second person";
  if (p === "third") return "third person";
  if (p === "mixed") return "mixed";
  return "—";
}

// ─── Tense ──────────────────────────────────────────────────────────────────

function TenseSection({
  craft,
  goToLine,
}: {
  craft: StoryCraftAnalysis;
  goToLine: (n: number) => void;
}) {
  const t = craft.tense;
  const total = t.totals.past + t.totals.present;
  if (total === 0) {
    return (
      <EmptyState title="No tense markers yet">
        <p className="muted small">
          Past- and present-tense verbs are detected by common forms and the -ed suffix.
        </p>
      </EmptyState>
    );
  }
  return (
    <div className="craft-section">
      <p className="muted small">
        Dominant tense: <strong>{tenseLabel(t.dominant)}</strong>
        {" "}— past {t.totals.past} · present {t.totals.present}
      </p>
      {t.dominant === "mixed" ? (
        <p className="muted small">
          Tense use is mixed. Short stories usually stay in one tense throughout.
        </p>
      ) : null}
      {t.conflicts.length > 0 ? (
        <>
          <h4 className="rep-pattern-title">
            Off-tense lines <span className="muted small">— {t.conflicts.length}</span>
          </h4>
          <ul className="rep-card-list">
            {t.conflicts.slice(0, 30).map((c) => (
              <li key={c.line} className="rep-card rep-card--med">
                <div className="rep-card-head">
                  <button
                    type="button"
                    className="linkish line-jump-inline"
                    onClick={() => goToLine(c.line)}
                  >
                    Line {c.line}
                  </button>
                  <span className="rep-card-count">{tenseLabel(c.dominant)}</span>
                </div>
                <p className="muted small">past {c.past} · present {c.present}</p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted small">No tense conflicts detected.</p>
      )}
    </div>
  );
}

function tenseLabel(t: string): string {
  if (t === "past") return "past";
  if (t === "present") return "present";
  if (t === "mixed") return "mixed";
  return "—";
}

// ─── Show vs tell ───────────────────────────────────────────────────────────

function ShowTellSection({
  craft,
  goToLine,
}: {
  craft: StoryCraftAnalysis;
  goToLine: (n: number) => void;
}) {
  const s = craft.showVsTell;
  if (s.total === 0) {
    return (
      <EmptyState title="No filter words found">
        <p className="muted small">
          Filter words like <em>felt</em>, <em>knew</em>, <em>noticed</em> distance the reader
          from your character. None spotted — nice.
        </p>
      </EmptyState>
    );
  }
  return (
    <div className="craft-section">
      <p className="muted small">
        {s.total} filter word{s.total === 1 ? "" : "s"} found — words like
        {" "}<em>felt</em>, <em>knew</em>, <em>realized</em> that often signal telling.
      </p>
      <h4 className="rep-pattern-title">Most-used</h4>
      <ul className="rep-card-list">
        {s.byWord.slice(0, 10).map((w) => {
          const lineNums = uniq(s.hits.filter((h) => h.word === w.word).map((h) => h.line));
          return (
            <li key={w.word} className="rep-card rep-card--low">
              <div className="rep-card-head">
                <strong>{w.word}</strong>
                <span className="rep-card-count">×{w.count}</span>
              </div>
              <p className="muted small">
                Line{lineNums.length === 1 ? " " : "s "}
                <JumpLineList lineNumbers={lineNums.slice(0, 12)} goToLine={goToLine} />
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Adverbs ────────────────────────────────────────────────────────────────

function AdverbsSection({
  craft,
  goToLine,
}: {
  craft: StoryCraftAnalysis;
  goToLine: (n: number) => void;
}) {
  const a = craft.adverbs;
  if (a.adverbTotal === 0 && a.weaselTotal === 0) {
    return (
      <EmptyState title="No adverbs or filler words">
        <p className="muted small">
          No <em>-ly</em> adverbs or weasel words (<em>very</em>, <em>really</em>, <em>just</em>) spotted.
        </p>
      </EmptyState>
    );
  }
  return (
    <div className="craft-section">
      <p className="muted small">
        {a.adverbTotal} adverb{a.adverbTotal === 1 ? "" : "s"} ·
        {" "}{a.weaselTotal} filler word{a.weaselTotal === 1 ? "" : "s"}
        {a.adverbPer100 > 0 ? <> · {a.adverbPer100.toFixed(1)} adverbs per 100 words</> : null}
      </p>

      {a.topAdverbs.length > 0 ? (
        <>
          <h4 className="rep-pattern-title">Top -ly adverbs</h4>
          <ul className="rep-card-list">
            {a.topAdverbs.map((w) => {
              const lineNums = uniq(a.adverbHits.filter((h) => h.word === w.word).map((h) => h.line));
              return (
                <li key={w.word} className="rep-card rep-card--low">
                  <div className="rep-card-head">
                    <strong>{w.word}</strong>
                    <span className="rep-card-count">×{w.count}</span>
                  </div>
                  <p className="muted small">
                    Line{lineNums.length === 1 ? " " : "s "}
                    <JumpLineList lineNumbers={lineNums.slice(0, 12)} goToLine={goToLine} />
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {a.topWeasels.length > 0 ? (
        <>
          <h4 className="rep-pattern-title">Filler / weasel words</h4>
          <ul className="rep-card-list">
            {a.topWeasels.map((w) => {
              const lineNums = uniq(a.weaselHits.filter((h) => h.word === w.word).map((h) => h.line));
              return (
                <li key={w.word} className="rep-card rep-card--low">
                  <div className="rep-card-head">
                    <strong>{w.word}</strong>
                    <span className="rep-card-count">×{w.count}</span>
                  </div>
                  <p className="muted small">
                    Line{lineNums.length === 1 ? " " : "s "}
                    <JumpLineList lineNumbers={lineNums.slice(0, 12)} goToLine={goToLine} />
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}

// ─── Characters ─────────────────────────────────────────────────────────────

function CharactersSection({
  craft,
  goToLine,
}: {
  craft: StoryCraftAnalysis;
  goToLine: (n: number) => void;
}) {
  const c = craft.characters;
  if (c.characters.length === 0) {
    return (
      <EmptyState title="No characters detected yet">
        <p className="muted small">
          Capitalized names mentioned at least twice will appear here, with the lines they show up on.
        </p>
      </EmptyState>
    );
  }
  return (
    <div className="craft-section">
      <p className="muted small">
        {c.characters.length} character{c.characters.length === 1 ? "" : "s"} ·
        {" "}{c.totalMentions} mention{c.totalMentions === 1 ? "" : "s"}
      </p>
      <ul className="rep-card-list">
        {c.characters.map((ch) => (
          <li
            key={ch.name}
            className={`rep-card rep-card--${ch.vanishes ? "high" : "low"}`}
          >
            <div className="rep-card-head">
              <strong>{ch.display}</strong>
              <span className="rep-card-count">×{ch.count}</span>
            </div>
            <p className="muted small">
              First seen line {ch.firstLine} · last seen line {ch.lastLine}
              {ch.vanishes ? " · vanishes before the ending" : null}
            </p>
            <p className="muted small">
              Lines <JumpLineList lineNumbers={ch.lines.slice(0, 20)} goToLine={goToLine} />
              {ch.lines.length > 20 ? ` and ${ch.lines.length - 20} more` : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function uniq(nums: number[]): number[] {
  const s = new Set<number>();
  for (const n of nums) s.add(n);
  return [...s].sort((a, b) => a - b);
}
