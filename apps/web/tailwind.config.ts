import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7fb",
          100: "#e9ecf5",
          200: "#cdd3e6",
          800: "#1f2440",
          900: "#0e1230",
          950: "#080b22",
        },
        accent: {
          400: "#7aa2ff",
          500: "#5e7dff",
          600: "#4862e6",
        },
        good: "#3ec47a",
        warn: "#ffb547",
        bad: "#ef5b5b",
      },
      fontFamily: {
        display: ["ui-sans-serif", "system-ui", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        soft: "0 2px 14px -2px rgba(8, 11, 34, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
