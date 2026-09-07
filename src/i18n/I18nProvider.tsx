import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

export type Language = "en" | "de" | "fr";

interface I18nContextValue {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

type Translation = Record<Language, string>;
type TranslationKey = keyof typeof translations;

const STORAGE_KEY = "chess.language";

const translations = {
  "language.label": { en: "Language", de: "Sprache", fr: "Langue" },
  "language.english": { en: "English", de: "Englisch", fr: "Anglais" },
  "language.german": { en: "German", de: "Deutsch", fr: "Allemand" },
  "language.french": { en: "French", de: "Französisch", fr: "Français" },
  "common.close": { en: "Close", de: "Schließen", fr: "Fermer" },
  "common.cancel": { en: "Cancel", de: "Abbrechen", fr: "Annuler" },
  "common.save": { en: "Save", de: "Speichern", fr: "Enregistrer" },
  "common.delete": { en: "Delete", de: "Löschen", fr: "Supprimer" },
  "common.refresh": { en: "Refresh", de: "Aktualisieren", fr: "Actualiser" },
  "common.loading": { en: "Loading…", de: "Wird geladen…", fr: "Chargement…" },
  "common.running": { en: "Running", de: "Läuft", fr: "En cours" },
  "common.complete": { en: "Complete", de: "Abgeschlossen", fr: "Terminé" },
  "common.cancelled": { en: "Cancelled", de: "Abgebrochen", fr: "Annulé" },
  "common.failed": { en: "Failed", de: "Fehlgeschlagen", fr: "Échec" },
  "common.white": { en: "White", de: "Weiß", fr: "Blancs" },
  "common.black": { en: "Black", de: "Schwarz", fr: "Noirs" },
  "common.draw": { en: "Draw", de: "Remis", fr: "Nulle" },
  "common.games": { en: "Games", de: "Partien", fr: "Parties" },
  "common.move": { en: "Move", de: "Zug", fr: "Coup" },
  "common.status": { en: "Status", de: "Status", fr: "Statut" },
  "common.file": { en: "File", de: "Datei", fr: "Fichier" },
  "common.size": { en: "Size", de: "Größe", fr: "Taille" },
  "database.title": { en: "Chess Database", de: "Schachdatenbank", fr: "Base de données d’échecs" },
  "database.local": { en: "Local chess database", de: "Lokale Schachdatenbank", fr: "Base de données d’échecs locale" },
  "database.loadingStatus": { en: "Loading database status…", de: "Datenbankstatus wird geladen…", fr: "Chargement de l’état de la base…" },
  "database.importPgn": { en: "Import PGN…", de: "PGN importieren…", fr: "Importer un PGN…" },
  "database.searchGames": { en: "Search Games…", de: "Partien suchen…", fr: "Rechercher des parties…" },
  "database.importTitle": { en: "Import PGN Database", de: "PGN-Datenbank importieren", fr: "Importer une base PGN" },
  "database.preparingImport": { en: "Preparing import…", de: "Import wird vorbereitet…", fr: "Préparation de l’import…" },
  "database.readingPgn": { en: "Reading PGN", de: "PGN wird gelesen", fr: "Lecture du PGN" },
  "database.finalizing": { en: "Finalizing", de: "Finalisierung", fr: "Finalisation" },
  "database.parsing": { en: "Parsing games and staging position statistics", de: "Partien werden analysiert und Positionsstatistiken vorbereitet", fr: "Analyse des parties et préparation des statistiques de position" },
  "database.merging": { en: "Merging position statistics and publishing staged games", de: "Positionsstatistiken werden zusammengeführt und Partien veröffentlicht", fr: "Fusion des statistiques de position et publication des parties" },
  "database.importComplete": { en: "Database import complete", de: "Datenbankimport abgeschlossen", fr: "Import de la base terminé" },
  "database.importCancelled": { en: "Import cancelled", de: "Import abgebrochen", fr: "Import annulé" },
  "database.importFailed": { en: "Import failed", de: "Import fehlgeschlagen", fr: "Échec de l’import" },
  "database.selectMove": { en: "Select a move to query the local chess database.", de: "Wähle einen Zug, um die lokale Schachdatenbank abzufragen.", fr: "Sélectionnez un coup pour interroger la base d’échecs locale." },
  "database.querying": { en: "Querying chess database…", de: "Schachdatenbank wird abgefragt…", fr: "Interrogation de la base d’échecs…" },
  "database.noPosition": { en: "No imported database game contains this position.", de: "Keine importierte Datenbankpartie enthält diese Position.", fr: "Aucune partie importée ne contient cette position." },
  "engine.manager": { en: "Engine Manager", de: "Engine-Verwaltung", fr: "Gestionnaire de moteurs" },
  "engine.currentSubtitle": { en: "Current UCI instances, processes and communication", de: "Aktuelle UCI-Instanzen, Prozesse und Kommunikation", fr: "Instances UCI, processus et communications actuels" },
  "engine.history": { en: "History", de: "Historie", fr: "Historique" },
  "engine.historyTitle": { en: "Engine History", de: "Engine-Historie", fr: "Historique des moteurs" },
  "engine.historySubtitle": { en: "Gracefully closed UCI instances and their logs", de: "Ordnungsgemäß geschlossene UCI-Instanzen und ihre Logs", fr: "Instances UCI fermées proprement et leurs journaux" },
  "engine.selectInstance": { en: "Select an engine instance.", de: "Wähle eine Engine-Instanz aus.", fr: "Sélectionnez une instance de moteur." },
  "engine.noActive": { en: "No active engine instance is registered.", de: "Keine aktive Engine-Instanz ist registriert.", fr: "Aucune instance de moteur active n’est enregistrée." },
  "engine.noClosed": { en: "No closed engine instance is available yet.", de: "Noch keine geschlossene Engine-Instanz verfügbar.", fr: "Aucune instance de moteur fermée n’est encore disponible." },
  "engine.terminate": { en: "Terminate process", de: "Prozess beenden", fr: "Arrêter le processus" },
  "engine.terminating": { en: "Terminating…", de: "Wird beendet…", fr: "Arrêt…" },
  "engine.type": { en: "Type", de: "Typ", fr: "Type" },
  "engine.exitCode": { en: "Exit code", de: "Exit-Code", fr: "Code de sortie" },
  "engine.instanceSince": { en: "Instance since", de: "Instanz seit", fr: "Instance depuis" },
  "engine.processSince": { en: "Process since", de: "Prozess seit", fr: "Processus depuis" },
  "engine.lastActivity": { en: "Last activity", de: "Letzte Aktivität", fr: "Dernière activité" },
  "engine.logEntries": { en: "Log entries", de: "Log-Einträge", fr: "Entrées du journal" },
  "engine.executable": { en: "Executable", de: "Programmdatei", fr: "Exécutable" },
  "engine.protocol": { en: "UCI protocol", de: "UCI-Protokoll", fr: "Protocole UCI" },
  "engine.noCommunication": { en: "No communication has been logged yet.", de: "Noch keine Kommunikation protokolliert.", fr: "Aucune communication n’a encore été enregistrée." },
  "evaluation.failed": { en: "Failed to load the engine evaluation.", de: "Engine-Bewertung konnte nicht geladen werden.", fr: "Impossible de charger l’évaluation du moteur." },
  "evaluation.analysisFailed": { en: "Failed to load the analysis evaluation.", de: "Analysebewertung konnte nicht geladen werden.", fr: "Impossible de charger l’évaluation de l’analyse." },
  "analysis.complete": { en: "Analysis complete", de: "Analyse abgeschlossen", fr: "Analyse terminée" },
  "analysis.failed": { en: "Analysis replay failed.", de: "Analyse-Wiedergabe fehlgeschlagen.", fr: "Échec de la relecture de l’analyse." },
  "analysis.preparing": { en: "Preparing analysis…", de: "Analyse wird vorbereitet…", fr: "Préparation de l’analyse…" },
  "analysis.cancelled": { en: "Analysis canceled.", de: "Analyse abgebrochen.", fr: "Analyse annulée." },
  "analysis.startFailed": { en: "Could not start analysis replay.", de: "Analyse-Wiedergabe konnte nicht gestartet werden.", fr: "Impossible de démarrer la relecture de l’analyse." },
  "game.startFailed": { en: "Failed to start a new game.", de: "Neue Partie konnte nicht gestartet werden.", fr: "Impossible de démarrer une nouvelle partie." },
  "game.moveFailed": { en: "Failed to execute the move.", de: "Zug konnte nicht ausgeführt werden.", fr: "Impossible d’exécuter le coup." },
  "game.engineMoveFailed": { en: "Failed to execute the engine move.", de: "Engine-Zug konnte nicht ausgeführt werden.", fr: "Impossible d’exécuter le coup du moteur." },
  "game.savePgnFailed": { en: "Could not save the PGN file.", de: "PGN-Datei konnte nicht gespeichert werden.", fr: "Impossible d’enregistrer le fichier PGN." },
  "program.terminate": { en: "Terminate Program?", de: "Programm beenden?", fr: "Arrêter le programme ?" },
  "program.terminateText": { en: "The chess server and, in development mode, the frontend server will be stopped.", de: "Der Schachserver und im Entwicklungsmodus auch der Frontend-Server werden beendet.", fr: "Le serveur d’échecs et, en mode développement, le serveur frontend seront arrêtés." },
  "program.terminateFailed": { en: "Could not terminate the program.", de: "Programm konnte nicht beendet werden.", fr: "Impossible d’arrêter le programme." },
  "settings.loadFailed": { en: "Engine settings could not be loaded.", de: "Engine-Einstellungen konnten nicht geladen werden.", fr: "Impossible de charger les paramètres du moteur." },
  "settings.defaultSaved": { en: "Default profile assignments saved.", de: "Standard-Profilzuweisungen gespeichert.", fr: "Affectations de profils par défaut enregistrées." },
  "settings.engineCreated": { en: "Engine created.", de: "Engine erstellt.", fr: "Moteur créé." },
  "settings.engineSaved": { en: "Engine saved.", de: "Engine gespeichert.", fr: "Moteur enregistré." },
} satisfies Record<string, Translation>;

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

const localeByLanguage: Record<Language, string> = {
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
};

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}

function detectInitialLanguage(): Language {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "de" || stored === "fr") {
    return stored;
  }

  const browserLanguage = window.navigator.language.toLowerCase();
  if (browserLanguage.startsWith("de")) {
    return "de";
  }
  if (browserLanguage.startsWith("fr")) {
    return "fr";
  }
  return "en";
}

function findTranslationKey(text: string): TranslationKey | null {
  if (aliases[text]) {
    return aliases[text];
  }

  for (const [key, translation] of Object.entries(translations)) {
    if (translation.en === text || translation.de === text || translation.fr === text) {
      return key as TranslationKey;
    }
  }
  return null;
}

function translateDynamicText(text: string, language: Language): string | null {
  let match = /^Analyzing\s+(\d+)\s*\/\s*(\d+)…?$/.exec(text);
  if (match) {
    const [, current, total] = match;
    return language === "de"
      ? `Analyse ${current} / ${total}…`
      : language === "fr"
        ? `Analyse ${current} / ${total}…`
        : `Analyzing ${current} / ${total}…`;
  }

  match = /^Analysis complete \((.+)\)\.$/.exec(text);
  if (match) {
    return `${translations["analysis.complete"][language]} (${match[1]}).`;
  }

  match = /^Mate for (White|Black)$/.exec(text);
  if (match) {
    const color = match[1] === "White" ? translations["common.white"][language] : translations["common.black"][language];
    return language === "de"
      ? `Matt für ${color}`
      : language === "fr"
        ? `Mat pour les ${color.toLowerCase()}`
        : `Mate for ${color}`;
  }

  match = /^Mate (?:for|für) (White|Black|Weiß|Schwarz)(?: in (\d+))?$/.exec(text);
  if (match) {
    const isWhite = match[1] === "White" || match[1] === "Weiß";
    const color = isWhite ? translations["common.white"][language] : translations["common.black"][language];
    const distance = match[2];
    if (language === "de") {
      return distance ? `Matt für ${color} in ${distance}` : `Matt für ${color}`;
    }
    if (language === "fr") {
      return distance ? `Mat pour les ${color.toLowerCase()} en ${distance}` : `Mat pour les ${color.toLowerCase()}`;
    }
    return distance ? `Mate for ${color} in ${distance}` : `Mate for ${color}`;
  }

  match = /^(\d[\d.,\s]*) continuations$/.exec(text);
  if (match) {
    return language === "de"
      ? `${match[1]} Fortsetzungen`
      : language === "fr"
        ? `${match[1]} continuations`
        : text;
  }

  match = /^(\d[\d.,\s]*) white wins$/.exec(text);
  if (match) {
    return language === "de" ? `${match[1]} Siege für Weiß` : language === "fr" ? `${match[1]} victoires des Blancs` : text;
  }
  match = /^(\d[\d.,\s]*) black wins$/.exec(text);
  if (match) {
    return language === "de" ? `${match[1]} Siege für Schwarz` : language === "fr" ? `${match[1]} victoires des Noirs` : text;
  }
  match = /^(\d[\d.,\s]*) draws$/.exec(text);
  if (match) {
    return language === "de" ? `${match[1]} Remis` : language === "fr" ? `${match[1]} nulles` : text;
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
    return `${leading}${translations[key][language]}${trailing}`;
  }

  const dynamic = translateDynamicText(core, language);
  return dynamic == null ? text : `${leading}${dynamic}${trailing}`;
}

function translateElement(root: ParentNode, language: Language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const parent = current.parentElement;
    if (parent && !["SCRIPT", "STYLE", "CODE", "PRE"].includes(parent.tagName)) {
      const translated = translateText(current.textContent ?? "", language);
      if (translated !== current.textContent) {
        current.textContent = translated;
      }
    }
    current = walker.nextNode();
  }

  const elements = root instanceof Element ? [root, ...root.querySelectorAll("*")] : [...root.querySelectorAll("*")];
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
    locale: localeByLanguage[language],
    setLanguage: (nextLanguage) => setLanguageState(nextLanguage),
    t: (key, values) => interpolate(translations[key][language], values),
  }), [language]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.title = language === "de" ? "Schach" : language === "fr" ? "Échecs" : "Chess";

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

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
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
