import { describe, expect, it } from "vitest";
import { diffStoryLines } from "./diff-lines";

describe("diffStoryLines", () => {
  it("marks identical bodies as same", () => {
    const rows = diffStoryLines("a\nb", "a\nb");
    expect(rows).toEqual([
      { kind: "same", text: "a" },
      { kind: "same", text: "b" },
    ]);
  });

  it("pairs single-line replace as change", () => {
    const rows = diffStoryLines("old", "new");
    expect(rows).toEqual([{ kind: "change", left: "old", right: "new" }]);
  });

  it("reports insert as right-only row", () => {
    const rows = diffStoryLines("a", "a\nb");
    expect(rows.some((r) => r.kind === "right" && r.text === "b")).toBe(true);
  });
});
