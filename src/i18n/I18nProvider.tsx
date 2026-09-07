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
  "app.title": { en: "Chess Analysis Tool", de: "Schach-Analysetool", fr: "Outil d’analyse d’échecs" },
  "language.label": { en: "Language", de: "Sprache", fr: "Langue" },
  "language.english": { en: "English", de: "Englisch", fr: "Anglais" },
  "language.german": { en: "German", de: "Deutsch", fr: "Allemand" },
  "language.french": { en: "French", de: "Französisch", fr: "Français" },
  "common.close": { en: "Close", de: "Schließen", fr: "Fermer" },
  "common.cancel": { en: "Cancel", de: "Abbrechen", fr: "Annuler" },
  "common.ok": { en: "OK", de: "OK", fr: "OK" },
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

  "moves.title": { en: "Moves", de: "Züge", fr: "Coups" },
  "moves.empty": { en: "No moves yet", de: "Noch keine Züge", fr: "Aucun coup pour le moment" },
  "moves.computerThinking": { en: "Computer is thinking…", de: "Computer denkt nach…", fr: "L’ordinateur réfléchit…" },
  "moves.loading": { en: "Loading / applying moves…", de: "Züge werden geladen / angewendet…", fr: "Chargement / application des coups…" },
  "moves.error": { en: "Error: {message}", de: "Fehler: {message}", fr: "Erreur : {message}" },

  "data.label": { en: "Data", de: "Daten", fr: "Données" },
  "data.title": {
    en: "Load or save a game, start a new game, or exit the program",
    de: "Partie importieren oder exportieren, neue Partie starten oder Programm beenden",
    fr: "Importer ou exporter une partie, démarrer une nouvelle partie ou quitter le programme",
  },
  "data.newGame": { en: "New Game", de: "Neue Partie", fr: "Nouvelle partie" },
  "data.exportCurrentGame": {
    en: "Export Current Game",
    de: "Aktuelle Partie exportieren",
    fr: "Exporter la partie actuelle",
  },
  "data.importNewGame": {
    en: "Import New Game",
    de: "Neue Partie importieren",
    fr: "Importer une nouvelle partie",
  },
  "data.chessDatabase": {
    en: "Chess Database…",
    de: "Schachdatenbank…",
    fr: "Base de données d’échecs…",
  },
  "data.terminateProgram": {
    en: "Terminate Program",
    de: "Programm beenden",
    fr: "Arrêter le programme",
  },
  "data.terminating": {
    en: "Terminating…",
    de: "Wird beendet…",
    fr: "Arrêt…",
  },

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
  "engine.managerTitle": {
    en: "Show engine processes and UCI communication",
    de: "Engine-Prozesse und UCI-Kommunikation anzeigen",
    fr: "Afficher les processus des moteurs et les communications UCI",
  },
  "engine.settings": {
    en: "Engine Settings",
    de: "Engine-Einstellungen",
    fr: "Paramètres des moteurs",
  },
  "engine.settingsTitle": {
    en: "Manage engines and profiles",
    de: "Engines und Profile verwalten",
    fr: "Gérer les moteurs et les profils",
  },
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
  "analysis.cancelRunning": { en: "Cancel analysis", de: "Analyse abbrechen", fr: "Annuler l’analyse" },
  "analysis.cancelRunningTitle": {
    en: "Cancel running analysis",
    de: "Laufende Analyse abbrechen",
    fr: "Annuler l’analyse en cours",
  },
  "analysis.options": { en: "Options", de: "Optionen", fr: "Options" },
  "analysis.optionsTitle": {
    en: "Open options after the completed analysis",
    de: "Optionen nach der abgeschlossenen Analyse öffnen",
    fr: "Ouvrir les options après l’analyse terminée",
  },
  "analysis.analyzeAgain": { en: "Analyze again", de: "Erneut analysieren", fr: "Analyser à nouveau" },
  "analysis.analyzeAgainTitle": {
    en: "Analyze the loaded PGN game again",
    de: "Geladene PGN-Partie erneut analysieren",
    fr: "Analyser à nouveau la partie PGN chargée",
  },
  "analysis.analyze": { en: "Analyze", de: "Analysieren", fr: "Analyser" },
  "analysis.analyzeTitle": {
    en: "Analyze the loaded PGN game",
    de: "Geladene PGN-Partie analysieren",
    fr: "Analyser la partie PGN chargée",
  },
  "analysis.dialogTitle": { en: "Analysis", de: "Analyse", fr: "Analyse" },
  "analysis.dialogDescription": {
    en: "The game is replayed from the initial position. After every ply, the selected analysis engine evaluates the new position.",
    de: "Die Partie wird von der Ausgangsstellung aus nachgespielt. Nach jedem Halbzug bewertet die ausgewählte Analyse-Engine die neue Stellung.",
    fr: "La partie est rejouée depuis la position initiale. Après chaque demi-coup, le moteur d’analyse sélectionné évalue la nouvelle position.",
  },
  "analysis.engineProfile": { en: "Engine profile", de: "Engine-Profil", fr: "Profil du moteur" },
  "analysis.depth": { en: "Depth (0 = time per position)", de: "Tiefe (0 = Zeit pro Stellung)", fr: "Profondeur (0 = temps par position)" },
  "analysis.timePerPosition": { en: "Time per position (seconds)", de: "Zeit pro Stellung (Sekunden)", fr: "Temps par position (secondes)" },
  "analysis.profile": { en: "Profile", de: "Profil", fr: "Profil" },
  "analysis.engine": { en: "Engine", de: "Engine", fr: "Moteur" },
  "analysis.search": { en: "Search", de: "Suche", fr: "Recherche" },
  "analysis.searchDepth": { en: "depth {depth}", de: "Tiefe {depth}", fr: "profondeur {depth}" },
  "analysis.searchTime": { en: "{seconds}s per position", de: "{seconds}s pro Stellung", fr: "{seconds}s par position" },
  "analysis.noEngineProfile": {
    en: "No engine profile is available. Create one under Engine Settings first.",
    de: "Kein Engine-Profil verfügbar. Erstelle zuerst eines unter Engine-Einstellungen.",
    fr: "Aucun profil de moteur n’est disponible. Créez-en d’abord un dans les paramètres des moteurs.",
  },
  "analysis.starting": { en: "Starting…", de: "Wird gestartet…", fr: "Démarrage…" },

  "game.newGame": { en: "New Game", de: "Neue Partie", fr: "Nouvelle partie" },
  "game.timeEachPlayerMinutes": {
    en: "Time for each player (minutes)",
    de: "Zeit pro Spieler (Minuten)",
    fr: "Temps par joueur (minutes)",
  },
  "game.incrementWhiteSeconds": {
    en: "Increment for White (seconds)",
    de: "Inkrement für Weiß (Sekunden)",
    fr: "Incrément pour les Blancs (secondes)",
  },
  "game.incrementBlackSeconds": {
    en: "Increment for Black (seconds)",
    de: "Inkrement für Schwarz (Sekunden)",
    fr: "Incrément pour les Noirs (secondes)",
  },
  "game.cpuProfileNote": {
    en: "CPU profile assignments are configured globally under Engine Settings → Defaults.",
    de: "CPU-Profilzuweisungen werden global unter Engine-Einstellungen → Standards konfiguriert.",
    fr: "Les affectations de profils CPU sont configurées globalement sous Paramètres des moteurs → Valeurs par défaut.",
  },
  "game.starting": { en: "Starting…", de: "Wird gestartet…", fr: "Démarrage…" },
  "game.startGame": { en: "Start Game", de: "Partie starten", fr: "Démarrer la partie" },
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
  "settings.subtitle": {
    en: "Engines, reusable profiles, and their assignments",
    de: "Engines, wiederverwendbare Profile und ihre Zuordnungen",
    fr: "Moteurs, profils réutilisables et leurs affectations",
  },
  "settings.version": { en: "Version {version}", de: "Version {version}", fr: "Version {version}" },
  "settings.scanSystem": { en: "Scan /usr/games", de: "/usr/games durchsuchen", fr: "Analyser /usr/games" },
  "settings.reset": { en: "Reset Engines & Profiles", de: "Engines und Profile zurücksetzen", fr: "Réinitialiser moteurs et profils" },
  "settings.area": { en: "Engine settings area", de: "Bereich Engine-Einstellungen", fr: "Zone des paramètres des moteurs" },
  "settings.defaults": { en: "Defaults", de: "Standards", fr: "Valeurs par défaut" },
  "settings.profiles": { en: "Profiles", de: "Profile", fr: "Profils" },
  "settings.engines": { en: "Engines", de: "Engines", fr: "Moteurs" },
  "settings.useCases": { en: "Use Cases", de: "Anwendungsfälle", fr: "Cas d’utilisation" },
  "settings.useCasesDescription": {
    en: "Profiles are independent of their use case",
    de: "Profile sind unabhängig von ihrem Anwendungsfall",
    fr: "Les profils sont indépendants de leur cas d’utilisation",
  },
  "settings.whiteCpu": { en: "White CPU", de: "Weiß CPU", fr: "CPU Blancs" },
  "settings.blackCpu": { en: "Black CPU", de: "Schwarz CPU", fr: "CPU Noirs" },
  "settings.liveEvaluation": { en: "Live Evaluation", de: "Live-Bewertung", fr: "Évaluation en direct" },
  "settings.deepAnalysis": { en: "Deep Analysis", de: "Tiefenanalyse", fr: "Analyse approfondie" },
  "settings.noProfile": { en: "No profile", de: "Kein Profil", fr: "Aucun profil" },
  "settings.defaultAssignments": { en: "Default Profile Assignments", de: "Standard-Profilzuweisungen", fr: "Affectations de profils par défaut" },
  "settings.defaultAssignmentsDescription": {
    en: "A profile only describes its engine configuration. This section defines which profile each use case uses by default.",
    de: "Ein Profil beschreibt nur die Engine-Konfiguration. Hier wird festgelegt, welches Profil jeder Anwendungsfall standardmäßig verwendet.",
    fr: "Un profil décrit uniquement la configuration du moteur. Cette section définit le profil utilisé par défaut pour chaque cas d’utilisation.",
  },
  "settings.global": { en: "Global", de: "Global", fr: "Global" },
  "settings.fallback": { en: "Fallback", de: "Fallback", fr: "Secours" },
  "settings.detectedUciEngine": { en: "the detected UCI engine", de: "die erkannte UCI-Engine", fr: "le moteur UCI détecté" },
  "settings.fallbackInfoBefore": { en: "The fallback profile remains bound to", de: "Das Fallback-Profil bleibt gebunden an", fr: "Le profil de secours reste lié à" },
  "settings.fallbackInfoAfter": {
    en: "so the application always has a valid engine profile available. It can be edited like any other profile, but it cannot be deleted while it is the fallback.",
    de: "damit der Anwendung immer ein gültiges Engine-Profil zur Verfügung steht. Es kann wie jedes andere Profil bearbeitet werden, kann aber nicht gelöscht werden, solange es das Fallback-Profil ist.",
    fr: "afin que l’application dispose toujours d’un profil de moteur valide. Il peut être modifié comme les autres profils, mais ne peut pas être supprimé tant qu’il sert de profil de secours.",
  },
  "settings.fallbackStockfish": {
    en: "is preferred as the fallback engine when available.",
    de: "wird als Fallback-Engine bevorzugt, wenn es verfügbar ist.",
    fr: "est préféré comme moteur de secours lorsqu’il est disponible.",
  },
  "settings.whiteCpuPlayer": { en: "White CPU Player", de: "CPU-Spieler Weiß", fr: "Joueur CPU Blancs" },
  "settings.whiteCpuDescription": { en: "Profile used when White is controlled by the computer.", de: "Profil, das verwendet wird, wenn Weiß vom Computer gesteuert wird.", fr: "Profil utilisé lorsque les Blancs sont contrôlés par l’ordinateur." },
  "settings.blackCpuPlayer": { en: "Black CPU Player", de: "CPU-Spieler Schwarz", fr: "Joueur CPU Noirs" },
  "settings.blackCpuDescription": { en: "Profile used when Black is controlled by the computer.", de: "Profil, das verwendet wird, wenn Schwarz vom Computer gesteuert wird.", fr: "Profil utilisé lorsque les Noirs sont contrôlés par l’ordinateur." },
  "settings.liveEvaluationDescription": { en: "Profile used for live position evaluation.", de: "Profil für die laufende Stellungsbewertung.", fr: "Profil utilisé pour l’évaluation en direct de la position." },
  "settings.deepAnalysisDescription": { en: "Default selection for a new Deep Analysis run.", de: "Standardauswahl für eine neue Tiefenanalyse.", fr: "Sélection par défaut pour une nouvelle analyse approfondie." },
  "settings.unknownEngine": { en: "Unknown engine", de: "Unbekannte Engine", fr: "Moteur inconnu" },
  "settings.saving": { en: "Saving…", de: "Wird gespeichert…", fr: "Enregistrement…" },
  "settings.saveDefaults": { en: "Save Defaults", de: "Standards speichern", fr: "Enregistrer les valeurs par défaut" },
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
    const color = match[1] === "White"
      ? translations["common.white"][language]
      : translations["common.black"][language];
    return language === "de"
      ? `Matt für ${color}`
      : language === "fr"
        ? `Mat pour les ${color.toLowerCase()}`
        : `Mate for ${color}`;
  }

  match = /^Mate (?:for|für) (White|Black|Weiß|Schwarz)(?: in (\d+))?$/.exec(text);
  if (match) {
    const isWhite = match[1] === "White" || match[1] === "Weiß";
    const color = isWhite
      ? translations["common.white"][language]
      : translations["common.black"][language];
    const distance = match[2];

    if (language === "de") {
      return distance ? `Matt für ${color} in ${distance}` : `Matt für ${color}`;
    }
    if (language === "fr") {
      return distance
        ? `Mat pour les ${color.toLowerCase()} en ${distance}`
        : `Mat pour les ${color.toLowerCase()}`;
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
    return language === "de"
      ? `${match[1]} Siege für Weiß`
      : language === "fr"
        ? `${match[1]} victoires des Blancs`
        : text;
  }

  match = /^(\d[\d.,\s]*) black wins$/.exec(text);
  if (match) {
    return language === "de"
      ? `${match[1]} Siege für Schwarz`
      : language === "fr"
        ? `${match[1]} victoires des Noirs`
        : text;
  }

  match = /^(\d[\d.,\s]*) draws$/.exec(text);
  if (match) {
    return language === "de"
      ? `${match[1]} Remis`
      : language === "fr"
        ? `${match[1]} nulles`
        : text;
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
    locale: localeByLanguage[language],
    setLanguage: (nextLanguage) => setLanguageState(nextLanguage),
    t: (key, values) => interpolate(translations[key][language], values),
  }), [language]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.title = translations["app.title"][language];

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
