const HASH_PREFIX = "share:";

export interface SharedPoem {
  title: string;
  body: string;
}

export function encodeShareHash(poem: SharedPoem): string {
  const json = JSON.stringify({ t: poem.title.trim(), b: poem.body });
  return HASH_PREFIX + btoa(unescape(encodeURIComponent(json)));
}

export function decodeShareHash(hash: string): SharedPoem | null {
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

export function buildShareUrl(poem: SharedPoem): string {
  return `${window.location.origin}${window.location.pathname}#${encodeShareHash(poem)}`;
}

export function checkShareHash(): SharedPoem | null {
  return decodeShareHash(window.location.hash);
}
