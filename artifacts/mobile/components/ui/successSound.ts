import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const SAMPLE_RATE = 44_100;
const WAV_FILE_URI = FileSystem.cacheDirectory
  ? `${FileSystem.cacheDirectory}duckpal-success-chime.wav`
  : null;

let nativeSoundPromise: Promise<Audio.Sound | null> | null = null;
let webAudioContext: AudioContext | null = null;

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function toBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const hasSecond = second !== undefined;
    const hasThird = third !== undefined;

    result += alphabet[first >> 2];
    result += alphabet[((first & 0x03) << 4) | (hasSecond ? second >> 4 : 0)];
    result += hasSecond ? alphabet[((second & 0x0f) << 2) | (hasThird ? third >> 6 : 0)] : "=";
    result += hasThird ? alphabet[third & 0x3f] : "=";
  }

  return result;
}

function createSuccessChimeBase64(): string {
  const durationSeconds = 0.52;
  const sampleCount = Math.floor(SAMPLE_RATE * durationSeconds);
  const bytesPerSample = 2;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + sampleCount * bytesPerSample);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + sampleCount * bytesPerSample, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, sampleCount * bytesPerSample, true);

  const notes = [
    { frequency: 784, start: 0 },
    { frequency: 1046.5, start: 0.08 },
    { frequency: 1318.5, start: 0.16 },
  ];

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const time = sampleIndex / SAMPLE_RATE;
    let sample = 0;

    for (const note of notes) {
      const elapsed = time - note.start;
      if (elapsed < 0) continue;

      const attack = Math.min(1, elapsed / 0.008);
      const envelope = attack * Math.exp(-5.8 * elapsed);
      sample += Math.sin(2 * Math.PI * note.frequency * elapsed) * envelope * 0.28;
    }

    const clampedSample = Math.max(-1, Math.min(1, sample));
    view.setInt16(headerSize + sampleIndex * bytesPerSample, clampedSample * 0x7fff, true);
  }

  return toBase64(new Uint8Array(buffer));
}

async function prepareNativeSuccessSound(): Promise<Audio.Sound | null> {
  if (!WAV_FILE_URI) return null;

  try {
    const fileInfo = await FileSystem.getInfoAsync(WAV_FILE_URI);
    if (!fileInfo.exists) {
      await FileSystem.writeAsStringAsync(
        WAV_FILE_URI,
        createSuccessChimeBase64(),
        { encoding: FileSystem.EncodingType.Base64 },
      );
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: WAV_FILE_URI },
      { shouldPlay: false, volume: 0.75 },
    );
    return sound;
  } catch {
    return null;
  }
}

function getNativeSuccessSound(): Promise<Audio.Sound | null> {
  if (!nativeSoundPromise) {
    nativeSoundPromise = prepareNativeSuccessSound();
  }
  return nativeSoundPromise;
}

function getWebAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;

  try {
    const AudioContextConstructor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;

    if (!webAudioContext || webAudioContext.state === "closed") {
      webAudioContext = new AudioContextConstructor();
    }
    if (webAudioContext.state === "suspended") {
      void webAudioContext.resume().catch(() => {});
    }
    return webAudioContext;
  } catch {
    return null;
  }
}

function playWebSuccessChime() {
  const context = getWebAudioContext();
  if (!context) return;

  const now = context.currentTime;
  const notes = [
    { frequency: 784, start: 0, duration: 0.28 },
    { frequency: 1046.5, start: 0.08, duration: 0.34 },
    { frequency: 1318.5, start: 0.16, duration: 0.42 },
  ];

  for (const note of notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = now + note.start;
    const end = start + note.duration;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(note.frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.16, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end);
  }
}

export function prepareSuccessSound() {
  if (Platform.OS !== "web") {
    void getNativeSuccessSound();
  }
}

export function playSuccessSound() {
  if (Platform.OS === "web") {
    playWebSuccessChime();
    return;
  }

  void getNativeSuccessSound().then((sound) => {
    if (!sound) return;
    void sound.replayAsync().catch(() => {});
  });
}
