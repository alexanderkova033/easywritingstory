import { STORAGE_KEY_UI_HOVER_HINTS } from "@/shared/storage-keys";

export function readUiHoverHintsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UI_HOVER_HINTS);
    if (raw === "0" || raw === "false") return false;
    return true;
  } catch {
    return true;
  }
}

export function writeUiHoverHintsEnabled(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY_UI_HOVER_HINTS, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}
