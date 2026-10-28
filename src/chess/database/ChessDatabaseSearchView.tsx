import { useI18n } from "../../i18n/I18nProvider";
import ChessDatabaseSearchFilters from "./ChessDatabaseSearchFilters";
import type { ChessDatabaseSearchController } from "./useChessDatabaseSearch";

interface Props {
  controller: ChessDatabaseSearchController;
  onBack: () => void;
  onClose: () => void;
}

export default function ChessDatabaseSearchView({
  controller,
  onBack,
  onClose,
}: Props) {
  const { t } = useI18n();
  const {
    searchResults,
    hasSearched,
    isSearching,
    searchError,
    loadingGameId,
    resetSearch,
    searchGames,
    loadGame,
  } = controller;

  return (
    <div className="chess-database-overlay" role="presentation">
      <section
        className="chess-database-dialog chess-database-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chess-database-search-title"
      >
        <div className="chess-database-search-header">
          <div>
            <h2 id="chess-database-search-title">{t("database.searchTitle")}</h2>
            <p>{t("database.searchStartHint")}</p>
          </div>
        </div>

        <div className="chess-database-search-body">
          <form
            className="chess-database-search-form"
            onSubmit={(event) => {
              event.preventDefault();
              void searchGames();
            }}
          >
            <ChessDatabaseSearchFilters controller={controller} />

            <div className="chess-database-search-actions">
              <button
                type="button"
                className="chess-database-secondary-button"
                onClick={resetSearch}
                disabled={isSearching || loadingGameId !== null}
              >
                {t("database.resetFilters")}
              </button>
              <button
                type="submit"
                className="chess-database-primary-button"
                disabled={isSearching || loadingGameId !== null}
              >
                {isSearching
                  ? t("database.querying")
                  : t("database.searchGames")}
              </button>
            </div>
          </form>

          {searchError && (
            <div className="chess-database-error">{searchError}</div>
          )}

          <div className="chess-database-results-section">
            <div className="chess-database-results-toolbar">
              <strong>{t("database.searchResults")}</strong>
              {hasSearched && (
                <span>
                  {searchResults.length.toLocaleString()} {t("common.games")}
                </span>
              )}
            </div>

            <div className="chess-database-results-wrap">
              <table className="chess-database-results">
                <thead>
                  <tr>
                    <th>{t("common.date")}</th>
                    <th>{t("common.white")}</th>
                    <th>{t("common.black")}</th>
                    <th>{t("common.result")}</th>
                    <th>{t("database.eco")}</th>
                    <th>{t("common.event")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {searchResults.length === 0 && (
                    <tr>
                      <td colSpan={7} className="chess-database-empty">
                        {hasSearched
                          ? t("database.noSearchResults")
                          : t("database.searchStartHint")}
                      </td>
                    </tr>
                  )}
                  {searchResults.map((game) => (
                    <tr key={game.id}>
                      <td>{game.date || "?"}</td>
                      <td>
                        {game.white}
                        {game.whiteElo != null ? ` (${game.whiteElo})` : ""}
                      </td>
                      <td>
                        {game.black}
                        {game.blackElo != null ? ` (${game.blackElo})` : ""}
                      </td>
                      <td>
                        {game.result === "1/2-1/2"
                          ? "½-½"
                          : game.result || "*"}
                      </td>
                      <td>{game.eco || "—"}</td>
                      <td title={game.event || ""}>{game.event || "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="chess-database-row-action"
                          onClick={() => void loadGame(game.id)}
                          disabled={loadingGameId !== null}
                        >
                          {loadingGameId === game.id
                            ? t("database.loadingGameAction")
                            : t("database.loadGameAction")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="chess-database-footer chess-database-search-footer">
          <button
            type="button"
            onClick={onBack}
            disabled={loadingGameId !== null}
          >
            {t("common.back")}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loadingGameId !== null}
          >
            {t("common.close")}
          </button>
        </div>
      </section>
    </div>
  );
}
