const chocolateDark = {
  text: "#FFF8F0",
  tint: "#C47B2B",
  background: "#0D0500",
  foreground: "#FFF8F0",
  card: "rgba(61,31,10,0.65)",
  cardForeground: "#FFF8F0",
  primary: "#C47B2B",
  primaryForeground: "#FFF8F0",
  secondary: "rgba(196,123,43,0.18)",
  secondaryForeground: "#E8943A",
  muted: "rgba(61,31,10,0.45)",
  mutedForeground: "#D4A574",
  accent: "#FF6B35",
  accentForeground: "#FFF8F0",
  destructive: "#CC4400",
  destructiveForeground: "#FFF8F0",
  warning: "#FF6B35",
  warningForeground: "#FFF8F0",
  success: "#4CAF50",
  successForeground: "#FFF8F0",
  border: "rgba(196,123,43,0.25)",
  input: "rgba(196,123,43,0.15)",
  tabBar: "rgba(13,5,0,0.92)",
  header: "rgba(13,5,0,0.92)",
  gradientColors: ["#0D0500", "#1A0A00", "#2C1503"] as const,
};

const colors = {
  light: chocolateDark,
  dark: chocolateDark,
  radius: 24,
};

export default colors;
