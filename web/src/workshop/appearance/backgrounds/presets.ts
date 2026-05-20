export const BACKGROUND_OPTIONS = [
  { id: "dark",       label: "Dark",         blurb: "Flat charcoal workspace with slow ambient colour drift.",         glyph: "■"  },
  { id: "nebula",     label: "Nebula",       blurb: "Deep space dust clouds, slow hue drift, pinprick stars.",         glyph: "✦"  },
  { id: "tidepool",   label: "Tide pool",    blurb: "Shallow water over stone, caustic ripples, pebble glints.",       glyph: "≋"  },
  { id: "kiln",       label: "Copper kiln",  blurb: "Heated metal glow, ember sparks, umber haze.",                    glyph: "◉"  },
  { id: "glasshouse", label: "Glasshouse",   blurb: "Refracted prism light through cool grey panels.",                 glyph: "◇"  },
  { id: "velvet",     label: "Velvet hour",  blurb: "Plum-to-violet dusk wash with soft bokeh and gold motes.",        glyph: "❂"  },
  { id: "riverstone", label: "Riverstone",   blurb: "Wet slate, mineral veining, slow surface shimmer.",               glyph: "⌬"  },
  { id: "linen",      label: "Linen",        blurb: "Woven cream textile, soft sheen, warm tactile weave.",            glyph: "▦"  },
  { id: "apricotfog", label: "Apricot fog",  blurb: "Peach mist over deep teal, drifting fog bands.",                  glyph: "❀"  },
  { id: "inkwell",    label: "Inkwell",      blurb: "Sumi-e ink bleeds across warm cream paper, vermilion seal.",      glyph: "✒"  },
  { id: "custom",     label: "Custom",       blurb: "Your generated backdrop.",                                        glyph: "✦"  },
] as const;

export type BackgroundId = (typeof BACKGROUND_OPTIONS)[number]["id"];

/** CSS variable values for a user-generated custom backdrop. */
export interface CustomBackgroundTheme {
  colorScheme: "light" | "dark";
  label: string;
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  ambientA: string;
  ambientB: string;
  ambientC: string;
  ambientD: string;
  shineTop: string;
  shineMid: string;
  netLine: string;
}

/** Curated backgrounds shown at random to first-time visitors. */
export const RANDOM_FIRST_VISIT_BACKGROUNDS: BackgroundId[] = [
  "nebula", "tidepool", "kiln", "glasshouse", "velvet",
  "riverstone", "linen", "apricotfog", "inkwell",
];

export function pickRandomFirstVisitBackground(): BackgroundId {
  const idx = Math.floor(Math.random() * RANDOM_FIRST_VISIT_BACKGROUNDS.length);
  return RANDOM_FIRST_VISIT_BACKGROUNDS[idx]!;
}
