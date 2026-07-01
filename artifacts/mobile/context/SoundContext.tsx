import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const SOUND_KEY = "ducklock_sound_enabled";

interface SoundContextValue {
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
}

const SoundContext = createContext<SoundContextValue>({
  soundEnabled: true,
  setSoundEnabled: () => {},
});

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SOUND_KEY)
      .then((val) => {
        if (val !== null) setSoundEnabledState(JSON.parse(val) as boolean);
      })
      .catch(() => {});
  }, []);

  const setSoundEnabled = useCallback((val: boolean) => {
    setSoundEnabledState(val);
    AsyncStorage.setItem(SOUND_KEY, JSON.stringify(val)).catch(() => {});
  }, []);

  return (
    <SoundContext.Provider value={{ soundEnabled, setSoundEnabled }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundContext() {
  return useContext(SoundContext);
}
