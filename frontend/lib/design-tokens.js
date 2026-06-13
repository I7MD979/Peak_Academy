/** Peak Academy design tokens — single source of truth for colors and icon metrics. */

export const peakOrange = "#ff7a00";
export const peakBlack = "#0c0f10";
export const landingNavy = "#0a1220";
export const landingNavy2 = "#0f1a2e";

export const semantic = {
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f59e0b",
  accentBlue: "#3b82f6"
};

export const chart = {
  orange: peakOrange,
  blue: semantic.accentBlue,
  green: semantic.success,
  purple: "#8b5cf6",
  pink: "#ec4899"
};

export const md3 = {
  primary: "#1a1f35",
  mdPrimary: "#ffb68b",
  primaryContainer: peakOrange,
  onPrimaryContainer: "#5c2800",
  background: peakBlack,
  onBackground: "#e1e3e3",
  surface: "#121415",
  onSurface: "#e1e3e3",
  onSurfaceVariant: "#a8acac",
  surfaceVariant: "#41484a",
  surfaceContainerLowest: peakBlack,
  surfaceContainerLow: "#191c1d",
  surfaceContainer: "#1d2021",
  surfaceContainerHigh: "#282a2b",
  surfaceContainerHighest: "#323536",
  surfaceDim: "#141718",
  outlineVariant: "#584235",
  error: "#ffb4ab",
  errorContainer: "#93000a",
  onErrorContainer: "#ffdad6"
};

export const light = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0"
};

export const landing = {
  navy: landingNavy,
  navy2: landingNavy2,
  navyCard: landingNavy2,
  surface: landingNavy,
  orange: peakOrange,
  cream: "#f4f6fa",
  ink: landingNavy,
  inkMuted: "#434f63",
  inkSubtle: "#5c6a7e",
  muted: "#8da3bc",
  white: "#ffffff"
};

export const iconSizes = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 22
};

export const iconStroke = {
  default: 2,
  emphasis: 2.25
};

/** Flat map for Tailwind `theme.extend.colors`. */
export const tailwindColors = {
  primary: md3.primary,
  "md-primary": md3.mdPrimary,
  "primary-container": md3.primaryContainer,
  "on-primary": "#522300",
  "on-primary-container": md3.onPrimaryContainer,
  secondary: "#c4c5dd",
  "secondary-container": "#46485c",
  "on-secondary-container": "#b6b6cf",
  tertiary: "#c1c4e7",
  background: md3.background,
  "on-background": md3.onBackground,
  surface: md3.surface,
  "on-surface": md3.onSurface,
  "on-surface-variant": md3.onSurfaceVariant,
  "surface-variant": md3.surfaceVariant,
  "surface-container-lowest": md3.surfaceContainerLowest,
  "surface-container-low": md3.surfaceContainerLow,
  "surface-container": md3.surfaceContainer,
  "surface-container-high": md3.surfaceContainerHigh,
  "surface-container-highest": md3.surfaceContainerHighest,
  "outline-variant": md3.outlineVariant,
  error: md3.error,
  "error-container": md3.errorContainer,
  "on-error-container": md3.onErrorContainer,
  accent: peakOrange,
  "accent-blue": semantic.accentBlue,
  success: semantic.success,
  danger: semantic.danger,
  warning: semantic.warning,
  bg: light.bg,
  card: light.card,
  text: light.text,
  "text-muted": light.textMuted,
  border: light.border,
  "landing-navy": landing.navy,
  "landing-navy2": landing.navy2,
  "landing-orange": landing.orange,
  "landing-navy-card": landing.navyCard,
  "landing-surface": landing.surface,
  "landing-white": landing.white,
  "landing-cream": landing.cream,
  "landing-ink": landing.ink,
  "landing-ink-muted": landing.inkMuted,
  "landing-ink-subtle": landing.inkSubtle,
  "landing-on-dark": landing.white,
  "landing-on-dark-muted": "rgba(255,255,255,0.82)",
  "landing-on-dark-subtle": "rgba(255,255,255,0.68)",
  "peak-black": peakBlack,
  "peak-orange": peakOrange,
  "auth-on-surface": md3.onSurface,
  "auth-on-surface-variant": md3.onSurfaceVariant,
  "auth-surface-lowest": md3.surfaceContainerLowest,
  "auth-surface-low": md3.surfaceContainerLow,
  "auth-surface-high": md3.surfaceContainerHigh,
  "auth-surface-highest": md3.surfaceContainerHighest,
  "auth-surface-variant": md3.surfaceVariant,
  "auth-surface-bright": "#3d4143",
  "auth-outline-variant": md3.outlineVariant,
  "auth-primary": md3.mdPrimary,
  "auth-primary-container": md3.primaryContainer,
  "auth-on-primary-container": md3.onPrimaryContainer,
  "surface-dim": md3.surfaceDim,
  muted: md3.surfaceContainerHigh,
  destructive: semantic.danger,
  "chart-orange": chart.orange,
  "chart-blue": chart.blue,
  "chart-green": chart.green,
  "chart-purple": chart.purple,
  "chart-pink": chart.pink
};
