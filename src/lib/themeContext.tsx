"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// "system" follows the phone/computer's own light/dark setting (the default).
export type ThemePref = "system" | "light" | "dark";
type Theme = "light" | "dark";
interface Ctx {
  theme: Theme;                 // what is showing right now
  pref: ThemePref;              // what the player chose
  setPref: (p: ThemePref) => void;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}
const ThemeContext = createContext<Ctx>({
  theme: "light", pref: "system", setPref: () => {}, toggle: () => {}, setTheme: () => {},
});

function systemTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>("system");
  const [sys, setSys] = useState<Theme>("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hcgc-theme");
      if (saved === "dark" || saved === "light" || saved === "system") setPrefState(saved);
    } catch { /* storage unavailable — stay on system */ }
    setSys(systemTheme());
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => setSys(systemTheme());
    mq?.addEventListener?.("change", onChange);
    return () => mq?.removeEventListener?.("change", onChange);
  }, []);

  const theme: Theme = pref === "system" ? sys : pref;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    try { localStorage.setItem("hcgc-theme", p); } catch { /* ignore */ }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme, pref, setPref,
        toggle: () => setPref(theme === "light" ? "dark" : "light"),
        setTheme: (t) => setPref(t),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
