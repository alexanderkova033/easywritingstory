const HASH_PREFIX = "share:";

export interface SharedStory {
  title: string;
  body: string;
}

export function encodeShareHash(story: SharedStory): string {
  const json = JSON.stringify({ t: story.title.trim(), b: story.body });
  return HASH_PREFIX + btoa(unescape(encodeURIComponent(json)));
}

export function decodeShareHash(hash: string): SharedStory | null {
  try {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!raw.startsWith(HASH_PREFIX)) return null;
    const json = decodeURIComponent(escape(atob(raw.slice(HASH_PREFIX.length))));
    const obj = JSON.parse(json) as { t?: unknown; b?: unknown };
    if (typeof obj.b !== "string") return null;
    return { title: typeof obj.t === "string" ? obj.t : "", body: obj.b };
  } catch {
    return null;
  }
}

export function buildShareUrl(story: SharedStory): string {
  return `${window.location.origin}${window.location.pathname}#${encodeShareHash(story)}`;
}

export function checkShareHash(): SharedStory | null {
  return decodeShareHash(window.location.hash);
}
