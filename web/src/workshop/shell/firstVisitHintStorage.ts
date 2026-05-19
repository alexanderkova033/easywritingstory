import { STORAGE_KEY_FIRST_HINT_DISMISSED } from "@/shared/storage-keys";

export { STORAGE_KEY_FIRST_HINT_DISMISSED as FIRST_VISIT_HINT_STORAGE_KEY };

export function readFirstVisitHintDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_FIRST_HINT_DISMISSED) === "1";
  } catch {
    return false;
  }
}
