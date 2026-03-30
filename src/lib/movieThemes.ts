/**
 * movieThemes.ts
 * Maps movie keywords → cinematic color themes + TMDB poster URLs
 * The theme changes the entire page accent color and glow
 */

export interface MovieTheme {
  bg1:    string;   // deepest background
  bg2:    string;   // secondary background
  accent: string;   // main accent color
  glow:   string;   // rgba glow
  text:   string;   // primary text
  muted:  string;   // muted text
  border: string;   // border rgba
  card:   string;   // glass card bg
  label:  string;   // genre label
}

const THEMES: Record<string, MovieTheme> = {
  // Warm gold / drama
  drama: {
    bg1: "#070503", bg2: "#0D0A04", accent: "#C9940C",
    glow: "rgba(201,148,12,0.2)", text: "#F0E6CC", muted: "#7A6535",
    border: "rgba(201,148,12,0.18)", card: "rgba(14,10,4,0.78)", label: "Drama"
  },
  // Deep red / thriller / horror
  thriller: {
    bg1: "#060204", bg2: "#0E040A", accent: "#C0244A",
    glow: "rgba(192,36,74,0.22)", text: "#F0D8DC", muted: "#7A3045",
    border: "rgba(192,36,74,0.2)", card: "rgba(12,4,8,0.8)", label: "Thriller"
  },
  // Electric blue / sci-fi
  scifi: {
    bg1: "#020508", bg2: "#040A14", accent: "#1A8FE3",
    glow: "rgba(26,143,227,0.22)", text: "#D0E8F8", muted: "#305870",
    border: "rgba(26,143,227,0.2)", card: "rgba(4,10,18,0.8)", label: "Sci-Fi"
  },
  // Emerald / adventure / nature
  adventure: {
    bg1: "#020604", bg2: "#040E06", accent: "#16A35A",
    glow: "rgba(22,163,90,0.2)", text: "#D0F0DC", muted: "#306045",
    border: "rgba(22,163,90,0.18)", card: "rgba(4,12,6,0.8)", label: "Adventure"
  },
  // Purple / fantasy / magic
  fantasy: {
    bg1: "#040208", bg2: "#080412", accent: "#8B2FD0",
    glow: "rgba(139,47,208,0.22)", text: "#E8D0F8", muted: "#5A3070",
    border: "rgba(139,47,208,0.2)", card: "rgba(8,4,14,0.8)", label: "Fantasy"
  },
  // Warm orange / comedy / romance
  romance: {
    bg1: "#070402", bg2: "#0E0804", accent: "#E06020",
    glow: "rgba(224,96,32,0.2)", text: "#F8E0CC", muted: "#7A4820",
    border: "rgba(224,96,32,0.18)", card: "rgba(14,8,4,0.8)", label: "Romance"
  },
  // Steel blue / crime / noir
  noir: {
    bg1: "#030406", bg2: "#06080E", accent: "#4A7A9B",
    glow: "rgba(74,122,155,0.2)", text: "#C8D8E8", muted: "#405870",
    border: "rgba(74,122,155,0.18)", card: "rgba(6,8,14,0.8)", label: "Noir"
  },
};

// Keyword → theme key
const KEYWORD_MAP: Record<string, keyof typeof THEMES> = {
  // Thriller / horror
  "silence": "thriller", "lambs": "thriller", "psycho": "thriller",
  "shining": "thriller", "alien": "scifi", "halloween": "thriller",
  "parasite": "thriller", "joker": "thriller", "dark knight": "thriller",
  "no country": "thriller", "seven": "noir", "se7en": "noir",
  // Sci-fi
  "matrix": "scifi", "interstellar": "scifi", "arrival": "scifi",
  "inception": "scifi", "blade runner": "noir", "2001": "scifi",
  "star wars": "scifi", "gravity": "scifi", "dune": "scifi",
  "her": "scifi", "ex machina": "scifi",
  // Adventure / action
  "indiana": "adventure", "lord of the rings": "fantasy",
  "hobbit": "fantasy", "jurassic": "adventure", "avengers": "adventure",
  "wonder woman": "adventure", "mad max": "adventure",
  // Fantasy
  "harry potter": "fantasy", "narnia": "fantasy", "pan's labyrinth": "fantasy",
  "princess bride": "fantasy", "wizard of oz": "fantasy",
  // Romance / drama
  "shawshank": "drama", "godfather": "noir", "schindler": "drama",
  "forrest gump": "drama", "titanic": "romance", "la la land": "romance",
  "notebook": "romance", "pride and prejudice": "romance",
  "devil wears prada": "drama", "mamma mia": "romance",
  "bridesmaids": "romance", "bridgerton": "romance",
  "crazy rich": "romance", "about time": "romance",
  // Noir / crime
  "pulp fiction": "noir", "fight club": "noir", "goodfellas": "noir",
  "taxi driver": "noir", "chinatown": "noir", "fargo": "noir",
  // Comedy
  "home alone": "romance", "elf": "romance", "ferris": "romance",
};

export function getMovieTheme(movieTitle: string): MovieTheme {
  if (!movieTitle) return THEMES.drama;
  const lower = movieTitle.toLowerCase();
  for (const [keyword, themeKey] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) return THEMES[themeKey];
  }
  return THEMES.drama; // default gold
}

// Cinematic movie poster placeholder tiles for the scrolling background
// Using gradient placeholders that look like movie posters
export const POSTER_FILMS = [
  "The Godfather", "Pulp Fiction", "Inception", "Interstellar",
  "The Dark Knight", "Schindler's List", "The Matrix",
  "Goodfellas", "Fight Club", "Parasite", "Dune",
  "Blade Runner", "2001: A Space Odyssey", "La La Land",
  "The Silence of the Lambs", "No Country for Old Men",
  "There Will Be Blood", "Mulholland Drive", "Arrival",
  "Mad Max: Fury Road", "Her", "The Grand Budapest Hotel",
];

export const POSTER_COLORS = [
  ["#1a0a02","#5a2008"], ["#020818","#083060"], ["#060208","#28088a"],
  ["#020a04","#085028"], ["#0a0404","#500808"], ["#060402","#382008"],
  ["#020408","#083050"], ["#080204","#480820"], ["#040208","#200848"],
  ["#060802","#285018"], ["#0a0602","#503010"], ["#020608","#083848"],
];
