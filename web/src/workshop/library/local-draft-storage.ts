import {
  tryLocalStorageSetItem,
} from "@/shared/platform/browser-storage";
import {
  STORAGE_KEY_DRAFT,
  STORAGE_KEY_DRAFT_LEGACY_V1,
} from "@/shared/storage-keys";

const STORAGE_KEY = STORAGE_KEY_DRAFT;

export type SpellMode = "strict" | "permissive";

export interface DraftState {
  title: string;
  body: string;
  /** Optional form or note (e.g. sonnet, free verse). */
  form?: string;
  spellMode?: SpellMode;
}

function readSpellMode(v: unknown): SpellMode | undefined {
  if (v === "strict" || v === "permissive") return v;
  return undefined;
}

export function loadDraft(): DraftState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (typeof o.title !== "string" || typeof o.body !== "string") return null;
    const form =
      o.form === undefined || o.form === null
        ? undefined
        : String(o.form);
    const sm = readSpellMode(o.spellMode);
    return {
      title: o.title,
      body: o.body,
      ...(form ? { form } : {}),
      ...(sm ? { spellMode: sm } : {}),
    };
  } catch {
    return null;
  }
}

export function saveDraft(state: DraftState): boolean {
  return tryLocalStorageSetItem(
    STORAGE_KEY,
    JSON.stringify({
      title: state.title,
      body: state.body,
      ...(state.form ? { form: state.form } : {}),
      ...(state.spellMode ? { spellMode: state.spellMode } : {}),
    }),
  );
}

/** Migrate v1 draft key if present and v2 empty. */
export function migrateLegacyDraftIfNeeded(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const legacy = localStorage.getItem(STORAGE_KEY_DRAFT_LEGACY_V1);
    if (!legacy) return;
    const v = JSON.parse(legacy) as unknown;
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (typeof o.title !== "string" || typeof o.body !== "string") return;
    void saveDraft({
      title: o.title,
      body: o.body,
    });
  } catch {
    /* ignore */
  }
}
