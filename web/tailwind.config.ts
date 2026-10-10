import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0B0907", // warm black
        coal: "#15110D", // raised night
        smoke: "#2A231C", // night hairline
        paper: "#F3EBDD", // warm cream
        sand: "#E6DAC6", // raised paper / paper hairline
        ink: "#1A1410", // text on paper
        ivory: "#F4EDE1", // text on night
        mute: "#9C9182", // secondary text, both
        saffron: "#F0A33A", // the model, the accent
        ember: "#D9622B", // rare second accent (hover, wrong notes)
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        deva: ["var(--font-deva)", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      transitionTimingFunction: { out: "cubic-bezier(.16,1,.3,1)" },
    },
  },
} satisfies Config;
