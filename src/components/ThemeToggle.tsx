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
        // Moon (crescent) — tap to go dark
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-app">
          <path d="M20.742 15.01A8.5 8.5 0 1 1 9 3.258a7 7 0 0 0 11.742 11.752z" />
        </svg>
      ) : (
        // Sun — tap to go light. Clean 8-ray design.
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
          stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          className="text-app">
          <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
          <line x1="12" y1="2"  x2="12" y2="5"  />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2"  y1="12" x2="5"  y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
          <line x1="4.93"  y1="4.93"  x2="7.05"  y2="7.05"  />
          <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" />
          <line x1="4.93"  y1="19.07" x2="7.05"  y2="16.95" />
          <line x1="16.95" y1="7.05"  x2="19.07" y2="4.93" />
        </svg>
      )}
    </button>
  );
}
