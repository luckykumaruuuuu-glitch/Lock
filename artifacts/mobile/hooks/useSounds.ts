import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";
import { Platform } from "react-native";

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.08
): void {
  if (Platform.OS !== "web") return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  const [muted, setMuted] = useState(false);

  const playClick = useCallback(() => {
    if (muted) return;
    playTone(700, 0.06, "square", 0.05);
    Haptics.selectionAsync().catch(() => {});
  }, [muted]);

  const playSuccess = useCallback(() => {
    if (muted) return;
    playTone(440, 0.12, "sine");
    setTimeout(() => playTone(554, 0.12, "sine"), 110);
    setTimeout(() => playTone(659, 0.25, "sine", 0.1), 220);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [muted]);

  const playWarning = useCallback(() => {
    if (muted) return;
    playTone(440, 0.1, "sawtooth", 0.07);
    setTimeout(() => playTone(330, 0.2, "sawtooth", 0.07), 130);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, [muted]);

  const playLock = useCallback(() => {
    if (muted) return;
    playTone(220, 0.08, "square", 0.06);
    setTimeout(() => playTone(180, 0.15, "square", 0.08), 90);
    setTimeout(() => playTone(150, 0.3, "sine", 0.06), 180);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, [muted]);

  return { playClick, playSuccess, playWarning, playLock, muted, setMuted };
}
