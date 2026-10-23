"use client";
import { useTheme, type ThemePref } from "@/lib/themeContext";

export const UNOFFICIAL_NOTE =
  "Unofficial — made for fun by a regular. Not affiliated with Herndon Centennial Golf Course.";

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// Shared footer for the non-play screens: appearance setting, the course's
// real booking / directions / phone links, and the unofficial disclaimer.
export default function SiteFooter() {
  const { pref, setPref } = useTheme();
  const link = "text-link hover:underline";
  return (
    <footer className="mt-12 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center space-y-3">
      <div className="inline-flex items-center gap-2 text-xs text-subtle">
        <span id="appearance-label">Appearance</span>
        <div role="radiogroup" aria-labelledby="appearance-label" className="inline-flex rounded-lg border border-app bg-card p-0.5">
          {THEME_OPTIONS.map((o) => (
            <button
              key={o.value}
              role="radio"
              aria-checked={pref === o.value}
              onClick={() => setPref(o.value)}
              className={`min-h-8 px-3 rounded-md font-semibold transition-colors ${
                pref === o.value ? "bg-primary text-on-primary" : "text-muted hover:text-app"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-subtle text-xs">
        <a href="https://www.herndongolf.com/tee-times/" target="_blank" rel="noopener noreferrer" className={link}>
          Book a Tee Time ↗
        </a>
        <span aria-hidden> · </span>
        <a
          href="https://www.google.com/maps/dir/?api=1&destination=909+Ferndale+Ave+Herndon+VA+20170"
          target="_blank"
          rel="noopener noreferrer"
          className={link}
        >
          909 Ferndale Ave, Herndon VA
        </a>
        <span aria-hidden> · </span>
        <a href="tel:+17034715769" className={link}>(703) 471-5769</a>
      </p>
      <p className="text-subtle text-[11px] max-w-xs mx-auto leading-snug">{UNOFFICIAL_NOTE}</p>
    </footer>
  );
}
