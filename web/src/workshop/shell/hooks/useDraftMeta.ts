import { useCallback, useMemo, useState } from "react";
import {
  loadDraftMetaMap,
  saveDraftMetaMap,
  upsertDraftMeta,
  type DraftMetaMap,
} from "@/workshop/library/library-meta";
import type { DraftLibrary } from "@/workshop/library/local-draft-library";

export interface DraftMetaState {
  meta: DraftMetaMap;
  setMeta: React.Dispatch<React.SetStateAction<DraftMetaMap>>;
  storyOptions: Array<{ id: string; label: string; archived: boolean }>;
  setDraftLabel: (storyId: string, label: string) => void;
  togglePinned: (storyId: string) => void;
  setDraftTags: (storyId: string, tags: string[]) => void;
  setDraftArchived: (storyId: string, archived: boolean) => void;
}

export function useDraftMeta(library: DraftLibrary): DraftMetaState {
  const [meta, setMeta] = useState<DraftMetaMap>(() => loadDraftMetaMap());

  const storyOptions = useMemo(() => {
    const labelFor = (p: (typeof library.stories)[0]) =>
      meta[p.id]?.label?.trim() || p.title.trim() || "Untitled";
    return library.stories
      .slice()
      .filter(
        (p) => !meta[p.id]?.archived || p.id === library.activeId,
      )
      .sort((a, b) => {
        const ma = meta[a.id] ?? {};
        const mb = meta[b.id] ?? {};
        const pa = ma.pinned ? 1 : 0;
        const pb = mb.pinned ? 1 : 0;
        if (pa !== pb) return pb - pa;
        const oa = ma.lastOpenedAt ? new Date(ma.lastOpenedAt).getTime() : 0;
        const ob = mb.lastOpenedAt ? new Date(mb.lastOpenedAt).getTime() : 0;
        if (oa !== ob) return ob - oa;
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      })
      .map((p) => ({
        id: p.id,
        label: labelFor(p),
        archived: Boolean(meta[p.id]?.archived),
      }));
  }, [library.stories, library.activeId, meta]);

  const setDraftLabel = useCallback((storyId: string, label: string) => {
    setMeta((prev) => {
      const patched = upsertDraftMeta(prev, storyId, { label });
      void saveDraftMetaMap(patched);
      return patched;
    });
  }, []);

  const togglePinned = useCallback((storyId: string) => {
    setMeta((prev) => {
      const pinned = Boolean(prev[storyId]?.pinned);
      const patched = upsertDraftMeta(prev, storyId, { pinned: !pinned });
      void saveDraftMetaMap(patched);
      return patched;
    });
  }, []);

  const setDraftTags = useCallback((storyId: string, tags: string[]) => {
    setMeta((prev) => {
      const patched = upsertDraftMeta(prev, storyId, { tags });
      void saveDraftMetaMap(patched);
      return patched;
    });
  }, []);

  const setDraftArchived = useCallback(
    (storyId: string, archived: boolean) => {
      setMeta((prev) => {
        const patched = upsertDraftMeta(prev, storyId, { archived });
        void saveDraftMetaMap(patched);
        return patched;
      });
    },
    [],
  );

  return {
    meta,
    setMeta,
    storyOptions,
    setDraftLabel,
    togglePinned,
    setDraftTags,
    setDraftArchived,
  };
}
