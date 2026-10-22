"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme !== "light";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Ganti ke tema ${isDark ? "terang" : "gelap"}`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}
