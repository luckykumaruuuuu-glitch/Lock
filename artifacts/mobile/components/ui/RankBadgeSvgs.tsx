/**
 * RankBadgeSvgs
 *
 * Custom SVG badges for leaderboard rank positions in Friend Battle.
 * Keyed by rank number (1, 2, 3, 4, …).
 *
 * Add an SVG string here and it will automatically replace the plain
 * colored circle in the leaderboard — no other files need changing.
 *
 * Rules:
 *  - SVG fills the container exactly (width = height = `size` prop)
 *  - No extra wrapper View or background
 */

import React from "react";
import { SvgXml } from "react-native-svg";

/* ─── SVG catalogue ──────────────────────────────────────────────────────── */
// Empty string = not yet uploaded → falls back to the plain colored circle.
const RANK_BADGE_SVGS: Record<number, string> = {
  1: ``, // 1st place — upload pending
  2: ``, // 2nd place — upload pending
  3: ``, // 3rd place — upload pending
  4: ``, // 4th place — upload pending
};

/* ─── Public helpers ─────────────────────────────────────────────────────── */

/** Returns true when a real SVG is registered for this rank. */
export function hasRankBadgeSvg(rank: number): boolean {
  const svg = RANK_BADGE_SVGS[rank];
  return typeof svg === "string" && svg.trim().length > 0;
}

/**
 * Renders the custom rank badge SVG at exactly `size` × `size`.
 * Returns null if no SVG is registered for that rank (triggers fallback).
 */
export function RankBadgeSvgIcon({
  rank,
  size,
}: {
  rank: number;
  size: number;
}) {
  const svg = RANK_BADGE_SVGS[rank];
  if (!svg || svg.trim().length === 0) return null;
  return <SvgXml xml={svg} width={size} height={size} />;
}
