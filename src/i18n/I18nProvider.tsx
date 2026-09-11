import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  detectSupportedLanguage,
  getLanguageDefinition,
  isSupportedLanguage,
  type Language,
} from "./languages";
import { italianTranslations } from "./translations/it";
import { spanishTranslations } from "./translations/es";

export type { Language } from "./languages";

interface I18nContextValue {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

type BaseLanguage = "en" | "de" | "fr";
type Translation = Record<BaseLanguage, string>;
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
  "analysis.analyzeAgain": { en: "Analyze again", de: "Erneut analysieren", fr: "Analyser à nouveau" },
  "analysis.analyzeAgainTitle": {
    en: "Analyze the game again",
    de: "Partie erneut analysieren",
    fr: "Analyser à nouveau la partie",
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
  "settings.engineProfiles": { en: "Engine Profiles", de: "Engine-Profile", fr: "Profils de moteur" },
  "settings.profileValuesSubtitle": { en: "Engine and concrete UCI values", de: "Engine und konkrete UCI-Werte", fr: "Moteur et valeurs UCI concrètes" },
  "settings.newProfile": { en: "New Profile", de: "Neues Profil", fr: "Nouveau profil" },
  "settings.assignedProfile": { en: "Assigned profile", de: "Zugeordnetes Profil", fr: "Profil attribué" },
  "settings.reusableProfile": { en: "Reusable profile", de: "Wiederverwendbares Profil", fr: "Profil réutilisable" },
  "settings.newProfileTitle": { en: "New profile", de: "Neues Profil", fr: "Nouveau profil" },
  "settings.selectDefinedEngineStep": { en: "Step 1 · Select an already defined engine", de: "Schritt 1 · Bereits definierte Engine auswählen", fr: "Étape 1 · Sélectionner un moteur déjà défini" },
  "settings.noEngineAvailable": { en: "No engine available", de: "Keine Engine verfügbar", fr: "Aucun moteur disponible" },
  "settings.defineEngineFirst": { en: "Define a UCI engine under Engines first.", de: "Definiere zuerst unter Engines eine UCI-Engine.", fr: "Définissez d’abord un moteur UCI sous Moteurs." },
  "settings.selectEngine": { en: "Select engine…", de: "Engine auswählen…", fr: "Sélectionner un moteur…" },
  "settings.continue": { en: "Continue", de: "Weiter", fr: "Continuer" },
  "settings.noProfileSelected": { en: "No profile selected", de: "Kein Profil ausgewählt", fr: "Aucun profil sélectionné" },
  "settings.selectOrCreateProfile": { en: "Select a profile on the left or create a new one.", de: "Wähle links ein Profil aus oder erstelle ein neues.", fr: "Sélectionnez un profil à gauche ou créez-en un nouveau." },
  "settings.configureProfile": { en: "Configure profile", de: "Profil konfigurieren", fr: "Configurer le profil" },
  "settings.reusableEngineConfiguration": { en: "{engine} · reusable engine configuration", de: "{engine} · wiederverwendbare Engine-Konfiguration", fr: "{engine} · configuration de moteur réutilisable" },
  "settings.configureUciStep": { en: "Step 2 · Configure UCI values for {engine}", de: "Schritt 2 · UCI-Werte für {engine} konfigurieren", fr: "Étape 2 · Configurer les valeurs UCI pour {engine}" },
  "settings.fallbackProfileInfo": { en: "This profile is the fallback for {engine}. It can be edited like any other profile, but it cannot be deleted while it is the fallback.", de: "Dieses Profil ist das Fallback-Profil für {engine}. Es kann wie jedes andere Profil bearbeitet werden, aber nicht gelöscht werden, solange es als Fallback dient.", fr: "Ce profil sert de profil de secours pour {engine}. Il peut être modifié comme les autres profils, mais ne peut pas être supprimé tant qu’il sert de secours." },
  "settings.profileName": { en: "Profile name", de: "Profilname", fr: "Nom du profil" },
  "settings.profileUciOptions": { en: "Profile UCI Options ({count})", de: "UCI-Optionen des Profils ({count})", fr: "Options UCI du profil ({count})" },
  "settings.profileUciOptionsDescription": { en: "Values are only displayed here. Click a value to edit that specific option.", de: "Die Werte werden hier nur angezeigt. Klicke auf einen Wert, um die jeweilige Option zu bearbeiten.", fr: "Les valeurs sont uniquement affichées ici. Cliquez sur une valeur pour modifier l’option correspondante." },
  "settings.filterOptions": { en: "Filter options", de: "Optionen filtern", fr: "Filtrer les options" },
  "settings.resetDefaults": { en: "Reset defaults", de: "Standardwerte zurücksetzen", fr: "Réinitialiser les valeurs par défaut" },
  "settings.noMatchingUciOptions": { en: "No matching UCI options.", de: "Keine passenden UCI-Optionen.", fr: "Aucune option UCI correspondante." },
  "settings.fallbackProfileCannotDelete": { en: "Fallback profile cannot be deleted", de: "Das Fallback-Profil kann nicht gelöscht werden", fr: "Le profil de secours ne peut pas être supprimé" },
  "settings.removeFromDefaultsBeforeDelete": { en: "Remove this profile from Defaults before deleting it", de: "Entferne dieses Profil vor dem Löschen aus den Standards", fr: "Retirez ce profil des valeurs par défaut avant de le supprimer" },
  "settings.deleteProfile": { en: "Delete Profile", de: "Profil löschen", fr: "Supprimer le profil" },
  "settings.saveProfile": { en: "Save Profile", de: "Profil speichern", fr: "Enregistrer le profil" },
  "settings.createProfile": { en: "Create Profile", de: "Profil erstellen", fr: "Créer le profil" },
  "settings.editOption": { en: "Edit {name}", de: "{name} bearbeiten", fr: "Modifier {name}" },
  "settings.closeEditor": { en: "Close editor", de: "Editor schließen", fr: "Fermer l’éditeur" },
  "settings.profileValue": { en: "Profile value", de: "Profilwert", fr: "Valeur du profil" },
  "settings.apply": { en: "Apply", de: "Übernehmen", fr: "Appliquer" },
  "settings.clickToEdit": { en: "click to edit", de: "zum Bearbeiten klicken", fr: "cliquer pour modifier" },
  "settings.profileCreated": { en: "Engine profile created.", de: "Engine-Profil erstellt.", fr: "Profil de moteur créé." },
  "settings.profileSaved": { en: "Engine profile saved.", de: "Engine-Profil gespeichert.", fr: "Profil de moteur enregistré." },
  "settings.profileSaveFailed": { en: "Engine profile could not be saved.", de: "Engine-Profil konnte nicht gespeichert werden.", fr: "Impossible d’enregistrer le profil de moteur." },
  "settings.profileDeleted": { en: "Engine profile deleted.", de: "Engine-Profil gelöscht.", fr: "Profil de moteur supprimé." },
  "settings.profileDeleteFailed": { en: "Engine profile could not be deleted.", de: "Engine-Profil konnte nicht gelöscht werden.", fr: "Impossible de supprimer le profil de moteur." },
  "settings.deleteProfileConfirm": { en: 'Delete engine profile "{name}"?', de: 'Engine-Profil "{name}" löschen?', fr: 'Supprimer le profil de moteur "{name}" ?' },

  "common.back": { en: "Back", de: "Zurück", fr: "Retour" },
  "common.player": { en: "Player", de: "Spieler", fr: "Joueur" },
  "common.result": { en: "Result", de: "Ergebnis", fr: "Résultat" },
  "common.date": { en: "Date", de: "Datum", fr: "Date" },
  "common.event": { en: "Event", de: "Turnier", fr: "Événement" },
  "common.any": { en: "Any", de: "Beliebig", fr: "Tous" },
  "common.author": { en: "Author", de: "Autor", fr: "Auteur" },
  "common.options": { en: "Options", de: "Optionen", fr: "Options" },
  "common.currentOperation": { en: "Current operation", de: "Aktueller Vorgang", fr: "Opération en cours" },
  "common.elapsed": { en: "Elapsed", de: "Vergangen", fr: "Écoulé" },
  "engine.maxRecentEntries": { en: "up to 2000 most recent entries per instance", de: "bis zu 2000 neueste Einträge pro Instanz", fr: "jusqu’aux 2000 entrées les plus récentes par instance" },
  "engine.instanceId": { en: "Instance {id}", de: "Instanz {id}", fr: "Instance {id}" },
  "engine.loadListFailed": { en: "Could not load engine list: {message}", de: "Engine-Liste konnte nicht geladen werden: {message}", fr: "Impossible de charger la liste des moteurs : {message}" },
  "engine.loadLogFailed": { en: "Could not load engine log: {message}", de: "Engine-Log konnte nicht geladen werden: {message}", fr: "Impossible de charger le journal du moteur : {message}" },
  "engine.terminateFailed": { en: "Could not terminate engine process: {message}", de: "Engine-Prozess konnte nicht beendet werden: {message}", fr: "Impossible d’arrêter le processus du moteur : {message}" },
  "engine.terminateConfirm": { en: "Really terminate engine process {pid} ({label})?", de: "Engine-Prozess {pid} ({label}) wirklich beenden?", fr: "Arrêter réellement le processus moteur {pid} ({label}) ?" },
  "settings.definedEngines": { en: "Defined Engines", de: "Definierte Engines", fr: "Moteurs définis" },
  "settings.engineDefinitionSubtitle": { en: "Executable and UCI definition", de: "Programmdatei und UCI-Definition", fr: "Exécutable et définition UCI" },
  "settings.newEngine": { en: "New Engine", de: "Neue Engine", fr: "Nouveau moteur" },
  "settings.noEngineDefined": { en: "No engine has been defined yet.", de: "Noch keine Engine definiert.", fr: "Aucun moteur n’a encore été défini." },
  "settings.uciEngine": { en: "UCI Engine", de: "UCI-Engine", fr: "Moteur UCI" },
  "settings.noProfileDefined": { en: "No profile has been defined yet.", de: "Noch kein Profil definiert.", fr: "Aucun profil n’a encore été défini." },
  "settings.defineNewEngine": { en: "Define new engine", de: "Neue Engine definieren", fr: "Définir un nouveau moteur" },
  "settings.selectExecutableStep": { en: "Step 1 · Select the executable using the system file picker or enter its path", de: "Schritt 1 · Programmdatei über den System-Dateidialog auswählen oder Pfad eingeben", fr: "Étape 1 · Sélectionnez l’exécutable avec le sélecteur de fichiers système ou saisissez son chemin" },
  "settings.engineNameOptional": { en: "Engine name (optional)", de: "Engine-Name (optional)", fr: "Nom du moteur (facultatif)" },
  "settings.engineNamePlaceholder": { en: "Otherwise taken from the UCI engine", de: "Andernfalls von der UCI-Engine übernommen", fr: "Sinon repris du moteur UCI" },
  "settings.enginePathFallback": { en: "Engine path (fallback)", de: "Engine-Pfad (Fallback)", fr: "Chemin du moteur (secours)" },
  "settings.engineFileDialogInfo": { en: "The file dialog opens on the computer running the backend. Enter an engine name first to enable it. If the native file picker cannot be used, enter the executable path directly instead.", de: "Der Dateidialog öffnet sich auf dem Computer, auf dem das Backend läuft. Gib zuerst einen Engine-Namen ein, um ihn zu aktivieren. Falls der native Dateidialog nicht verwendet werden kann, gib stattdessen den Pfad zur Programmdatei direkt ein.", fr: "Le sélecteur de fichiers s’ouvre sur l’ordinateur qui exécute le backend. Saisissez d’abord un nom de moteur pour l’activer. Si le sélecteur natif ne peut pas être utilisé, saisissez directement le chemin de l’exécutable." },
  "settings.filePickerOpen": { en: "File picker is open…", de: "Dateidialog ist geöffnet…", fr: "Le sélecteur de fichiers est ouvert…" },
  "settings.selectEngineFile": { en: "Select engine file…", de: "Engine-Datei auswählen…", fr: "Sélectionner le fichier du moteur…" },
  "settings.inspecting": { en: "Inspecting…", de: "Wird geprüft…", fr: "Inspection…" },
  "settings.useEnteredPath": { en: "Use entered path…", de: "Eingegebenen Pfad verwenden…", fr: "Utiliser le chemin saisi…" },
  "settings.noEngineSelected": { en: "No engine selected", de: "Keine Engine ausgewählt", fr: "Aucun moteur sélectionné" },
  "settings.selectOrCreateEngine": { en: "Select an engine on the left or create a new definition.", de: "Wähle links eine Engine aus oder erstelle eine neue Definition.", fr: "Sélectionnez un moteur à gauche ou créez une nouvelle définition." },
  "settings.reviewEngineDefinition": { en: "Review engine definition", de: "Engine-Definition prüfen", fr: "Vérifier la définition du moteur" },
  "settings.uciMetadataDescription": { en: "UCI metadata and detected engine capabilities", de: "UCI-Metadaten und erkannte Engine-Fähigkeiten", fr: "Métadonnées UCI et capacités détectées du moteur" },
  "settings.reviewAndSaveStep": { en: "Step 2 · Review and save the detected engine and UCI capabilities", de: "Schritt 2 · Erkannte Engine und UCI-Fähigkeiten prüfen und speichern", fr: "Étape 2 · Vérifiez et enregistrez le moteur détecté et ses capacités UCI" },
  "settings.engineName": { en: "Engine name", de: "Engine-Name", fr: "Nom du moteur" },
  "settings.engineLabel": { en: "Engine", de: "Engine", fr: "Moteur" },
  "settings.uciName": { en: "UCI name", de: "UCI-Name", fr: "Nom UCI" },
  "settings.availableUciOptions": { en: "Available UCI Options", de: "Verfügbare UCI-Optionen", fr: "Options UCI disponibles" },
  "settings.availableUciOptionsDescription": { en: "Capabilities and original defaults reported by the engine. Concrete values are configured exclusively in profiles.", de: "Von der Engine gemeldete Fähigkeiten und ursprüngliche Standardwerte. Konkrete Werte werden ausschließlich in Profilen konfiguriert.", fr: "Capacités et valeurs par défaut d’origine signalées par le moteur. Les valeurs concrètes sont configurées exclusivement dans les profils." },
  "settings.deleteEngine": { en: "Delete Engine", de: "Engine löschen", fr: "Supprimer le moteur" },
  "settings.selectAnotherEngine": { en: "Select another engine…", de: "Andere Engine auswählen…", fr: "Sélectionner un autre moteur…" },
  "settings.saveEngine": { en: "Save Engine", de: "Engine speichern", fr: "Enregistrer le moteur" },
  "settings.createEngine": { en: "Create Engine", de: "Engine erstellen", fr: "Créer le moteur" },
  "settings.selectDefinedEngineFirst": { en: "Please select a defined engine first.", de: "Bitte wähle zuerst eine definierte Engine aus.", fr: "Veuillez d’abord sélectionner un moteur défini." },
  "settings.engineSelectedDefaults": { en: "{engine} selected. Its UCI defaults are now the starting values of this profile.", de: "{engine} ausgewählt. Die UCI-Standardwerte sind jetzt die Ausgangswerte dieses Profils.", fr: "{engine} sélectionné. Ses valeurs UCI par défaut sont maintenant les valeurs initiales de ce profil." },
  "settings.openingFilePicker": { en: "Opening system file picker…", de: "System-Dateidialog wird geöffnet…", fr: "Ouverture du sélecteur de fichiers système…" },
  "settings.engineSelectionFailed": { en: "Engine could not be selected or inspected.", de: "Engine konnte nicht ausgewählt oder geprüft werden.", fr: "Impossible de sélectionner ou d’inspecter le moteur." },
  "settings.enterEnginePathFirst": { en: "Please enter an engine executable path first.", de: "Bitte gib zuerst den Pfad zur Engine-Programmdatei ein.", fr: "Veuillez d’abord saisir le chemin de l’exécutable du moteur." },
  "settings.readingUciDefinition": { en: "Starting engine and reading its UCI definition…", de: "Engine wird gestartet und UCI-Definition gelesen…", fr: "Démarrage du moteur et lecture de sa définition UCI…" },
  "settings.engineDetected": { en: "{engine} detected · {count} UCI options", de: "{engine} erkannt · {count} UCI-Optionen", fr: "{engine} détecté · {count} options UCI" },
  "settings.engineInspectFailed": { en: "Engine could not be inspected.", de: "Engine konnte nicht geprüft werden.", fr: "Impossible d’inspecter le moteur." },
  "settings.scanNoNew": { en: "Scan complete. No new responsive UCI engines found in /usr/games.", de: "Suche abgeschlossen. Keine neuen antwortenden UCI-Engines in /usr/games gefunden.", fr: "Analyse terminée. Aucun nouveau moteur UCI répondant trouvé dans /usr/games." },
  "settings.scanAdded": { en: "Scan complete. Added {engines} UCI engine(s) and {profiles} default profile(s).", de: "Suche abgeschlossen. {engines} UCI-Engine(s) und {profiles} Standardprofil(e) hinzugefügt.", fr: "Analyse terminée. {engines} moteur(s) UCI et {profiles} profil(s) par défaut ajoutés." },
  "settings.scanFailed": { en: "System engines could not be scanned.", de: "System-Engines konnten nicht durchsucht werden.", fr: "Impossible d’analyser les moteurs système." },
  "settings.resetConfirm": { en: "Delete all saved engines and profiles? /usr/games will be scanned again. Only executables that complete a UCI handshake will be imported, each with a default profile. /usr/games/stockfish is preferred as fallback when available.", de: "Alle gespeicherten Engines und Profile löschen? /usr/games wird erneut durchsucht. Nur Programmdateien mit erfolgreichem UCI-Handshake werden importiert, jeweils mit einem Standardprofil. /usr/games/stockfish wird, falls vorhanden, als Fallback bevorzugt.", fr: "Supprimer tous les moteurs et profils enregistrés ? /usr/games sera analysé à nouveau. Seuls les exécutables qui terminent un handshake UCI seront importés, chacun avec un profil par défaut. /usr/games/stockfish est préféré comme secours lorsqu’il est disponible." },
  "settings.resetSummary": { en: "Engine settings reset. {engines} engine(s) available; fallback: {fallback}.", de: "Engine-Einstellungen zurückgesetzt. {engines} Engine(s) verfügbar; Fallback: {fallback}.", fr: "Paramètres des moteurs réinitialisés. {engines} moteur(s) disponible(s) ; secours : {fallback}." },
  "settings.resetFailed": { en: "Engine settings could not be reset.", de: "Engine-Einstellungen konnten nicht zurückgesetzt werden.", fr: "Impossible de réinitialiser les paramètres des moteurs." },
  "settings.defaultSaveFailed": { en: "Default profile assignments could not be saved.", de: "Standard-Profilzuweisungen konnten nicht gespeichert werden.", fr: "Impossible d’enregistrer les affectations de profils par défaut." },
  "settings.engineDeleteConfirm": { en: "Delete engine \"{name}\"?", de: "Engine „{name}“ löschen?", fr: "Supprimer le moteur « {name} » ?" },
  "settings.engineDeleted": { en: "Engine deleted.", de: "Engine gelöscht.", fr: "Moteur supprimé." },
  "settings.engineSaveFailed": { en: "Engine could not be saved.", de: "Engine konnte nicht gespeichert werden.", fr: "Impossible d’enregistrer le moteur." },
  "settings.engineDeleteFailed": { en: "Engine could not be deleted.", de: "Engine konnte nicht gelöscht werden.", fr: "Impossible de supprimer le moteur." },
  "database.statusReadFailed": { en: "Could not read chess database status.", de: "Status der Schachdatenbank konnte nicht gelesen werden.", fr: "Impossible de lire l’état de la base d’échecs." },
  "database.importStartFailed": { en: "Could not start PGN database import.", de: "PGN-Datenbankimport konnte nicht gestartet werden.", fr: "Impossible de démarrer l’import de la base PGN." },
  "database.importCancelFailed": { en: "Could not cancel database import.", de: "Datenbankimport konnte nicht abgebrochen werden.", fr: "Impossible d’annuler l’import de la base." },
  "database.searchFailed": { en: "Chess database search failed.", de: "Suche in der Schachdatenbank fehlgeschlagen.", fr: "La recherche dans la base d’échecs a échoué." },
  "database.gameLoadFailed": { en: "Could not load database game.", de: "Datenbankpartie konnte nicht geladen werden.", fr: "Impossible de charger la partie de la base." },
  "database.finalizationComplete": { en: "Database finalization complete.", de: "Finalisierung der Datenbank abgeschlossen.", fr: "Finalisation de la base terminée." },
  "database.startsAfterPgn": { en: "Starts after the PGN file has been fully processed.", de: "Startet, nachdem die PGN-Datei vollständig verarbeitet wurde.", fr: "Démarre après le traitement complet du fichier PGN." },
  "database.gamesProcessed": { en: "Games processed", de: "Verarbeitete Partien", fr: "Parties traitées" },
  "database.gamesAccepted": { en: "Games accepted", de: "Übernommene Partien", fr: "Parties acceptées" },
  "database.gamesSkipped": { en: "Games skipped", de: "Übersprungene Partien", fr: "Parties ignorées" },
  "database.pliesIndexed": { en: "Plies indexed", de: "Indizierte Halbzüge", fr: "Demi-coups indexés" },
  "database.searchTitle": { en: "Search Chess Database", de: "Schachdatenbank durchsuchen", fr: "Rechercher dans la base d’échecs" },
  "database.fromYear": { en: "From year", de: "Ab Jahr", fr: "À partir de l’année" },
  "database.toYear": { en: "To year", de: "Bis Jahr", fr: "Jusqu’à l’année" },
  "database.minimumElo": { en: "Minimum Elo", de: "Mindest-Elo", fr: "Elo minimum" },
  "database.eco": { en: "ECO", de: "ECO", fr: "ECO" },
  "analysis.databaseQueryFailed": { en: "Could not query the chess database.", de: "Schachdatenbank konnte nicht abgefragt werden.", fr: "Impossible d’interroger la base d’échecs." },
  "analysis.engineLinesAria": { en: "Analysis engine lines", de: "Analyse-Engine-Varianten", fr: "Variantes du moteur d’analyse" },
  "analysis.noBoardPositionsVariation": { en: "No board positions have been provided for this variation yet.", de: "Für diese Variante wurden noch keine Brettstellungen bereitgestellt.", fr: "Aucune position d’échiquier n’a encore été fournie pour cette variante." },
  "analysis.enableEvaluationBar": { en: "Enable the evaluation bar to analyze the position.", de: "Aktiviere die Bewertungsleiste, um die Stellung zu analysieren.", fr: "Activez la barre d’évaluation pour analyser la position." },
  "analysis.evaluationVariation": { en: "EvaluationEngine variation", de: "EvaluationEngine-Variante", fr: "Variante EvaluationEngine" },
  "analysis.evaluationContinuation": { en: "EvaluationEngine continuation", de: "EvaluationEngine-Fortsetzung", fr: "Suite EvaluationEngine" },
  "analysis.evaluationCalculating": { en: "Evaluation for the analysis variation is being calculated…", de: "Bewertung der Analysevariante wird berechnet…", fr: "Calcul de l’évaluation de la variante d’analyse…" },
  "analysis.enableSelectedInfinite": { en: "Enable the evaluation bar to analyze the selected position infinitely.", de: "Aktiviere die Bewertungsleiste, um die ausgewählte Stellung unbegrenzt zu analysieren.", fr: "Activez la barre d’évaluation pour analyser indéfiniment la position sélectionnée." },
  "analysis.evaluationEngine": { en: "Evaluation engine", de: "Bewertungs-Engine", fr: "Moteur d’évaluation" },
  "analysis.history": { en: "Analysis history", de: "Analyseverlauf", fr: "Historique de l’analyse" },
  "analysis.moveAnnotationLoss": {
    en: "Win chance loss {loss} pp · Best move {best}",
    de: "Gewinnchancenverlust {loss} %-Punkte · Bester Zug {best}",
    fr: "Perte de chances de gain {loss} points · Meilleur coup {best}",
  },
  "analysis.moveAnnotationOnlyMove": {
    en: "Only good move · Best move {best} · Second best {second}",
    de: "Einziger guter Zug · Bester Zug {best} · Zweitbester Zug {second}",
    fr: "Seul bon coup · Meilleur coup {best} · Deuxième meilleur {second}",
  },
  "analysis.moveAnnotationBrilliant": {
    en: "Brilliant move · depth {earlyDepth} → {finalDepth} · rank {earlyRank} → {finalRank} · became much stronger during the search",
    de: "Brillanter Zug · Tiefe {earlyDepth} → {finalDepth} · Rang {earlyRank} → {finalRank} · während der Suche deutlich aufgewertet",
    fr: "Coup brillant · profondeur {earlyDepth} → {finalDepth} · rang {earlyRank} → {finalRank} · nettement revalorisé pendant la recherche",
  },
  "analysis.moveAnnotationBrilliantMaterial": {
    en: "Brilliant move · material investment {material} · final rank {finalRank}",
    de: "Brillanter Zug · Materialinvestition {material} · Endrang {finalRank}",
    fr: "Coup brillant · investissement matériel {material} · rang final {finalRank}",
  },
  "analysis.moveAnnotationBrilliantCombined": {
    en: "Brilliant move · depth {earlyDepth} → {finalDepth} · rank {earlyRank} → {finalRank} · material investment {material}",
    de: "Brillanter Zug · Tiefe {earlyDepth} → {finalDepth} · Rang {earlyRank} → {finalRank} · Materialinvestition {material}",
    fr: "Coup brillant · profondeur {earlyDepth} → {finalDepth} · rang {earlyRank} → {finalRank} · investissement matériel {material}",
  },
  "analysis.mode": { en: "Analysis mode", de: "Analysemodus", fr: "Mode analyse" },
  "analysis.clickMoveContinuation": { en: "Click a move in the move list to play an engine continuation.", de: "Klicke auf einen Zug in der Zugliste, um eine Engine-Fortsetzung abzuspielen.", fr: "Cliquez sur un coup de la liste pour jouer une suite du moteur." },
  "analysis.selectMoveStoredVariations": { en: "Select a move to show the stored engine variations here.", de: "Wähle einen Zug aus, um hier die gespeicherten Engine-Varianten anzuzeigen.", fr: "Sélectionnez un coup pour afficher ici les variantes moteur enregistrées." },
  "analysis.noEvaluationPly": { en: "No evaluation is available for this ply yet.", de: "Für diesen Halbzug ist noch keine Bewertung verfügbar.", fr: "Aucune évaluation n’est encore disponible pour ce demi-coup." },
  "analysis.noEngineVariations": { en: "No engine variations were provided for this position.", de: "Für diese Stellung wurden keine Engine-Varianten bereitgestellt.", fr: "Aucune variante moteur n’a été fournie pour cette position." },
  "analysis.analysisEngine": { en: "Analysis engine", de: "Analyse-Engine", fr: "Moteur d’analyse" },
  "analysis.source": { en: "Analysis source", de: "Analysequelle", fr: "Source d’analyse" },
  "analysis.engineSource": { en: "Engine", de: "Engine", fr: "Moteur" },
  "analysis.databaseSource": { en: "Database", de: "Datenbank", fr: "Base de données" },
  "analysis.databasePositionAfter": { en: "Database position after {label}", de: "Datenbankstellung nach {label}", fr: "Position de base après {label}" },
  "analysis.databasePosition": { en: "Database position", de: "Datenbankstellung", fr: "Position de base" },
  "analysis.engineContinuationFrom": { en: "Engine continuation from {label}", de: "Engine-Fortsetzung ab {label}", fr: "Suite du moteur à partir de {label}" },
  "analysis.engineContinuation": { en: "Engine continuation", de: "Engine-Fortsetzung", fr: "Suite du moteur" },
  "analysis.databaseContinuations": { en: "Database continuations", de: "Datenbankfortsetzungen", fr: "Suites de la base" },
  "analysis.engineVariations": { en: "Engine variations", de: "Engine-Varianten", fr: "Variantes du moteur" },
  "analysis.noEngineLines": { en: "No engine lines.", de: "Keine Engine-Varianten.", fr: "Aucune variante moteur." },
  "analysis.engineOutputPlaceholder": { en: "Engine output will appear here.", de: "Die Engine-Ausgabe erscheint hier.", fr: "La sortie du moteur apparaîtra ici." },
  "game.gameOver": { en: "Game Over", de: "Partie beendet", fr: "Partie terminée" },
  "game.savePgn": { en: "Save PGN", de: "PGN speichern", fr: "Enregistrer le PGN" },
  "game.loadPgn": { en: "Load PGN", de: "PGN laden", fr: "Charger un PGN" },
  "game.whiteEngine": { en: "White Engine", de: "Engine Weiß", fr: "Moteur Blancs" },
  "game.blackEngine": { en: "Black Engine", de: "Engine Schwarz", fr: "Moteur Noirs" },
  "game.blackWinsCheckmate": { en: "Black wins by checkmate.", de: "Schwarz gewinnt durch Schachmatt.", fr: "Les Noirs gagnent par échec et mat." },
  "game.whiteWinsCheckmate": { en: "White wins by checkmate.", de: "Weiß gewinnt durch Schachmatt.", fr: "Les Blancs gagnent par échec et mat." },
  "game.stalemate": { en: "Draw by stalemate.", de: "Remis durch Patt.", fr: "Nulle par pat." },
  "game.blackWinsWhiteResigned": { en: "Black wins because White resigned.", de: "Schwarz gewinnt, weil Weiß aufgegeben hat.", fr: "Les Noirs gagnent car les Blancs ont abandonné." },
  "game.whiteWinsBlackResigned": { en: "White wins because Black resigned.", de: "Weiß gewinnt, weil Schwarz aufgegeben hat.", fr: "Les Blancs gagnent car les Noirs ont abandonné." },
  "game.blackWinsWhiteTime": { en: "Black wins because White ran out of time.", de: "Schwarz gewinnt, weil Weiß die Zeit überschritten hat.", fr: "Les Noirs gagnent car les Blancs ont dépassé le temps." },
  "game.whiteWinsBlackTime": { en: "White wins because Black ran out of time.", de: "Weiß gewinnt, weil Schwarz die Zeit überschritten hat.", fr: "Les Blancs gagnent car les Noirs ont dépassé le temps." },
  "game.endedOnTime": { en: "Game ended on time.", de: "Partie durch Zeitüberschreitung beendet.", fr: "Partie terminée au temps." },
  "game.drawFifty": { en: "Draw by the fifty-move rule.", de: "Remis durch die 50-Züge-Regel.", fr: "Nulle par la règle des cinquante coups." },
  "game.drawThreefold": { en: "Draw by threefold repetition.", de: "Remis durch dreifache Stellungswiederholung.", fr: "Nulle par triple répétition." },
  "game.drawInsufficient": { en: "Draw by insufficient mating material.", de: "Remis wegen unzureichenden Mattmaterials.", fr: "Nulle pour matériel insuffisant pour mater." },
  "game.endedState": { en: "Game ended: {state}", de: "Partie beendet: {state}", fr: "Partie terminée : {state}" },
  "game.ended": { en: "The game has ended.", de: "Die Partie ist beendet.", fr: "La partie est terminée." },
  "game.enableWhiteEngine": { en: "Enable White player engine", de: "Engine für Weiß aktivieren", fr: "Activer le moteur des Blancs" },
  "game.disableWhiteEngine": { en: "Disable White player engine", de: "Engine für Weiß deaktivieren", fr: "Désactiver le moteur des Blancs" },
  "game.enableBlackEngine": { en: "Enable Black player engine", de: "Engine für Schwarz aktivieren", fr: "Activer le moteur des Noirs" },
  "game.disableBlackEngine": { en: "Disable Black player engine", de: "Engine für Schwarz deaktivieren", fr: "Désactiver le moteur des Noirs" },
  "game.enableEvaluationEngine": { en: "Enable evaluation engine", de: "Bewertungs-Engine aktivieren", fr: "Activer le moteur d’évaluation" },
  "game.disableEvaluationEngine": { en: "Disable evaluation engine", de: "Bewertungs-Engine deaktivieren", fr: "Désactiver le moteur d’évaluation" },
  "game.enableAnalysisEvaluation": { en: "Enable analysis evaluation", de: "Analysebewertung aktivieren", fr: "Activer l’évaluation d’analyse" },
  "game.disableAnalysisEvaluation": { en: "Disable analysis evaluation", de: "Analysebewertung deaktivieren", fr: "Désactiver l’évaluation d’analyse" },
  "game.selectMoveEvaluation": { en: "Select a move to use the evaluation engine", de: "Wähle einen Zug aus, um die Bewertungs-Engine zu verwenden", fr: "Sélectionnez un coup pour utiliser le moteur d’évaluation" },
  "game.enableEvaluationVariation": { en: "Enable the evaluation engine for the current variation", de: "Bewertungs-Engine für die aktuelle Variante aktivieren", fr: "Activer le moteur d’évaluation pour la variante actuelle" },
  "game.enableEvaluationSelectedMove": { en: "Enable the evaluation engine for the selected move", de: "Bewertungs-Engine für den ausgewählten Zug aktivieren", fr: "Activer le moteur d’évaluation pour le coup sélectionné" },
  "game.promotionPrompt": { en: "Promotion for {color} pawn ({from} → {to}):", de: "Umwandlung für {color}-Bauern ({from} → {to}):", fr: "Promotion du pion {color} ({from} → {to}) :" },
  "game.boardLoadFailed": { en: "Could not load the board from the server.", de: "Brett konnte nicht vom Server geladen werden.", fr: "Impossible de charger l’échiquier depuis le serveur." },
  "game.restoreFailed": { en: "Could not restore the current game after reload.", de: "Aktuelle Partie konnte nach dem Neuladen nicht wiederhergestellt werden.", fr: "Impossible de restaurer la partie actuelle après rechargement." },
  "game.settingsLoadFailed": { en: "Game settings could not be loaded.", de: "Partieeinstellungen konnten nicht geladen werden.", fr: "Impossible de charger les paramètres de partie." },
  "game.clockLoadFailed": { en: "Could not load the clock.", de: "Uhr konnte nicht geladen werden.", fr: "Impossible de charger l’horloge." },
  "game.possibleMovesFailed": { en: "Failed to load possible moves.", de: "Mögliche Züge konnten nicht geladen werden.", fr: "Impossible de charger les coups possibles." },
  "game.loadPgnFailed": { en: "Could not load the PGN file.", de: "PGN-Datei konnte nicht geladen werden.", fr: "Impossible de charger le fichier PGN." },
  "analysis.noDeepProfile": { en: "No deep analysis engine profile is available.", de: "Kein Engine-Profil für die Tiefenanalyse verfügbar.", fr: "Aucun profil de moteur d’analyse approfondie n’est disponible." },
  "analysis.variationMoveFailed": { en: "Failed to execute the analysis variation move.", de: "Zug der Analysevariante konnte nicht ausgeführt werden.", fr: "Impossible d’exécuter le coup de la variante d’analyse." },
  "analysis.evaluationBoardUnavailable": { en: "The EvaluationEngine board position is not available.", de: "Die Brettstellung der EvaluationEngine ist nicht verfügbar.", fr: "La position d’échiquier de l’EvaluationEngine n’est pas disponible." },
  "analysis.variationFromPly": { en: "EvaluationEngine variation from ply {ply}", de: "EvaluationEngine-Variante ab Halbzug {ply}", fr: "Variante EvaluationEngine à partir du demi-coup {ply}" },
  "analysis.continuationFromPly": { en: "EvaluationEngine continuation from ply {ply}", de: "EvaluationEngine-Fortsetzung ab Halbzug {ply}", fr: "Suite EvaluationEngine à partir du demi-coup {ply}" },
  "analysis.variationsInfinite": { en: "EvaluationEngine variations · infinite", de: "EvaluationEngine-Varianten · unbegrenzt", fr: "Variantes EvaluationEngine · infinies" },
  "analysis.evaluationPlyCalculating": { en: "Evaluation for ply {ply} is being calculated…", de: "Bewertung für Halbzug {ply} wird berechnet…", fr: "Calcul de l’évaluation du demi-coup {ply}…" },
  "analysis.terminalPosition": { en: "terminal position", de: "Endstellung", fr: "position terminale" },
  "analysis.depthInfinite": { en: "depth {depth} · infinite", de: "Tiefe {depth} · unbegrenzt", fr: "profondeur {depth} · infinie" },
  "common.database": { en: "Database", de: "Datenbank", fr: "Base de données" },
  "settings.scanningSystem": { en: "Scanning /usr/games and validating UCI handshakes…", de: "/usr/games wird durchsucht und UCI-Handshakes werden geprüft…", fr: "Analyse de /usr/games et validation des handshakes UCI…" },
  "settings.optionDefault": { en: "default", de: "Standard", fr: "défaut" },
  "settings.optionMin": { en: "min", de: "Min.", fr: "min" },
  "settings.optionMax": { en: "max", de: "Max.", fr: "max" },
  "settings.optionAction": { en: "action", de: "Aktion", fr: "action" },
  "settings.optionEmpty": { en: "<empty>", de: "<leer>", fr: "<vide>" },
  "settings.defaultProfileName": { en: "{engine} Profile", de: "{engine} Profil", fr: "Profil {engine}" },
  "settings.uciOptionsCount": { en: "{count} UCI options", de: "{count} UCI-Optionen", fr: "{count} options UCI" },
  "engine.stateRunning": { en: "RUNNING", de: "LÄUFT", fr: "EN COURS" },
  "engine.stateStopped": { en: "STOPPED", de: "GESTOPPT", fr: "ARRÊTÉ" },
  "engine.stateClosed": { en: "CLOSED", de: "GESCHLOSSEN", fr: "FERMÉ" },
  "common.error": { en: "Error", de: "Fehler", fr: "Erreur" },
  "game.pieceQueen": { en: "Queen", de: "Dame", fr: "Dame" },
  "game.pieceRook": { en: "Rook", de: "Turm", fr: "Tour" },
  "game.pieceBishop": { en: "Bishop", de: "Läufer", fr: "Fou" },
  "game.pieceKnight": { en: "Knight", de: "Springer", fr: "Cavalier" },
} satisfies Record<string, Translation>;

const additionalTranslations: Record<"it" | "es", Record<string, string>> = {
  it: italianTranslations,
  es: spanishTranslations,
};

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

const I18nContext = createContext<I18nContextValue | null>(null);

function getTranslation(key: TranslationKey, language: Language): string {
  if (language === "it" || language === "es") {
    return additionalTranslations[language][key];
  }
  return translations[key][language];
}

function validateAdditionalTranslations() {
  const keys = Object.keys(translations) as TranslationKey[];
  for (const language of ["it", "es"] as const) {
    const missing = keys.filter((key) => !Object.prototype.hasOwnProperty.call(additionalTranslations[language], key));
    if (missing.length > 0) {
      throw new Error(`Missing ${language} translations: ${missing.join(", ")}`);
    }
  }
}

validateAdditionalTranslations();

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
  if (isSupportedLanguage(stored)) {
    return stored;
  }
  return detectSupportedLanguage(window.navigator.language);
}

function findTranslationKey(text: string): TranslationKey | null {
  if (aliases[text]) {
    return aliases[text];
  }

  for (const key of Object.keys(translations) as TranslationKey[]) {
    if (SUPPORTED_LANGUAGES.some(({ code }) => getTranslation(key, code) === text)) {
      return key;
    }
  }
  return null;
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
