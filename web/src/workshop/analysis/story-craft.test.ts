import { describe, it, expect } from "vitest";
import {
  analyzeDialogueTags,
  analyzePov,
  analyzeTense,
  analyzeShowVsTell,
  analyzeAdverbs,
  analyzeCharacters,
  analyzeStoryCraft,
} from "./story-craft";

describe("analyzeDialogueTags", () => {
  it("counts said vs. stronger tag verbs", () => {
    const r = analyzeDialogueTags([
      '"Hello," she said.',
      '"Hi," he whispered.',
      '"Run!" she shouted.',
      'No dialogue here.',
    ]);
    expect(r.dialogueLineCount).toBe(3);
    expect(r.saidCount).toBe(1);
    expect(r.strongTagCount).toBeGreaterThanOrEqual(2);
    const verbs = r.verbCounts.map((v) => v.verb);
    expect(verbs).toContain("whispered");
    expect(verbs).toContain("shouted");
  });

  it("reports lines with dialogue but no attribution", () => {
    const r = analyzeDialogueTags(['"Where are you going?"']);
    expect(r.dialogueLineCount).toBe(1);
    expect(r.unattributed).toEqual([1]);
  });
});

describe("analyzePov", () => {
  it("flags first person as dominant", () => {
    const r = analyzePov([
      "I walked to the river.",
      "My boots were wet.",
      "I sat down.",
    ]);
    expect(r.dominant).toBe("first");
    expect(r.conflicts).toHaveLength(0);
  });

  it("detects POV conflict against the dominant POV", () => {
    const r = analyzePov([
      "I walked to the river.",
      "I sat down on a rock.",
      "I drank from a cup.",
      "I closed my eyes.",
      "He picked up the stones and threw them across.",
    ]);
    expect(r.dominant).toBe("first");
    expect(r.conflicts.map((c) => c.line)).toContain(5);
  });
});

describe("analyzeTense", () => {
  it("identifies past tense as dominant", () => {
    const r = analyzeTense([
      "She walked home.",
      "She was tired.",
      "She looked at the door.",
    ]);
    expect(r.dominant).toBe("past");
  });

  it("identifies present tense as dominant", () => {
    const r = analyzeTense([
      "She walks home.",
      "She is tired.",
      "She looks at the door.",
    ]);
    expect(r.dominant).toBe("present");
  });
});

describe("analyzeShowVsTell", () => {
  it("flags filter words", () => {
    const r = analyzeShowVsTell([
      "She felt cold.",
      "He realized the door was open.",
      "Pure description here.",
    ]);
    expect(r.total).toBe(2);
    expect(r.byWord.map((w) => w.word)).toContain("felt");
    expect(r.byWord.map((w) => w.word)).toContain("realized");
  });
});

describe("analyzeAdverbs", () => {
  it("flags -ly adverbs and weasel words", () => {
    const r = analyzeAdverbs([
      "She walked quickly down the street.",
      "It was really very dark.",
      "He spoke softly.",
    ]);
    expect(r.adverbTotal).toBeGreaterThanOrEqual(2);
    expect(r.weaselTotal).toBeGreaterThanOrEqual(2);
    const adverbs = r.topAdverbs.map((a) => a.word);
    expect(adverbs).toContain("quickly");
    expect(adverbs).toContain("softly");
    const weasels = r.topWeasels.map((a) => a.word);
    expect(weasels).toContain("really");
    expect(weasels).toContain("very");
  });

  it("ignores -ly exception words like 'only'", () => {
    const r = analyzeAdverbs(["She was only there for a moment."]);
    expect(r.topAdverbs.find((a) => a.word === "only")).toBeUndefined();
  });
});

describe("analyzeCharacters", () => {
  it("collects names mentioned twice or more", () => {
    const r = analyzeCharacters([
      "Sara walked into the room.",
      "She saw Tom by the window.",
      "Sara called out to Tom.",
      "Tom turned around.",
    ]);
    const names = r.characters.map((c) => c.name);
    expect(names).toContain("sara");
    expect(names).toContain("tom");
  });

  it("flags a character that vanishes before the ending", () => {
    const lines = [
      "Mark and Jane walked together.",
      "Mark spoke softly to Jane.",
      "Mark went home alone.",
      "Jane stood by the door.",
      "Jane saw the storm.",
      "Jane went inside.",
      "Jane locked the door.",
      "Jane drank tea.",
      "Jane fell asleep.",
    ];
    const r = analyzeCharacters(lines);
    const mark = r.characters.find((c) => c.name === "mark");
    expect(mark?.vanishes).toBe(true);
  });
});

describe("analyzeStoryCraft (bundle)", () => {
  it("returns all six analyses without throwing on empty input", () => {
    const r = analyzeStoryCraft([]);
    expect(r.dialogue.dialogueLineCount).toBe(0);
    expect(r.pov.dominant).toBe("unknown");
    expect(r.tense.dominant).toBe("unknown");
    expect(r.showVsTell.total).toBe(0);
    expect(r.adverbs.adverbTotal).toBe(0);
    expect(r.characters.characters).toEqual([]);
  });
});
