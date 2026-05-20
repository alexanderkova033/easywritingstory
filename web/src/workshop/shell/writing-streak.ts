/**
 * Lightweight writing-streak tracker — fully local. No analytics, no server.
 * Counts consecutive days the user has touched the editor with non-empty
 * content. Updates at most once per day. Used as a subtle landing-page badge.
 */

const LS_KEY = "easy-stories:streak:v1";

interface StreakState {
  /** ISO yyyy-mm-dd of the last day a write was recorded. */
  lastDay: string;
  /** Consecutive-day count ending on lastDay. */
  count: number;
  /** All-time best. */
  best: number;
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map((n) => parseInt(n, 10));
  const [yb, mb, db] = b.split("-").map((n) => parseInt(n, 10));
  const ta = Date.UTC(ya!, (ma ?? 1) - 1, da ?? 1);
  const tb = Date.UTC(yb!, (mb ?? 1) - 1, db ?? 1);
  return Math.round((tb - ta) / 86_400_000);
}

function readState(): StreakState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<StreakState>;
    if (typeof v.lastDay !== "string" || typeof v.count !== "number") return null;
    return {
      lastDay: v.lastDay,
      count: Math.max(0, Math.floor(v.count)),
      best: Math.max(0, Math.floor(v.best ?? v.count)),
    };
  } catch { return null; }
}

function writeState(s: StreakState): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/** Record a write today. Idempotent within a calendar day. */
export function recordWriteToday(): StreakState {
  const today = todayKey();
  const prev = readState();
  if (!prev) {
    const s: StreakState = { lastDay: today, count: 1, best: 1 };
    writeState(s);
    return s;
  }
  if (prev.lastDay === today) return prev;
  const gap = daysBetween(prev.lastDay, today);
  const count = gap === 1 ? prev.count + 1 : 1;
  const best = Math.max(prev.best, count);
  const next: StreakState = { lastDay: today, count, best };
  writeState(next);
  return next;
}

/** Read current streak — returns 0 if last write was >1 day ago. */
export function getCurrentStreak(): { count: number; best: number } {
  const s = readState();
  if (!s) return { count: 0, best: 0 };
  const today = todayKey();
  const gap = daysBetween(s.lastDay, today);
  if (gap > 1) return { count: 0, best: s.best };
  return { count: s.count, best: s.best };
}

/* ---- Daily prompt — deterministic, rotates by date ---- */

const PROMPTS: string[] = [
  "Open a story with a smell you didn't know you remembered.",
  "Begin with one sentence of dialogue and no description.",
  "Write a scene in which a character lies and the reader knows.",
  "Two strangers wait together. Neither speaks first.",
  "Open with weather. End in a room.",
  "A character changes their mind without saying so.",
  "Write the moment before something is broken.",
  "Open with: \"They had not spoken in a year.\"",
  "Describe a kitchen entirely through the things on the counter.",
  "A small lie, told kindly. What happens after?",
  "Three minutes, three people, one bus stop.",
  "A character carries something heavy. Don't name it.",
  "Write a scene at night. Use the word \"nearly\" three times.",
  "End a story with a question one character does not answer.",
  "A character returns to a place that has changed.",
  "Open with a phone that rings once and stops.",
  "Show a friendship through what one person notices and the other doesn't.",
  "Begin with the sentence you almost didn't send.",
  "Write a scene where the weather argues with the mood.",
  "Open in motion. Close in silence.",
];

/**
 * Today's prompt — same all day for the same user (deterministic by yyyy-mm-dd
 * hash). Rotates daily.
 */
export function getDailyPrompt(): string {
  const today = todayKey();
  let h = 0;
  for (let i = 0; i < today.length; i++) h = (h * 31 + today.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % PROMPTS.length;
  return PROMPTS[idx]!;
}
