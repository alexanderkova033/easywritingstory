import type { StoryAnalysis } from "@/workshop/analysis/ai-analyze";

export const LS_LAST_ANALYSIS_PREFIX = "easy-stories:ai-last:";
export const LS_RESOLVED_PREFIX = "easy-stories:ai-resolved:";
export const LS_IGNORED_PREFIX = "easy-stories:ai-ignored:";

export function loadLastAnalysis(storyId?: string): StoryAnalysis | null {
  if (!storyId) return null;
  try {
    const raw = localStorage.getItem(LS_LAST_ANALYSIS_PREFIX + storyId);
    if (!raw) return null;
    return JSON.parse(raw) as StoryAnalysis;
  } catch { return null; }
}

export function saveLastAnalysis(storyId: string | undefined, analysis: StoryAnalysis) {
  if (!storyId) return;
  try { localStorage.setItem(LS_LAST_ANALYSIS_PREFIX + storyId, JSON.stringify(analysis)); }
  catch { /* storage full */ }
}

export function loadIdSet(prefix: string, storyId?: string): Set<string> {
  if (!storyId) return new Set();
  try {
    const raw = localStorage.getItem(prefix + storyId);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((x) => String(x)));
  } catch { return new Set(); }
}

export function saveIdSet(prefix: string, storyId: string | undefined, set: Set<string>) {
  if (!storyId) return;
  try {
    if (set.size === 0) localStorage.removeItem(prefix + storyId);
    else localStorage.setItem(prefix + storyId, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

export function loadIgnoredIssueIds(storyId?: string): Set<string> {
  return loadIdSet(LS_IGNORED_PREFIX, storyId);
}
