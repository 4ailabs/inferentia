import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { localeSwitchHref, oppositeLocale } from "@/lib/i18n";

/**
 * Minimal locale toggle — two pills "EN | ES".
 * The active one is filled with ink, the inactive is a link that flips locale
 * while preserving the rest of the query string.
 */
export function LocaleToggle({
  locale,
  pathname,
  search = {},
}: {
  locale: Locale;
  pathname: string;
  search?: Record<string, string | string[] | undefined>;
}) {
  const other = oppositeLocale(locale);
  const otherHref = localeSwitchHref(pathname, other, search);

  const pill = "px-2 py-1 text-[10px] tabular tracking-[0.18em] uppercase transition-colors";
  const active = "bg-ink text-paper";
  const inactive = "text-ink-mute hover:text-ink";

  return (
    <div className="inline-flex items-center border border-rule">
      {locale === "en" ? (
        <span className={`${pill} ${active}`}>EN</span>
      ) : (
        <Link href={otherHref} className={`${pill} ${inactive}`}>
          EN
        </Link>
      )}
      <span className="w-px h-3 bg-rule" />
      {locale === "es" ? (
        <span className={`${pill} ${active}`}>ES</span>
      ) : (
        <Link href={otherHref} className={`${pill} ${inactive}`}>
          ES
        </Link>
      )}
    </div>
  );
}
