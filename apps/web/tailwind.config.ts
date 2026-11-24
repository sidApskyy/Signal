import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#080D1B",
        deep: "#0B1220",
        surface: "#121E35",
        surface2: "#16233E",
        electric: "#3B82F6",
        cyan2: "#60A5FA",
        lime: "#B8FF3C",
        ink: "#E5E7EB",
        muted: "#94A3B8",
        line: "#1E2D4D",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: { card: "10px" },
    },
  },
  plugins: [],
} satisfies Config;
