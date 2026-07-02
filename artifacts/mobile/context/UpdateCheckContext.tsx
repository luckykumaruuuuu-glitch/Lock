import React, { createContext, useContext } from "react";
import { UpdateInfo, useUpdateCheck } from "@/hooks/useUpdateCheck";

interface UpdateCheckContextValue {
  showUpdateModal: boolean;
  updateInfo: UpdateInfo | null;
  hasUpdate: boolean;
  dismiss: () => void;
  reopenModal: () => void;
}

const UpdateCheckContext = createContext<UpdateCheckContextValue>({
  showUpdateModal: false,
  updateInfo: null,
  hasUpdate: false,
  dismiss: () => {},
  reopenModal: () => {},
});

export function UpdateCheckProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useUpdateCheck();
  return (
    <UpdateCheckContext.Provider value={value}>
      {children}
    </UpdateCheckContext.Provider>
  );
}

export function useUpdateCheckContext() {
  return useContext(UpdateCheckContext);
}
