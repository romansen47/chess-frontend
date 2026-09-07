import { useEffect } from "react";
import { useI18n, type Language } from "./I18nProvider";

const TERMINATE_PROGRAM_TEXT =
  "Terminate Program?\n\nThe chess server and, in development mode, the frontend server will be stopped.";

const EXPORT_LABELS = new Set([
  "Save PGN",
  "Export Current Game",
  "Aktuelle Partie exportieren",
  "Exporter la partie actuelle",
]);

const IMPORT_LABELS = new Set([
  "Load PGN",
  "Import New Game",
  "Neue Partie importieren",
  "Importer une nouvelle partie",
]);

function exportCurrentGameLabel(language: Language): string {
  if (language === "de") {
    return "Aktuelle Partie exportieren";
  }
  if (language === "fr") {
    return "Exporter la partie actuelle";
  }
  return "Export Current Game";
}

function importNewGameLabel(language: Language): string {
  if (language === "de") {
    return "Neue Partie importieren";
  }
  if (language === "fr") {
    return "Importer une nouvelle partie";
  }
  return "Import New Game";
}

function localizeSingleGameImportError(
  code: string,
  gameCount: number | undefined,
  language: Language,
): string | null {
  if (code === "PGN_NO_GAME") {
    if (language === "de") {
      return "Die ausgewählte PGN-Datei enthält keine Partie.";
    }
    if (language === "fr") {
      return "Le fichier PGN sélectionné ne contient aucune partie.";
    }
    return "The selected PGN file does not contain a game.";
  }

  if (code === "PGN_MULTIPLE_GAMES") {
    const count = Number.isFinite(gameCount) ? gameCount : undefined;
    const countText = count == null ? "" : ` (${count})`;
    if (language === "de") {
      return `Diese PGN-Datei enthält mehrere Partien${countText}. „Neue Partie importieren“ akzeptiert genau eine Partie. Bitte verwende für PGN-Dateien mit mehreren Partien Schachdatenbank → PGN importieren.`;
    }
    if (language === "fr") {
      return `Ce fichier PGN contient plusieurs parties${countText}. « Importer une nouvelle partie » accepte exactement une partie. Pour les fichiers PGN contenant plusieurs parties, utilisez Base de données d’échecs → Importer un PGN.`;
    }
    return `This PGN contains multiple games${countText}. “Import New Game” accepts exactly one game. Please use Chess Database → Import PGN for multi-game PGN files.`;
  }

  return null;
}

function translateWorkflowText(root: ParentNode, language: Language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const text = current.textContent ?? "";
    const leading = text.match(/^\s*/)?.[0] ?? "";
    const trailing = text.match(/\s*$/)?.[0] ?? "";
    const core = text.trim();
    let replacement: string | null = null;

    if (EXPORT_LABELS.has(core)) {
      replacement = exportCurrentGameLabel(language);
    } else if (IMPORT_LABELS.has(core)) {
      replacement = importNewGameLabel(language);
    }

    if (replacement != null && replacement !== core) {
      current.textContent = `${leading}${replacement}${trailing}`;
    }
    current = walker.nextNode();
  }
}

export default function BrowserLocaleBridge() {
  const { language, locale } = useI18n();

  useEffect(() => {
    const nativeConfirm = window.confirm.bind(window);
    const nativeFetch = window.fetch.bind(window);
    const nativeNumberToLocaleString = Number.prototype.toLocaleString;
    const nativeDateToLocaleString = Date.prototype.toLocaleString;
    const nativeDateToLocaleTimeString = Date.prototype.toLocaleTimeString;

    window.confirm = (message?: string) => {
      let translated = message ?? "";

      if (translated === TERMINATE_PROGRAM_TEXT) {
        translated = language === "de"
          ? "Programm beenden?\n\nDer Schachserver und im Entwicklungsmodus auch der Frontend-Server werden beendet."
          : language === "fr"
            ? "Arrêter le programme ?\n\nLe serveur d’échecs et, en mode développement, le serveur frontend seront arrêtés."
            : TERMINATE_PROGRAM_TEXT;
      } else {
        const engineMatch = /^Engine-Prozess (.+) \((.+)\) wirklich beenden\?$/.exec(translated);
        if (engineMatch) {
          const [, pid, label] = engineMatch;
          translated = language === "de"
            ? `Engine-Prozess ${pid} (${label}) wirklich beenden?`
            : language === "fr"
              ? `Arrêter réellement le processus moteur ${pid} (${label}) ?`
              : `Really terminate engine process ${pid} (${label})?`;
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
            const localized = localizeSingleGameImportError(payload.code, payload.gameCount, language);
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
      return nativeNumberToLocaleString.call(this, locales ?? locale, options);
    };

    Date.prototype.toLocaleString = function(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
      return nativeDateToLocaleString.call(this, locales ?? locale, options);
    };

    Date.prototype.toLocaleTimeString = function(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
      return nativeDateToLocaleTimeString.call(this, locales ?? locale, options);
    };

    translateWorkflowText(document.body, language);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" && mutation.target.parentNode) {
          translateWorkflowText(mutation.target.parentNode as ParentNode, language);
          continue;
        }
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            translateWorkflowText(node as Element, language);
          } else if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
            translateWorkflowText(node.parentNode as ParentNode, language);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      window.confirm = nativeConfirm;
      window.fetch = nativeFetch;
      Number.prototype.toLocaleString = nativeNumberToLocaleString;
      Date.prototype.toLocaleString = nativeDateToLocaleString;
      Date.prototype.toLocaleTimeString = nativeDateToLocaleTimeString;
    };
  }, [language, locale]);

  return null;
}
