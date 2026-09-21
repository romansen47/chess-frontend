import {
  SUPPORTED_LANGUAGES,
  type Language,
} from "./languages";
import { englishTranslations, type TranslationKey } from "./translations/en";
import { germanTranslations } from "./translations/de";
import { frenchTranslations } from "./translations/fr";
import { italianTranslations } from "./translations/it";
import { spanishTranslations } from "./translations/es";

export type { TranslationKey } from "./translations/en";

type TranslationCatalog = Record<TranslationKey, string>;

const translations = {
  en: englishTranslations,
  de: germanTranslations,
  fr: frenchTranslations,
  it: italianTranslations,
  es: spanishTranslations,
} satisfies Record<Language, TranslationCatalog>;

const aliases: Record<string, TranslationKey> = {
  "Aktualisieren": "common.refresh",
  "Historie": "engine.history",
  "Engine-Historie": "engine.historyTitle",
  "Aktuelle UCI-Instanzen, Prozesse und Kommunikation": "engine.currentSubtitle",
  "UCI-Protokoll": "engine.protocol",
  "Typ": "engine.type",
  "Instanz seit": "engine.instanceSince",
  "Prozess seit": "engine.processSince",
};

export function getTranslation(
  key: TranslationKey,
  language: Language,
): string {
  return translations[language][key];
}

export function findTranslationKey(text: string): TranslationKey | null {
  if (aliases[text]) {
    return aliases[text];
  }

  for (const key of Object.keys(englishTranslations) as TranslationKey[]) {
    if (
      SUPPORTED_LANGUAGES.some(
        ({ code }) => getTranslation(key, code) === text,
      )
    ) {
      return key;
    }
  }
  return null;
}

export function interpolate(
  template: string,
  values?: Record<string, string | number>,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : match,
  );
}
