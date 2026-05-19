export function attachMockLocalStorage(): {
  store: Record<string, string>;
  detach: () => void;
} {
  const store: Record<string, string> = {};
  const ls = {
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
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
  const prev = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    value: ls,
    configurable: true,
    writable: true,
  });
  return {
    store,
    detach: () => {
      Object.defineProperty(globalThis, "localStorage", {
        value: prev,
        configurable: true,
        writable: true,
      });
    },
  };
}
