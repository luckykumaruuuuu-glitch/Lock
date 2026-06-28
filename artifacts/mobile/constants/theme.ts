const theme = {
  background:       "#000000",
  cardBackground:   "#1C1C1E",
  divider:          "#2C2C2E",
  elevated:         "#3A3A3C",

  primaryText:      "#FFFFFF",
  secondaryText:    "#8E8E93",
  tertiaryText:     "#48484A",

  accent:           "#FFD60A",
  accentSecondary:  "#FF9F0A",
  accentBg:         "rgba(255,214,10,0.1)",
  accentBorder:     "rgba(255,214,10,0.25)",

  buttonBackground: "#FFD60A",
  buttonText:       "#000000",

  radioActive:      "#FFD60A",
  radioInactive:    "#3A3A3C",

  success:          "#32D74B",
  error:            "#FF453A",
  warning:          "#FF9F0A",

  cardBorder:       "rgba(255,255,255,0.1)",
  overlay:          "rgba(0,0,0,0.82)",
  footerBg:         "rgba(0,0,0,0.95)",

  gradientPrimary:  ["#FFD60A", "#FF9F0A"] as const,
  gradientDisabled: ["#2C2C2E", "#1C1C1E"] as const,
};

export default theme;
