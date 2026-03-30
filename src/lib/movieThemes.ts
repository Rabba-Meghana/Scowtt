/**
 * movieThemes.ts
 *
 * Each theme is defined by ONE poster gradient (3 stops).
 * ALL other UI colors are algorithmically derived from those stops — nothing else is hardcoded.
 *
 * Poster stops:  [deep-shadow, mid-tone, accent-highlight]
 * From these we derive: bg1, bg2, card, accent, glow, text, muted, border
 */

export interface MovieTheme {
  // Poster colors (source of truth)
  poster: [string, string, string];
  // Derived UI tokens
  bg1:    string;
  bg2:    string;
  accent: string;
  glow:   string;
  text:   string;
  muted:  string;
  border: string;
  card:   string;
  label:  string;
}

/**
 * Build a full theme from 3 poster color stops.
 * p0 = darkest shadow, p1 = mid tone, p2 = accent/highlight
 */
function makeTheme(p0: string, p1: string, p2: string, label: string): MovieTheme {
  return {
    poster: [p0, p1, p2],
    bg1:    p0,                                     // page background = darkest poster stop
    bg2:    p1,                                     // secondary bg = mid poster stop
    accent: p2,                                     // accent = highlight poster stop
    glow:   hexToRgba(p2, 0.24),                    // glow = accent at 24% opacity
    text:   "#F0EAE0",                              // always near-white — readable on any dark bg
    muted:  blendHex(p2, "#606060", 0.3),           // muted = 30% accent + 70% grey
    border: hexToRgba(p2, 0.18),                    // border = accent at 18% opacity
    card:   hexToRgba(blendHex(p0, p1, 0.4), 0.78),// card = blend of bg stops at 78% opacity
    label,
  };
}

/** Blend two hex colors. t=0 → a, t=1 → b */
function blendHex(a: string, b: string, t: number): string {
  const [ar,ag,ab] = hexToRgb(a);
  const [br,bg,bb] = hexToRgb(b);
  return rgbToHex(
    Math.round(ar + (br - ar) * t),
    Math.round(ag + (bg - ag) * t),
    Math.round(ab + (bb - ab) * t),
  );
}

function hexToRgb(hex: string): [number,number,number] {
  const h = hex.replace("#","");
  const n = parseInt(h.length === 3
    ? h.split("").map(c => c+c).join("")
    : h, 16);
  return [(n>>16)&255, (n>>8)&255, n&255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r,g,b].map(v => v.toString(16).padStart(2,"0")).join("");
}

function hexToRgba(hex: string, a: number): string {
  const [r,g,b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Theme definitions ────────────────────────────────────────────────────────
// Each entry: makeTheme(darkest-shadow, mid-tone, highlight-accent, label)

const THEMES: Record<string, MovieTheme> = {
  // Gold / prestige drama
  drama:     makeTheme("#080502", "#1C0E03", "#C9940C", "Drama"),
  // Sandy desert amber — Dune, Lawrence of Arabia
  desert:    makeTheme("#090601", "#1E0F03", "#D4820A", "Desert Epic"),
  // Deep crimson — thrillers, horrors
  thriller:  makeTheme("#060103", "#180308", "#C02040", "Thriller"),
  // Electric blue — sci-fi
  scifi:     makeTheme("#010408", "#03101E", "#1A8FE3", "Sci-Fi"),
  // Emerald — adventure, jungle
  adventure: makeTheme("#010502", "#03120A", "#16A35A", "Adventure"),
  // Deep violet — fantasy, magic
  fantasy:   makeTheme("#030108", "#0A0318", "#8B2FD0", "Fantasy"),
  // Warm terracotta — romance, comedy
  romance:   makeTheme("#070302", "#180B04", "#D45A20", "Romance"),
  // Steel blue-grey — noir, crime
  noir:      makeTheme("#020304", "#060A10", "#4A7A9B", "Noir"),
  // Teal — mystery, underwater
  mystery:   makeTheme("#010506", "#031216", "#0EA8A8", "Mystery"),
  // Warm sepia — western, historical
  western:   makeTheme("#080402", "#1C0E04", "#B87040", "Western"),
};

// ── Keyword → theme key ──────────────────────────────────────────────────────
const KEYWORD_MAP: [string, keyof typeof THEMES][] = [
  // Desert / epic
  ["dune",              "desert"],
  ["arrakis",           "desert"],
  ["lawrence of arabia","desert"],
  ["mad max",           "desert"],
  // Sci-fi
  ["matrix",            "scifi"],
  ["interstellar",      "scifi"],
  ["inception",         "scifi"],
  ["arrival",           "scifi"],
  ["star wars",         "scifi"],
  ["gravity",           "scifi"],
  ["her ",              "scifi"],
  ["ex machina",        "scifi"],
  ["2001",              "scifi"],
  ["alien",             "scifi"],
  // Thriller / horror
  ["dark knight",       "thriller"],
  ["joker",             "thriller"],
  ["silence of the lambs","thriller"],
  ["psycho",            "thriller"],
  ["shining",           "thriller"],
  ["halloween",         "thriller"],
  ["parasite",          "thriller"],
  ["no country",        "thriller"],
  ["seven",             "thriller"],
  ["se7en",             "thriller"],
  ["hereditary",        "thriller"],
  ["midsommar",         "thriller"],
  // Fantasy
  ["lord of the rings", "fantasy"],
  ["hobbit",            "fantasy"],
  ["harry potter",      "fantasy"],
  ["narnia",            "fantasy"],
  ["wizard of oz",      "fantasy"],
  ["pan's labyrinth",   "fantasy"],
  // Adventure
  ["indiana jones",     "adventure"],
  ["jurassic",          "adventure"],
  ["avengers",          "adventure"],
  ["wonder woman",      "adventure"],
  ["gladiator",         "adventure"],
  // Noir / crime
  ["godfather",         "noir"],
  ["pulp fiction",      "noir"],
  ["blade runner",      "noir"],
  ["chinatown",         "noir"],
  ["fargo",             "noir"],
  ["fight club",        "noir"],
  ["goodfellas",        "noir"],
  ["taxi driver",       "noir"],
  // Romance / drama
  ["shawshank",         "drama"],
  ["schindler",         "drama"],
  ["forrest gump",      "drama"],
  ["green mile",        "drama"],
  ["titanic",           "romance"],
  ["la la land",        "romance"],
  ["notebook",          "romance"],
  ["pride and prejudice","romance"],
  ["devil wears prada", "romance"],
  ["mamma mia",         "romance"],
  ["bridgerton",        "romance"],
  ["crazy rich",        "romance"],
  ["about time",        "romance"],
  // Western
  ["django",            "western"],
  ["unforgiven",        "western"],
  ["tombstone",         "western"],
  ["true grit",         "western"],
  // Mystery
  ["knives out",        "mystery"],
  ["gone girl",         "mystery"],
  ["vertigo",           "mystery"],
];

export function getMovieTheme(movieTitle: string): MovieTheme {
  if (!movieTitle) return THEMES.drama;
  const lower = movieTitle.toLowerCase();
  for (const [keyword, key] of KEYWORD_MAP) {
    if (lower.includes(keyword)) return THEMES[key];
  }
  return THEMES.drama;
}
