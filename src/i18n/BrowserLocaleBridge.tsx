import { useEffect } from "react";
import { useI18n } from "./I18nProvider";

const TERMINATE_PROGRAM_TEXT =
  "Terminate Program?\n\nThe chess server and, in development mode, the frontend server will be stopped.";

export default function BrowserLocaleBridge() {
  const { language, locale } = useI18n();

  useEffect(() => {
    const nativeConfirm = window.confirm.bind(window);
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

    Number.prototype.toLocaleString = function(locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions) {
      return nativeNumberToLocaleString.call(this, locales ?? locale, options);
    };

    Date.prototype.toLocaleString = function(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
      return nativeDateToLocaleString.call(this, locales ?? locale, options);
    };

    Date.prototype.toLocaleTimeString = function(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
      return nativeDateToLocaleTimeString.call(this, locales ?? locale, options);
    };

    return () => {
      window.confirm = nativeConfirm;
      Number.prototype.toLocaleString = nativeNumberToLocaleString;
      Date.prototype.toLocaleString = nativeDateToLocaleString;
      Date.prototype.toLocaleTimeString = nativeDateToLocaleTimeString;
    };
  }, [language, locale]);

  return null;
}
