import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  SUPPORTED_LANGUAGES,
  detectSupportedLanguage,
  getLanguageDefinition,
  isSupportedLanguage,
  type Language,
} from "./languages";
import {
  findTranslationKey,
  getTranslation,
  interpolate,
  type TranslationKey,
} from "./translationCatalog";

export type { Language } from "./languages";

interface I18nContextValue {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const STORAGE_KEY = "chess.language";

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLanguage(): Language {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isSupportedLanguage(stored)) {
    return stored;
  }
  return detectSupportedLanguage(window.navigator.language);
}

type DynamicFormatter<T extends unknown[]> = Record<Language, (...args: T) => string>;

const analyzingText: DynamicFormatter<[string, string]> = {
  en: (current, total) => `Analyzing ${current} / ${total}…`,
  de: (current, total) => `Analyse ${current} / ${total}…`,
  fr: (current, total) => `Analyse ${current} / ${total}…`,
  it: (current, total) => `Analisi ${current} / ${total}…`,
  es: (current, total) => `Analizando ${current} / ${total}…`,
};

const mateText: DynamicFormatter<[boolean, string | undefined]> = {
  en: (white, distance) => `Mate for ${white ? "White" : "Black"}${distance ? ` in ${distance}` : ""}`,
  de: (white, distance) => `Matt für ${white ? "Weiß" : "Schwarz"}${distance ? ` in ${distance}` : ""}`,
  fr: (white, distance) => `Mat pour les ${white ? "Blancs" : "Noirs"}${distance ? ` en ${distance}` : ""}`,
  it: (white, distance) => `Matto per il ${white ? "Bianco" : "Nero"}${distance ? ` in ${distance}` : ""}`,
  es: (white, distance) => `Mate para las ${white ? "Blancas" : "Negras"}${distance ? ` en ${distance}` : ""}`,
};

const continuationsText: DynamicFormatter<[string]> = {
  en: (count) => `${count} continuations`,
  de: (count) => `${count} Fortsetzungen`,
  fr: (count) => `${count} continuations`,
  it: (count) => `${count} continuazioni`,
  es: (count) => `${count} continuaciones`,
};

const whiteWinsText: DynamicFormatter<[string]> = {
  en: (count) => `${count} white wins`,
  de: (count) => `${count} Siege für Weiß`,
  fr: (count) => `${count} victoires des Blancs`,
  it: (count) => `${count} vittorie del Bianco`,
  es: (count) => `${count} victorias de las Blancas`,
};

const blackWinsText: DynamicFormatter<[string]> = {
  en: (count) => `${count} black wins`,
  de: (count) => `${count} Siege für Schwarz`,
  fr: (count) => `${count} victoires des Noirs`,
  it: (count) => `${count} vittorie del Nero`,
  es: (count) => `${count} victorias de las Negras`,
};

const drawsText: DynamicFormatter<[string]> = {
  en: (count) => `${count} draws`,
  de: (count) => `${count} Remis`,
  fr: (count) => `${count} nulles`,
  it: (count) => `${count} patte`,
  es: (count) => `${count} tablas`,
};

function translateDynamicText(text: string, language: Language): string | null {
  let match = /^(?:Analyzing|Analyse|Analisi|Analizando)\s+(\d+)\s*\/\s*(\d+)…?$/.exec(text);
  if (match) {
    return analyzingText[language](match[1], match[2]);
  }

  const completeLabels = SUPPORTED_LANGUAGES.map(({ code }) => getTranslation("analysis.complete", code));
  const completePrefix = completeLabels.find((label) => text.startsWith(`${label} (`));
  if (completePrefix && text.endsWith(").")) {
    return `${getTranslation("analysis.complete", language)} ${text.slice(completePrefix.length + 1)}`;
  }

  match = /^(?:Mate for|Matt für|Mat pour les|Matto per il|Mate para las)\s+(White|Black|Weiß|Schwarz|Blancs|Noirs|Bianco|Nero|Blancas|Negras)(?:\s+(?:in|en)\s+(\d+))?$/.exec(text);
  if (match) {
    const white = ["White", "Weiß", "Blancs", "Bianco", "Blancas"].includes(match[1]);
    return mateText[language](white, match[2]);
  }

  match = /^(\d[\d.,\s]*)\s+(?:continuations|Fortsetzungen|continuazioni|continuaciones)$/.exec(text);
  if (match) {
    return continuationsText[language](match[1]);
  }

  match = /^(\d[\d.,\s]*)\s+(?:white wins|Siege für Weiß|victoires des Blancs|vittorie del Bianco|victorias de las Blancas)$/.exec(text);
  if (match) {
    return whiteWinsText[language](match[1]);
  }

  match = /^(\d[\d.,\s]*)\s+(?:black wins|Siege für Schwarz|victoires des Noirs|vittorie del Nero|victorias de las Negras)$/.exec(text);
  if (match) {
    return blackWinsText[language](match[1]);
  }

  match = /^(\d[\d.,\s]*)\s+(?:draws|Remis|nulles|patte|tablas)$/.exec(text);
  if (match) {
    return drawsText[language](match[1]);
  }

  return null;
}

function translateText(text: string, language: Language): string {
  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  const core = text.trim();
  if (!core) {
    return text;
  }

  const key = findTranslationKey(core);
  if (key) {
    return `${leading}${getTranslation(key, language)}${trailing}`;
  }

  const dynamic = translateDynamicText(core, language);
  return dynamic == null ? text : `${leading}${dynamic}${trailing}`;
}

function translateElement(root: ParentNode, language: Language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const parent = current.parentElement;
    if (
      parent
      && !parent.closest(".language-selector")
      && !["SCRIPT", "STYLE", "CODE", "PRE"].includes(parent.tagName)
    ) {
      const translated = translateText(current.textContent ?? "", language);
      if (translated !== current.textContent) {
        current.textContent = translated;
      }
    }
    current = walker.nextNode();
  }

  const elements = root instanceof Element
    ? [root, ...root.querySelectorAll("*")]
    : [...root.querySelectorAll("*")];

  for (const element of elements) {
    for (const attribute of ["title", "aria-label", "placeholder"] as const) {
      const value = element.getAttribute(attribute);
      if (value) {
        const translated = translateText(value, language);
        if (translated !== value) {
          element.setAttribute(attribute, translated);
        }
      }
    }
  }
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>(detectInitialLanguage);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    locale: getLanguageDefinition(language).locale,
    setLanguage: (nextLanguage) => setLanguageState(nextLanguage),
    t: (key, values) => interpolate(getTranslation(key, language), values),
  }), [language]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.title = getTranslation("app.title", language);

    translateElement(document.body, language);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" && mutation.target.parentNode) {
          translateElement(mutation.target.parentNode as ParentNode, language);
          continue;
        }

        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            translateElement(node as Element, language);
          } else if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
            translateElement(node.parentNode as ParentNode, language);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}
