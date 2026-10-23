import type { Formats } from "next-intl";
import { getRequestConfig } from "next-intl/server";

// English only for now. French is added by reading a locale cookie here,
// see docs/plans/m0-plan.md. The locale is fixed on purpose: a cookie read
// would make every page request-dependent under Cache Components.
export const locales = ["en"] as const;
export const defaultLocale = "en";

export const formats = {
  dateTime: {
    // "Oct 23, 2026", as docs/ui-ux-guide.md asks.
    short: { day: "numeric", month: "short", year: "numeric" },
  },
  number: {
    cad: { style: "currency", currency: "CAD", maximumFractionDigits: 0 },
  },
} satisfies Formats;

export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    formats,
    // Dates render in Eastern time wherever the server runs.
    timeZone: "America/Toronto",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
