import type { formats, locales } from "@/i18n/request";
import type messages from "./messages/en.json";

// Makes next-intl type-check message keys against messages/en.json, so a
// typo in a key fails `npm run typecheck` instead of showing at runtime.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof locales)[number];
    Messages: typeof messages;
    Formats: typeof formats;
  }
}
