import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import {
  deleteDatabaseGame,
  loadDatabaseGame,
  searchDatabaseGames,
} from "../api/chessDatabaseApi";
import { fetchOpenings } from "../api/openingApi";
import type { Opening } from "../types";
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
  const [deletingGameId, setDeletingGameId] = useState<number | null>(null);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [openingsLoading, setOpeningsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setOpeningsLoading(true);
    void fetchOpenings()
      .then((loaded) => {
        if (active) setOpenings(loaded);
      })
      .catch(() => {
        if (active) setOpenings([]);
      })
      .finally(() => {
        if (active) setOpeningsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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

  async function deleteGame(game: DatabaseGameSummary) {
    if (!window.confirm(t("database.deleteGameConfirm", {
      white: game.white,
      black: game.black,
    }))) return;

    setDeletingGameId(game.id);
    setSearchError(null);
    try {
      await deleteDatabaseGame(game.id);
      setSearchResults((previous) => previous.filter(
        (candidate) => candidate.id !== game.id,
      ));
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : t("database.gameDeleteFailed"),
      );
    } finally {
      setDeletingGameId(null);
    }
  }

  return {
    searchForm,
    searchResults,
    hasSearched,
    isSearching,
    searchError,
    loadingGameId,
    deletingGameId,
    openings,
    openingsLoading,
    updateSearchField,
    resetSearch,
    searchGames,
    loadGame,
    deleteGame,
  };
}

export type ChessDatabaseSearchController =
  ReturnType<typeof useChessDatabaseSearch>;
