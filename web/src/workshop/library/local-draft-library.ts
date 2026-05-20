import {
  tryLocalStorageRemoveItem,
  tryLocalStorageSetItem,
} from "@/shared/platform/browser-storage";
import {
  STORAGE_KEY_DRAFT,
  STORAGE_KEY_LIBRARY,
} from "@/shared/storage-keys";
import { loadDraft, type DraftState, type SpellMode } from "./local-draft-storage";
import {
  migrateLegacyRevisionsV1ToStory,
  parseRevisionSnapshotsFromExport,
  setRevisionsForStory,
  type RevisionSnapshot,
} from "./revision-snapshots";

const LIBRARY_KEY = STORAGE_KEY_LIBRARY;
const LEGACY_DRAFT_KEY = STORAGE_KEY_DRAFT;
const CURRENT_LIBRARY_VERSION = 2 as const;

export type { SpellMode };

export interface StoryRecord {
  id: string;
  title: string;
  body: string;
  form?: string;
  spellMode?: SpellMode;
  updatedAt: string;
}

export interface DraftLibrary {
  version: typeof CURRENT_LIBRARY_VERSION;
  activeId: string;
  stories: StoryRecord[];
}

function newStoryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function parseStoryItem(p: unknown): StoryRecord | null {
  if (!p || typeof p !== "object") return null;
  const r = p as Record<string, unknown>;
  if (
    typeof r.id !== "string" ||
    typeof r.title !== "string" ||
    typeof r.body !== "string"
  ) {
    return null;
  }
  const updatedAt =
    typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString();
  const form =
    r.form === undefined || r.form === null ? undefined : String(r.form);
  const spellMode =
    r.spellMode === "strict" || r.spellMode === "permissive"
      ? r.spellMode
      : undefined;
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    updatedAt,
    ...(form ? { form } : {}),
    ...(spellMode ? { spellMode } : {}),
  };
}

function readLibraryRaw(): DraftLibrary | null {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    // v1 used `poems`; v2 uses `stories`. Accept either and emit v2.
    const rawItems = Array.isArray(o.stories)
      ? o.stories
      : Array.isArray(o.poems)
        ? o.poems
        : null;
    if (rawItems === null) return null;
    if (typeof o.activeId !== "string") return null;
    const stories: StoryRecord[] = [];
    for (const item of rawItems) {
      const s = parseStoryItem(item);
      if (s) stories.push(s);
    }
    if (stories.length === 0) return null;
    if (!stories.some((x) => x.id === o.activeId)) return null;
    return {
      version: CURRENT_LIBRARY_VERSION,
      activeId: o.activeId,
      stories,
    };
  } catch {
    return null;
  }
}

export function saveLibrary(lib: DraftLibrary): boolean {
  return tryLocalStorageSetItem(LIBRARY_KEY, JSON.stringify(lib));
}

function emptyStory(): StoryRecord {
  const id = newStoryId();
  return {
    id,
    title: "",
    body: "",
    updatedAt: new Date().toISOString(),
  };
}

function fromDraftState(d: DraftState, id: string): StoryRecord {
  return {
    id,
    title: d.title,
    body: d.body,
    updatedAt: new Date().toISOString(),
    ...(d.form ? { form: d.form } : {}),
    ...(d.spellMode ? { spellMode: d.spellMode } : {}),
  };
}

/**
 * Loads the story library, migrating a legacy single-slot draft + global
 * snapshots once.
 */
export function loadOrCreateLibrary(): DraftLibrary {
  const existing = readLibraryRaw();
  if (existing) return existing;

  const d = loadDraft();
  const id = newStoryId();
  const story: StoryRecord = d ? fromDraftState(d, id) : { ...emptyStory(), id };
  const lib: DraftLibrary = {
    version: CURRENT_LIBRARY_VERSION,
    activeId: id,
    stories: [story],
  };
  void saveLibrary(lib);
  migrateLegacyRevisionsV1ToStory(id);
  void tryLocalStorageRemoveItem(LEGACY_DRAFT_KEY);
  return lib;
}

export function storyById(lib: DraftLibrary, id: string): StoryRecord | undefined {
  return lib.stories.find((p) => p.id === id);
}

export function upsertActiveStory(
  lib: DraftLibrary,
  patch: Pick<StoryRecord, "title" | "body"> & {
    form?: string;
    spellMode?: SpellMode;
  },
): DraftLibrary {
  const now = new Date().toISOString();
  const stories = lib.stories.map((p) => {
    if (p.id !== lib.activeId) return p;
    const next: StoryRecord = {
      ...p,
      title: patch.title,
      body: patch.body,
      updatedAt: now,
    };
    if (patch.form !== undefined) {
      if (patch.form.trim()) next.form = patch.form.trim();
      else delete next.form;
    }
    if (patch.spellMode !== undefined) {
      next.spellMode = patch.spellMode;
    }
    return next;
  });
  return { ...lib, stories };
}

export function setActiveStory(lib: DraftLibrary, activeId: string): DraftLibrary | null {
  if (!lib.stories.some((p) => p.id === activeId)) return null;
  return { ...lib, activeId };
}

export function addStory(lib: DraftLibrary, story: StoryRecord): DraftLibrary {
  return { ...lib, stories: [...lib.stories, story], activeId: story.id };
}

export function duplicateStoryById(
  lib: DraftLibrary,
  storyId: string,
): DraftLibrary | null {
  const cur = storyById(lib, storyId);
  if (!cur) return null;
  const copy: StoryRecord = {
    id: newStoryId(),
    title: cur.title ? `${cur.title} (copy)` : "",
    body: cur.body,
    updatedAt: new Date().toISOString(),
    ...(cur.form ? { form: cur.form } : {}),
    ...(cur.spellMode ? { spellMode: cur.spellMode } : {}),
  };
  return addStory(lib, copy);
}

export function duplicateActiveStory(lib: DraftLibrary): DraftLibrary | null {
  return duplicateStoryById(lib, lib.activeId);
}

export function newBlankStoryAfter(lib: DraftLibrary): DraftLibrary {
  const p = emptyStory();
  return addStory(lib, p);
}

/** Removes a story; if it was the last one, inserts a fresh blank story. */
export function removeStory(lib: DraftLibrary, storyId: string): DraftLibrary {
  let stories = lib.stories.filter((p) => p.id !== storyId);
  if (stories.length === 0) {
    stories = [emptyStory()];
  }
  let activeId = lib.activeId;
  if (activeId === storyId) {
    activeId = stories[0]!.id;
  }
  return { ...lib, stories, activeId };
}

// Backward-compat export mark — older backups carry "easyPoemsWorkshopExport".
// Accepted on import; new backups use the new mark.
export const WORKSHOP_EXPORT_MARK_LEGACY = "easyPoemsWorkshopExport" as const;
export const WORKSHOP_EXPORT_MARK = "easyStoryWorkshopExport" as const;
export const WORKSHOP_EXPORT_VERSION = 1 as const;

export interface WorkshopExportStory {
  title: string;
  body: string;
  form?: string;
  spellMode?: SpellMode;
  updatedAt?: string;
  revisions?: RevisionSnapshot[];
}

export interface WorkshopExportFile {
  [WORKSHOP_EXPORT_MARK]: true;
  version: typeof WORKSHOP_EXPORT_VERSION;
  exportedAt: string;
  stories: WorkshopExportStory[];
}

export function buildWorkshopExportJson(input: {
  stories: StoryRecord[];
  revisionsForStory: (storyId: string) => RevisionSnapshot[];
}): string {
  const exportedAt = new Date().toISOString();
  const stories: WorkshopExportStory[] = input.stories.map((p) => ({
    title: p.title,
    body: p.body,
    ...(p.form ? { form: p.form } : {}),
    ...(p.spellMode ? { spellMode: p.spellMode } : {}),
    updatedAt: p.updatedAt,
    revisions: input.revisionsForStory(p.id),
  }));
  const payload: WorkshopExportFile = {
    [WORKSHOP_EXPORT_MARK]: true,
    version: WORKSHOP_EXPORT_VERSION,
    exportedAt,
    stories,
  };
  return JSON.stringify(payload, null, 2);
}

export interface ImportMergeResult {
  added: number;
  lib: DraftLibrary;
}

export function mergeImportedStories(
  lib: DraftLibrary,
  rawJson: string,
): ImportMergeResult | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch {
    return { error: "That file is not valid JSON." };
  }
  if (!parsed || typeof parsed !== "object") return { error: "Invalid backup format." };
  const o = parsed as Record<string, unknown>;
  const isCurrentMark = o[WORKSHOP_EXPORT_MARK] === true;
  const isLegacyMark = o[WORKSHOP_EXPORT_MARK_LEGACY] === true;
  if (!isCurrentMark && !isLegacyMark) {
    return { error: "Not an easywriting-story workshop backup." };
  }
  if (o.version !== 1) {
    return {
      error:
        "This backup was created with an incompatible version and cannot be imported. " +
        "Try exporting a fresh backup from the version you used to create this file.",
    };
  }
  // Accept either `stories` (current) or `poems` (legacy) as the item array.
  const rawItems = Array.isArray(o.stories)
    ? o.stories
    : Array.isArray(o.poems)
      ? o.poems
      : null;
  if (rawItems === null) {
    return { error: "Backup is missing the stories array." };
  }
  let added = 0;
  let next = lib;
  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    if (typeof p.title !== "string" || typeof p.body !== "string") continue;
    const id = newStoryId();
    const form =
      p.form === undefined || p.form === null ? undefined : String(p.form);
    const spellMode =
      p.spellMode === "strict" || p.spellMode === "permissive"
        ? p.spellMode
        : undefined;
    const story: StoryRecord = {
      id,
      title: p.title,
      body: p.body,
      updatedAt:
        typeof p.updatedAt === "string" ? p.updatedAt : new Date().toISOString(),
      ...(form?.trim() ? { form: form.trim() } : {}),
      ...(spellMode ? { spellMode } : {}),
    };
    next = { ...next, stories: [...next.stories, story], activeId: id };
    added++;
    const revs = parseRevisionSnapshotsFromExport(p.revisions);
    if (revs.length) {
      void setRevisionsForStory(id, revs);
    }
  }
  if (added === 0) return { error: "No stories found in that file." };
  return { added, lib: next };
}
