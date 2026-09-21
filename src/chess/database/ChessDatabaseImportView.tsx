import { useI18n } from "../../i18n/I18nProvider";
import {
  databaseImportOperationLabel,
  databaseImportProgressPercent,
  databaseImportStatusLabel,
  formatDatabaseBytes,
  formatDatabaseElapsed,
} from "./chessDatabaseUtils";
import type { ChessDatabaseImportController } from "./useChessDatabaseImport";

interface Props {
  controller: ChessDatabaseImportController;
  onCloseResult: () => void;
}

export default function ChessDatabaseImportView({
  controller,
  onCloseResult,
}: Props) {
  const { t } = useI18n();
  const {
    importFileName,
    isImportStarting,
    importJob,
    importStartError,
    cancelRequested,
    cancelImport,
  } = controller;

  const progressPercent = databaseImportProgressPercent(importJob);
  const importRunning =
    isImportStarting || importJob?.status === "RUNNING";
  const importCanClose =
    !importRunning && (importJob !== null || importStartError !== null);
  const pgnComplete = importJob != null && progressPercent >= 100;
  const finalizationActive = importJob?.phase === "FINALIZING_DATABASE";
  const finalizationComplete = importJob?.status === "COMPLETE";

  return (
    <div className="chess-database-overlay" role="presentation">
      <section
        className="chess-database-dialog chess-database-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chess-database-import-title"
      >
        <h2 id="chess-database-import-title">{t("database.importTitle")}</h2>
        <div
          className="chess-database-import-file"
          title={importJob?.fileName || importFileName}
        >
          {importJob?.fileName || importFileName}
        </div>

        {isImportStarting && (
          <div className="chess-database-muted">Preparing import…</div>
        )}

        {importJob && (
          <>
            <div className="chess-database-import-phases">
              <div
                className={`chess-database-import-phase ${
                  pgnComplete ? "is-complete" : "is-active"
                }`}
              >
                <div className="chess-database-import-phase-header">
                  <strong>1. Reading PGN</strong>
                  <span>{pgnComplete ? "Complete" : "Running"}</span>
                </div>
                <div
                  className="chess-database-progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressPercent)}
                >
                  <div
                    className="chess-database-progress-bar"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="chess-database-progress-label">
                  <strong>{progressPercent.toFixed(1)}%</strong>
                  <span>
                    {formatDatabaseBytes(importJob.bytesRead)} /{" "}
                    {formatDatabaseBytes(importJob.totalBytes)}
                  </span>
                </div>
              </div>

              <div
                className={[
                  "chess-database-import-phase",
                  finalizationActive ? "is-active" : "",
                  finalizationComplete ? "is-complete" : "",
                ].filter(Boolean).join(" ")}
              >
                <div className="chess-database-import-phase-header">
                  <strong>2. Building database</strong>
                  <span>
                    {finalizationComplete
                      ? "Complete"
                      : finalizationActive
                        ? "Running"
                        : "Waiting"}
                  </span>
                </div>
                {finalizationActive && (
                  <div
                    className="chess-database-indeterminate"
                    role="progressbar"
                    aria-label={t("database.finalizing")}
                  >
                    <div className="chess-database-indeterminate-bar" />
                  </div>
                )}
                <div className="chess-database-import-phase-detail">
                  {finalizationComplete
                    ? t("database.finalizationComplete")
                    : finalizationActive
                      ? "Merging position statistics and publishing staged games…"
                      : t("database.startsAfterPgn")}
                </div>
              </div>
            </div>

            <div className="chess-database-import-result">
              <div>
                <span>{t("common.status")}</span>
                <strong>{databaseImportStatusLabel(importJob)}</strong>
              </div>
              <div>
                <span>{t("common.currentOperation")}</span>
                <strong>{databaseImportOperationLabel(importJob)}</strong>
              </div>
              <div>
                <span>{t("database.gamesProcessed")}</span>
                <strong>{importJob.processedGames.toLocaleString()}</strong>
              </div>
              <div>
                <span>{t("database.gamesAccepted")}</span>
                <strong>{importJob.importedGames.toLocaleString()}</strong>
              </div>
              <div>
                <span>{t("database.gamesSkipped")}</span>
                <strong>{importJob.skippedGames.toLocaleString()}</strong>
              </div>
              <div>
                <span>{t("database.pliesIndexed")}</span>
                <strong>{importJob.totalPlies.toLocaleString()}</strong>
              </div>
              <div>
                <span>{t("common.elapsed")}</span>
                <strong>{formatDatabaseElapsed(importJob.elapsedMillis)}</strong>
              </div>
            </div>

            {importJob.message && (
              <div
                className={
                  importJob.status === "FAILED"
                    ? "chess-database-error"
                    : "chess-database-import-message"
                }
              >
                {importJob.message}
              </div>
            )}
          </>
        )}

        {importStartError && (
          <div className="chess-database-error">{importStartError}</div>
        )}

        <div className="chess-database-footer chess-database-import-footer">
          {importJob?.status === "RUNNING" && (
            <button
              type="button"
              onClick={() => void cancelImport()}
              disabled={cancelRequested}
            >
              {cancelRequested ? "Cancelling…" : "Cancel"}
            </button>
          )}
          <button
            type="button"
            disabled={!importCanClose}
            onClick={onCloseResult}
          >
            OK
          </button>
        </div>
      </section>
    </div>
  );
}
