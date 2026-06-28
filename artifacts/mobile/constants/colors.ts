const glassDark = {
  text: "#FFFFFF",
  tint: "#6366F1",
  background: "#080014",
  foreground: "#FFFFFF",
  card: "rgba(255,255,255,0.06)",
  cardForeground: "#FFFFFF",
  primary: "#6366F1",
  primaryForeground: "#FFFFFF",
  secondary: "rgba(99,102,241,0.18)",
  secondaryForeground: "#A5B4FC",
  muted: "rgba(255,255,255,0.06)",
  mutedForeground: "rgba(255,255,255,0.45)",
  accent: "#FF006E",
  accentForeground: "#FFFFFF",
  destructive: "#FF0055",
  destructiveForeground: "#FFFFFF",
  warning: "#FF9500",
  warningForeground: "#FFFFFF",
  success: "#00FF88",
  successForeground: "#000000",
  border: "rgba(255,255,255,0.12)",
  input: "rgba(255,255,255,0.10)",
  tabBar: "rgba(8,0,20,0.90)",
  header: "rgba(8,0,20,0.90)",
  gradientColors: ["#080014", "#16082E", "#0D1535"] as const,
};

const colors = {
  light: glassDark,
  dark: glassDark,
  radius: 24,
};

export default colors;
