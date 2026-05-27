import type { ReactNode } from "react";
import type { ChecklistItem } from "@/workshop/analysis/publication-checklist";

export function checklistJumpLabel(item: ChecklistItem): string {
  if (item.focusTitleField) return "Focus title";
  switch (item.openToolTab) {
    case "spell":
      return "Spelling";
    case "goals":
      return "Goals";
    default:
      return "Open";
  }
}

export function endWordOfLine(line: string | undefined): string {
  if (!line) return "";
  const m = line.match(/[a-zA-Z']+(?=[^a-zA-Z']*$)/);
  return m ? m[0] : "";
}

export function escapeRegex(s: string): string {
  return s.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

export function buildPhraseRegexSource(phrase: string): string {
  const words = phrase.split(/\s+/).filter(Boolean).map(escapeRegex);
  if (words.length === 0) return "(?!)";
  return words.join("[^A-Za-z']+");
}

export function buildPhraseRegex(phrase: string): RegExp {
  return new RegExp(buildPhraseRegexSource(phrase), "gi");
}

export function highlightInLine(
  lineText: string,
  match: string | RegExp,
): ReactNode[] {
  const out: ReactNode[] = [];
  const source = typeof match === "string" ? escapeRegex(match) : match.source;
  const flags = typeof match === "string" ? "gi" : (match.flags.includes("g") ? match.flags : match.flags + "g");
  const re = new RegExp(source, flags);
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lineText)) !== null) {
    if (m.index > lastIndex) {
      out.push(lineText.slice(lastIndex, m.index));
    }
    out.push(
      <mark key={`${m.index}-${m[0]}`} className="rep-highlight">
        {m[0]}
      </mark>,
    );
    lastIndex = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (lastIndex < lineText.length) {
    out.push(lineText.slice(lastIndex));
  }
  return out;
}

/**
 * Trim a long paragraph down to a short window of context around the first
 * match of `re`. Used in cluster cards so the preview reads as a snippet
 * around the highlighted word, not the whole paragraph (often 2–3 lines tall).
 *
 * Returns the original text untouched if the line is already short or the
 * regex doesn't match — never widen, never strip word boundaries mid-word.
 */
export function cropAroundMatch(
  lineText: string,
  match: string | RegExp,
  context = 40,
): string {
  if (!lineText) return "";
  if (lineText.length <= context * 2 + 30) return lineText;
  const source = typeof match === "string" ? escapeRegex(match) : match.source;
  const flags = typeof match === "string" ? "i" : match.flags.replace(/g/g, "");
  let re: RegExp;
  try {
    re = new RegExp(source, flags);
  } catch {
    return lineText;
  }
  const m = re.exec(lineText);
  if (!m) return lineText;
  const matchStart = m.index;
  const matchEnd = matchStart + m[0].length;
  let from = Math.max(0, matchStart - context);
  let to = Math.min(lineText.length, matchEnd + context);
  // Snap to nearest word boundary so we don't cut mid-word.
  if (from > 0) {
    const ws = lineText.slice(from, matchStart).search(/\s\S/);
    if (ws >= 0) from = from + ws + 1;
  }
  if (to < lineText.length) {
    const tail = lineText.slice(matchEnd, to);
    const lastWs = tail.lastIndexOf(" ");
    if (lastWs >= 0) to = matchEnd + lastWs;
  }
  const prefix = from > 0 ? "…" : "";
  const suffix = to < lineText.length ? "…" : "";
  return `${prefix}${lineText.slice(from, to)}${suffix}`;
}
