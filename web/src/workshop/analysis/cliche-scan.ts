export interface ClicheHit {
  phrase: string;
  lineNumber: number; // 1-based
  lineText: string;
}

/**
 * Common poetic/literary clichés to flag.
 * Lowercase; matched case-insensitively against poem lines.
 */
const CLICHES: string[] = [
  // Nature / time
  "like the wind",
  "stands the test of time",
  "the sands of time",
  "time flies",
  "time heals all wounds",
  "the passage of time",
  "as old as time",
  "the dawn of a new day",
  "a new day dawns",
  "rays of sunshine",
  "the light at the end of the tunnel",
  "in the blink of an eye",
  // Emotions
  "heart of gold",
  "wear your heart on your sleeve",
  "break my heart",
  "broken heart",
  "from the bottom of my heart",
  "heart and soul",
  "with all my heart",
  "tears of joy",
  "tears rolled down",
  "butterflies in my stomach",
  "a shoulder to cry on",
  "in the depths of despair",
  "storm of emotions",
  // Journeys / life
  "life is a journey",
  "life is short",
  "roads less traveled",
  "the road not taken",
  "at a crossroads",
  "new chapter",
  "at the end of the day",
  "when all is said and done",
  "the bottom line",
  "only time will tell",
  // Descriptions
  "crystal clear",
  "diamond in the rough",
  "silver lining",
  "needle in a haystack",
  "piece of cake",
  "the calm before the storm",
  "a perfect storm",
  "larger than life",
  "cold as ice",
  "white as snow",
  "black as night",
  "quiet as a mouse",
  "smooth as silk",
  "burning desire",
  "fiery passion",
  "like a river",
  "eyes like stars",
  "hair like silk",
  "lips like roses",
  "gentle as a breeze",
  // Overused openers / closers
  "in a world where",
  "once upon a time",
  "happily ever after",
  "be yourself",
  "follow your dreams",
  "reach for the stars",
  "the sky is the limit",
  "make a difference",
  "change the world",
];

/** Cached pre-processed cliché list. */
let compiled: { phrase: string; re: RegExp }[] | null = null;

function getCompiled() {
  if (!compiled) {
    compiled = CLICHES.map((phrase) => ({
      phrase,
      re: new RegExp(`\\b${phrase.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}\\b`, "i"),
    }));
  }
  return compiled;
}

export function scanCliches(lines: string[]): ClicheHit[] {
  const patterns = getCompiled();
  const hits: ClicheHit[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i]!;
    if (!lineText.trim()) continue;
    for (const { phrase, re } of patterns) {
      if (re.test(lineText)) {
        hits.push({ phrase, lineNumber: i + 1, lineText });
      }
    }
  }
  return hits;
}
