import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cay: {
          red: "#C40707",
          black: "#111111",
          ink: "#212529",
          paper: "#F1F1F1",
          sand: "#EBDBCA",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
