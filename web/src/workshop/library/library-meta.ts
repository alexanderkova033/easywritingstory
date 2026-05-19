import { tryLocalStorageSetItem } from "@/shared/platform/browser-storage";
import { STORAGE_KEY_LIBRARY_META } from "@/shared/storage-keys";

const META_KEY = STORAGE_KEY_LIBRARY_META;

export interface DraftMeta {
  pinned?: boolean;
  /** Optional user-facing name shown in library/dropdown. */
  label?: string;
  /** Comma-separated tags, stored normalized without commas. */
  tags?: string[];
  lastOpenedAt?: string;
  /** Hidden from lists until “show archived” is on (draft stays in storage). */
  archived?: boolean;
}

export type DraftMetaMap = Record<string, DraftMeta | undefined>;

function safeParse(raw: string | null): DraftMetaMap {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return {};
    return v as DraftMetaMap;
  } catch {
    return {};
  }
}

export function loadDraftMetaMap(): DraftMetaMap {
  try {
    return safeParse(localStorage.getItem(META_KEY));
  } catch {
    return {};
  }
}

export function saveDraftMetaMap(map: DraftMetaMap): boolean {
  return tryLocalStorageSetItem(META_KEY, JSON.stringify(map));
}

export function upsertDraftMeta(
  map: DraftMetaMap,
  poemId: string,
  patch: DraftMeta,
): DraftMetaMap {
  const prev = map[poemId] ?? {};
  const next: DraftMeta = { ...prev, ...patch };
  // Normalize tags
  if (next.tags) {
    next.tags = next.tags
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.replaceAll(",", ""));
    if (next.tags.length === 0) delete next.tags;
  }
  if (next.label !== undefined && !next.label.trim()) delete next.label;
  return { ...map, [poemId]: next };
}

