export const SUPPORTED_LANGUAGES = [
  { code: "en", nativeName: "English", locale: "en-US" },
  { code: "de", nativeName: "Deutsch", locale: "de-DE" },
  { code: "fr", nativeName: "Français", locale: "fr-FR" },
  { code: "it", nativeName: "Italiano", locale: "it-IT" },
  { code: "es", nativeName: "Español", locale: "es-ES" },
] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: Language = "en";

const languageByCode = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((language) => [language.code, language]),
) as Record<Language, (typeof SUPPORTED_LANGUAGES)[number]>;

export function isSupportedLanguage(value: string | null | undefined): value is Language {
  return Boolean(value && Object.prototype.hasOwnProperty.call(languageByCode, value));
}

export function getLanguageDefinition(language: Language) {
  return languageByCode[language];
}

export function detectSupportedLanguage(browserLocale: string): Language {
  const normalized = browserLocale.toLowerCase();
  const match = SUPPORTED_LANGUAGES.find(({ code }) =>
    normalized === code || normalized.startsWith(`${code}-`),
  );
  return match?.code ?? DEFAULT_LANGUAGE;
}
