export interface VocabStats {
  totalWords: number;
  uniqueWords: number;
  /** Type-token ratio: unique/total (0–1). Higher = more varied. */
  ttr: number;
  avgWordLength: number;
  /** Fraction of words > 7 chars (complexity signal). */
  longWordRatio: number;
  /** Fraction of content words (non-stopwords). Higher = denser. */
  lexicalDensity: number;
}

const STOP = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by",
  "from","is","are","was","were","be","been","being","have","has","had","do",
  "does","did","will","would","could","should","may","might","i","you","he",
  "she","it","we","they","me","him","her","us","them","my","your","his","its",
  "our","their","this","that","these","those","not","no","so","as","if","up",
  "out","about","into","over","after","before","then","when","where","who","what",
]);

export function computeVocabStats(lines: string[]): VocabStats | null {
  const words = lines
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && /[a-z]/.test(w));

  if (words.length === 0) return null;

  const unique = new Set(words);
  const content = words.filter((w) => !STOP.has(w));
  const totalLen = words.reduce((s, w) => s + w.length, 0);

  return {
    totalWords: words.length,
    uniqueWords: unique.size,
    ttr: Math.round((unique.size / words.length) * 100) / 100,
    avgWordLength: Math.round((totalLen / words.length) * 10) / 10,
    longWordRatio: Math.round((words.filter((w) => w.length > 7).length / words.length) * 100) / 100,
    lexicalDensity: Math.round((content.length / words.length) * 100) / 100,
  };
}

export function ttrLabel(ttr: number): string {
  if (ttr >= 0.85) return "Highly varied";
  if (ttr >= 0.7)  return "Varied";
  if (ttr >= 0.55) return "Moderate";
  if (ttr >= 0.4)  return "Some repetition";
  return "High repetition";
}
