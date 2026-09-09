import { useEffect, useRef } from "react";
import { useI18n, type Language } from "./I18nProvider";

const TERMINATE_PROGRAM_TEXT =
  "Terminate Program?\n\nThe chess server and, in development mode, the frontend server will be stopped.";

/**
 * ChessBoard's legacy single-game import still awaits File.text() before it
 * calls fetch(). Materializing a very large PGN as a JavaScript string would
 * duplicate the complete file in the browser heap.
 *
 * The bridge therefore substitutes this marker only for the dedicated
 * single-game PGN input and replaces it with the original File object again
 * immediately before the request is handed to the browser's native fetch.
 * The browser can then stream the file-backed Blob without creating the full
 * PGN string in JavaScript memory.
 */
const SINGLE_PGN_FILE_MARKER = "__CAT_SINGLE_PGN_FILE_STREAM__";

const noGameText: Record<Language, string> = {
  en: "The selected PGN file does not contain a game.",
  de: "Die ausgewählte PGN-Datei enthält keine Partie.",
  fr: "Le fichier PGN sélectionné ne contient aucune partie.",
  it: "Il file PGN selezionato non contiene alcuna partita.",
  es: "El archivo PGN seleccionado no contiene ninguna partida.",
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
  language: Language,
): string | null {
  if (code === "PGN_NO_GAME") {
    return noGameText[language];
  }

  // PGN_MULTIPLE_GAMES deliberately remains structured JSON. The dedicated
  // modal dialog owns that error because it also explains the database import path.
  return null;
}

function isSingleGamePgnInput(input: HTMLInputElement): boolean {
  if (input.type !== "file") {
    return false;
  }

  // The database dialog already uploads its File directly via FormData and
  // must never participate in this compatibility bridge.
  if (input.classList.contains("chess-database-hidden-input")) {
    return false;
  }

  const accept = input.accept.toLowerCase();
  return accept.includes(".pgn") || accept.includes("application/x-chess-pgn");
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
    const nativeFileText = File.prototype.text;

    let pendingSinglePgnFile: File | null = null;

    const handleFileSelection = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !isSingleGamePgnInput(target)) {
        return;
      }

      pendingSinglePgnFile = target.files?.[0] ?? null;
    };

    const streamingFileText: typeof File.prototype.text = function (this: Blob) {
      if (pendingSinglePgnFile === this) {
        return Promise.resolve(SINGLE_PGN_FILE_MARKER);
      }

      return nativeFileText.call(this);
    };

    document.addEventListener("change", handleFileSelection, true);
    File.prototype.text = streamingFileText;

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
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

      let effectiveInit = init;
      if (
        method === "POST"
        && url.includes("/api/game/pgn")
        && init?.body === SINGLE_PGN_FILE_MARKER
        && pendingSinglePgnFile
      ) {
        effectiveInit = {
          ...init,
          body: pendingSinglePgnFile,
        };
        pendingSinglePgnFile = null;
      }

      const response = await nativeFetch(input, effectiveInit);

      if (method === "POST" && url.includes("/api/game/pgn") && !response.ok) {
        try {
          const payload = await response.clone().json() as { code?: string };
          if (payload.code) {
            const localized = localizeSingleGameImportError(
              payload.code,
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
      document.removeEventListener("change", handleFileSelection, true);
      if (File.prototype.text === streamingFileText) {
        File.prototype.text = nativeFileText;
      }
      window.confirm = nativeConfirm;
      window.fetch = nativeFetch;
      Number.prototype.toLocaleString = nativeNumberToLocaleString;
      Date.prototype.toLocaleString = nativeDateToLocaleString;
      Date.prototype.toLocaleTimeString = nativeDateToLocaleTimeString;
    };
  }, []);

  return null;
}
