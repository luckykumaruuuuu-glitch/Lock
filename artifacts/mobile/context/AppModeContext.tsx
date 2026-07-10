import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const APP_MODE_KEY = "ducklock_app_mode";

export type AppMode = "DuckLock" | "DuckPal";

interface AppModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleAppMode: () => void;
}

const AppModeContext = createContext<AppModeContextValue>({
  mode: "DuckLock",
  setMode: () => {},
  toggleAppMode: () => {},
});

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppMode>("DuckLock");

  useEffect(() => {
    AsyncStorage.getItem(APP_MODE_KEY)
      .then((val) => {
        if (val === "DuckLock" || val === "DuckPal") setModeState(val);
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((val: AppMode) => {
    setModeState(val);
    AsyncStorage.setItem(APP_MODE_KEY, val).catch(() => {});
  }, []);

  const toggleAppMode = useCallback(() => {
    setModeState((prev) => {
      const next: AppMode = prev === "DuckLock" ? "DuckPal" : "DuckLock";
      AsyncStorage.setItem(APP_MODE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  return (
    <AppModeContext.Provider value={{ mode, setMode, toggleAppMode }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  return useContext(AppModeContext);
}
