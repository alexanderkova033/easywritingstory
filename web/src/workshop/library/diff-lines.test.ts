import { describe, expect, it } from "vitest";
import { diffPoemLines } from "./diff-lines";

describe("diffPoemLines", () => {
  it("marks identical bodies as same", () => {
    const rows = diffPoemLines("a\nb", "a\nb");
    expect(rows).toEqual([
      { kind: "same", text: "a" },
      { kind: "same", text: "b" },
    ]);
  });

  it("pairs single-line replace as change", () => {
    const rows = diffPoemLines("old", "new");
    expect(rows).toEqual([{ kind: "change", left: "old", right: "new" }]);
  });

  it("reports insert as right-only row", () => {
    const rows = diffPoemLines("a", "a\nb");
    expect(rows.some((r) => r.kind === "right" && r.text === "b")).toBe(true);
  });
});
