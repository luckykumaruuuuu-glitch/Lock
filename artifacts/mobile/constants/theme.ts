const theme = {
  background:       "#000000",
  cardBackground:   "#1C1C1E",
  divider:          "#2C2C2E",
  elevated:         "#3A3A3C",

  primaryText:      "#FFFFFF",
  secondaryText:    "#8E8E93",
  tertiaryText:     "#48484A",

  accent:           "#FFBF80",
  accentSecondary:  "#FFA660",
  accentBg:         "rgba(255,191,128,0.12)",
  accentBorder:     "rgba(255,191,128,0.28)",

  buttonBackground: "#FFBF80",
  buttonText:       "#000000",

  radioActive:      "#FFBF80",
  radioInactive:    "#3A3A3C",

  success:          "#32D74B",
  error:            "#FF453A",
  warning:          "#FFA660",

  cardBorder:       "rgba(255,255,255,0.1)",
  overlay:          "rgba(0,0,0,0.82)",
  footerBg:         "rgba(0,0,0,0.95)",

  gradientPrimary:  ["#FFBF80", "#FFA660"] as const,
  gradientDisabled: ["#2C2C2E", "#1C1C1E"] as const,
};

export default theme;
