import * as Haptics from "expo-haptics";
import { useCallback } from "react";
import { Platform } from "react-native";

import { useSoundContext } from "@/context/SoundContext";

// Singleton AudioContext — browsers hard-cap concurrent instances (Chrome: 6,
// Safari: ~4). Creating a new one per playTone() call exhausted the cap after
// rapid taps, causing silent failures. One shared instance + lightweight
// per-tone OscillatorNodes is the correct Web Audio pattern.
let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new AudioCtx();
    }
    // Browsers auto-suspend idle contexts; resume before use.
    if (_audioCtx.state === "suspended") {
      _audioCtx.resume().catch(() => {});
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.08
): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
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
  const { soundEnabled, setSoundEnabled } = useSoundContext();

  const muted = !soundEnabled;
  const setMuted = useCallback(
    (val: boolean) => setSoundEnabled(!val),
    [setSoundEnabled]
  );

  const playClick = useCallback(() => {
    if (!soundEnabled) return;
    playTone(680, 0.06, "triangle", 0.06);
    Haptics.selectionAsync().catch(() => {});
  }, [soundEnabled]);

  const playSuccess = useCallback(() => {
    if (!soundEnabled) return;
    playTone(523, 0.12, "sine", 0.07);
    setTimeout(() => playTone(659, 0.12, "sine", 0.07), 110);
    setTimeout(() => playTone(784, 0.28, "sine", 0.09), 220);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [soundEnabled]);

  const playWarning = useCallback(() => {
    if (!soundEnabled) return;
    playTone(400, 0.1, "sawtooth", 0.07);
    setTimeout(() => playTone(300, 0.22, "sawtooth", 0.07), 130);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, [soundEnabled]);

  const playPermissionGranted = useCallback(() => {
    if (!soundEnabled) return;
    playTone(880, 0.08, "sine", 0.07);
    setTimeout(() => playTone(1100, 0.18, "sine", 0.06), 100);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [soundEnabled]);

  const playLock = useCallback(() => {
    if (!soundEnabled) return;
    playTone(220, 0.08, "square", 0.06);
    setTimeout(() => playTone(180, 0.15, "square", 0.08), 90);
    setTimeout(() => playTone(150, 0.3, "sine", 0.06), 180);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, [soundEnabled]);

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
