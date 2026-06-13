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
      colors: {
        primary: "#1a1f35",
        "md-primary": "#ffb68b",
        "primary-container": "#ff7a00",
        "on-primary": "#522300",
        "on-primary-container": "#5c2800",
        secondary: "#c4c5dd",
        "secondary-container": "#46485c",
        "on-secondary-container": "#b6b6cf",
        tertiary: "#c1c4e7",
        background: "#0c0f10",
        "on-background": "#e1e3e3",
        surface: "#121415",
        "on-surface": "#e1e3e3",
        "on-surface-variant": "#a8acac",
        "surface-variant": "#41484a",
        "surface-container-lowest": "#0c0f10",
        "surface-container-low": "#191c1d",
        "surface-container": "#1d2021",
        "surface-container-high": "#282a2b",
        "surface-container-highest": "#323536",
        "outline-variant": "#584235",
        error: "#ffb4ab",
        "error-container": "#93000a",
        "on-error-container": "#ffdad6",
        accent: "#f97316",
        "accent-blue": "#3b82f6",
        success: "#22c55e",
        danger: "#ef4444",
        warning: "#f59e0b",
        bg: "#f8fafc",
        card: "#ffffff",
        text: "#1e293b",
        "text-muted": "#64748b",
        border: "#e2e8f0",
        "landing-navy": "#0a1220",
        "landing-navy2": "#0f1a2e",
        "landing-orange": "#f5721a",
        "landing-navy-card": "#0f1a2e",
        "landing-surface": "#0a1220",
        "landing-white": "#ffffff",
        "landing-cream": "#f4f6fa",
        "landing-ink": "#0a1220",
        "landing-ink-muted": "#434f63",
        "landing-ink-subtle": "#5c6a7e",
        "landing-on-dark": "#ffffff",
        "landing-on-dark-muted": "rgba(255,255,255,0.82)",
        "landing-on-dark-subtle": "rgba(255,255,255,0.68)",
        "peak-black": "#0c0f10",
        "peak-orange": "#ff7a00",
        "auth-on-surface": "#e1e3e3",
        "auth-on-surface-variant": "#a8acac",
        "auth-surface-lowest": "#0c0f10",
        "auth-surface-low": "#191c1d",
        "auth-surface-high": "#282a2b",
        "auth-surface-highest": "#323536",
        "auth-surface-bright": "#3d4143",
        "auth-outline-variant": "#584235",
        "auth-primary": "#ffb68b",
        "auth-primary-container": "#ff7a00",
        "auth-on-primary-container": "#5c2800",
        "surface-dim": "#141718",
        muted: "#282a2b",
        destructive: "#ef4444"
      },
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
