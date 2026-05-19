/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  HoverHintsProvider,
  UI_HOVER_HINT_DOM_ID,
  useHoverHintBinder,
} from "./HoverHintsContext";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches:
      query.includes("(hover: hover)") && !query.includes("(hover: none)"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

function LabeledButton({ label }: { label: string }) {
  const hint = useHoverHintBinder();
  return (
    <button type="button" {...hint("Explains the control")}>
      {label}
    </button>
  );
}

describe("HoverHintsProvider (DOM)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows a tooltip after the hover delay", () => {
    render(
      <HoverHintsProvider>
        <LabeledButton label="Action" />
      </HoverHintsProvider>,
    );

    const btn = screen.getByRole("button", { name: "Action" });
    fireEvent.pointerEnter(btn);

    expect(screen.queryByRole("tooltip")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(560);
    });

    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("Explains the control");
    expect(tip).toHaveAttribute("id", UI_HOVER_HINT_DOM_ID);
    expect(btn).toHaveAttribute("aria-describedby", UI_HOVER_HINT_DOM_ID);
  });

  it("cancels a pending tooltip when pointer leaves before the delay", () => {
    render(
      <HoverHintsProvider>
        <LabeledButton label="Act" />
      </HoverHintsProvider>,
    );

    const btn = screen.getByRole("button", { name: "Act" });
    fireEvent.pointerEnter(btn);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.pointerLeave(btn);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
