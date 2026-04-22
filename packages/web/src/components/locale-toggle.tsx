import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { oppositeLocale, localeShort, localeSwitchHref } from "@/lib/i18n";

/**
 * Minimal locale toggle. Renders "EN / ES" with the inactive one linked,
 * keeping the current pathname and setting ?lang= accordingly.
 */
export function LocaleToggle({
  locale,
  pathname,
}: {
  locale: Locale;
  pathname: string;
}) {
  const other = oppositeLocale(locale);
  return (
    <div className="flex items-center gap-2 text-[10.5px] tabular tracking-[0.18em] uppercase text-ink-mute">
      <span className={locale === "en" ? "text-ink font-medium" : ""}>
        EN
      </span>
      <span className="text-ink-mute">·</span>
      <span className={locale === "es" ? "text-ink font-medium" : ""}>
        ES
      </span>
      <Link
        href={localeSwitchHref(pathname, other)}
        className="ml-2 border border-rule px-2 py-1 text-[10px] hover:border-ink hover:text-ink transition-colors"
      >
        {localeShort(other)} ↗
      </Link>
    </div>
  );
}
