/** @type {import('tailwindcss').Config} */
module.exports = {
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
      colors: {
        primary: "#1a1f35",
        accent: "#f97316",
        "accent-blue": "#3b82f6",
        success: "#22c55e",
        danger: "#ef4444",
        warning: "#f59e0b",
        bg: "#f8fafc",
        card: "#ffffff",
        text: "#1e293b",
        "text-muted": "#64748b",
        border: "#e2e8f0"
      }
    }
  },
  plugins: []
};
