import React, { createContext, useContext } from "react";

import { useFirebaseSync, FirebaseSyncState } from "@/hooks/useFirebaseSync";
import { LockEntry } from "@/hooks/useLockStorage";

/* ───────────────────────────────────────────────
   Context shape
─────────────────────────────────────────────── */
interface FirebaseSyncContextType extends FirebaseSyncState {
  saveToFirebase: (entry: LockEntry) => Promise<void>;
}

const FirebaseSyncContext = createContext<FirebaseSyncContextType>({
  deviceId: null,
  online: false,
  lastSyncedAt: null,
  configured: false,
  startupSyncStatus: "checking",
  saveToFirebase: async () => {},
});

/* ───────────────────────────────────────────────
   Provider — mount once at the app root.
   Initialises Firebase listeners, connection
   state tracking, and the 30-min sync interval.
─────────────────────────────────────────────── */
export function FirebaseSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { saveFirebaseLockOnConfirm, ...syncState } = useFirebaseSync();

  return (
    <FirebaseSyncContext.Provider
      value={{ ...syncState, saveToFirebase: saveFirebaseLockOnConfirm }}
    >
      {children}
    </FirebaseSyncContext.Provider>
  );
}

/* ───────────────────────────────────────────────
   Consumer hook
─────────────────────────────────────────────── */
export function useFirebaseSyncContext() {
  return useContext(FirebaseSyncContext);
}
