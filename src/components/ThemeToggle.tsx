"use client";
import { useTheme } from "@/lib/themeContext";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border border-app hover:bg-accent transition-colors ${className}`}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? (
        <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" className="text-app">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" className="text-app">
          <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm3-1a1 1 0 100 2h1a1 1 0 100-2h-1zM3 9a1 1 0 000 2h1a1 1 0 100-2H3zm11.657-5.657a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zm-9.9 9.9a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm5.657-.657a1 1 0 10-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zm-11.314 0a1 1 0 011.414 0l.707.707A1 1 0 015.05 17.464l-.707-.707a1 1 0 010-1.414z" />
        </svg>
      )}
    </button>
  );
}
