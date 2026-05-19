/** Best-effort wrappers: local/session storage can throw (quota, private mode). */

/**
 * Estimates localStorage usage in bytes by summing key+value lengths (UTF-16 characters * 2).
 * Returns null if localStorage is unavailable.
 */
export function estimateLocalStorageBytes(): number | null {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key) ?? "";
      total += (key.length + value.length) * 2;
    }
    return total;
  } catch {
    return null;
  }
}

/** Conservative localStorage quota estimate (5 MB is the typical minimum). */
const STORAGE_QUOTA_ESTIMATE = 5 * 1024 * 1024;
const STORAGE_WARN_THRESHOLD = 0.8;

/**
 * Returns true when estimated localStorage usage exceeds 80% of the conservative quota.
 */
export function isLocalStorageNearlyFull(): boolean {
  const used = estimateLocalStorageBytes();
  if (used === null) return false;
  return used / STORAGE_QUOTA_ESTIMATE >= STORAGE_WARN_THRESHOLD;
}

export function tryLocalStorageSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function tryLocalStorageRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function trySessionStorageSetItem(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
