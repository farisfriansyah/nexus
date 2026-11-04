"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createPreferencesStore, type PreferencesState } from "@/features/preferences/store";
import type { StoreApi } from "zustand";
import { useStore } from "zustand";

const PreferencesContext = createContext<StoreApi<PreferencesState> | null>(null);
const AdminContext = createContext(false);

export function PreferencesProvider({ email, isAdmin = false, children }: { email: string; isAdmin?: boolean; children: ReactNode }) {
  const [store] = useState(() => createPreferencesStore(email));
  return <AdminContext.Provider value={isAdmin}><PreferencesContext.Provider value={store}>{children}</PreferencesContext.Provider></AdminContext.Provider>;
}

export function usePreferences<T>(selector: (state: PreferencesState) => T): T {
  const store = useContext(PreferencesContext);
  if (!store) throw new Error("usePreferences must be used within PreferencesProvider");
  return useStore(store, selector);
}

export function useIsAdmin(): boolean {
  return useContext(AdminContext);
}
