/**
 * All localStorage/sessionStorage keys used by easywriting-story, in one place.
 *
 * Historical note: this project began as easywriting-poem. The original prefix
 * was `easy-poems:`. {@link runStorageMigrationOnce} copies every legacy key
 * to its new name on first boot of the story app and is idempotent, so it's
 * safe to leave the call in place forever.
 */

const NEW_PREFIX = "easy-stories:";
const OLD_PREFIX = "easy-poems:";

// Draft library
export const STORAGE_KEY_LIBRARY = "easy-stories:library:v1";

// Single-slot draft (legacy migration path)
export const STORAGE_KEY_DRAFT = "easy-stories:draft:v2";
export const STORAGE_KEY_DRAFT_LEGACY_V1 = "easy-stories:draft:v1";

// Revision snapshots
/** Legacy global snapshot store (pre-library) */
export const STORAGE_KEY_REVISIONS_V1 = "easy-stories:revisions:v1";
/** Per-story snapshot map */
export const STORAGE_KEY_REVISIONS_V2 = "easy-stories:revisions:v2";

// Spell check
export const STORAGE_KEY_SPELL_DICT = "easy-stories:spell:personal:v1";
export const STORAGE_KEY_SPELL_IGNORE_SESSION = "easy-stories:spell:ignore-session:v1";

// Workshop metadata
export const STORAGE_KEY_GOALS = "easy-stories:goals:v1";
export const STORAGE_KEY_IDEAS_NOTEBOOK = "easy-stories:ideas-notebook:v1";
export const STORAGE_KEY_LIBRARY_META = "easy-stories:libraryMeta:v1";
export const STORAGE_KEY_APPEARANCE = "easy-stories:appearance:v1";
export const STORAGE_KEY_FIRST_HINT_DISMISSED = "easy-stories:first-hint-dismissed";

// Session / UI preferences
export const STORAGE_KEY_LAST_TOOL_TAB = "easy-stories:lastToolTab";
export const STORAGE_KEY_LAST_EXPORT_AT = "easy-stories:lastExportAt";
export const STORAGE_KEY_SHOW_LINE_SYLLABLES = "easy-stories:showLineSyllables";
export const STORAGE_KEY_SHOW_RHYME_SCHEME = "easy-stories:showRhymeScheme";
export const STORAGE_KEY_RHYME_SCHEME_BREADTH = "easy-stories:rhymeSchemeBreadth";
/** Delayed "what does this do?" bubbles on buttons (fine-pointer / hover devices). */
export const STORAGE_KEY_UI_HOVER_HINTS = "easy-stories:uiHoverHints";

// Reading mode
export const STORAGE_KEY_READING_FONT_SIZE = "easy-stories:readingFontSize";
export const STORAGE_KEY_READING_THEME = "easy-stories:readingTheme";
export const STORAGE_KEY_READING_LINE_NUMBERS = "easy-stories:readingLineNumbers";
export const STORAGE_KEY_READING_DROP_CAP = "easy-stories:readingDropCap";
export const STORAGE_KEY_WORD_LOOKUP_ENABLED = "easy-stories:wordLookupEnabled";

// AI settings
export const STORAGE_KEY_AI_MODEL = "ep_openai_model";
export const STORAGE_KEY_AI_SCORING_ENABLED = "easy-stories:ai-scoring-enabled";

// Landing page
export const STORAGE_KEY_LANDING_DISMISSED = "easy-stories:landing-dismissed";

// Onboarding
export const STORAGE_KEY_SAMPLE_DISMISSED = "easy-stories:sample-dismissed";
export const STORAGE_KEY_TABS_EXPANDED = "easy-stories:tabs-expanded";
export const STORAGE_KEY_MOBILE_NUDGE_DISMISSED = "easy-stories:mobile-nudge-dismissed";

// Layout
export const STORAGE_KEY_TOOLS_WIDTH = "easy-stories:tools-panel-width";
export const STORAGE_KEY_RAIL_WIDTH = "easy-stories:rail-width";

// One-time migration marker (own key — under the new prefix only).
const MIGRATION_MARKER = "easy-stories:migration:from-easy-poems:v1";

/**
 * One-time migration of legacy `easy-poems:*` storage keys to the new
 * `easy-stories:*` prefix. Idempotent — once the marker is set the function
 * is a cheap localStorage read and returns immediately.
 *
 * Safety guarantees:
 *   - Each old key is only copied if the corresponding new key does not
 *     already exist. This is the back-stop that prevents a half-completed
 *     previous migration from clobbering data on a retry.
 *   - The old keys are intentionally NOT deleted. They stay as a recovery
 *     path for at least one release. A later cleanup pass can purge them.
 *   - Failures are silent. localStorage can be unavailable (private mode,
 *     storage full, sandboxed iframe) and the rest of the app must still
 *     work.
 *
 * Call once, as early as possible on app boot, before any other code reads
 * from localStorage. See `web/src/app/main.tsx`.
 */
export function runStorageMigrationOnce(): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(MIGRATION_MARKER)) return;

    // Snapshot the keys first — modifying localStorage during the loop would
    // invalidate the index-based iteration in some browsers.
    const legacyKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(OLD_PREFIX)) legacyKeys.push(k);
    }

    for (const oldKey of legacyKeys) {
      const newKey = NEW_PREFIX + oldKey.slice(OLD_PREFIX.length);
      // Don't overwrite if the new key has already been written (e.g. by a
      // prior partial run, or by the user importing a backup).
      if (localStorage.getItem(newKey) !== null) continue;
      const value = localStorage.getItem(oldKey);
      if (value === null) continue;
      try {
        localStorage.setItem(newKey, value);
      } catch {
        // Quota exceeded — stop the migration but don't poison the marker.
        return;
      }
    }

    // Same for sessionStorage (only one key uses it today, but be general).
    if (typeof sessionStorage !== "undefined") {
      const sessionKeys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(OLD_PREFIX)) sessionKeys.push(k);
      }
      for (const oldKey of sessionKeys) {
        const newKey = NEW_PREFIX + oldKey.slice(OLD_PREFIX.length);
        if (sessionStorage.getItem(newKey) !== null) continue;
        const value = sessionStorage.getItem(oldKey);
        if (value === null) continue;
        try {
          sessionStorage.setItem(newKey, value);
        } catch {
          /* ignore */
        }
      }
    }

    localStorage.setItem(MIGRATION_MARKER, new Date().toISOString());
  } catch {
    // Best-effort. If anything in here throws, we just won't migrate.
  }
}
