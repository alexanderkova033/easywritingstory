import { describe, expect, it } from "vitest";
import { evaluateGoals } from "@/workshop/goals/metrics";
import type { DocumentStats } from "./line-stats";

function stats(partial: Partial<DocumentStats> = {}): DocumentStats {
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
    prose: {
      sentences: [],
      avgWordsPerSentence: 0,
      sentenceLengthStdDev: 0,
      longestSentence: null,
      dialogueFraction: 0,
      readingGrade: 0,
    },
    ...partial,
  };
}

describe("evaluateGoals", () => {
  it("warns when word count is below minimum", () => {
    const out = evaluateGoals(
      stats({ totalWords: 100 }),
      { minWords: 500 },
    );
    expect(out.warnings.some((w) => w.includes("below your minimum"))).toBe(true);
  });

  it("warns when paragraph count is outside range", () => {
    const low = evaluateGoals(
      stats({
        stanzaCount: 1,
        stanzaStats: [
          {
            stanzaIndex: 1,
            startLine: 1,
            endLine: 1,
            lineCountInStanza: 1,
            nonEmptyLines: 1,
            words: 1,
            syllables: 1,
            avgSyllablesPerNonEmptyLine: 1,
          },
        ],
      }),
      { minStanzas: 3 },
    );
    expect(low.warnings.some((w) => w.includes("Paragraphs"))).toBe(true);

    const high = evaluateGoals(
      stats({ stanzaCount: 4, stanzaStats: [] }),
      { maxStanzas: 2 },
    );
    expect(high.warnings.some((w) => w.includes("above your maximum"))).toBe(
      true,
    );
  });
});
