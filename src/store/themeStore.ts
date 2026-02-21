import { create } from "zustand";

const STORAGE_KEY = "nutritrack-theme";

export type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return "light";
}

/** Call before React mounts to avoid flash. */
export function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  hydrate: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "light",

  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    get().setTheme(next);
  },

  hydrate: () => {
    const theme = getStoredTheme();
    set({ theme });
    applyTheme(theme);
  },
}));
