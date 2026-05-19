import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { attachMockLocalStorage } from "@/shared/test/mock-local-storage";
import {
  addRevision,
  loadRevisions,
  migrateLegacyRevisionsV1ToPoem,
  removeRevision,
} from "./revision-snapshots";

describe("revision-snapshots (per poem)", () => {
  let detach: () => void;

  beforeEach(() => {
    ({ detach } = attachMockLocalStorage());
  });

  afterEach(() => {
    detach();
  });

  it("scopes snapshots by poem id", () => {
    const a = addRevision("poem-a", [], {
      title: "A",
      body: "x",
    });
    expect(a.ok).toBe(true);
    const b = addRevision("poem-b", [], {
      title: "B",
      body: "y",
    });
    expect(b.ok).toBe(true);
    expect(loadRevisions("poem-a")).toHaveLength(1);
    expect(loadRevisions("poem-b")).toHaveLength(1);
    expect(loadRevisions("poem-a")[0]!.title).toBe("A");
  });

  it("migrates legacy v1 array into a poem bucket once", () => {
    const legacy = [
      {
        id: "s1",
        createdAt: "2026-01-01T00:00:00.000Z",
        title: "Old",
        body: "z",
      },
    ];
    globalThis.localStorage.setItem("easy-poems:revisions:v1", JSON.stringify(legacy));
    migrateLegacyRevisionsV1ToPoem("first-poem");
    expect(globalThis.localStorage.getItem("easy-poems:revisions:v1")).toBeNull();
    const snaps = loadRevisions("first-poem");
    expect(snaps).toHaveLength(1);
    expect(snaps[0]!.title).toBe("Old");
  });

  it("removeRevision drops one id", () => {
    const r1 = addRevision("p", [], { title: "t", body: "b" });
    const r2 = addRevision("p", r1.revisions, { title: "t2", body: "b2" });
    const id = r2.revisions[1]!.id;
    const out = removeRevision("p", r2.revisions, id);
    expect(out.ok).toBe(true);
    expect(out.revisions).toHaveLength(1);
  });
});
