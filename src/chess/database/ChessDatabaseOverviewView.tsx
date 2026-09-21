import { useI18n } from "../../i18n/I18nProvider";
import { formatDatabaseBytes } from "./chessDatabaseUtils";
import type { ChessDatabaseStatusController } from "./useChessDatabaseStatus";

interface Props {
  controller: ChessDatabaseStatusController;
  onImport: () => void;
  onSearch: () => void;
  onClose: () => void;
}

export default function ChessDatabaseOverviewView({
  controller,
  onImport,
  onSearch,
  onClose,
}: Props) {
  const { t } = useI18n();
  const { status, statusError, isStatusLoading } = controller;

  return (
    <div className="chess-database-overlay" role="presentation">
      <section
        className="chess-database-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chess-database-title"
      >
        <h2 id="chess-database-title">{t("database.title")}</h2>

        <div className="chess-database-status-card">
          {isStatusLoading && (
            <div className="chess-database-muted">Loading database status…</div>
          )}
          {!isStatusLoading && status && (
            <>
              <div className="chess-database-status-row">
                <span>{t("common.database")}</span>
                <strong>{status.name || t("database.title")}</strong>
              </div>
              <div className="chess-database-status-row">
                <span>{t("common.file")}</span>
                <strong className="chess-database-path" title={status.path}>
                  {status.path}
                </strong>
              </div>
              <div className="chess-database-status-row">
                <span>{t("common.games")}</span>
                <strong>{status.gameCount.toLocaleString()}</strong>
              </div>
              <div className="chess-database-status-row">
                <span>{t("common.size")}</span>
                <strong>{formatDatabaseBytes(status.sizeBytes)}</strong>
              </div>
            </>
          )}
          {statusError && (
            <div className="chess-database-error">{statusError}</div>
          )}
        </div>

        <div className="chess-database-actions">
          <button type="button" onClick={onImport}>
            {t("database.importPgn")}
          </button>
          <button type="button" onClick={onSearch}>
            {t("database.searchGames")}
          </button>
        </div>

        <div className="chess-database-footer">
          <button type="button" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
      </section>
    </div>
  );
}
