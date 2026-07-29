/**
 * PlatformSvgIcons
 *
 * Drop-in replacements for FontAwesome5 platform-app icons.
 * SVG strings are keyed by the AppItem.id value from LockContext.
 *
 * Add a platform's SVG string to PLATFORM_SVG_ICONS and it will
 * automatically appear in Active Locks, Select Apps and Confirm screens.
 *
 * Rules enforced here:
 *  - No background / wrapper View with a color
 *  - SVG fills the container (width = height = `size` prop)
 *  - Transparent SVG backgrounds stay transparent
 */

import React from "react";
import { SvgXml } from "react-native-svg";

/* ─── SVG catalogue ─────────────────────────────────────────────────────── */
// Each value is the raw SVG string for the platform's icon.
// Empty string = not yet uploaded → component falls back to FontAwesome5.
const PLATFORM_SVG_ICONS: Record<string, string> = {
  instagram: ``,
  tiktok:    ``,
  twitter:   ``,
  facebook:  ``,
  youtube:   ``,
  snapchat:  ``,
  reddit:    ``,
  pinterest: ``,
  whatsapp:  ``,
  telegram:  ``,
  discord:   ``,
  linkedin:  ``,
};

/* ─── Public helpers ─────────────────────────────────────────────────────── */

/** Returns true when a real SVG is registered for this app id. */
export function hasPlatformSvg(appId: string): boolean {
  const svg = PLATFORM_SVG_ICONS[appId];
  return typeof svg === "string" && svg.trim().length > 0;
}

/**
 * Renders the platform's SVG icon with no background and no extra padding.
 * `size` controls both width and height.
 * `opacity` can be used to dim the icon (e.g. when an app is already locked).
 */
export function PlatformIcon({
  appId,
  size,
  opacity = 1,
}: {
  appId: string;
  size: number;
  opacity?: number;
}) {
  const svg = PLATFORM_SVG_ICONS[appId];
  if (!svg || svg.trim().length === 0) return null;

  return (
    <SvgXml
      xml={svg}
      width={size}
      height={size}
      style={{ opacity }}
    />
  );
}
