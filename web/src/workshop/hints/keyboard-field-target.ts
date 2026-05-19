/** True when focus is in a field where global shortcuts should not fire. */
export function isTypingInField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.closest(".cm-editor")) return true;
  if (el.isContentEditable) return true;
  return false;
}
