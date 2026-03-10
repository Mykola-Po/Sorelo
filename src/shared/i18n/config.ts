export const LOCALE_COOKIE = "sorelo-locale";

export const SUPPORTED_LOCALES = ["en", "uk", "ru"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function resolveSupportedLocale(
  value: string | undefined
): SupportedLocale {
  if (value && isSupportedLocale(value)) {
    return value;
  }

  return "en";
}

export function getLocaleLabel(locale: SupportedLocale) {
  if (locale === "en") {
    return "EN";
  }

  if (locale === "uk") {
    return "UA";
  }

  return "RU";
}

export function getIntlLocale(locale: SupportedLocale) {
  if (locale === "uk") {
    return "uk-UA";
  }

  if (locale === "ru") {
    return "ru-RU";
  }

  return "en-US";
}
