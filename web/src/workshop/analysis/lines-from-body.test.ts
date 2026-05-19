import { describe, expect, it } from "vitest";
import { linesFromBody } from "./lines-from-body";

describe("linesFromBody", () => {
  it("splits on newlines", () => {
    expect(linesFromBody("a\nb")).toEqual(["a", "b"]);
  });

  it("returns single empty string for empty body", () => {
    expect(linesFromBody("")).toEqual([""]);
  });

  it("preserves trailing empty line", () => {
    expect(linesFromBody("a\n")).toEqual(["a", ""]);
  });
});
