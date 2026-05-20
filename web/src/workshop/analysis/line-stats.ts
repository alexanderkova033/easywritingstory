import { countSyllablesInLine, countSyllablesInWord } from "@/workshop/text/syllables";
import { wordsInLine } from "@/workshop/text/tokenize";

/** Typical silent-reading pace for prose (words per minute) — used for time-to-read hints. */
export const SILENT_READING_WPM = 250;

/**
 * Sentence-segmentation regex used in prose mode. Splits on `.`, `!`, `?`,
 * ellipsis, and em-dashes that close a thought; preserves the terminator.
 * Heuristic — not linguistically exact, but good enough for IGCSE-length work.
 */
const SENTENCE_TERMINATOR = /[.!?]+["'’”)]*\s+(?=[A-Z"'“(])|[.!?]+["'’”)]*\s*$/g;

/** Crude detector for dialogue spans inside a paragraph. Matches `"..."` / `“...”`. */
const DIALOGUE_SPAN = /["“]([^"”]+)["”]/g;

/** Per-stanza aggregates (stanzas separated by one or more blank lines). */
export interface StanzaStat {
  stanzaIndex: number;
  startLine: number;
  endLine: number;
  /** Lines in this stanza from startLine–endLine (includes the stanza’s own lines only). */
  lineCountInStanza: number;
  nonEmptyLines: number;
  words: number;
  syllables: number;
  /** Mean estimated syllables per non-empty line in this stanza (1 decimal). */
  avgSyllablesPerNonEmptyLine: number;
}

/** Live counts for the header / overview (no syllable work — cheap on every keystroke). */
export interface QuickDocumentStats {
  totalLines: number;
  nonEmptyLines: number;
  totalWords: number;
  totalChars: number;
  stanzaCount: number;
}

export function computeQuickDocumentStats(body: string): QuickDocumentStats {
  if (!body) {
    return {
      totalLines: 0,
      nonEmptyLines: 0,
      totalWords: 0,
      totalChars: 0,
      stanzaCount: 0,
    };
  }
  const rawLines = body.split("\n");
  let nonEmpty = 0;
  let totalWords = 0;
  for (const text of rawLines) {
    const isNonEmpty = text.trim().length > 0;
    if (isNonEmpty) {
      nonEmpty++;
      totalWords += wordsInLine(text).length;
    }
  }
  let stanzaCount = 0;
  let prevBlank = true;
  for (const text of rawLines) {
    const blank = text.trim().length === 0;
    if (!blank && prevBlank) stanzaCount++;
    prevBlank = blank;
  }
  return {
    totalLines: rawLines.length,
    nonEmptyLines: nonEmpty,
    totalWords,
    totalChars: body.length,
    stanzaCount,
  };
}

export interface SentenceStat {
  /** 1-based index across the whole document. */
  index: number;
  /** 1-based line where the sentence starts. */
  startLine: number;
  /** Trimmed sentence text (terminator included). */
  text: string;
  words: number;
  /** True if the sentence text contains at least one `"..."` / `“...”` span. */
  hasDialogue: boolean;
}

export interface ProseMetrics {
  sentences: SentenceStat[];
  /** Mean words per sentence (1 decimal); 0 if no sentences. */
  avgWordsPerSentence: number;
  /** Population standard deviation of words/sentence (1 decimal). High = varied; low = monotonous. */
  sentenceLengthStdDev: number;
  /** Sentence with the most words (ties: earliest). */
  longestSentence: { index: number; words: number; startLine: number } | null;
  /** Share of total words that fall inside `"..."` spans, 0–1 (2 decimals). */
  dialogueFraction: number;
  /** Flesch-Kincaid grade level (1 decimal); 0 if no sentences/words. */
  readingGrade: number;
}

export interface DocumentStats {
  totalLines: number;
  nonEmptyLines: number;
  totalSyllables: number;
  totalWords: number;
  totalChars: number;
  /** Non-empty line groups separated by one or more blank lines. (Paragraph count.) */
  stanzaCount: number;
  /** Estimated minutes to read silently at {@link SILENT_READING_WPM} (1 decimal); 0 if no words. */
  estimatedReadingMinutes: number;
  /** One entry per stanza/paragraph; empty if there are no non-empty lines. */
  stanzaStats: StanzaStat[];
  /** Mean words per non-empty line (1 decimal); 0 if no non-empty lines. */
  avgWordsPerNonEmptyLine: number;
  /** Sentence-level metrics for prose. */
  prose: ProseMetrics;
}

const EMPTY_PROSE: ProseMetrics = {
  sentences: [],
  avgWordsPerSentence: 0,
  sentenceLengthStdDev: 0,
  longestSentence: null,
  dialogueFraction: 0,
  readingGrade: 0,
};

function fleschKincaidGrade(totalWords: number, totalSentences: number, totalSyllables: number): number {
  if (totalWords === 0 || totalSentences === 0) return 0;
  const grade =
    0.39 * (totalWords / totalSentences) +
    11.8 * (totalSyllables / totalWords) -
    15.59;
  // Clamp negatives to 0; round to 1 decimal.
  return Math.max(0, Math.round(grade * 10) / 10);
}

function segmentSentences(body: string, rawLines: string[]): SentenceStat[] {
  if (!body) return [];
  // Map each char offset to its 1-based line number so we can attribute each
  // sentence to where it starts.
  const lineOfOffset: number[] = new Array(body.length);
  {
    let line = 1;
    for (let i = 0; i < body.length; i++) {
      lineOfOffset[i] = line;
      if (body[i] === "\n") line++;
    }
  }
  void rawLines;

  const sentences: SentenceStat[] = [];
  let cursor = 0;
  const re = new RegExp(SENTENCE_TERMINATOR.source, "g");
  let m: RegExpExecArray | null;
  let idx = 1;
  while ((m = re.exec(body)) !== null) {
    const end = m.index + m[0].length;
    const raw = body.slice(cursor, end).trim();
    if (raw.length > 0) {
      const words = wordsInLine(raw).length;
      const startLine = lineOfOffset[cursor + (body.slice(cursor).match(/\S/)?.index ?? 0)] ?? 1;
      const hasDialogue = /["“][^"”]*["”]/.test(raw);
      sentences.push({ index: idx++, startLine, text: raw, words, hasDialogue });
    }
    cursor = end;
  }
  // Trailing fragment with no terminator (mid-sentence).
  const tail = body.slice(cursor).trim();
  if (tail.length > 0) {
    const words = wordsInLine(tail).length;
    const startLine = lineOfOffset[cursor + (body.slice(cursor).match(/\S/)?.index ?? 0)] ?? 1;
    const hasDialogue = /["“][^"”]*["”]/.test(tail);
    sentences.push({ index: idx, startLine, text: tail, words, hasDialogue });
  }
  return sentences;
}

function computeProseMetrics(
  body: string,
  rawLines: string[],
  totalWords: number,
  totalSyllables: number,
): ProseMetrics {
  const sentences = segmentSentences(body, rawLines);
  if (sentences.length === 0) {
    return {
      ...EMPTY_PROSE,
      readingGrade: fleschKincaidGrade(totalWords, 0, totalSyllables),
    };
  }

  let wordsSum = 0;
  let longest: { index: number; words: number; startLine: number } | null = null;
  for (const s of sentences) {
    wordsSum += s.words;
    if (!longest || s.words > longest.words) {
      longest = { index: s.index, words: s.words, startLine: s.startLine };
    }
  }
  const mean = wordsSum / sentences.length;
  let varianceSum = 0;
  for (const s of sentences) {
    const d = s.words - mean;
    varianceSum += d * d;
  }
  const stdDev = Math.sqrt(varianceSum / sentences.length);

  let dialogueWords = 0;
  const reDialogue = new RegExp(DIALOGUE_SPAN.source, "g");
  let dm: RegExpExecArray | null;
  while ((dm = reDialogue.exec(body)) !== null) {
    dialogueWords += wordsInLine(dm[1] ?? "").length;
  }
  const dialogueFraction =
    totalWords > 0 ? Math.round((dialogueWords / totalWords) * 100) / 100 : 0;

  return {
    sentences,
    avgWordsPerSentence: Math.round(mean * 10) / 10,
    sentenceLengthStdDev: Math.round(stdDev * 10) / 10,
    longestSentence: longest,
    dialogueFraction,
    readingGrade: fleschKincaidGrade(totalWords, sentences.length, totalSyllables),
  };
}
// Silence unused warning for countSyllablesInWord; kept exported by /text/syllables for callers.
void countSyllablesInWord;

export function computeDocumentStats(body: string): DocumentStats {
  const rawLines = body.split("\n");
  if (rawLines.length === 0) {
    return {
      totalLines: 0,
      nonEmptyLines: 0,
      totalSyllables: 0,
      totalWords: 0,
      totalChars: 0,
      stanzaCount: 0,
      estimatedReadingMinutes: 0,
      stanzaStats: [],
      avgWordsPerNonEmptyLine: 0,
      prose: { ...EMPTY_PROSE },
    };
  }

  interface PerLineCounts { text: string; words: number; syllables: number }
  const lineCounts: PerLineCounts[] = [];
  let totalSyllables = 0;
  let totalWords = 0;
  let nonEmpty = 0;

  for (const text of rawLines) {
    const wn = wordsInLine(text).length;
    const syllables = countSyllablesInLine(text);
    if (text.trim().length > 0) nonEmpty++;
    totalSyllables += syllables;
    totalWords += wn;
    lineCounts.push({ text, words: wn, syllables });
  }

  let stanzaCount = 0;
  let prevBlank = true;
  for (const text of rawLines) {
    const blank = text.trim().length === 0;
    if (!blank && prevBlank) stanzaCount++;
    prevBlank = blank;
  }

  const avgWordsPerNonEmptyLine =
    nonEmpty > 0 ? Math.round((10 * totalWords) / nonEmpty) / 10 : 0;

  const stanzaStats: StanzaStat[] = [];
  let si = 0;
  while (si < rawLines.length) {
    while (si < rawLines.length && rawLines[si]!.trim() === "") si++;
    if (si >= rawLines.length) break;
    const startLine = si + 1;
    let end = si;
    let stNonEmpty = 0;
    let stWords = 0;
    let stSyl = 0;
    let stLines = 0;
    while (end < rawLines.length && rawLines[end]!.trim() !== "") {
      const row = lineCounts[end]!;
      stLines++;
      if (row.text.trim().length > 0) {
        stNonEmpty++;
        stWords += row.words;
        stSyl += row.syllables;
      }
      end++;
    }
    stanzaStats.push({
      stanzaIndex: stanzaStats.length + 1,
      startLine,
      endLine: end,
      lineCountInStanza: stLines,
      nonEmptyLines: stNonEmpty,
      words: stWords,
      syllables: stSyl,
      avgSyllablesPerNonEmptyLine:
        stNonEmpty > 0 ? Math.round((10 * stSyl) / stNonEmpty) / 10 : 0,
    });
    si = end;
  }

  const estimatedReadingMinutes =
    totalWords <= 0
      ? 0
      : Math.max(0.1, Math.round((10 * totalWords) / SILENT_READING_WPM) / 10);

  const prose = computeProseMetrics(body, rawLines, totalWords, totalSyllables);

  return {
    totalLines: rawLines.length,
    nonEmptyLines: nonEmpty,
    totalSyllables,
    totalWords,
    totalChars: body.length,
    stanzaCount,
    estimatedReadingMinutes,
    stanzaStats,
    avgWordsPerNonEmptyLine,
    prose,
  };
}
