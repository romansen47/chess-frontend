import { useEffect, useRef } from "react";
import { useI18n, type Language } from "./I18nProvider";

const TERMINATE_PROGRAM_TEXT =
  "Terminate Program?\n\nThe chess server and, in development mode, the frontend server will be stopped.";

const noGameText: Record<Language, string> = {
  en: "The selected PGN file does not contain a game.",
  de: "Die ausgewählte PGN-Datei enthält keine Partie.",
  fr: "Le fichier PGN sélectionné ne contient aucune partie.",
  it: "Il file PGN selezionato non contiene alcuna partita.",
  es: "El archivo PGN seleccionado no contiene ninguna partida.",
};

const multipleGamesText: Record<Language, (countText: string) => string> = {
  en: (countText) => `This PGN contains multiple games${countText}. “Import New Game” accepts exactly one game. Please use Chess Database → Import PGN for multi-game PGN files.`,
  de: (countText) => `Diese PGN-Datei enthält mehrere Partien${countText}. „Neue Partie importieren“ akzeptiert genau eine Partie. Bitte verwende für PGN-Dateien mit mehreren Partien Schachdatenbank → PGN importieren.`,
  fr: (countText) => `Ce fichier PGN contient plusieurs parties${countText}. « Importer une nouvelle partie » accepte exactement une partie. Pour les fichiers PGN contenant plusieurs parties, utilisez Base de données d’échecs → Importer un PGN.`,
  it: (countText) => `Questo file PGN contiene più partite${countText}. “Importa nuova partita” accetta esattamente una partita. Per i file PGN con più partite usa Database scacchistico → Importa PGN.`,
  es: (countText) => `Este archivo PGN contiene varias partidas${countText}. “Importar nueva partida” acepta exactamente una partida. Para archivos PGN con varias partidas usa Base de datos de ajedrez → Importar PGN.`,
};

const terminateProgramText: Record<Language, string> = {
  en: TERMINATE_PROGRAM_TEXT,
  de: "Programm beenden?\n\nDer Schachserver und im Entwicklungsmodus auch der Frontend-Server werden beendet.",
  fr: "Arrêter le programme ?\n\nLe serveur d’échecs et, en mode développement, le serveur frontend seront arrêtés.",
  it: "Terminare il programma?\n\nIl server scacchistico e, in modalità di sviluppo, anche il server frontend verranno arrestati.",
  es: "¿Cerrar el programa?\n\nEl servidor de ajedrez y, en modo de desarrollo, también el servidor frontend se detendrán.",
};

const terminateEngineText: Record<Language, (pid: string, label: string) => string> = {
  en: (pid, label) => `Really terminate engine process ${pid} (${label})?`,
  de: (pid, label) => `Engine-Prozess ${pid} (${label}) wirklich beenden?`,
  fr: (pid, label) => `Arrêter réellement le processus moteur ${pid} (${label}) ?`,
  it: (pid, label) => `Terminare davvero il processo del motore ${pid} (${label})?`,
  es: (pid, label) => `¿Terminar realmente el proceso del motor ${pid} (${label})?`,
};

function localizeSingleGameImportError(
  code: string,
  gameCount: number | undefined,
  language: Language,
): string | null {
  if (code === "PGN_NO_GAME") {
    return noGameText[language];
  }

  if (code === "PGN_MULTIPLE_GAMES") {
    const count = Number.isFinite(gameCount) ? gameCount : undefined;
    const countText = count == null ? "" : ` (${count})`;
    return multipleGamesText[language](countText);
  }

  return null;
}

export default function BrowserLocaleBridge() {
  const { language, locale } = useI18n();
  const languageRef = useRef(language);
  const localeRef = useRef(locale);

  languageRef.current = language;
  localeRef.current = locale;

  useEffect(() => {
    const nativeConfirm = window.confirm.bind(window);
    const nativeFetch = window.fetch.bind(window);
    const nativeNumberToLocaleString = Number.prototype.toLocaleString;
    const nativeDateToLocaleString = Date.prototype.toLocaleString;
    const nativeDateToLocaleTimeString = Date.prototype.toLocaleTimeString;

    window.confirm = (message?: string) => {
      const currentLanguage = languageRef.current;
      let translated = message ?? "";

      if (translated === TERMINATE_PROGRAM_TEXT) {
        translated = terminateProgramText[currentLanguage];
      } else {
        const engineMatch = /^Engine-Prozess (.+) \((.+)\) wirklich beenden\?$/.exec(translated);
        if (engineMatch) {
          const [, pid, label] = engineMatch;
          translated = terminateEngineText[currentLanguage](pid, label);
        }
      }

      return nativeConfirm(translated);
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await nativeFetch(input, init);
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

      if (method === "POST" && url.includes("/api/game/pgn") && !response.ok) {
        try {
          const payload = await response.clone().json() as { code?: string; gameCount?: number };
          if (payload.code) {
            const localized = localizeSingleGameImportError(
              payload.code,
              payload.gameCount,
              languageRef.current,
            );
            if (localized) {
              const headers = new Headers(response.headers);
              headers.set("Content-Type", "text/plain; charset=utf-8");
              return new Response(localized, {
                status: response.status,
                statusText: response.statusText,
                headers,
              });
            }
          }
        } catch {
          // Non-JSON API errors continue unchanged.
        }
      }

      return response;
    };

    Number.prototype.toLocaleString = function(locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions) {
      return nativeNumberToLocaleString.call(this, locales ?? localeRef.current, options);
    };

    Date.prototype.toLocaleString = function(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
      return nativeDateToLocaleString.call(this, locales ?? localeRef.current, options);
    };

    Date.prototype.toLocaleTimeString = function(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
      return nativeDateToLocaleTimeString.call(this, locales ?? localeRef.current, options);
    };

    return () => {
      window.confirm = nativeConfirm;
      window.fetch = nativeFetch;
      Number.prototype.toLocaleString = nativeNumberToLocaleString;
      Date.prototype.toLocaleString = nativeDateToLocaleString;
      Date.prototype.toLocaleTimeString = nativeDateToLocaleTimeString;
    };
  }, []);

  return null;
}
