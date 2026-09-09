import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { Language } from "../../i18n/languages";
import "./PgnImportProblemDialog.css";

interface PgnImportProblemDialogProps {
  error: string;
}

interface PgnImportErrorPayload {
  code?: string;
  gameCount?: number;
  earlyAbort?: boolean;
}

interface DialogCopy {
  multipleTitle: string;
  multipleMessage: (minimumGames: number) => string;
  failedTitle: string;
  failedMessage: string;
  importInstead: string;
  ok: string;
}

const COPY: Record<Language, DialogCopy> = {
  en: {
    multipleTitle: "Multiple games detected",
    multipleMessage: (minimumGames) =>
      `“Import new game” can load only one game. This PGN contains at least ${minimumGames} games, so the import was stopped.`,
    failedTitle: "PGN import could not be completed",
    failedMessage:
      "The file could not be imported as a single game. PGN files containing multiple games must be imported through the chess database.",
    importInstead: "Please import the file instead via:",
    ok: "OK",
  },
  de: {
    multipleTitle: "Mehrere Partien erkannt",
    multipleMessage: (minimumGames) =>
      `„Neue Partie importieren“ kann nur eine einzelne Partie laden. Diese PGN-Datei enthält mindestens ${minimumGames} Partien; der Import wurde deshalb abgebrochen.`,
    failedTitle: "PGN-Import konnte nicht abgeschlossen werden",
    failedMessage:
      "Die Datei konnte nicht als einzelne Partie importiert werden. PGN-Dateien mit mehreren Partien müssen über die Schachdatenbank importiert werden.",
    importInstead: "Bitte importiere die Datei stattdessen über:",
    ok: "OK",
  },
  fr: {
    multipleTitle: "Plusieurs parties détectées",
    multipleMessage: (minimumGames) =>
      `« Importer une nouvelle partie » ne peut charger qu’une seule partie. Ce fichier PGN contient au moins ${minimumGames} parties ; l’importation a donc été arrêtée.`,
    failedTitle: "L’importation PGN n’a pas pu être terminée",
    failedMessage:
      "Le fichier n’a pas pu être importé comme une partie unique. Les fichiers PGN contenant plusieurs parties doivent être importés via la base de données d’échecs.",
    importInstead: "Importez plutôt le fichier via :",
    ok: "OK",
  },
  it: {
    multipleTitle: "Rilevate più partite",
    multipleMessage: (minimumGames) =>
      `“Importa nuova partita” può caricare una sola partita. Questo file PGN contiene almeno ${minimumGames} partite, quindi l’importazione è stata interrotta.`,
    failedTitle: "Impossibile completare l’importazione PGN",
    failedMessage:
      "Il file non può essere importato come singola partita. I file PGN con più partite devono essere importati tramite il database scacchistico.",
    importInstead: "Importa invece il file tramite:",
    ok: "OK",
  },
  es: {
    multipleTitle: "Se detectaron varias partidas",
    multipleMessage: (minimumGames) =>
      `“Importar nueva partida” solo puede cargar una partida. Este archivo PGN contiene al menos ${minimumGames} partidas, por lo que se detuvo la importación.`,
    failedTitle: "No se pudo completar la importación PGN",
    failedMessage:
      "El archivo no se pudo importar como una sola partida. Los archivos PGN con varias partidas deben importarse mediante la base de datos de ajedrez.",
    importInstead: "Importa el archivo en su lugar mediante:",
    ok: "OK",
  },
};

function parsePgnImportError(error: string): PgnImportErrorPayload | null {
  try {
    const parsed = JSON.parse(error) as PgnImportErrorPayload;
    if (parsed && typeof parsed === "object" && typeof parsed.code === "string") {
      return parsed;
    }
  } catch {
    // Plain network errors are handled separately.
  }

  return null;
}

export function isPgnImportProblem(error: string | null): boolean {
  if (!error) return false;
  if (error === "Failed to fetch") return true;
  return parsePgnImportError(error)?.code === "PGN_MULTIPLE_GAMES";
}

export default function PgnImportProblemDialog({ error }: PgnImportProblemDialogProps) {
  const { language, t } = useI18n();
  const [open, setOpen] = useState(true);
  const payload = parsePgnImportError(error);
  const multipleGames = payload?.code === "PGN_MULTIPLE_GAMES";
  const minimumGames = Math.max(2, payload?.gameCount ?? 2);
  const copy = COPY[language];

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="pgn-import-problem-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setOpen(false);
        }
      }}
    >
      <div
        className="pgn-import-problem-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pgn-import-problem-title"
      >
        <div className="pgn-import-problem-icon" aria-hidden="true">⚠</div>
        <h2 id="pgn-import-problem-title">
          {multipleGames ? copy.multipleTitle : copy.failedTitle}
        </h2>

        <p className="pgn-import-problem-message">
          {multipleGames
            ? copy.multipleMessage(minimumGames)
            : copy.failedMessage}
        </p>

        <p className="pgn-import-problem-instruction">{copy.importInstead}</p>
        <div className="pgn-import-problem-path">
          <span>{t("data.label")}</span>
          <span aria-hidden="true">→</span>
          <span>{t("data.chessDatabase")}</span>
          <span aria-hidden="true">→</span>
          <span>{t("database.importPgn")}</span>
        </div>

        <div className="pgn-import-problem-actions">
          <button type="button" onClick={() => setOpen(false)} autoFocus>
            {copy.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
