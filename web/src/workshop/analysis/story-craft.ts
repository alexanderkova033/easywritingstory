/**
 * Story-craft analyses.
 *
 * Pure, line-based analyzers aimed at short fiction (IGCSE coursework):
 *   - Dialogue tags
 *   - POV consistency
 *   - Tense consistency
 *   - Show-vs-tell / filter words
 *   - Adverbs and weasel words
 *   - Character mentions
 *
 * Each takes string[] lines (already split by the caller) and returns plain
 * data. Heuristic by design — surface candidates for the writer to judge,
 * not authoritative calls. Runs in the heavy-analysis Web Worker.
 */
import { normalizeWordToken, wordSpansInLine, wordsInLine } from "@/workshop/text/tokenize";

export type Severity = "low" | "med" | "high";

// ─── Dialogue tags ──────────────────────────────────────────────────────────

const STRONG_SAID_SUBSTITUTES = new Set([
  "exclaimed", "shouted", "yelled", "screamed", "whispered", "hissed",
  "growled", "snarled", "muttered", "mumbled", "gasped", "sighed",
  "laughed", "chuckled", "cried", "snapped", "barked", "boomed",
  "stammered", "stuttered", "groaned", "moaned", "demanded", "pleaded",
  "begged", "interjected", "exclaimed", "proclaimed", "declared",
  "announced", "retorted", "replied", "answered", "questioned", "queried",
  "inquired", "asked", "responded",
]);

const NEUTRAL_TAGS = new Set(["said", "says", "saying"]);

export interface DialogueTagOccurrence {
  line: number;
  verb: string;
  surface: string;
  lineText: string;
}

export interface DialogueTagAnalysis {
  /** Lines that contain at least one pair of quote marks. */
  dialogueLineCount: number;
  /** All detected attribution verbs, grouped. */
  saidCount: number;
  strongTagCount: number;
  /** Top non-"said" verbs, sorted by frequency. */
  verbCounts: Array<{ verb: string; count: number; severity: Severity }>;
  /** Lines with dialogue but no detectable attribution at all. */
  unattributed: number[];
  occurrences: DialogueTagOccurrence[];
}

/**
 * Pattern matches an attribution adjacent to a closing quote, e.g.:
 *   "hello," she said.   "hello," said Tom.   "hello!" he whispered.
 * Quote chars include straight, curly, and single.
 */
const ATTRIBUTION_RE =
  /["'”’]\s*[,.!?]?\s*(?:[A-Za-z]+\s+)?([a-z]+(?:ed|s|ing)?)\b/g;

function hasDialogue(line: string): boolean {
  return /["“”]/.test(line) || /(?:^|\s)['‘][^'’]+['’]/.test(line);
}

export function analyzeDialogueTags(lines: string[]): DialogueTagAnalysis {
  const occurrences: DialogueTagOccurrence[] = [];
  const verbCounts = new Map<string, number>();
  const unattributed: number[] = [];
  let dialogueLineCount = 0;
  let saidCount = 0;
  let strongTagCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i] ?? "";
    if (!hasDialogue(text)) continue;
    dialogueLineCount += 1;

    const re = new RegExp(ATTRIBUTION_RE.source, "g");
    let found = false;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const verb = m[1]?.toLowerCase();
      if (!verb) continue;
      if (
        !NEUTRAL_TAGS.has(verb) &&
        !STRONG_SAID_SUBSTITUTES.has(verb)
      ) {
        continue;
      }
      found = true;
      verbCounts.set(verb, (verbCounts.get(verb) ?? 0) + 1);
      if (NEUTRAL_TAGS.has(verb)) saidCount += 1;
      else strongTagCount += 1;
      occurrences.push({
        line: i + 1,
        verb,
        surface: m[0]!.trim(),
        lineText: text,
      });
    }

    if (!found) unattributed.push(i + 1);
  }

  const verbList = [...verbCounts.entries()]
    .filter(([v]) => !NEUTRAL_TAGS.has(v))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([verb, count]) => ({
      verb,
      count,
      severity: (count >= 4 ? "high" : count >= 2 ? "med" : "low") as Severity,
    }));

  return {
    dialogueLineCount,
    saidCount,
    strongTagCount,
    verbCounts: verbList,
    unattributed,
    occurrences,
  };
}

// ─── POV consistency ────────────────────────────────────────────────────────

const FIRST = new Set(["i", "me", "my", "mine", "we", "us", "our", "ours", "myself", "ourselves"]);
const SECOND = new Set(["you", "your", "yours", "yourself", "yourselves"]);
const THIRD = new Set([
  "he", "him", "his", "himself",
  "she", "her", "hers", "herself",
  "they", "them", "their", "theirs", "themselves",
]);

export type Pov = "first" | "second" | "third" | "mixed" | "unknown";

export interface PovLine {
  line: number;
  first: number;
  second: number;
  third: number;
  /** POV that dominates the line; "none" if no markers at all. */
  dominant: Pov | "none";
}

export interface PovAnalysis {
  totals: { first: number; second: number; third: number };
  /** Document-level POV. "mixed" if no POV holds >70% share. */
  dominant: Pov;
  /** Lines whose dominant POV conflicts with the document's. */
  conflicts: PovLine[];
  perLine: PovLine[];
}

export function analyzePov(lines: string[]): PovAnalysis {
  const perLine: PovLine[] = [];
  let totalFirst = 0;
  let totalSecond = 0;
  let totalThird = 0;

  for (let i = 0; i < lines.length; i++) {
    let f = 0;
    let s = 0;
    let t = 0;
    for (const w of wordsInLine(lines[i] ?? "")) {
      const n = normalizeWordToken(w);
      if (FIRST.has(n)) f += 1;
      else if (SECOND.has(n)) s += 1;
      else if (THIRD.has(n)) t += 1;
    }
    totalFirst += f;
    totalSecond += s;
    totalThird += t;
    const max = Math.max(f, s, t);
    let dominant: PovLine["dominant"] = "none";
    if (max > 0) {
      if (f === max) dominant = "first";
      else if (s === max) dominant = "second";
      else dominant = "third";
    }
    perLine.push({ line: i + 1, first: f, second: s, third: t, dominant });
  }

  const total = totalFirst + totalSecond + totalThird;
  let docDominant: Pov = "unknown";
  if (total === 0) {
    docDominant = "unknown";
  } else {
    const ratios = {
      first: totalFirst / total,
      second: totalSecond / total,
      third: totalThird / total,
    };
    const best = Math.max(ratios.first, ratios.second, ratios.third);
    if (best < 0.7) docDominant = "mixed";
    else if (ratios.first === best) docDominant = "first";
    else if (ratios.second === best) docDominant = "second";
    else docDominant = "third";
  }

  const conflicts: PovLine[] = [];
  if (docDominant !== "mixed" && docDominant !== "unknown") {
    for (const pl of perLine) {
      if (pl.dominant === "none") continue;
      if (pl.dominant !== docDominant) conflicts.push(pl);
    }
  }

  return {
    totals: { first: totalFirst, second: totalSecond, third: totalThird },
    dominant: docDominant,
    conflicts,
    perLine,
  };
}

// ─── Tense consistency ──────────────────────────────────────────────────────

const PAST_MARKERS = new Set([
  "was", "were", "had", "did", "said", "went", "came", "took", "gave",
  "made", "saw", "thought", "knew", "got", "found", "told", "felt", "left",
  "kept", "held", "stood", "ran", "sat", "looked", "walked", "turned",
  "moved", "called", "asked", "tried", "began", "started", "stopped",
  "wanted", "needed", "seemed", "watched", "heard", "noticed", "wondered",
  "remembered", "decided",
]);

const PRESENT_MARKERS = new Set([
  "is", "are", "am", "has", "have", "does", "do", "says", "goes", "comes",
  "takes", "gives", "makes", "sees", "thinks", "knows", "gets", "finds",
  "tells", "feels", "leaves", "keeps", "holds", "stands", "runs", "sits",
  "looks", "walks", "turns", "moves", "calls", "asks", "tries", "begins",
  "starts", "stops", "wants", "needs", "seems", "watches", "hears",
  "notices", "wonders", "remembers", "decides",
]);

export type Tense = "past" | "present" | "mixed" | "unknown";

export interface TenseLine {
  line: number;
  past: number;
  present: number;
  dominant: Tense | "none";
}

export interface TenseAnalysis {
  totals: { past: number; present: number };
  dominant: Tense;
  conflicts: TenseLine[];
  perLine: TenseLine[];
}

function countTenseInLine(line: string): { past: number; present: number } {
  let past = 0;
  let present = 0;
  const words = wordsInLine(line);
  for (let i = 0; i < words.length; i++) {
    const raw = words[i]!;
    const n = normalizeWordToken(raw);
    if (PAST_MARKERS.has(n)) {
      past += 1;
      continue;
    }
    if (PRESENT_MARKERS.has(n)) {
      present += 1;
      continue;
    }
    // -ed suffix heuristic (only count obvious cases, skip very short stems)
    if (n.length >= 5 && n.endsWith("ed") && !n.endsWith("ied") && !n.endsWith("eed")) {
      past += 1;
    }
  }
  return { past, present };
}

export function analyzeTense(lines: string[]): TenseAnalysis {
  const perLine: TenseLine[] = [];
  let totalPast = 0;
  let totalPresent = 0;

  for (let i = 0; i < lines.length; i++) {
    const { past, present } = countTenseInLine(lines[i] ?? "");
    totalPast += past;
    totalPresent += present;
    let dominant: TenseLine["dominant"] = "none";
    if (past > 0 || present > 0) {
      dominant = past >= present ? "past" : "present";
      if (past === present && past > 0) dominant = "past";
    }
    perLine.push({ line: i + 1, past, present, dominant });
  }

  const total = totalPast + totalPresent;
  let docDominant: Tense = "unknown";
  if (total === 0) {
    docDominant = "unknown";
  } else {
    const pastRatio = totalPast / total;
    if (pastRatio >= 0.75) docDominant = "past";
    else if (pastRatio <= 0.25) docDominant = "present";
    else docDominant = "mixed";
  }

  const conflicts: TenseLine[] = [];
  if (docDominant === "past" || docDominant === "present") {
    for (const tl of perLine) {
      if (tl.dominant === "none") continue;
      // Only flag if the line has a clear majority in the other tense
      const otherCount = docDominant === "past" ? tl.present : tl.past;
      const docCount = docDominant === "past" ? tl.past : tl.present;
      if (otherCount > 0 && otherCount > docCount) conflicts.push(tl);
    }
  }

  return {
    totals: { past: totalPast, present: totalPresent },
    dominant: docDominant,
    conflicts,
    perLine,
  };
}

// ─── Show vs. tell / filter words ───────────────────────────────────────────

const FILTER_WORDS = new Set([
  "felt", "feel", "feels", "feeling",
  "knew", "know", "knows", "knowing",
  "realized", "realize", "realizes", "realizing", "realised", "realise",
  "noticed", "notice", "notices", "noticing",
  "sensed", "sense", "senses", "sensing",
  "thought", "think", "thinks", "thinking",
  "wondered", "wonder", "wonders", "wondering",
  "heard", "hear", "hears", "hearing",
  "saw", "see", "sees", "seeing",
  "watched", "watch", "watches", "watching",
  "seemed", "seem", "seems", "seeming",
  "decided", "decide", "decides", "deciding",
  "remembered", "remember", "remembers", "remembering",
  "looked", "look", "looks", "looking",
]);

export interface ShowVsTellHit {
  line: number;
  word: string;
  start: number;
  end: number;
  lineText: string;
}

export interface ShowVsTellAnalysis {
  total: number;
  hits: ShowVsTellHit[];
  byWord: Array<{ word: string; count: number }>;
}

export function analyzeShowVsTell(lines: string[]): ShowVsTellAnalysis {
  const hits: ShowVsTellHit[] = [];
  const byWord = new Map<string, number>();
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i] ?? "";
    for (const span of wordSpansInLine(text)) {
      const n = normalizeWordToken(span.raw);
      if (!FILTER_WORDS.has(n)) continue;
      hits.push({
        line: i + 1,
        word: n,
        start: span.start,
        end: span.end,
        lineText: text,
      });
      byWord.set(n, (byWord.get(n) ?? 0) + 1);
    }
  }
  const sortedByWord = [...byWord.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }));
  return { total: hits.length, hits, byWord: sortedByWord };
}

// ─── Adverbs & weasel words ─────────────────────────────────────────────────

/** Words that look adverbial (-ly) but aren't, or are common enough to ignore. */
const LY_EXCEPTIONS = new Set([
  "only", "early", "family", "fly", "july", "rely", "reply", "supply",
  "apply", "imply", "ally", "belly", "rally", "silly", "ugly", "holy",
  "lovely", "lonely", "lively", "likely", "ply", "italy", "rally",
  "assembly", "ugly", "july", "july", "anomaly",
]);

/** Vague intensifiers / fillers worth flagging. */
const WEASEL_WORDS = new Set([
  "very", "really", "just", "actually", "basically", "literally",
  "quite", "rather", "somewhat", "sort", "kind", "perhaps", "maybe",
  "probably", "obviously", "clearly", "essentially", "totally",
  "completely", "absolutely", "definitely",
]);

export interface AdverbHit {
  line: number;
  word: string;
  start: number;
  end: number;
  lineText: string;
}

export interface AdverbAnalysis {
  adverbTotal: number;
  weaselTotal: number;
  adverbHits: AdverbHit[];
  weaselHits: AdverbHit[];
  /** Top -ly adverbs by frequency. */
  topAdverbs: Array<{ word: string; count: number }>;
  /** Top weasel words by frequency. */
  topWeasels: Array<{ word: string; count: number }>;
  /** Adverb density per 100 words. */
  adverbPer100: number;
}

export function analyzeAdverbs(lines: string[]): AdverbAnalysis {
  const adverbHits: AdverbHit[] = [];
  const weaselHits: AdverbHit[] = [];
  const adverbCounts = new Map<string, number>();
  const weaselCounts = new Map<string, number>();
  let wordCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i] ?? "";
    for (const span of wordSpansInLine(text)) {
      const n = normalizeWordToken(span.raw);
      if (!n) continue;
      wordCount += 1;
      if (WEASEL_WORDS.has(n)) {
        weaselHits.push({
          line: i + 1,
          word: n,
          start: span.start,
          end: span.end,
          lineText: text,
        });
        weaselCounts.set(n, (weaselCounts.get(n) ?? 0) + 1);
        continue;
      }
      if (n.length >= 5 && n.endsWith("ly") && !LY_EXCEPTIONS.has(n)) {
        adverbHits.push({
          line: i + 1,
          word: n,
          start: span.start,
          end: span.end,
          lineText: text,
        });
        adverbCounts.set(n, (adverbCounts.get(n) ?? 0) + 1);
      }
    }
  }

  const topAdverbs = [...adverbCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => ({ word, count }));
  const topWeasels = [...weaselCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => ({ word, count }));

  return {
    adverbTotal: adverbHits.length,
    weaselTotal: weaselHits.length,
    adverbHits,
    weaselHits,
    topAdverbs,
    topWeasels,
    adverbPer100: wordCount > 0 ? (adverbHits.length * 100) / wordCount : 0,
  };
}

// ─── Character mentions ─────────────────────────────────────────────────────

/** Capitalized words that aren't proper nouns. */
const NON_CHARACTER_CAPS = new Set([
  "i", "the", "a", "an",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july",
  "august", "september", "october", "november", "december",
  "mr", "mrs", "ms", "dr",
  "god", "lord",
  "english", "french", "spanish", "german", "american", "british",
  "ok", "okay", "yes", "no",
]);

export interface CharacterMention {
  line: number;
  start: number;
  end: number;
  surface: string;
}

export interface Character {
  name: string;
  /** Most-used surface form (case preserved). */
  display: string;
  count: number;
  firstLine: number;
  lastLine: number;
  lines: number[];
  /** True if the character appears in the first 1/3 but vanishes in the final 1/3. */
  vanishes: boolean;
  mentions: CharacterMention[];
}

export interface CharacterAnalysis {
  characters: Character[];
  /** Total proper-noun mentions detected. */
  totalMentions: number;
}

export function analyzeCharacters(lines: string[]): CharacterAnalysis {
  // Pass 1: a word is a proper-noun candidate if it appears capitalized at
  // least once and never appears in lowercase. Words like "She", "The" are
  // filtered because they show up lowercase elsewhere; explicit stoplist
  // catches single-occurrence false positives like day/month names.
  const seenCapitalized = new Set<string>();
  const everLowercase = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i] ?? "";
    for (const span of wordSpansInLine(text)) {
      const surface = span.raw;
      const first = surface[0];
      if (!first) continue;
      const lower = normalizeWordToken(surface);
      if (NON_CHARACTER_CAPS.has(lower)) continue;
      const isCap = first >= "A" && first <= "Z";
      if (isCap) seenCapitalized.add(lower);
      else everLowercase.add(lower);
    }
  }
  const properCandidates = new Set<string>();
  for (const w of seenCapitalized) {
    if (!everLowercase.has(w)) properCandidates.add(w);
  }

  // Pass 2: tally occurrences of confirmed proper nouns, including those at
  // sentence starts.
  const byName = new Map<
    string,
    {
      counts: Map<string, number>;
      lines: Set<number>;
      mentions: CharacterMention[];
      firstLine: number;
      lastLine: number;
    }
  >();
  let totalMentions = 0;

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i] ?? "";
    for (const span of wordSpansInLine(text)) {
      const surface = span.raw;
      const first = surface[0];
      if (!first || first < "A" || first > "Z") continue;
      const lower = normalizeWordToken(surface);
      if (!properCandidates.has(lower)) continue;

      totalMentions += 1;
      const entry =
        byName.get(lower) ?? {
          counts: new Map<string, number>(),
          lines: new Set<number>(),
          mentions: [],
          firstLine: i + 1,
          lastLine: i + 1,
        };
      entry.counts.set(surface, (entry.counts.get(surface) ?? 0) + 1);
      entry.lines.add(i + 1);
      entry.lastLine = i + 1;
      entry.mentions.push({
        line: i + 1,
        start: span.start,
        end: span.end,
        surface,
      });
      byName.set(lower, entry);
    }
  }

  const totalLines = Math.max(1, lines.length);
  const earlyCutoff = Math.ceil(totalLines / 3);
  const lateStart = Math.ceil((2 * totalLines) / 3);

  const characters: Character[] = [];
  for (const [name, info] of byName) {
    let count = 0;
    let display = name;
    let best = 0;
    for (const [surf, c] of info.counts) {
      count += c;
      if (c > best) {
        best = c;
        display = surf;
      }
    }
    if (count < 2) continue; // require ≥ 2 mentions to be considered a character
    const sortedLines = [...info.lines].sort((a, b) => a - b);
    const appearsEarly = info.firstLine <= earlyCutoff;
    const appearsLate = info.lastLine >= lateStart;
    const vanishes = totalLines >= 6 && appearsEarly && !appearsLate;
    characters.push({
      name,
      display,
      count,
      firstLine: info.firstLine,
      lastLine: info.lastLine,
      lines: sortedLines,
      vanishes,
      mentions: info.mentions,
    });
  }

  characters.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { characters, totalMentions };
}

// ─── Bundled facade ─────────────────────────────────────────────────────────

export interface StoryCraftAnalysis {
  dialogue: DialogueTagAnalysis;
  pov: PovAnalysis;
  tense: TenseAnalysis;
  showVsTell: ShowVsTellAnalysis;
  adverbs: AdverbAnalysis;
  characters: CharacterAnalysis;
}

export const EMPTY_STORY_CRAFT: StoryCraftAnalysis = {
  dialogue: {
    dialogueLineCount: 0,
    saidCount: 0,
    strongTagCount: 0,
    verbCounts: [],
    unattributed: [],
    occurrences: [],
  },
  pov: {
    totals: { first: 0, second: 0, third: 0 },
    dominant: "unknown",
    conflicts: [],
    perLine: [],
  },
  tense: {
    totals: { past: 0, present: 0 },
    dominant: "unknown",
    conflicts: [],
    perLine: [],
  },
  showVsTell: { total: 0, hits: [], byWord: [] },
  adverbs: {
    adverbTotal: 0,
    weaselTotal: 0,
    adverbHits: [],
    weaselHits: [],
    topAdverbs: [],
    topWeasels: [],
    adverbPer100: 0,
  },
  characters: { characters: [], totalMentions: 0 },
};

export function analyzeStoryCraft(lines: string[]): StoryCraftAnalysis {
  return {
    dialogue: analyzeDialogueTags(lines),
    pov: analyzePov(lines),
    tense: analyzeTense(lines),
    showVsTell: analyzeShowVsTell(lines),
    adverbs: analyzeAdverbs(lines),
    characters: analyzeCharacters(lines),
  };
}
