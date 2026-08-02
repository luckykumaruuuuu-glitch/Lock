import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import * as Localization from "expo-localization";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { DurationPreset, useLock } from "@/context/LockContext";
import { useSounds } from "@/hooks/useSounds";

/* ── Duration options ── */
const DURATION_OPTIONS = [
  { id: "1d" as DurationPreset, label: "1 Day",    sublabel: "24 hours of focus",  icon: "sun"      as const, colors: ["#FFBF80", "#FFA660"] as [string, string], glow: "#FFBF80" },
  { id: "7d" as DurationPreset, label: "7 Days",   sublabel: "One full week",       icon: "calendar" as const, colors: ["#FFBF80", "#FFA660"] as [string, string], glow: "#FFBF80" },
  { id: "30d" as DurationPreset, label: "30 Days",  sublabel: "Build a new habit",  icon: "award"    as const, colors: ["#FFBF80", "#FFA660"] as [string, string], glow: "#FFBF80" },
  { id: "custom" as DurationPreset, label: "Custom", sublabel: "Pick any date",     icon: "edit-2"   as const, colors: ["#32D74B", "#30C244"] as [string, string], glow: "#32D74B" },
];

/* ── Duration card icons (SVG — no font dependency, works in Expo Go) ── */
function DurationCardIcon({ name, size, color }: { name: "sun" | "calendar" | "award" | "edit-2"; size: number; color: string }) {
  const s = size;
  if (name === "sun") return (
    <Svg width={s} height={s} viewBox="0 0 512 511.72" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" fill={color} d="M256 109.28c80.96 0 146.58 65.62 146.58 146.58 0 80.96-65.62 146.58-146.58 146.58-80.96 0-146.58-65.62-146.58-146.58 0-80.96 65.62-146.58 146.58-146.58zM40.04 151.45c-7.93-4.36-10.81-14.36-6.45-22.29s14.35-10.83 22.3-6.45l36.87 20.39c7.94 4.36 10.82 14.36 6.45 22.28-4.37 7.93-14.35 10.84-22.29 6.46l-36.88-20.39zm0 208.82c-7.93 4.36-10.81 14.36-6.45 22.29s14.35 10.83 22.3 6.45l36.87-20.39c7.94-4.36 10.82-14.36 6.45-22.28-4.37-7.93-14.35-10.84-22.29-6.46l-36.88 20.39zm81.17 93.96c-4.68 7.78-2.17 17.89 5.62 22.58 7.78 4.68 17.89 2.17 22.58-5.61l21.73-36.1c4.69-7.78 2.18-17.89-5.6-22.58-7.79-4.69-17.9-2.18-22.59 5.61l-21.74 36.1zM238.6 495c-.17 9.04 7 16.51 16.04 16.72 9.03.17 16.52-7 16.72-16.05l.76-42.13c.18-9.03-6.99-16.51-16.05-16.71-9.03-.18-16.51 7-16.7 16.04L238.6 495zm121.95-23.32c4.36 7.92 14.36 10.8 22.29 6.44s10.83-14.34 6.45-22.29l-20.38-36.88c-4.37-7.93-14.36-10.81-22.3-6.45-7.92 4.37-10.83 14.35-6.45 22.3l20.39 36.88zm93.96-81.18c7.79 4.68 17.89 2.17 22.58-5.61 4.69-7.78 2.18-17.89-5.61-22.58l-36.1-21.74c-7.79-4.68-17.89-2.18-22.58 5.61-4.69 7.78-2.18 17.89 5.61 22.58l36.1 21.74zm40.78-117.39c9.03.18 16.51-6.99 16.71-16.03.17-9.04-7-16.53-16.05-16.72l-42.13-.76c-9.03-.19-16.51 6.99-16.7 16.04-.19 9.04 6.99 16.51 16.03 16.71l42.14.76zM16.71 238.32C7.68 238.15.2 245.31 0 254.36c-.17 9.03 7 16.52 16.04 16.71l42.14.77c9.03.18 16.51-6.99 16.7-16.04.18-9.04-6.99-16.52-16.03-16.71l-42.14-.77zm104.5-180.83c-4.68-7.78-2.17-17.89 5.62-22.58 7.78-4.68 17.89-2.18 22.58 5.61l21.73 36.1c4.69 7.78 2.18 17.88-5.6 22.58-7.79 4.68-17.9 2.17-22.59-5.61l-21.74-36.1zM238.6 16.72C238.43 7.68 245.6.2 254.64 0c9.03-.17 16.52 7 16.72 16.05l.76 42.13c.18 9.03-6.99 16.51-16.05 16.71-9.03.18-16.51-7-16.7-16.04l-.77-42.13zm121.95 23.32c4.36-7.92 14.36-10.8 22.29-6.44s10.83 14.34 6.45 22.29l-20.38 36.87c-4.37 7.94-14.36 10.82-22.3 6.46-7.92-4.37-10.83-14.35-6.45-22.3l20.39-36.88zm93.96 81.18c7.79-4.68 17.89-2.17 22.58 5.61 4.69 7.78 2.18 17.89-5.61 22.57l-36.1 21.75c-7.79 4.68-17.89 2.18-22.58-5.61-4.69-7.79-2.18-17.89 5.61-22.58l36.1-21.74z" />
      <Path fillRule="evenodd" clipRule="evenodd" fill={color} fillOpacity={0.65} d="M256 109.28c45.28 0 85.76 20.54 112.65 52.8L116.6 301.25a146.424 146.424 0 01-7.18-45.39c0-80.96 65.62-146.58 146.58-146.58zM40.04 151.45c-7.93-4.36-10.81-14.36-6.45-22.29s14.35-10.83 22.3-6.45l36.87 20.39c7.94 4.36 10.82 14.36 6.45 22.28-4.37 7.93-14.35 10.84-22.29 6.46l-36.88-20.39zm-23.33 86.87C7.68 238.15.2 245.31 0 254.36c-.17 9.03 7 16.52 16.04 16.71l42.14.77c9.03.18 16.51-6.99 16.7-16.04.18-9.04-6.99-16.52-16.03-16.71l-42.14-.77zm104.5-180.83c-4.68-7.78-2.17-17.89 5.62-22.58 7.78-4.68 17.89-2.18 22.58 5.61l21.73 36.1c4.69 7.78 2.18 17.88-5.6 22.58-7.79 4.68-17.9 2.17-22.59-5.61l-21.74-36.1zM238.6 16.72C238.43 7.68 245.6.2 254.64 0c9.03-.17 16.52 7 16.72 16.05l.76 42.13c.18 9.03-6.99 16.51-16.05 16.71-9.03.18-16.51-7-16.7-16.04l-.77-42.13zm121.95 23.32c4.36-7.92 14.36-10.8 22.29-6.44s10.83 14.34 6.45 22.29l-20.38 36.87c-4.37 7.94-14.36 10.82-22.3 6.46-7.92-4.37-10.83-14.35-6.45-22.3l20.39-36.88z" />
    </Svg>
  );
  if (name === "calendar") return (
    <Svg width={s} height={s} viewBox="0 0 511.999 502.775" fill="none">
      {/* Calendar body */}
      <Path fillRule="nonzero" fill={color} d="M465.323 502.775H46.678c-25.627 0-46.677-21.05-46.677-46.659V198.051h511.998v258.065c0 25.662-21.014 46.659-46.676 46.659z" />
      {/* Header (top bar) */}
      <Path fill={color} fillOpacity={0.65} d="M46.68 26.417h418.633c25.646 0 46.68 21.018 46.68 46.664v125.02H0V73.081c0-25.629 21.051-46.664 46.68-46.664z" />
      {/* Pin rings */}
      <Path fill={color} fillOpacity={0.5} d="M354.567 60.378c12.137 0 23.131 4.927 31.076 12.872 7.948 7.947 12.874 18.94 12.874 31.077 0 12.11-4.926 23.097-12.874 31.05-7.945 7.974-18.939 12.9-31.076 12.9-12.109 0-23.098-4.926-31.048-12.872-7.975-7.981-12.903-18.968-12.903-31.078 0-12.137 4.928-23.13 12.873-31.077l.432-.396c7.918-7.717 18.738-12.476 30.646-12.476zm-197.137 0c12.137 0 23.129 4.927 31.076 12.872 7.945 7.947 12.872 18.94 12.872 31.077 0 12.11-4.927 23.097-12.872 31.05-7.947 7.974-18.939 12.9-31.076 12.9-12.111 0-23.098-4.926-31.05-12.872-7.975-7.981-12.902-18.968-12.902-31.078 0-12.137 4.927-23.13 12.875-31.077l.43-.396c7.916-7.717 18.738-12.476 30.647-12.476z" />
      {/* Pin stems + "7" number */}
      <Path fillRule="nonzero" fill={color} d="M332.545 20.486c0-9.959 9.849-20.486 22.022-20.486 12.177 0 22.026 10.527 22.026 20.486v83.969c0 9.957-9.849 18.053-22.026 18.053-12.173 0-22.022-8.096-22.022-18.053V20.486zm-197.143 0c0-9.959 9.848-20.486 22.02-20.486 12.179 0 22.027 10.527 22.027 20.486v83.969c0 9.957-9.848 18.053-22.027 18.053-12.172 0-22.02-8.096-22.02-18.053V20.486zM309.016 302.778l-41.348 107.119H219.25l38.348-96.622-51.417.643-3.213-37.921h106.048z" />
    </Svg>
  );
  if (name === "award") return (
    <Svg width={s} height={s} viewBox="0 0 360 511.48" fill="none">
      {/* Ribbon right */}
      <Path fill={color} fillOpacity={0.55} d="M144.83 306.61l151.45-26.08L360 429.51l-78.8-.9-64.75 52.53z" />
      {/* Ribbon left */}
      <Path fill={color} fillOpacity={0.45} d="M231.94 290.08l-162.37 4.3L0 459.86l78.8-.91 64.75 52.53z" />
      {/* Badge star outer */}
      <Path fill={color} d="M183.21.03c9.35-.4 16.72 2.86 24.15 7.59 9.44 5.98 20.06 17.8 33.17 25.3 18.45 10.54 52.62-4 70.12 21.99 10.2 15.16 10.68 27.04 11.44 38.78.82 12.67 3.04 24.32 16.01 41.47 21.46 28.38 25.93 47.27 14.87 66.96-7.54 13.42-23.41 20.88-27.09 29.38-7.81 18.09.83 31.72-9.87 52.81-7.43 14.62-18.89 24.26-34.16 29.18-12.87 4.14-25.79-1.85-36.1 2.48-18.12 7.61-31.48 25.3-45.89 29.77-5.57 1.73-11.11 2.58-16.65 2.54-5.53.04-11.08-.81-16.64-2.54-14.42-4.47-27.78-22.16-45.89-29.77-10.31-4.33-23.23 1.66-36.11-2.48-15.26-4.92-26.73-14.56-34.16-29.18-10.7-21.09-2.05-34.72-9.87-52.81-3.67-8.5-19.55-15.96-27.09-29.38-11.05-19.69-6.58-38.58 14.88-66.96 12.96-17.15 15.18-28.8 16-41.47.76-11.74 1.24-23.62 11.45-38.78 17.5-25.99 51.66-11.45 70.11-21.99 13.12-7.5 23.73-19.32 33.17-25.3 7.44-4.73 14.81-7.99 24.15-7.59z" />
      {/* Badge highlight */}
      <Path fill={color} fillOpacity={0.6} d="M183.21.04c9.35-.41 16.71 2.86 24.15 7.58 9.44 5.98 20.06 17.8 33.17 25.3 14.67 8.38 39.28.91 57.55 10.56L91.95 314.9c-2.45-.2-4.92-.62-7.38-1.41-15.27-4.92-26.73-14.55-34.16-29.18-10.7-21.09-2.05-34.72-9.87-52.81-3.67-8.5-19.55-15.96-27.09-29.38-11.06-19.69-6.58-38.58 14.88-66.96 12.96-17.14 15.18-28.8 16-41.47.76-11.74 1.24-23.62 11.44-38.78 17.51-26 51.68-11.45 70.12-21.99 13.12-7.5 23.74-19.32 33.17-25.3C166.5 2.9 173.87-.37 183.21.04z" />
      {/* Coin circle */}
      <Path fill={color} fillOpacity={0.85} d="M182.71 46.79c71.81 0 130.03 58.22 130.03 130.04s-58.22 130.03-130.03 130.03c-71.82 0-130.04-58.21-130.04-130.03S110.89 46.79 182.71 46.79z" />
      {/* Inner symbol ($ / number) */}
      <Path fillRule="nonzero" fill={color} fillOpacity={0.25} d="M175.17 115.83h18.94l-.44 11.93c7.96.5 14.91 1.29 20.88 2.39l-4.33 23.12h-22.37c-3.48 0-5.79.54-6.93 1.63-1.15 1.1-1.77 3.19-1.87 6.27l9.4 1.04c11.43 1.3 19.32 4.23 23.64 8.8 4.33 4.58 6.49 10.49 6.49 17.76 0 7.26-.75 13.05-2.24 17.37-1.49 4.33-3.63 7.63-6.41 9.92-5.08 3.88-11.74 6.12-19.99 6.71l-.45 15.07h-19.24l.6-15.07c-9.45-.69-17.46-1.89-24.02-3.58l4.32-23.72c8.26 2.2 16.91 3.29 25.96 3.29 3.78 0 7.31-.2 10.59-.6v-6.26l-9.25-1.05c-11.93-1.19-19.88-4.67-23.86-10.44-3.48-5.07-5.22-11.68-5.22-19.84 0-10.74 2.21-18.54 6.64-23.41 4.42-4.88 10.66-7.86 18.71-8.96l.45-12.37z" />
    </Svg>
  );
  return (
    <Svg width={s} height={s} viewBox="0 0 512 500.66" fill="none">
      {/* Pencil tip base */}
      <Path fillRule="nonzero" fill={color} d="M198.29 451.7c-2.06 4.4-6.03 7.28-10.45 8.14L17.92 500.25c-11.18 2.64-20.7-8.07-17.18-18.72l43.22-132.56c2.56-7.85 7.26-27.97 13.37-32.57a14.56 14.56 0 0113.34-2.21L198.29 451.7z" />
      {/* Tip highlight */}
      <Path fill={color} fillOpacity={0.55} d="M156.43 452.35L14.57 486.09l42.52-130.38c1.44 2.23 3.14 4.29 5.09 6.19 7.29 7.09 17.7 11.29 31 12.84.85 11.85 5.17 21.37 12.71 28.74 7.26 7.09 17.3 11.85 29.89 14.46.62 11.33 4.67 20.58 12.03 27.83 2.52 2.48 5.4 4.67 8.62 6.58z" />
      {/* Tip shadow */}
      <Path fill={color} fillOpacity={0.45} d="M154.94 452.98l1.83-.43c-3.36-1.95-6.35-4.21-8.96-6.78-7.36-7.25-11.41-16.5-12.03-27.83-4.3-.89-8.31-2.04-12.01-3.44l-42.85 19.04c2.87 3.69 5.35 7.66 7.46 11.89 3.34 6.69 5.64 13.9 6.94 21.46l59.62-13.91z" />
      {/* Main pencil body */}
      <Path fillRule="nonzero" fill={color} d="M493.98 157.18c-27.81 27.8-55.61 55.61-83.41 83.41-71.76 71.78-143.55 143.62-215.32 215.39-13.64 9.88-36.21.85-47.44-10.21-7.36-7.25-11.41-16.5-12.03-27.83-23.32-4.83-40.8-18.11-42.6-43.2-13.3-1.55-23.71-5.75-31-12.84-14.63-13.31-18.27-35.17-.4-50.76 69.82-69.82 139.66-139.71 209.48-209.54 27.85-27.86 55.7-55.72 83.56-83.58 24.03-24.03 63.29-24.03 87.32 0l51.84 51.84c24.03 24.03 24.03 63.28 0 87.32z" />
      {/* Top cap */}
      <Path fill={color} fillOpacity={0.65} d="M463.21 165.76l19.67-19.67c17.96-17.96 17.95-47.34 0-65.29l-51.83-51.83c-17.95-17.95-47.33-17.95-65.28 0l-19.68 19.67 117.12 117.12z" />
      {/* Top cap shadow */}
      <Path fill={color} fillOpacity={0.5} d="M463.21 165.76l19.67-19.67c17.96-17.96 17.95-47.34 0-65.29l-21.77-21.77-52.31 52.32 54.41 54.41z" />
      {/* Tip cream */}
      <Path fill={color} fillOpacity={0.6} d="M73.66 369.63l-14.72 45.51-.08-.04c-6.11-3.26-12.12-5.49-18.87-6.97l16.67-53.1c1.53 2.49 3.37 4.78 5.52 6.87 3.22 3.13 7.05 5.7 11.48 7.73z" />
      {/* Eraser base */}
      <Path fillRule="nonzero" fill={color} d="M84.23 483.87l-64.84 15.3c-4.19 1-22.08-1.28-17.37-18.84l19.86-61.58 17.42-10.79c30.06 6.53 50.95 28.87 56.06 59.15l-11.13 16.76z" />
      {/* Eraser dark */}
      <Path fill={color} fillOpacity={0.8} d="M15.99 484.85l64.84-15.3c-4.08-24.19-20.65-41.99-44.68-47.21l-20.16 62.51z" />
      {/* Eraser mid */}
      <Path fill={color} fillOpacity={0.65} d="M15.99 484.85l52.79-42.79c-7.9-9.83-19.08-16.77-32.63-19.72l-20.16 62.51z" />
      {/* Eraser light */}
      <Path fill={color} fillOpacity={0.5} d="M47.59 426a62.409 62.409 0 00-11.44-3.66l-19.91 61.74L47.59 426z" />
      {/* Shaft gold */}
      <Path fill={color} fillOpacity={0.75} d="M365.97 197.2L151.22 411.95c.15 21.51 20.14 32.89 32.9 32.89l214.75-214.75-32.9-32.89z" />
      {/* Shaft yellow */}
      <Path fill={color} fillOpacity={0.7} d="M281.74 112.96L66.99 327.72c-5.5 20.93 17.68 34.99 32.01 32.01l214.75-214.76-32.01-32.01z" />
      {/* Shaft shadow */}
      <Path fill={color} fillOpacity={0.6} d="M357.83 189.05L143.08 403.8c-19.79 2.35-37.7-16.48-35.05-35.04L322.78 154l35.05 35.05z" />
      {/* Ferrule light */}
      <Path fill={color} fillOpacity={0.45} d="M453.31 175.64l-44.32 44.33-117.12-117.11 44.33-44.33z" />
      {/* Ferrule shadow */}
      <Path fill={color} fillOpacity={0.35} d="M453.31 175.64l-44.32 44.33-34.71-34.7 44.33-44.33z" />
    </Svg>
  );
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["Su","Mo","Tu","We","Th","Fr","Sa"];

/* ── Helpers ── */
function msToDays(ms: number) { return Math.ceil(ms / 86400000); }
function startOfToday(): Date { const d = new Date(); d.setHours(0,0,0,0); return d; }
function tomorrowStart(): Date { const d = startOfToday(); d.setDate(d.getDate() + 1); return d; }
function maxDate(): Date { const d = startOfToday(); d.setDate(d.getDate() + 365); return d; }
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfWeek(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ── Clean dark calendar ── */
function DarkCalendar({
  visible,
  initial,
  minDate,
  maxDateVal,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  initial: Date;
  minDate: Date;
  maxDateVal: Date;
  onCancel: () => void;
  onConfirm: (d: Date) => void;
}) {
  const [viewYear,  setViewYear]  = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [selected,  setSelected]  = useState<Date>(initial);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const totalDays  = daysInMonth(viewYear, viewMonth);
  const startBlank = firstDayOfWeek(viewYear, viewMonth);

  const cells: (number | null)[] = [
    ...Array(startBlank).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function isBefore(day: number): boolean {
    const d = new Date(viewYear, viewMonth, day); d.setHours(0,0,0,0);
    return d < minDate;
  }
  function isAfter(day: number): boolean {
    const d = new Date(viewYear, viewMonth, day); d.setHours(0,0,0,0);
    return d > maxDateVal;
  }
  function isSelected(day: number): boolean {
    return sameDay(selected, new Date(viewYear, viewMonth, day));
  }
  function isToday(day: number): boolean {
    return sameDay(new Date(), new Date(viewYear, viewMonth, day));
  }

  function selectDay(day: number) {
    if (isBefore(day) || isAfter(day)) return;
    Haptics.selectionAsync();
    setSelected(new Date(viewYear, viewMonth, day));
  }

  const canGoPrev = !(viewYear === minDate.getFullYear() && viewMonth === minDate.getMonth());
  const canGoNext = !(viewYear === maxDateVal.getFullYear() && viewMonth === maxDateVal.getMonth());

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={calStyles.overlay}>
        <View style={calStyles.sheet}>

          {/* Header */}
          <View style={calStyles.header}>
            <Pressable
              onPress={prevMonth}
              disabled={!canGoPrev}
              style={({ pressed }) => [calStyles.navBtn, { opacity: !canGoPrev ? 0.22 : pressed ? 0.55 : 1 }]}
            >
              <Feather name="chevron-left" size={22} color="#FFBF80" />
            </Pressable>

            <View style={{ alignItems: "center" }}>
              <Text style={calStyles.monthLabel}>{MONTH_NAMES[viewMonth]}</Text>
              <Text style={calStyles.yearLabel}>{viewYear}</Text>
            </View>

            <Pressable
              onPress={nextMonth}
              disabled={!canGoNext}
              style={({ pressed }) => [calStyles.navBtn, { opacity: !canGoNext ? 0.22 : pressed ? 0.55 : 1 }]}
            >
              <Feather name="chevron-right" size={22} color="#FFBF80" />
            </Pressable>
          </View>

          {/* Day-of-week row */}
          <View style={calStyles.dayRow}>
            {DAY_LABELS.map(d => (
              <Text key={d} style={calStyles.dayLabel}>{d}</Text>
            ))}
          </View>

          <View style={calStyles.divider} />

          {/* Calendar grid */}
          <View style={calStyles.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`blank-${idx}`} style={calStyles.cell} />;
              const disabled = isBefore(day) || isAfter(day);
              const sel      = isSelected(day);
              const today    = isToday(day);
              return (
                <Pressable key={`${day}`} onPress={() => selectDay(day)} style={calStyles.cell} disabled={disabled}>
                  {sel ? (
                    <LinearGradient colors={["#FFBF80", "#FFA660"]} style={calStyles.selCircle}>
                      <Text style={calStyles.selDayText}>{day}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[calStyles.dayCircle, today && calStyles.todayRing]}>
                      <Text style={[
                        calStyles.dayText,
                        disabled && { color: "#3A3A3C" },
                        today && !disabled && { color: "#FFBF80" },
                      ]}>
                        {day}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Selected date summary */}
          <View style={calStyles.selectedRow}>
            <Feather name="calendar" size={13} color="#FFBF80" />
            <Text style={calStyles.selectedText}>
              {selected.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </View>

          <View style={calStyles.divider} />

          {/* CANCEL / OK */}
          <View style={calStyles.btnRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [calStyles.cancelBtn, { opacity: pressed ? 0.65 : 1 }]}
            >
              <Text style={calStyles.cancelBtnText}>CANCEL</Text>
            </Pressable>

            <Pressable
              onPress={() => onConfirm(selected)}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <LinearGradient colors={["#FFBF80", "#FFA660"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={calStyles.okBtn}>
                <Text style={calStyles.okBtnText}>OK</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const calStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  sheet:   { width: "100%", maxWidth: 360, backgroundColor: "#1C1C1E", borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 18, backgroundColor: "#1C1C1E" },
  navBtn:  { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  yearLabel:  { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 2 },
  dayRow:  { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10 },
  dayLabel:{ flex: 1, textAlign: "center", fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#8E8E93" },
  divider: { height: 1, backgroundColor: "#2C2C2E", marginHorizontal: 16 },
  grid:    { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, paddingVertical: 8 },
  cell:    { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 2 },
  dayCircle: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  todayRing: { borderWidth: 1, borderColor: "#FFBF80" },
  dayText:   { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  selCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", shadowColor: "#FFBF80", shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  selDayText:{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#000000" },
  selectedRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  selectedText:{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#8E8E93" },
  btnRow:  { flexDirection: "row", justifyContent: "flex-end", gap: 12, padding: 16, paddingTop: 14 },
  cancelBtn:   { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10 },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#8E8E93", letterSpacing: 0.5 },
  okBtn:       { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  okBtnText:   { fontSize: 14, fontFamily: "Inter_700Bold", color: "#000000", letterSpacing: 0.5 },
});

/* ── System time format detection ── */
function detectTimeFormatFromLocale(): boolean {
  // Fallback: returns true if device/locale uses 24-hour clock
  try {
    const sample = new Date(2000, 0, 1, 13, 0, 0); // 1 PM
    const formatted = sample.toLocaleTimeString([], { hour: "numeric" });
    return !/AM|PM/i.test(formatted);
  } catch {
    return false;
  }
}

function detectTimeFormat(): boolean {
  // Returns true if device uses 24-hour clock.
  // Prefer the actual OS-level time-format setting (Localization.getCalendars()),
  // which reflects the user's explicit 24-hour toggle even when it differs from
  // their locale/region. Fall back to the locale-based heuristic if unavailable.
  try {
    const uses24hourClock = Localization.getCalendars()?.[0]?.uses24hourClock;
    if (typeof uses24hourClock === "boolean") return uses24hourClock;
  } catch {
    // fall through to locale-based fallback
  }
  return detectTimeFormatFromLocale();
}

/* ── Time Picker Modal (for today's date) ── */
function TimePickerModal({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (hours: number, minutes: number) => void;
}) {
  function getDefaultTime(): { h: number; m: number } {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return { h: d.getHours() % 24, m: 0 };
  }

  const def = getDefaultTime();
  // Internal hour is always 0-23 — calculation logic unchanged
  const [hour,     setHour]     = useState(def.h);
  const [minute,   setMinute]   = useState(def.m);
  const [error,    setError]    = useState("");
  const [is24Hour, setIs24Hour] = useState<boolean>(detectTimeFormat);

  useEffect(() => {
    if (visible) {
      const d = getDefaultTime();
      setHour(d.h);
      setMinute(d.m);
      setError("");
      setIs24Hour(detectTimeFormat());
    }
  }, [visible]);

  function adjustHour(delta: number) {
    setError("");
    setHour(h => (h + delta + 24) % 24);
  }
  function adjustMinute(delta: number) {
    setError("");
    setMinute(m => (m + delta + 60) % 60);
  }
  function toggleAmPm() {
    setError("");
    setHour(h => (h + 12) % 24);
  }

  function confirm() {
    const now    = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target <= now) {
      setError("Please select a future time");
      return;
    }
    onConfirm(hour, minute);
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  // Display-only conversion — internal `hour` stays 0-23
  const displayHour = is24Hour ? hour : (hour % 12 || 12);
  const isAm        = hour < 12;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={calStyles.overlay}>
        <View style={calStyles.sheet}>

          {/* Header + 12H/24H toggle */}
          <View style={tpStyles.headerRow}>
            <View>
              <Text style={calStyles.monthLabel}>Select End Time</Text>
              <Text style={tpStyles.headerSub}>Today — pick a future time</Text>
            </View>
            <Pressable
              onPress={() => setIs24Hour(v => !v)}
              style={({ pressed }) => [tpStyles.fmtToggle, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={tpStyles.fmtToggleText}>{is24Hour ? "24H" : "12H"}</Text>
            </Pressable>
          </View>

          <View style={calStyles.divider} />

          {/* Hour  :  Minute  (+ AM/PM in 12h mode) */}
          <View style={[tpStyles.timeRow, !is24Hour && tpStyles.timeRowCompact]}>
            {/* Hours */}
            <View style={tpStyles.col}>
              <Text style={tpStyles.colLabel}>Hour</Text>
              <Pressable
                onPress={() => adjustHour(-1)}
                style={({ pressed }) => [tpStyles.arrow, { opacity: pressed ? 0.55 : 1 }]}
              >
                <Feather name="chevron-up" size={26} color="#FFBF80" />
              </Pressable>
              <View style={[tpStyles.valueBox, !is24Hour && tpStyles.valueBoxCompact]}>
                <Text style={tpStyles.valueText}>{pad(displayHour)}</Text>
              </View>
              <Pressable
                onPress={() => adjustHour(1)}
                style={({ pressed }) => [tpStyles.arrow, { opacity: pressed ? 0.55 : 1 }]}
              >
                <Feather name="chevron-down" size={26} color="#FFBF80" />
              </Pressable>
            </View>

            <Text style={tpStyles.colon}>:</Text>

            {/* Minutes */}
            <View style={tpStyles.col}>
              <Text style={tpStyles.colLabel}>Minute</Text>
              <Pressable
                onPress={() => adjustMinute(-5)}
                style={({ pressed }) => [tpStyles.arrow, { opacity: pressed ? 0.55 : 1 }]}
              >
                <Feather name="chevron-up" size={26} color="#FFBF80" />
              </Pressable>
              <View style={[tpStyles.valueBox, !is24Hour && tpStyles.valueBoxCompact]}>
                <Text style={tpStyles.valueText}>{pad(minute)}</Text>
              </View>
              <Pressable
                onPress={() => adjustMinute(5)}
                style={({ pressed }) => [tpStyles.arrow, { opacity: pressed ? 0.55 : 1 }]}
              >
                <Feather name="chevron-down" size={26} color="#FFBF80" />
              </Pressable>
            </View>

            {/* AM/PM column — only visible in 12h mode */}
            {!is24Hour && (
              <>
                <Text style={[tpStyles.colon, { opacity: 0 }]}>:</Text>
                <View style={tpStyles.col}>
                  <Text style={tpStyles.colLabel}>Period</Text>
                  <Pressable
                    onPress={toggleAmPm}
                    style={({ pressed }) => [tpStyles.arrow, { opacity: pressed ? 0.55 : 1 }]}
                  >
                    <Feather name="chevron-up" size={26} color="#FFBF80" />
                  </Pressable>
                  <View style={[tpStyles.valueBox, tpStyles.periodValueBox]}>
                    <Text style={[tpStyles.valueText, tpStyles.ampmText]}>
                      {isAm ? "AM" : "PM"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={toggleAmPm}
                    style={({ pressed }) => [tpStyles.arrow, { opacity: pressed ? 0.55 : 1 }]}
                  >
                    <Feather name="chevron-down" size={26} color="#FFBF80" />
                  </Pressable>
                </View>
              </>
            )}
          </View>

          {/* Error / spacer */}
          <View style={tpStyles.errorRow}>
            {!!error && (
              <>
                <Feather name="alert-circle" size={13} color="#FF453A" />
                <Text style={tpStyles.errorText}>{error}</Text>
              </>
            )}
          </View>

          <View style={calStyles.divider} />

          {/* CANCEL / CONFIRM */}
          <View style={calStyles.btnRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [calStyles.cancelBtn, { opacity: pressed ? 0.65 : 1 }]}
            >
              <Text style={calStyles.cancelBtnText}>CANCEL</Text>
            </Pressable>

            <Pressable
              onPress={confirm}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <LinearGradient
                colors={["#FFBF80", "#FFA660"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={calStyles.okBtn}
              >
                <Text style={calStyles.okBtnText}>CONFIRM</Text>
              </LinearGradient>
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const tpStyles = StyleSheet.create({
  headerRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 20, backgroundColor: "#1C1C1E" },
  headerSub:     { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 4 },
  fmtToggle:     { backgroundColor: "#2C2C2E", borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,191,128,0.25)", paddingHorizontal: 10, paddingVertical: 6 },
  fmtToggleText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#FFBF80", letterSpacing: 0.5 },
  timeRow:       { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 28, paddingHorizontal: 8, gap: 20 },
  timeRowCompact:{ gap: 10, paddingHorizontal: 4 },
  col:           { alignItems: "center", gap: 10 },
  colLabel:      { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#8E8E93", letterSpacing: 0.8, textTransform: "uppercase" },
  arrow:         { padding: 4 },
  valueBox:      { width: 76, height: 68, alignItems: "center", justifyContent: "center", backgroundColor: "#2C2C2E", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,191,128,0.25)" },
  valueBoxCompact:{ width: 62 },
  periodValueBox:{ width: 60 },
  valueText:     { fontSize: 38, fontFamily: "Inter_700Bold", color: "#FFBF80" },
  ampmText:      { fontSize: 22 },
  colon:         { fontSize: 38, fontFamily: "Inter_700Bold", color: "#FFBF80", marginTop: 26 },
  errorRow:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingBottom: 14, minHeight: 30 },
  errorText:     { fontSize: 12, fontFamily: "Inter_500Medium", color: "#FF453A" },
});

/* ── Main Duration Screen ── */
export default function DurationScreen() {
  const insets = useSafeAreaInsets();
  const { selection, setDurationPreset, setCustomDays, setCustomHours, setCustomMinutes, setCustomEndTime } = useLock();
  const { playClick } = useSounds();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [showPicker,     setShowPicker]     = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickedDate,     setPickedDate]     = useState<Date | null>(null);

  function handleSelect(preset: DurationPreset) {
    playClick();
    Haptics.selectionAsync();
    setDurationPreset(preset);
    if (preset !== "custom") {
      setPickedDate(null);
      setCustomDays("0");
      setCustomHours("0");
      setCustomEndTime(null);
    }
  }

  function handleCalendarConfirm(date: Date) {
    setShowPicker(false);

    // Today selected → open time picker instead
    if (sameDay(date, new Date())) {
      setShowTimePicker(true);
      return;
    }

    // Future date → day-based duration; no absolute timestamp needed
    const today = startOfToday();
    if (date <= today) return;
    setPickedDate(date);
    const days = msToDays(date.getTime() - Date.now());
    setCustomDays(String(Math.max(1, days)));
    setCustomHours("0");
    setCustomEndTime(null);
  }

  function handleTimeConfirm(hours: number, minutes: number) {
    const now    = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    if (target <= now) return; // validation already done in modal, safety guard

    // Store the exact target timestamp — confirmLock will use this directly
    // as endTime, so no floor/truncation or fresh-now drift can occur.
    setPickedDate(target);
    setCustomDays("0");
    setCustomHours("0");
    setCustomMinutes("0");
    setCustomEndTime(target.getTime());
    setShowTimePicker(false);
  }

  function getSummary(): string {
    if (selection.durationPreset === "custom") {
      if (!pickedDate) return "No date selected";
      if (sameDay(pickedDate, new Date())) {
        const durationMs    = pickedDate.getTime() - Date.now();
        const totalMinutes  = Math.floor(durationMs / (60 * 1000));
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const parts: string[] = [];
        if (h > 0) parts.push(`${h}h`);
        if (m > 0) parts.push(`${m}m`);
        return `Today, ${parts.join(" ") || "<1m"}`;
      }
      const days = msToDays(pickedDate.getTime() - Date.now());
      return `${days} day${days !== 1 ? "s" : ""}`;
    }
    return DURATION_OPTIONS.find(o => o.id === selection.durationPreset)?.label ?? "";
  }

  function getPickerLabel(): string {
    if (!pickedDate) return "Choose end date";
    if (sameDay(pickedDate, new Date())) {
      return `Today at ${pickedDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
    }
    return pickedDate.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" });
  }

  const canProceed =
    selection.durationPreset !== "custom" ||
    (pickedDate !== null && pickedDate > startOfToday());

  const selectedOpt = DURATION_OPTIONS.find(o => o.id === selection.durationPreset);

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>How long?</Text>
        <Text style={styles.subheading}>Duration is final — you can't change it after confirming.</Text>

        {/* 2×2 Grid */}
        <View style={styles.grid}>
          {DURATION_OPTIONS.map(opt => {
            const selected = selection.durationPreset === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => handleSelect(opt.id)}
                style={({ pressed }) => [styles.gridCell, { opacity: pressed ? 0.82 : 1 }]}
              >
                <GlassCard
                  style={[styles.optCardOuter, selected && { shadowColor: opt.glow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 16 }]}
                  borderColor={selected ? opt.colors[0] + "80" : "rgba(255,255,255,0.1)"}
                  backgroundColor={selected ? "rgba(255,191,128,0.05)" : "#1C1C1E"}
                  padding={0}
                >
                  <View style={styles.optCardInner}>
                    {selected && <View style={[styles.selectedDot, { backgroundColor: opt.colors[0] }]} />}
                    <View style={[styles.iconBox, { backgroundColor: selected ? opt.colors[0] + "22" : "#2C2C2E" }]}>
                      <DurationCardIcon name={opt.icon} size={26} color={selected ? opt.colors[0] : "#8E8E93"} />
                    </View>
                    <Text style={[styles.optLabel, { color: selected ? "#FFFFFF" : "#8E8E93" }]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.optSublabel}>{opt.sublabel}</Text>
                  </View>
                </GlassCard>
              </Pressable>
            );
          })}
        </View>

        {/* Custom date picker card */}
        {selection.durationPreset === "custom" && (
          <GlassCard padding={20} borderColor="rgba(50,215,75,0.2)">
            <Text style={styles.customTitle}>Pick End Date</Text>
            <Text style={styles.customHint}>Select the date when you want your lock to expire.</Text>

            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={styles.dateButton}
              activeOpacity={0.75}
            >
              <View style={[styles.dateButtonInner, { backgroundColor: pickedDate ? "rgba(50,215,75,0.1)" : "#2C2C2E" }]}>
                <Feather name="calendar" size={18} color={pickedDate ? "#32D74B" : "#8E8E93"} />
                <Text style={[styles.dateButtonText, { color: pickedDate ? "#32D74B" : "#8E8E93" }]}>
                  {getPickerLabel()}
                </Text>
                <Feather name="chevron-right" size={16} color={pickedDate ? "#32D74B" : "#3A3A3C"} />
              </View>
            </TouchableOpacity>

            {pickedDate && (
              <View style={styles.daysPreview}>
                <Feather name="clock" size={13} color="#32D74B" />
                <Text style={styles.daysPreviewText}>
                  {sameDay(pickedDate, new Date())
                    ? `~${Math.ceil((pickedDate.getTime() - Date.now()) / (60 * 60 * 1000))} hours from now`
                    : `${msToDays(pickedDate.getTime() - Date.now())} days from today`}
                </Text>
              </View>
            )}
          </GlassCard>
        )}

        {/* Calendar — minDate includes today so user can select today */}
        <DarkCalendar
          visible={showPicker}
          initial={pickedDate ?? startOfToday()}
          minDate={startOfToday()}
          maxDateVal={maxDate()}
          onCancel={() => setShowPicker(false)}
          onConfirm={handleCalendarConfirm}
        />

        {/* Time picker — shown when today is selected */}
        <TimePickerModal
          visible={showTimePicker}
          onCancel={() => setShowTimePicker(false)}
          onConfirm={handleTimeConfirm}
        />

        {/* Duration summary pill */}
        <View style={[styles.summary, { backgroundColor: "#1C1C1E" }]}>
          <Feather name="clock" size={14} color={selectedOpt?.colors[0] ?? "#FFBF80"} />
          <Text style={styles.summaryText}>
            Duration:{" "}
            <Text style={[styles.summaryBold, { color: selectedOpt?.colors[0] ?? "#FFBF80" }]}>
              {getSummary()}
            </Text>
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 20 }]}>
        <View style={styles.nextBtnShadow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/lock/confirm");
            }}
            disabled={!canProceed}
            style={({ pressed }) => [{ opacity: !canProceed ? 0.32 : pressed ? 0.82 : 1 }]}
          >
            <LinearGradient
              colors={["#FFBF80", "#FFA660"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.nextBtn}
            >
              <Text style={styles.nextBtnText}>Next — Review & Confirm</Text>
              <Feather name="arrow-right" size={18} color="#000000" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content:   { paddingHorizontal: 20, paddingTop: 24, gap: 18 },
  heading:   { fontSize: 34, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -1 },
  subheading:{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", lineHeight: 20, marginTop: -4 },

  grid:      { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridCell:  { width: "47.5%" },
  optCardOuter: { borderRadius: 20, minHeight: 165 },
  optCardInner: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 20, paddingHorizontal: 12 },
  iconBox:   { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  optLabel:  { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  optSublabel:{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#3A3A3C", textAlign: "center", lineHeight: 16 },
  selectedDot:{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },

  customTitle:{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF", marginBottom: 4 },
  customHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93", lineHeight: 17, marginBottom: 14 },
  dateButton: { borderRadius: 14, overflow: "hidden" },
  dateButtonInner:{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  dateButtonText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  daysPreview:    { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  daysPreviewText:{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#32D74B" },

  summary:     { flexDirection: "row", alignItems: "center", gap: 8, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  summaryText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  summaryBold: { fontFamily: "Inter_700Bold" },

  footer:   { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#2C2C2E", backgroundColor: "rgba(0,0,0,0.95)" },
  nextBtnShadow: { borderRadius: 18, shadowColor: "#FFBF80", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 10 },
  nextBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18, borderRadius: 18 },
  nextBtnText: { color: "#000000", fontSize: 16, fontFamily: "Inter_700Bold" },
});
