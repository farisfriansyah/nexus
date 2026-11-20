"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createPreferencesStore, type PreferencesState } from "@/features/preferences/store";
import type { StoreApi } from "zustand";
import { useStore } from "zustand";

const PreferencesContext = createContext<StoreApi<PreferencesState> | null>(null);
const CanManageContext = createContext(false);

export function PreferencesProvider({ email, canManage = false, children }: { email: string; canManage?: boolean; children: ReactNode }) {
  const [store] = useState(() => createPreferencesStore(email));
  return <CanManageContext.Provider value={canManage}><PreferencesContext.Provider value={store}>{children}</PreferencesContext.Provider></CanManageContext.Provider>;
}

export function usePreferences<T>(selector: (state: PreferencesState) => T): T {
  const store = useContext(PreferencesContext);
  if (!store) throw new Error("usePreferences must be used within PreferencesProvider");
  return useStore(store, selector);
}

export function useCanManage(): boolean {
  return useContext(CanManageContext);
}
