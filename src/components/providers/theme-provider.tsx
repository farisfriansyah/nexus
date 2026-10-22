"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

import { THEME_STORAGE_KEY } from "@/lib/theme";

export type Theme = "dark" | "light";

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const notify = () => listeners.forEach((listener) => listener());
const getSnapshot = (): Theme => (document.documentElement.classList.contains("light") ? "light" : "dark");
const getServerSnapshot = (): Theme => "dark";

function applyTheme(next: Theme) {
  document.documentElement.classList.toggle("light", next === "light");
  document.documentElement.classList.toggle("dark", next === "dark");
  notify();
}

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* storage unavailable */ }
    applyTheme(next);
  }, []);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) applyTheme(event.newValue === "light" ? "light" : "dark");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
