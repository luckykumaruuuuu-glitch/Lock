const darkTheme = {
  text: "#FFFFFF",
  tint: "#FFD580",
  background: "#000000",
  foreground: "#FFFFFF",
  card: "rgba(28,28,30,0.85)",
  cardForeground: "#FFFFFF",
  primary: "#FFD580",
  primaryForeground: "#1A1A1A",
  secondary: "rgba(255,213,128,0.12)",
  secondaryForeground: "#FFD580",
  muted: "rgba(255,255,255,0.06)",
  mutedForeground: "#A0A0A0",
  accent: "#FFA500",
  accentForeground: "#1A1A1A",
  destructive: "#FF453A",
  destructiveForeground: "#FFFFFF",
  warning: "#FF9F0A",
  warningForeground: "#1A1A1A",
  success: "#32D74B",
  successForeground: "#1A1A1A",
  border: "rgba(255,213,128,0.18)",
  input: "rgba(255,213,128,0.10)",
  tabBar: "#000000",
  header: "#000000",
  gradientColors: ["#FFD580", "#FFA500"] as const,
};

const colors = {
  light: darkTheme,
  dark: darkTheme,
  radius: 24,
};

export default colors;
