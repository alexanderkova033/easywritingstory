export const BACKGROUND_OPTIONS = [
  { id: "dark",       label: "Dark",          blurb: "Flat charcoal workspace with slow ambient colour drift.",                glyph: "■"  },
  { id: "nebula",     label: "Galactic arch", blurb: "Milky Way overhead, a planet's crescent rim along the horizon.",         glyph: "✦"  },
  { id: "glasshouse", label: "Glasshouse",    blurb: "Refracted prism light through cool grey panels, etched glass crescent.", glyph: "◇"  },
  { id: "velvet",     label: "Velvet hour",   blurb: "Plum-to-violet dusk, soft bokeh, a warm gold crescent overhead.",        glyph: "❂"  },
  { id: "linen",      label: "Linen",         blurb: "Woven cream textile with a soft tonal crescent stitched in.",            glyph: "▦"  },
  { id: "apricotfog", label: "Apricot fog",   blurb: "Peach mist over deep teal, a setting crescent low through the haze.",    glyph: "❀"  },
  { id: "inkwell",    label: "Inkwell",       blurb: "Sumi-e crescent brushed across warm cream paper with a vermilion seal.", glyph: "✒"  },
  { id: "custom",     label: "Custom",        blurb: "Your generated backdrop.",                                               glyph: "✦"  },
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
  "nebula", "glasshouse", "velvet", "linen", "apricotfog", "inkwell",
];

export function pickRandomFirstVisitBackground(): BackgroundId {
  const idx = Math.floor(Math.random() * RANDOM_FIRST_VISIT_BACKGROUNDS.length);
  return RANDOM_FIRST_VISIT_BACKGROUNDS[idx]!;
}
