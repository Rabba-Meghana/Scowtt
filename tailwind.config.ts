import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  "#FFFDF7",
          100: "#FDF6E8",
          200: "#FDF3DC",
          300: "#EDD99A",
          400: "#D4A82A",
          500: "#C8920A",
          600: "#B07D2E",
          700: "#9A6B1A",
          800: "#8B6210",
          900: "#6B4A10",
        },
        dark: {
          bg:      "#1A1508",
          surface: "#221A06",
          card:    "#2A1F08",
          border:  "#4A3A12",
          hover:   "#332808",
        },
        cream: {
          50:  "#FFFDF7",
          100: "#FDF6E8",
          200: "#F5ECD8",
          border: "#E8D9B0",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans:    ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
      animation: {
        "fade-in":    "fadeIn 0.4s ease-out forwards",
        "slide-up":   "slideUp 0.4s ease-out forwards",
        "shimmer":    "shimmer 1.6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%, 100%": { opacity: "0.5" },
          "50%":      { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
