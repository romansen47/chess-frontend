import { useEffect, type ChangeEvent } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { ChessDatabaseLoadedGame } from "../../ChessDatabaseDialog";
import { createInitialPieces } from "./boardUtils";
import { mapPositionStringToLocalPieces } from "./positionUtils";
import { formatPlayerDisplayName, formatTimeControlFromSettings, mapImportedUciMovesToRows } from "../game/gameFormatters";
import { createLiveEvaluationPosition } from "../evaluation/liveEvaluationPosition";
import { createNewGame, exportPgn, fetchClock, fetchGameSettings, fetchGameSnapshot, importPgn } from "../api/gameApi";
import { terminateBackend, terminateDevelopmentFrontend } from "../api/programApi";
import type { ClockState, GameAnnotation, GameSettings, UciGameResponse } from "../types";
import type { ChessBoardState } from "./useChessBoardState";
import type { ChessEngineState } from "./useChessEngineState";
import type { ChessGameState } from "./useChessGameState";

interface AnalysisBridge {
  replayActiveRef: { current: boolean };
  restoreAnnotations: (annotations: GameAnnotation[] | null | undefined) => void;
  restoreReplayAfterReload: (moves: UciGameResponse["moves"]) => Promise<void>;
  setImportedPlayers: (white: string | null | undefined, black: string | null | undefined, totalPlies: number) => void;
  setShowSettingsDialog: (value: boolean) => void;
  stopEvaluation: () => Promise<void>;
  resetState: () => void;
  resetAnnotations: () => void;
  setWhitePlayerName: (value: string | null) => void;
  setBlackPlayerName: (value: string | null) => void;
}

interface Options {
  board: ChessBoardState;
  engine: ChessEngineState;
  game: ChessGameState;
  analysis: AnalysisBridge;
  whiteComputerEnabled: boolean;
  blackComputerEnabled: boolean;
  disablePlayerEngines: () => Promise<void>;
  requestComputerMoveIfEnabled: (sideToMove: string | null | undefined) => Promise<unknown>;
  stopLiveEvaluation: () => Promise<void>;
  loadEngineConfigs: () => Promise<unknown>;
  synchronizeAfterMoveSequence: () => Promise<void>;
  resetBoardInteraction: () => void;
  loadBoardFromBackend: () => Promise<void>;
}

export function useChessGameLifecycle(options: Options) {
  const { board, engine, game, analysis } = options;
  const { t } = useI18n();

  async function loadClock(): Promise<ClockState | null> {
    if (board.uciAnalysisLoadedRef.current) return null;
    try {
      const data = await fetchClock();
      game.setClock(data);
      if (data.gameState) {
        game.setGameEndState(data.gameState);
        if (!analysis.replayActiveRef.current) game.setShowGameEndDialog(true);
      } else game.setGameEndState(null);
      game.setClockError(null);
      return data;
    } catch (error) {
      console.error("[loadClock] error", error);
      game.setClockError(t("game.clockLoadFailed"));
      return null;
    }
  }

  async function loadCurrentGameSnapshot() {
    try {
      const snapshot = await fetchGameSnapshot();
      const gameData = snapshot.game;
      const restoredMoves = gameData.moves ?? [];
      board.liveEvaluationPositionRef.current = createLiveEvaluationPosition(restoredMoves);
      analysis.restoreAnnotations(gameData.annotations);
      board.latestMovePlyRef.current = restoredMoves.reduce(
        (maxPly, move) => Math.max(maxPly, Number.isFinite(move.ply) ? move.ply : 0), 0,
      );
      board.setMoves(mapImportedUciMovesToRows(restoredMoves));
      if (gameData.position?.length === 64) board.setPieces(mapPositionStringToLocalPieces(gameData.position));
      const lastMove = restoredMoves[restoredMoves.length - 1];
      board.setLastMove(lastMove?.uci?.length >= 4
        ? { from: lastMove.uci.substring(0, 2), to: lastMove.uci.substring(2, 4) }
        : null);
      const imported = Boolean(snapshot.importedAnalysisGame);
      board.setUciAnalysisLoaded(imported);
      if (imported) {
        game.setClock(null);
        engine.setEngineAutoUpdate(false);
        engine.setEngineEval(null);
        engine.setLiveEvaluationBar(null);
        analysis.setImportedPlayers(
          formatPlayerDisplayName(gameData.whitePlayerName, "White"),
          formatPlayerDisplayName(gameData.blackPlayerName, "Black"),
          gameData.totalPlies ?? restoredMoves.length,
        );
      }
      await analysis.restoreReplayAfterReload(restoredMoves);
      return snapshot;
    } catch (error) {
      console.error("[loadCurrentGameSnapshot] error", error);
      board.setLoadError(t("game.restoreFailed"));
      await options.loadBoardFromBackend();
      return null;
    }
  }

  async function loadGameSettings() {
    try {
      game.setGameSettings(await fetchGameSettings());
      game.setGameSettingsError(null);
    } catch (error) {
      console.error("[loadGameSettings] error", error);
      game.setGameSettingsError(t("game.settingsLoadFailed"));
    }
  }

  function openGameSettingsDialog() {
    game.setGameSettingsError(null);
    game.setShowGameEndDialog(false);
    game.setShowGameSettingsDialog(true);
  }

  async function terminateProgram() {
    if (!window.confirm("Terminate Program?\n\nThe chess server and, in development mode, the frontend server will be stopped.")) return;
    engine.setIsTerminatingProgram(true);
    board.setLoadError(null);
    try {
      await terminateBackend();
      if (import.meta.env.DEV) {
        try { await terminateDevelopmentFrontend(); }
        catch (error) { console.warn("[terminateProgram] frontend dev server termination failed", error); }
      }
      window.setTimeout(() => window.location.replace("about:blank"), 100);
    } catch (error) {
      console.error("[terminateProgram] error", error);
      engine.setIsTerminatingProgram(false);
      board.setLoadError(t("program.terminateFailed"));
    }
  }

  async function saveUciGame() {
    try {
      board.setLoadError(null);
      const blob = await exportPgn(options.whiteComputerEnabled, options.blackComputerEnabled);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "game.pgn";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[saveUciGame] error", error);
      board.setLoadError(t("game.savePgnFailed"));
    }
  }

  function openUciFilePicker() { game.uciFileInputRef.current?.click(); }

  async function applyImportedGame(imported: UciGameResponse | ChessDatabaseLoadedGame) {
    board.setIsLoadingMoves(true);
    try {
      board.setLoadError(null);
      game.setShowGameEndDialog(false);
      game.setShowGameSettingsDialog(false);
      analysis.setShowSettingsDialog(false);
      options.resetBoardInteraction();
      board.setHoverPreview(null);
      await options.disablePlayerEngines();
      await options.stopLiveEvaluation();
      await analysis.stopEvaluation();
      engine.setEngineAutoUpdate(false);
      engine.setEngineEval(null);
      engine.setLiveEvaluationBar(null);
      analysis.resetState();
      const importedMoves = imported.moves ?? [];
      board.liveEvaluationPositionRef.current = createLiveEvaluationPosition(importedMoves);
      board.latestMovePlyRef.current = importedMoves.reduce(
        (maxPly, move) => Math.max(maxPly, Number.isFinite(move.ply) ? move.ply : 0), 0,
      );
      analysis.restoreAnnotations("annotations" in imported ? imported.annotations : undefined);
      board.setUciAnalysisLoaded(true);
      board.setMoves(mapImportedUciMovesToRows(importedMoves));
      analysis.setImportedPlayers(
        formatPlayerDisplayName(imported.whitePlayerName, "White"),
        formatPlayerDisplayName(imported.blackPlayerName, "Black"),
        imported.totalPlies ?? importedMoves.length,
      );
      game.setGameEndState(null);
      board.setPieces(imported.position?.length === 64 ? mapPositionStringToLocalPieces(imported.position) : createInitialPieces());
      const lastMove = importedMoves[importedMoves.length - 1];
      board.setLastMove(lastMove?.uci?.length >= 4
        ? { from: lastMove.uci.substring(0, 2), to: lastMove.uci.substring(2, 4) } : null);
      analysis.setShowSettingsDialog(true);
    } finally {
      board.setIsLoadingMoves(false);
    }
  }

  async function handleUciFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const hadImportedGame = board.uciAnalysisLoadedRef.current;
    event.target.value = "";
    if (!file) return;
    try {
      board.setIsLoadingMoves(true);
      board.setLoadError(null);
      await applyImportedGame(await importPgn(await file.text()));
    } catch (error) {
      console.error("[handleUciFileSelected] error", error);
      board.setUciAnalysisLoaded(hadImportedGame);
      board.setLoadError(error instanceof Error ? error.message : t("game.loadPgnFailed"));
    } finally {
      board.setIsLoadingMoves(false);
    }
  }

  async function startNewGame(settings: GameSettings) {
    try {
      board.setIsLoadingMoves(true);
      game.setIsStartingNewGame(true);
      board.setLoadError(null);
      game.setGameSettingsError(null);
      await options.disablePlayerEngines();
      await analysis.stopEvaluation();
      analysis.resetState();
      analysis.setWhitePlayerName(null);
      analysis.setBlackPlayerName(null);
      analysis.resetAnnotations();
      const applied = await createNewGame(settings);
      game.setGameSettings(applied);
      board.setUciAnalysisLoaded(false);
      board.setPieces(createInitialPieces());
      board.latestMovePlyRef.current = 0;
      board.liveEvaluationPositionRef.current = { uciMoves: [] };
      board.setMoves([]);
      board.setLastMove(null);
      options.resetBoardInteraction();
      board.setHoverPreview(null);
      game.setShowGameEndDialog(false);
      game.setGameEndState(null);
      game.setShowGameSettingsDialog(false);
      engine.setEngineEval(null);
      engine.setLiveEvaluationBar(null);
      game.setClock({
        whiteTime: applied.timeForEachPlayerSeconds,
        blackTime: applied.timeForEachPlayerSeconds,
        sideToMove: "white", whiteRunning: false, blackRunning: false, gameState: null,
        timeControl: formatTimeControlFromSettings(applied),
        whitePlayerName: null, blackPlayerName: null,
        whitePlayerEngineName: null, blackPlayerEngineName: null,
      });
      await options.requestComputerMoveIfEnabled("white");
      await options.synchronizeAfterMoveSequence();
    } catch (error) {
      console.error("[startNewGame] error", error);
      game.setGameSettingsError(t("game.startFailed"));
    } finally {
      game.setIsStartingNewGame(false);
      board.setIsLoadingMoves(false);
    }
  }

  useEffect(() => {
    void options.loadEngineConfigs();
    void loadGameSettings();
    void loadCurrentGameSnapshot().then((snapshot) => {
      if (!snapshot?.importedAnalysisGame) void loadClock();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (board.uciAnalysisLoaded) return;
    const intervalId = window.setInterval(() => { void loadClock(); }, 500);
    return () => window.clearInterval(intervalId);
  }, [board.uciAnalysisLoaded]);

  return {
    loadClock, openGameSettingsDialog, terminateProgram, saveUciGame, openUciFilePicker,
    applyImportedGame, handleUciFileSelected, startNewGame,
  };
}

export type ChessGameLifecycle = ReturnType<typeof useChessGameLifecycle>;
