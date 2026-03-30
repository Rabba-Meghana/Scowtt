export interface MovieTheme {
  bg1:    string;
  bg2:    string;
  accent: string;
  glow:   string;
  text:   string;
  muted:  string;
  border: string;
  card:   string;
  label:  string;
  poster: string[]; // 3 colors for poster gradient
}

const THEMES: Record<string, MovieTheme> = {
  drama: {
    bg1: "#070503", bg2: "#0D0A04", accent: "#C9940C",
    glow: "rgba(201,148,12,0.22)", text: "#F0E6CC", muted: "#7A6535",
    border: "rgba(201,148,12,0.18)", card: "rgba(14,10,4,0.78)", label: "Drama",
    poster: ["#2A1A04","#6B3A08","#C9940C"],
  },
  thriller: {
    bg1: "#060204", bg2: "#0E040A", accent: "#C0244A",
    glow: "rgba(192,36,74,0.25)", text: "#F0D8DC", muted: "#7A3045",
    border: "rgba(192,36,74,0.2)", card: "rgba(12,4,8,0.8)", label: "Thriller",
    poster: ["#1A0208","#5A0818","#C0244A"],
  },
  scifi: {
    bg1: "#020508", bg2: "#040A14", accent: "#1A8FE3",
    glow: "rgba(26,143,227,0.25)", text: "#D0E8F8", muted: "#305870",
    border: "rgba(26,143,227,0.2)", card: "rgba(4,10,18,0.8)", label: "Sci-Fi",
    poster: ["#020A18","#083060","#1A8FE3"],
  },
  adventure: {
    bg1: "#020604", bg2: "#040E06", accent: "#16A35A",
    glow: "rgba(22,163,90,0.22)", text: "#D0F0DC", muted: "#306045",
    border: "rgba(22,163,90,0.18)", card: "rgba(4,12,6,0.8)", label: "Adventure",
    poster: ["#021006","#085028","#16A35A"],
  },
  fantasy: {
    bg1: "#040208", bg2: "#080412", accent: "#8B2FD0",
    glow: "rgba(139,47,208,0.25)", text: "#E8D0F8", muted: "#5A3070",
    border: "rgba(139,47,208,0.2)", card: "rgba(8,4,14,0.8)", label: "Fantasy",
    poster: ["#0A0418","#300858","#8B2FD0"],
  },
  romance: {
    bg1: "#070402", bg2: "#0E0804", accent: "#E06020",
    glow: "rgba(224,96,32,0.22)", text: "#F8E0CC", muted: "#7A4820",
    border: "rgba(224,96,32,0.18)", card: "rgba(14,8,4,0.8)", label: "Romance",
    poster: ["#180804","#602010","#E06020"],
  },
  noir: {
    bg1: "#030406", bg2: "#06080E", accent: "#4A7A9B",
    glow: "rgba(74,122,155,0.22)", text: "#C8D8E8", muted: "#405870",
    border: "rgba(74,122,155,0.18)", card: "rgba(6,8,14,0.8)", label: "Noir",
    poster: ["#04080E","#102030","#4A7A9B"],
  },
  // DUNE — sandy desert gold/amber
  desert: {
    bg1: "#080501", bg2: "#120A02", accent: "#D4820A",
    glow: "rgba(212,130,10,0.28)", text: "#F5DFA8", muted: "#8A6020",
    border: "rgba(212,130,10,0.2)", card: "rgba(16,10,2,0.82)", label: "Desert Epic",
    poster: ["#180C02","#6B3A04","#D4820A"],
  },
};

const KEYWORD_MAP: Record<string, keyof typeof THEMES> = {
  "dune": "desert", "arrakis": "desert", "spice": "desert",
  "silence": "thriller", "lambs": "thriller", "psycho": "thriller",
  "shining": "thriller", "halloween": "thriller",
  "parasite": "thriller", "joker": "thriller", "dark knight": "thriller",
  "no country": "thriller", "seven": "noir", "se7en": "noir",
  "matrix": "scifi", "interstellar": "scifi", "arrival": "scifi",
  "inception": "scifi", "blade runner": "noir", "2001": "scifi",
  "star wars": "scifi", "gravity": "scifi",
  "her": "scifi", "ex machina": "scifi",
  "indiana": "adventure", "jurassic": "adventure",
  "avengers": "adventure", "mad max": "adventure",
  "lord of the rings": "fantasy", "hobbit": "fantasy",
  "harry potter": "fantasy", "narnia": "fantasy",
  "harry": "fantasy", "wizard": "fantasy",
  "shawshank": "drama", "godfather": "noir",
  "schindler": "drama", "forrest gump": "drama",
  "titanic": "romance", "la la land": "romance",
  "notebook": "romance", "pride and prejudice": "romance",
  "devil wears prada": "drama", "mamma mia": "romance",
  "bridgerton": "romance", "crazy rich": "romance",
  "about time": "romance",
  "pulp fiction": "noir", "fight club": "noir",
  "goodfellas": "noir", "taxi driver": "noir",
  "chinatown": "noir", "fargo": "noir",
  "alien": "scifi",
};

export function getMovieTheme(movieTitle: string): MovieTheme {
  if (!movieTitle) return THEMES.drama;
  const lower = movieTitle.toLowerCase();
  for (const [keyword, themeKey] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) return THEMES[themeKey];
  }
  return THEMES.drama;
}

export const POSTER_COLORS = [
  ["#1a0a02","#5a2008"],["#020818","#083060"],["#060208","#28088a"],
  ["#020a04","#085028"],["#0a0404","#500808"],["#060402","#382008"],
];
