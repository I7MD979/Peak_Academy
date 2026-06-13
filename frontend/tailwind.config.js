import { tailwindColors } from "./lib/design-tokens.js";

/** @type {import('tailwindcss').Config} */
const tailwindConfig = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
    "./hooks/**/*.{js,jsx}",
    "./store/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ["Cairo", "sans-serif"]
      },
      colors: tailwindColors,
      keyframes: {
        "peak-loader-glow": {
          "0%, 100%": { opacity: "0.35", transform: "scale(0.92)" },
          "50%": { opacity: "0.75", transform: "scale(1.08)" }
        }
      },
      animation: {
        "peak-loader-glow": "peak-loader-glow 2s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default tailwindConfig;
