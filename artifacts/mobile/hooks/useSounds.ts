import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

const SOUND_PREF_KEY = "focuslock_sounds_enabled";

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.08
): void {
  if (Platform.OS !== "web") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function useSounds() {
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SOUND_PREF_KEY)
      .then((val) => {
        if (val !== null) setMutedState(val === "false");
      })
      .catch(() => {});
  }, []);

  const setMuted = useCallback((val: boolean) => {
    setMutedState(val);
    AsyncStorage.setItem(SOUND_PREF_KEY, String(!val)).catch(() => {});
  }, []);

  const playClick = useCallback(() => {
    if (muted) return;
    playTone(680, 0.06, "triangle", 0.06);
    Haptics.selectionAsync().catch(() => {});
  }, [muted]);

  const playSuccess = useCallback(() => {
    if (muted) return;
    playTone(523, 0.12, "sine", 0.07);
    setTimeout(() => playTone(659, 0.12, "sine", 0.07), 110);
    setTimeout(() => playTone(784, 0.28, "sine", 0.09), 220);
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {});
  }, [muted]);

  const playWarning = useCallback(() => {
    if (muted) return;
    playTone(400, 0.1, "sawtooth", 0.07);
    setTimeout(() => playTone(300, 0.22, "sawtooth", 0.07), 130);
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Warning
    ).catch(() => {});
  }, [muted]);

  const playPermissionGranted = useCallback(() => {
    if (muted) return;
    playTone(880, 0.08, "sine", 0.07);
    setTimeout(() => playTone(1100, 0.18, "sine", 0.06), 100);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [muted]);

  const playLock = useCallback(() => {
    if (muted) return;
    playTone(220, 0.08, "square", 0.06);
    setTimeout(() => playTone(180, 0.15, "square", 0.08), 90);
    setTimeout(() => playTone(150, 0.3, "sine", 0.06), 180);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, [muted]);

  const playPreview = useCallback(() => {
    playTone(680, 0.06, "triangle", 0.06);
    setTimeout(() => playTone(880, 0.12, "sine", 0.07), 100);
    Haptics.selectionAsync().catch(() => {});
  }, []);

  return {
    playClick,
    playSuccess,
    playWarning,
    playLock,
    playPermissionGranted,
    playPreview,
    muted,
    setMuted,
  };
}
