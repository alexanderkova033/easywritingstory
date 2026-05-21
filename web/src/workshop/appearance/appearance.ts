import { tryLocalStorageSetItem } from "@/shared/platform/browser-storage";
import { STORAGE_KEY_APPEARANCE } from "@/shared/storage-keys";

export {
  STORY_FONT_OPTIONS,
  UI_FONT_OPTIONS,
  STORY_SIZE_OPTIONS,
  STORY_WEIGHT_OPTIONS,
  STORY_DECORATION_OPTIONS,
  type StoryFontId,
  type UiFontId,
  type StorySizeId,
  type StoryWeightId,
  type StoryDecorationId,
} from "./fonts";

export {
  BACKGROUND_OPTIONS,
  type BackgroundId,
  type CustomBackgroundTheme,
} from "./backgrounds/presets";

import {
  STORY_FONT_OPTIONS,
  UI_FONT_OPTIONS,
  STORY_SIZE_OPTIONS,
  STORY_WEIGHT_OPTIONS,
  STORY_DECORATION_OPTIONS,
  type StoryFontId,
  type UiFontId,
  type StorySizeId,
  type StoryWeightId,
  type StoryDecorationId,
} from "./fonts";

import {
  BACKGROUND_OPTIONS,
  type BackgroundId,
  type CustomBackgroundTheme,
  pickRandomFirstVisitBackground,
} from "./backgrounds/presets";

const STORAGE_KEY = STORAGE_KEY_APPEARANCE;

export type BackdropMotionSetting = "system" | "on" | "off";
export type BackdropPowerSetting = "off" | "low" | "very-low";

export interface AppearanceSettings {
  storyFont: StoryFontId;
  uiFont: UiFontId;
  background: BackgroundId;
  storySize: StorySizeId;
  storyWeight: StoryWeightId;
  storyDecoration: StoryDecorationId;
  /** Overrides animation preference. */
  backdropMotion: BackdropMotionSetting;
  /** Reduce paint complexity (fewer layers / less blend). */
  backdropPower: BackdropPowerSetting;
  /** Extra saturation cap for long-session comfort. */
  calmMode: boolean;
  /** Auto-warm + dim backdrop in the evening/night. */
  autoTimeShift: boolean;
  /** Fade motifs near the editor so prose has room to breathe. */
  nearTextDim: boolean;
  /** User-generated custom backdrop (active when background === "custom"). */
  customBackground: CustomBackgroundTheme | null;
}

const DEFAULTS: AppearanceSettings = {
  storyFont: "literata",
  uiFont: "dm-sans",
  background: "dark",
  storySize: "md",
  storyWeight: "normal",
  storyDecoration: "none",
  backdropMotion: "system",
  backdropPower: "off",
  calmMode: false,
  autoTimeShift: false,
  nearTextDim: false,
  customBackground: null,
};

export function defaultAppearance(): AppearanceSettings {
  return { ...DEFAULTS };
}

function isStoryFontId(x: string): x is StoryFontId {
  return STORY_FONT_OPTIONS.some((o) => o.id === x);
}

function isUiFontId(x: string): x is UiFontId {
  return UI_FONT_OPTIONS.some((o) => o.id === x);
}

function isBackgroundId(x: string): x is BackgroundId {
  return BACKGROUND_OPTIONS.some((o) => o.id === x);
}

function isStorySizeId(x: string): x is StorySizeId {
  return STORY_SIZE_OPTIONS.some((o) => o.id === x);
}

function isStoryWeightId(x: string): x is StoryWeightId {
  return STORY_WEIGHT_OPTIONS.some((o) => o.id === x);
}

function isStoryDecorationId(x: string): x is StoryDecorationId {
  return STORY_DECORATION_OPTIONS.some((o) => o.id === x);
}

function isBackdropMotionSetting(x: string): x is BackdropMotionSetting {
  return x === "system" || x === "on" || x === "off";
}

function isBackdropPowerSetting(x: string): x is BackdropPowerSetting {
  return x === "off" || x === "low" || x === "very-low";
}

function loadCustomBackground(v: unknown): CustomBackgroundTheme | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const fields = [
    "colorScheme", "label", "bg", "surface", "surface2", "border",
    "text", "muted", "accent", "ambientA", "ambientB", "ambientC",
    "ambientD", "shineTop", "shineMid", "netLine",
  ];
  if (!fields.every((k) => typeof o[k] === "string")) return null;
  if (o.colorScheme !== "light" && o.colorScheme !== "dark") return null;
  return o as unknown as CustomBackgroundTheme;
}

const APPEARANCE_SCHEMA_VERSION = 4;

/**
 * Returns the first non-empty string from candidates that passes the guard, or
 * the supplied fallback. Used by the appearance loader to accept either the
 * new field name (`storyFont`) or the legacy field name (`storyFont`).
 */
function pickString<T extends string>(
  guard: (s: string) => s is T,
  fallback: T,
  ...candidates: unknown[]
): T {
  for (const c of candidates) {
    if (typeof c === "string" && guard(c)) return c;
  }
  return fallback;
}

export function loadAppearance(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS, background: pickRandomFirstVisitBackground() };
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return { ...DEFAULTS };
    const o = v as Record<string, unknown>;
    return {
      storyFont: pickString(isStoryFontId, DEFAULTS.storyFont, o.storyFont, o.storyFont),
      uiFont: pickString(isUiFontId, DEFAULTS.uiFont, o.uiFont),
      background: pickString(isBackgroundId, DEFAULTS.background, o.background),
      storySize: pickString(isStorySizeId, DEFAULTS.storySize, o.storySize, o.storySize),
      storyWeight: pickString(isStoryWeightId, DEFAULTS.storyWeight, o.storyWeight, o.storyWeight),
      storyDecoration: pickString(isStoryDecorationId, DEFAULTS.storyDecoration, o.storyDecoration, o.storyDecoration),
      backdropMotion: pickString(isBackdropMotionSetting, DEFAULTS.backdropMotion, o.backdropMotion),
      backdropPower:
        typeof o.backdropPower === "string" && isBackdropPowerSetting(o.backdropPower)
          ? o.backdropPower
          : typeof o.lowPowerBackdrops === "boolean"
            ? (o.lowPowerBackdrops ? "low" : "off")
            : DEFAULTS.backdropPower,
      calmMode: typeof o.calmMode === "boolean" ? o.calmMode : DEFAULTS.calmMode,
      autoTimeShift: typeof o.autoTimeShift === "boolean" ? o.autoTimeShift : DEFAULTS.autoTimeShift,
      nearTextDim: typeof o.nearTextDim === "boolean" ? o.nearTextDim : DEFAULTS.nearTextDim,
      customBackground: loadCustomBackground(o.customBackground),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAppearance(s: AppearanceSettings): boolean {
  return tryLocalStorageSetItem(
    STORAGE_KEY,
    JSON.stringify({ schemaVersion: APPEARANCE_SCHEMA_VERSION, ...s }),
  );
}

const STORY_SIZE_VAR: Record<StorySizeId, string> = {
  xs: "0.95rem",
  sm: "1.075rem",
  md: "1.2rem",
  lg: "1.35rem",
  xl: "1.55rem",
};

const STORY_WEIGHT_VAR: Record<StoryWeightId, string> = {
  normal: "400",
  medium: "500",
  bold: "700",
};

let _lastBg: string | undefined;
let _customVarsApplied = false;

const CUSTOM_CSS_VARS = [
  "--bg", "--surface", "--surface-2", "--border", "--text", "--muted", "--accent",
  "--ambient-a", "--ambient-b", "--ambient-c", "--ambient-d",
  "--shine-top", "--shine-mid", "--net-line",
] as const;

function applyCustomVars(el: HTMLElement, cb: CustomBackgroundTheme): void {
  el.style.colorScheme = cb.colorScheme;
  el.style.setProperty("--bg", cb.bg);
  el.style.setProperty("--surface", cb.surface);
  el.style.setProperty("--surface-2", cb.surface2);
  el.style.setProperty("--border", cb.border);
  el.style.setProperty("--text", cb.text);
  el.style.setProperty("--muted", cb.muted);
  el.style.setProperty("--accent", cb.accent);
  el.style.setProperty("--ambient-a", cb.ambientA);
  el.style.setProperty("--ambient-b", cb.ambientB);
  el.style.setProperty("--ambient-c", cb.ambientC);
  el.style.setProperty("--ambient-d", cb.ambientD);
  el.style.setProperty("--shine-top", cb.shineTop);
  el.style.setProperty("--shine-mid", cb.shineMid);
  el.style.setProperty("--net-line", cb.netLine);
  _customVarsApplied = true;
}

function clearCustomVars(el: HTMLElement): void {
  if (!_customVarsApplied) return;
  el.style.colorScheme = "";
  CUSTOM_CSS_VARS.forEach((v) => el.style.removeProperty(v));
  _customVarsApplied = false;
}

/** Map local hour → `evening` (18-21), `night` (22-5), otherwise unset. */
function applyTimeOfDay(el: HTMLElement): void {
  const h = new Date().getHours();
  let band: string | null = null;
  if (h >= 22 || h < 6) band = "night";
  else if (h >= 18) band = "evening";
  if (band) el.dataset.timeOfDay = band;
  else delete el.dataset.timeOfDay;
}

let _timeOfDayTimer: number | undefined;
function maintainTimeOfDayTimer(el: HTMLElement, enabled: boolean): void {
  if (enabled && _timeOfDayTimer === undefined) {
    _timeOfDayTimer = window.setInterval(() => applyTimeOfDay(el), 15 * 60 * 1000);
  } else if (!enabled && _timeOfDayTimer !== undefined) {
    window.clearInterval(_timeOfDayTimer);
    _timeOfDayTimer = undefined;
  }
}

// The CSS-side variables and dataset attributes (`--story-font-size`,
// `data-story-font`, etc.) keep their `story-*` names to avoid rewriting every
// CSS file that reads them. This is purely a name mismatch with the TS-side
// `storyFont` / `storySize` settings; the values flow through unchanged.
export function applyAppearance(s: AppearanceSettings): void {
  const el = document.documentElement;
  el.dataset.storyFont = s.storyFont;
  el.dataset.uiFont = s.uiFont;

  const isCustomActive = s.background === "custom" && s.customBackground != null;
  if (isCustomActive) {
    applyCustomVars(el, s.customBackground!);
  } else {
    clearCustomVars(el);
  }

  const nextBg = s.background;
  if (_lastBg !== undefined && _lastBg !== nextBg) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      el.classList.add("theme-switching");
      requestAnimationFrame(() => {
        el.dataset.workshopBg = s.background;
        requestAnimationFrame(() => el.classList.remove("theme-switching"));
      });
    } else {
      el.dataset.workshopBg = s.background;
    }
  } else {
    el.dataset.workshopBg = s.background;
  }
  _lastBg = nextBg;
  if (s.backdropMotion === "system") delete el.dataset.backdropMotion;
  else el.dataset.backdropMotion = s.backdropMotion;
  if (s.backdropPower === "off") {
    el.removeAttribute("data-backdrop-low-power");
    delete el.dataset.backdropPower;
  } else {
    el.setAttribute("data-backdrop-low-power", "");
    el.dataset.backdropPower = s.backdropPower;
  }
  if (s.calmMode) el.dataset.calmMode = "on";
  else delete el.dataset.calmMode;
  if (s.nearTextDim) el.dataset.nearTextDim = "on";
  else delete el.dataset.nearTextDim;
  if (s.autoTimeShift) {
    el.dataset.autoTimeShift = "on";
    applyTimeOfDay(el);
  } else {
    delete el.dataset.autoTimeShift;
    delete el.dataset.timeOfDay;
  }
  maintainTimeOfDayTimer(el, s.autoTimeShift);
  el.style.setProperty("--story-font-size", STORY_SIZE_VAR[s.storySize]);
  el.style.setProperty("--story-font-weight", STORY_WEIGHT_VAR[s.storyWeight]);
  el.style.setProperty(
    "--story-text-decoration",
    s.storyDecoration === "underline" ? "underline" : "none",
  );
}
