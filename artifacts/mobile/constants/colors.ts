const darkTheme = {
  text: "#FFFFFF",
  tint: "#FFD60A",
  background: "#000000",
  foreground: "#FFFFFF",
  card: "#1C1C1E",
  cardForeground: "#FFFFFF",
  primary: "#FFD60A",
  primaryForeground: "#000000",
  secondary: "rgba(255,214,10,0.1)",
  secondaryForeground: "#FFD60A",
  muted: "rgba(255,255,255,0.06)",
  mutedForeground: "#8E8E93",
  accent: "#FF9F0A",
  accentForeground: "#000000",
  destructive: "#FF453A",
  destructiveForeground: "#FFFFFF",
  warning: "#FF9F0A",
  warningForeground: "#000000",
  success: "#32D74B",
  successForeground: "#000000",
  border: "rgba(255,255,255,0.1)",
  input: "rgba(255,255,255,0.08)",
  tabBar: "#000000",
  header: "#000000",
  gradientColors: ["#FFD60A", "#FF9F0A"] as const,
};

const colors = {
  light: darkTheme,
  dark: darkTheme,
  radius: 24,
};

export default colors;
