import type { Config } from "tailwindcss";

// The pothi palette: paper, one blue-black ink, two reds, and gold for hairlines only.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // paper family
        paper: "#F1E6CF", // wasli
        paper2: "#E8D8BA", // deeper paper for bands
        leaf: "#F8F0DF", // lighter leaf, for cards
        rule: "#CDB690", // hairlines on paper
        // ink family: one black, infused with blue
        kajal: "#131A2B", // ink and the night
        kajal2: "#1F2840", // the night's lighter edge
        sepia: "#4A5166", // secondary ink
        // reds
        sindoor: "#B23A22", // deep vermilion: accent, rubrics, buttons
        gulal: "#D9705A", // light red: the model's voice, highlights
        // ornament only
        sona: "#A8853C", // gold-leaf hairlines
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        // small UI text is set in the book serif too: no modern sans on the page
        sans: ["var(--font-serif)", "Georgia", "serif"],
        ui: ["var(--font-sans)", "system-ui", "sans-serif"],
        deva: ["var(--font-display)", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      transitionTimingFunction: { out: "cubic-bezier(.16,1,.3,1)" },
    },
  },
} satisfies Config;
