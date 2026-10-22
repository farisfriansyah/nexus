"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { LocalStoragePreferencesRepository } from "@/features/preferences/repository";

export const PREFERENCES_VERSION = 2;
const STORAGE_PREFIX = "nexus-preferences";

export interface PreferencesState {
  email: string;
  autoplay: boolean;
  intervalSeconds: number;
  hiddenTv: Record<string, string[]>;
  hiddenAnalytic: Record<string, string[]>;
  setAutoplay: (enabled: boolean) => void;
  setIntervalSeconds: (seconds: number) => void;
  toggleWidget: (mode: "tv" | "analytic", tab: string, widgetId: string) => void;
  reset: () => void;
}

export type PersistedPreferences = Pick<
  PreferencesState,
  "email" | "autoplay" | "intervalSeconds" | "hiddenTv" | "hiddenAnalytic"
>;

const defaults = (email: string) => ({
  email,
  autoplay: true,
  intervalSeconds: 15,
  hiddenTv: {} as Record<string, string[]>,
  hiddenAnalytic: {} as Record<string, string[]>
});

export function migratePreferences(persisted: unknown, version: number, email: string): PersistedPreferences {
  if (version < 2) {
    const old = persisted as Partial<PreferencesState>;
    return {
      ...defaults(email),
      autoplay: old.autoplay ?? true,
      intervalSeconds: old.intervalSeconds ?? 15,
      hiddenTv: old.hiddenTv ?? {}
    };
  }
  return persisted as PersistedPreferences;
}

export function createPreferencesStore(email: string) {
  const noopStorage: StateStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined
  };
  const storageKey = `${STORAGE_PREFIX}:${encodeURIComponent(email.toLowerCase())}`;
  const repository = new LocalStoragePreferencesRepository<string>(storageKey);
  const repositoryStorage: StateStorage = {
    getItem: (name) => name === storageKey ? repository.load() : null,
    setItem: (name, value) => { if (name === storageKey) repository.save(value); },
    removeItem: (name) => { if (typeof window !== "undefined") window.localStorage.removeItem(name); }
  };
  return create<PreferencesState>()(persist(
    (set) => ({
      ...defaults(email),
      setAutoplay: (autoplay) => set({ autoplay }),
      setIntervalSeconds: (intervalSeconds) => set({ intervalSeconds: Math.max(5, Math.min(120, intervalSeconds)) }),
      toggleWidget: (mode, tab, widgetId) => set((state) => {
        const key = mode === "tv" ? "hiddenTv" : "hiddenAnalytic";
        const current = state[key][tab] ?? [];
        const hidden = current.includes(widgetId) ? current.filter((id) => id !== widgetId) : [...current, widgetId];
        return { [key]: { ...state[key], [tab]: hidden } };
      }),
      reset: () => set(defaults(email))
    }),
    {
      name: storageKey,
      version: PREFERENCES_VERSION,
      storage: createJSONStorage(() => typeof window === "undefined" ? noopStorage : repositoryStorage),
      migrate: (persisted, version) => migratePreferences(persisted, version, email),
      partialize: (state) => ({
        email: state.email,
        autoplay: state.autoplay,
        intervalSeconds: state.intervalSeconds,
        hiddenTv: state.hiddenTv,
        hiddenAnalytic: state.hiddenAnalytic
      })
    }
  ));
}
