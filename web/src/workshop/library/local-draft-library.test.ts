import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { attachMockLocalStorage } from "@/shared/test/mock-local-storage";
import {
  duplicateStoryById,
  loadOrCreateLibrary,
  mergeImportedStories,
  newBlankStoryAfter,
  storyById,
  removeStory,
  setActiveStory,
  upsertActiveStory,
} from "./local-draft-library";

describe("local-draft-library", () => {
  let detach: () => void;

  beforeEach(() => {
    ({ detach } = attachMockLocalStorage());
  });

  afterEach(() => {
    detach();
  });

  it("creates one poem when storage is empty", () => {
    const lib = loadOrCreateLibrary();
    expect(lib.stories).toHaveLength(1);
    expect(lib.activeId).toBe(lib.stories[0]!.id);
  });

  it("upserts title and body on the active poem", () => {
    const lib = loadOrCreateLibrary();
    const next = upsertActiveStory(lib, {
      title: "Sea",
      body: "one\n",
      form: "haiku",
      spellMode: "strict",
    });
    const p = storyById(next, next.activeId);
    expect(p?.title).toBe("Sea");
    expect(p?.body).toBe("one\n");
    expect(p?.form).toBe("haiku");
    expect(p?.spellMode).toBe("strict");
  });

  it("clears form when empty string passed", () => {
    let lib = loadOrCreateLibrary();
    lib = upsertActiveStory(lib, {
      title: "",
      body: "",
      form: "note",
    });
    expect(storyById(lib, lib.activeId)?.form).toBe("note");
    lib = upsertActiveStory(lib, {
      title: "",
      body: "",
      form: "",
    });
    expect(storyById(lib, lib.activeId)?.form).toBeUndefined();
  });

  it("mergeImportedStories appends poems from backup JSON", () => {
    const lib = loadOrCreateLibrary();
    const raw = JSON.stringify({
      easyPoemsWorkshopExport: true,
      version: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      poems: [{ title: "Imported", body: "a\nb\n" }],
    });
    const merged = mergeImportedStories(lib, raw);
    expect("error" in merged).toBe(false);
    if ("error" in merged) return;
    expect(merged.added).toBe(1);
    expect(merged.lib.stories.length).toBe(lib.stories.length + 1);
    const active = storyById(merged.lib, merged.lib.activeId);
    expect(active?.title).toBe("Imported");
  });

  it("removeStory keeps at least one blank poem", () => {
    let lib = loadOrCreateLibrary();
    const onlyId = lib.stories[0]!.id;
    lib = removeStory(lib, onlyId);
    expect(lib.stories).toHaveLength(1);
    expect(lib.stories[0]!.body).toBe("");
  });

  it("duplicateStoryById copies a chosen draft and activates the copy", () => {
    let lib = loadOrCreateLibrary();
    lib = upsertActiveStory(lib, { title: "Source", body: "alpha\n" });
    const sourceId = lib.activeId;
    lib = newBlankStoryAfter(lib);
    expect(lib.activeId).not.toBe(sourceId);
    const back = setActiveStory(lib, sourceId);
    expect(back).not.toBeNull();
    lib = back!;
    expect(lib.activeId).toBe(sourceId);
    const dupLib = duplicateStoryById(lib, sourceId);
    expect(dupLib).not.toBeNull();
    const copy = storyById(dupLib!, dupLib!.activeId);
    expect(copy?.body).toBe("alpha\n");
    expect(copy?.title).toContain("copy");
  });
});
