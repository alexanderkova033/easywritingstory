let cache: Set<string> | null = null;
let loadPromise: Promise<Set<string>> | null = null;

export function loadEnglishWordlist(): Promise<Set<string>> {
  if (cache) return Promise.resolve(cache);
  if (!loadPromise) {
    const url = `${import.meta.env.BASE_URL}wordlist-en.txt`;
    loadPromise = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Word list failed (${r.status})`);
        return r.text();
      })
      .then((text) => {
        const s = new Set<string>();
        for (const line of text.split(/\n/)) {
          const w = line.trim().toLowerCase();
          if (w && !w.startsWith("#")) s.add(w);
        }
        cache = s;
        return s;
      });
  }
  return loadPromise;
}

export function clearWordlistCacheForTests(): void {
  cache = null;
  loadPromise = null;
}
