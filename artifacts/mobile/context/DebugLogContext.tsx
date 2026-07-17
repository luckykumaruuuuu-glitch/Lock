/**
 * DebugLogContext — manages the "Show Debug Log Icon" toggle.
 *
 * State is persisted to AsyncStorage so it survives app restarts.
 * Default is OFF so it never appears for normal users.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "@ducklock/show_debug_icon";

interface DebugLogContextValue {
  showDebugIcon: boolean;
  setShowDebugIcon: (v: boolean) => void;
}

const DebugLogContext = createContext<DebugLogContextValue>({
  showDebugIcon: false,
  setShowDebugIcon: () => {},
});

export function DebugLogProvider({ children }: { children: React.ReactNode }) {
  const [showDebugIcon, setShowDebugIconState] = useState(false);

  // Load persisted value on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => { if (v === "true") setShowDebugIconState(true); })
      .catch(() => {});
  }, []);

  function setShowDebugIcon(v: boolean) {
    setShowDebugIconState(v);
    AsyncStorage.setItem(STORAGE_KEY, v ? "true" : "false").catch(() => {});
  }

  return (
    <DebugLogContext.Provider value={{ showDebugIcon, setShowDebugIcon }}>
      {children}
    </DebugLogContext.Provider>
  );
}

export function useDebugLog() {
  return useContext(DebugLogContext);
}
