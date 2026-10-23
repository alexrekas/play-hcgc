export const UNOFFICIAL_NOTE =
  "Unofficial — made for fun by a regular. Not affiliated with Herndon Centennial Golf Course.";

// Shared footer for the non-play screens: the unofficial disclaimer plus the
// course's real booking / directions / phone links as plain secondary links.
export default function SiteFooter() {
  const link = "text-link hover:underline";
  return (
    <footer className="mt-12 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center space-y-2">
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
