import type { KeyboardEvent } from "react";
import { useCallback } from "react";
import type { ToolTab } from "@/workshop/shell/workshop-helpers";

export function useToolTabListKeyboard(
  toolTab: ToolTab,
  setToolTab: (t: ToolTab) => void,
  orderedTabIds: ToolTab[],
) {
  return useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).getAttribute("role") !== "tab") return;
      const ids = orderedTabIds;
      if (ids.length === 0) return;
      const idx = ids.indexOf(toolTab);
      if (idx < 0) return;
      let nextIdx = idx;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          nextIdx = (idx + 1) % ids.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          nextIdx = (idx - 1 + ids.length) % ids.length;
          break;
        case "Home":
          e.preventDefault();
          nextIdx = 0;
          break;
        case "End":
          e.preventDefault();
          nextIdx = ids.length - 1;
          break;
        default:
          return;
      }
      const next = ids[nextIdx]!;
      setToolTab(next);
      queueMicrotask(() => {
        document.getElementById(`tool-tab-${next}`)?.focus();
      });
    },
    [orderedTabIds, toolTab, setToolTab],
  );
}
