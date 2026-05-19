import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mergePersonalDictionaryFromJson } from "./personal-dictionary";

const KEY = "easy-poems:spell:personal:v1";

describe("mergePersonalDictionaryFromJson", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    vi.stubGlobal(
      "localStorage",
      {
        getItem: (k: string) => (k in store ? store[k]! : null),
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          for (const k of Object.keys(store)) delete store[k];
        },
        get length() {
          return Object.keys(store).length;
        },
        key: (i: number) => Object.keys(store)[i] ?? null,
      } as Storage,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("merges words and counts new entries", () => {
    const a = mergePersonalDictionaryFromJson(
      JSON.stringify(["alpha", "beta"]),
    );
    expect(a).toEqual({ ok: true, added: 2, total: 2 });
    const b = mergePersonalDictionaryFromJson(
      JSON.stringify(["alpha", "gamma"]),
    );
    expect(b).toEqual({ ok: true, added: 1, total: 3 });
  });

  it("normalizes case and skips empty strings", () => {
    const r = mergePersonalDictionaryFromJson(
      JSON.stringify(["  Hello ", "", "hello"]),
    );
    expect(r).toEqual({ ok: true, added: 1, total: 1 });
    const raw = store[KEY];
    expect(raw).toBeDefined();
    const arr = JSON.parse(raw!) as string[];
    expect(arr).toContain("hello");
    expect(arr.length).toBe(1);
  });

  it("rejects invalid JSON", () => {
    const r = mergePersonalDictionaryFromJson("not json");
    expect(r.ok).toBe(false);
  });

  it("rejects non-array root", () => {
    const r = mergePersonalDictionaryFromJson("{}");
    expect(r.ok).toBe(false);
  });
});
