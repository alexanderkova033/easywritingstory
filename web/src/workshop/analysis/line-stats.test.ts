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
  it("counts every non-empty line as its own paragraph", () => {
    const s = computeDocumentStats("a\nb\n\nc\n\n\nd");
    expect(s.stanzaCount).toBe(4);
  });

  it("computes avg words per non-empty line", () => {
    const s = computeDocumentStats("one two\nthree four five\n");
    expect(s.avgWordsPerNonEmptyLine).toBe(2.5);
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

  it("builds one stanza-stat entry per non-empty line", () => {
    const s = computeDocumentStats("one two\nthree\n\nfour\n");
    expect(s.stanzaStats).toHaveLength(3);
    expect(s.stanzaStats[0]).toMatchObject({
      stanzaIndex: 1,
      startLine: 1,
      endLine: 1,
      lineCountInStanza: 1,
      nonEmptyLines: 1,
      words: 2,
      avgSyllablesPerNonEmptyLine: expect.any(Number),
    });
    expect(s.stanzaStats[0]!.avgSyllablesPerNonEmptyLine).toBeGreaterThan(0);
    expect(s.stanzaStats[1]).toMatchObject({
      stanzaIndex: 2,
      startLine: 2,
      endLine: 2,
      lineCountInStanza: 1,
      nonEmptyLines: 1,
      words: 1,
    });
    expect(s.stanzaStats[2]).toMatchObject({
      stanzaIndex: 3,
      startLine: 4,
      endLine: 4,
      lineCountInStanza: 1,
      nonEmptyLines: 1,
      words: 1,
    });
    expect(s.stanzaStats[0]!.syllables).toBeGreaterThan(0);
  });
});
