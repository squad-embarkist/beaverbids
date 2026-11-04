import { createTranslator } from "next-intl";
import en from "../../../messages/en.json";

// Messages for the worker, which renders emails outside a request and so
// cannot use next-intl/server. Same file, same keys, type-checked the same
// way; the locale comes from the user's `language` column on the job.
export const EMAIL_LOCALES = ["en"] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];

const MESSAGES = { en } as const;

export function emailTranslator(locale: EmailLocale) {
  return createTranslator({ locale, messages: MESSAGES[locale], namespace: "Email" });
}

export type EmailTranslator = ReturnType<typeof emailTranslator>;
