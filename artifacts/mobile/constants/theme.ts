const theme = {
  background:       "#000000",
  cardBackground:   "#1C1C1E",
  divider:          "#2C2C2E",
  elevated:         "#3A3A3C",

  primaryText:      "#FFFFFF",
  secondaryText:    "#8E8E93",
  tertiaryText:     "#48484A",

  accent:           "#F5A94E",
  accentSecondary:  "#E07830",
  accentBg:         "rgba(245,169,78,0.1)",
  accentBorder:     "rgba(245,169,78,0.25)",

  buttonBackground: "#F5A94E",
  buttonText:       "#000000",

  radioActive:      "#F5A94E",
  radioInactive:    "#3A3A3C",

  success:          "#32D74B",
  error:            "#FF453A",
  warning:          "#E07830",

  cardBorder:       "rgba(255,255,255,0.1)",
  overlay:          "rgba(0,0,0,0.82)",
  footerBg:         "rgba(0,0,0,0.95)",

  gradientPrimary:  ["#F5A94E", "#E07830"] as const,
  gradientDisabled: ["#2C2C2E", "#1C1C1E"] as const,
};

export default theme;
