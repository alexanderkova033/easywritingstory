import { describe, expect, it } from "vitest";
import {
  computeDocumentStats,
  computeQuickDocumentStats,
  SILENT_READING_WPM,
} from "./line-stats";

describe("computeQuickDocumentStats", () => {
  it("matches word and line counts without syllable work", () => {
    const body = "one two\nthree\n\nfour five";
    const q = computeQuickDocumentStats(body);
    const full = computeDocumentStats(body);
    expect(q.totalLines).toBe(full.totalLines);
    expect(q.nonEmptyLines).toBe(full.nonEmptyLines);
    expect(q.totalWords).toBe(full.totalWords);
    expect(q.totalChars).toBe(full.totalChars);
    expect(q.stanzaCount).toBe(full.stanzaCount);
  });
});

describe("computeDocumentStats", () => {
  it("counts stanzas separated by blank lines", () => {
    const s = computeDocumentStats("a\nb\n\nc\n\n\nd");
    expect(s.stanzaCount).toBe(3);
  });

  it("computes avg words per non-empty line and longest line", () => {
    const s = computeDocumentStats("one two\nthree four five\n");
    expect(s.avgWordsPerNonEmptyLine).toBe(2.5);
    expect(s.longestLineByWords).toEqual({ lineNumber: 2, words: 3 });
  });

  it("estimates reading minutes from word count", () => {
    const s = computeDocumentStats("");
    expect(s.estimatedReadingMinutes).toBe(0);
    const one = computeDocumentStats("hello");
    expect(one.estimatedReadingMinutes).toBe(0.1);
    const w = "word ".repeat(SILENT_READING_WPM).trimEnd();
    const minute = computeDocumentStats(w);
    expect(minute.estimatedReadingMinutes).toBe(1);
  });

  it("builds stanza stats with line ranges and aggregates", () => {
    const s = computeDocumentStats("one two\nthree\n\nfour\n");
    expect(s.stanzaStats).toHaveLength(2);
    expect(s.stanzaStats[0]).toMatchObject({
      stanzaIndex: 1,
      startLine: 1,
      endLine: 2,
      lineCountInStanza: 2,
      nonEmptyLines: 2,
      words: 3,
      avgSyllablesPerNonEmptyLine: expect.any(Number),
    });
    expect(s.stanzaStats[0]!.avgSyllablesPerNonEmptyLine).toBeGreaterThan(0);
    expect(s.stanzaStats[1]).toMatchObject({
      stanzaIndex: 2,
      startLine: 4,
      endLine: 4,
      lineCountInStanza: 1,
      nonEmptyLines: 1,
      words: 1,
    });
    expect(s.stanzaStats[0]!.syllables).toBeGreaterThan(0);
  });
});
