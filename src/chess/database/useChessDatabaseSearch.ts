import { useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import {
  loadDatabaseGame,
  searchDatabaseGames,
} from "../api/chessDatabaseApi";
import type {
  ChessDatabaseLoadedGame,
  DatabaseGameSummary,
  SearchForm,
} from "./chessDatabaseTypes";
import { EMPTY_DATABASE_SEARCH } from "./chessDatabaseTypes";
import { createDatabaseSearchRequest } from "./chessDatabaseUtils";

interface Options {
  onGameLoaded: (game: ChessDatabaseLoadedGame) => void | Promise<void>;
  onClose: () => void;
}

export function useChessDatabaseSearch({
  onGameLoaded,
  onClose,
}: Options) {
  const { t } = useI18n();
  const [searchForm, setSearchForm] = useState<SearchForm>({
    ...EMPTY_DATABASE_SEARCH,
  });
  const [searchResults, setSearchResults] = useState<DatabaseGameSummary[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingGameId, setLoadingGameId] = useState<number | null>(null);

  function updateSearchField<K extends keyof SearchForm>(
    key: K,
    value: SearchForm[K],
  ) {
    setSearchForm((previous) => ({ ...previous, [key]: value }));
  }

  function resetSearch() {
    setSearchForm({ ...EMPTY_DATABASE_SEARCH });
    setSearchResults([]);
    setSearchError(null);
    setHasSearched(false);
  }

  async function searchGames() {
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setHasSearched(true);
    try {
      setSearchResults(
        await searchDatabaseGames(createDatabaseSearchRequest(searchForm)),
      );
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : t("database.searchFailed"),
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function loadGame(gameId: number) {
    setLoadingGameId(gameId);
    setSearchError(null);
    try {
      const game = await loadDatabaseGame(gameId);
      await onGameLoaded(game);
      onClose();
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : t("database.gameLoadFailed"),
      );
    } finally {
      setLoadingGameId(null);
    }
  }

  return {
    searchForm,
    searchResults,
    hasSearched,
    isSearching,
    searchError,
    loadingGameId,
    updateSearchField,
    resetSearch,
    searchGames,
    loadGame,
  };
}

export type ChessDatabaseSearchController =
  ReturnType<typeof useChessDatabaseSearch>;
