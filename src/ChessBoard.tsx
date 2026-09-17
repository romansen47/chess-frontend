import { useEffect, useRef, useState } from "react";
import { fetchEngineConfigOverview } from "./engineConfig";
import type { EngineConfigOverview } from "./engineConfig";
import { useI18n } from "./i18n/I18nProvider";
import type { ChessDatabaseLoadedGame } from "./ChessDatabaseDialog";
import type {
  ClockState,
  EngineEvaluation,
  GameSettings,
  GameSound,
  HoverPreview,
  LastMove,
  MoveResult,
  MoveRow,
  PerformMoveOptions,
  Piece,
  PieceType,
  UciGameResponse,
} from "./chess/types";
import ChessBoardView from "./chess/board/ChessBoardView";
import { GAME_SOUND_SOURCES } from "./chess/game/gameSounds";
import { createInitialPieces } from "./chess/board/boardUtils";
import {
  BOARD_ORIENTATION_STORAGE_KEY,
  normalizeBoardOrientation,
  type BoardOrientation,
} from "./chess/board/boardOrientation";
import {
  mapBackendPiecesToLocalPieces,
  mapPositionStringToLocalPieces,
} from "./chess/board/positionUtils";
import {
  applyLocalMoveTransition,
  reconcilePieceSnapshot,
} from "./chess/board/pieceTransitions";
import {
  formatPlayerDisplayName,
  formatTimeControlFromSettings,
  getAnalysisBlackPlayerName,
  getAnalysisWhitePlayerName,
  getDisplayedBlackPlayerName,
  getDisplayedWhitePlayerName,
  mapImportedUciMovesToRows,
} from "./chess/game/gameFormatters";
import { fetchBoard, fetchPossibleMoves, submitMove } from "./chess/api/boardApi";
import {
  createNewGame,
  exportPgn,
  fetchClock,
  fetchGameSettings,
  fetchGameSnapshot,
  importPgn,
} from "./chess/api/gameApi";
import { useComputerMoves } from "./chess/game/useComputerMoves";
import { BackendLiveEvaluationSource } from "./chess/evaluation/BackendLiveEvaluationSource";
import { LiveEvaluationController } from "./chess/evaluation/LiveEvaluationController";
import type { LiveEvaluationPosition } from "./chess/evaluation/LiveEvaluationSource";
import {
  appendCanonicalMoveToLiveEvaluationPosition,
  createLiveEvaluationPosition,
} from "./chess/evaluation/liveEvaluationPosition";
import { fetchAnalysisPossibleMoves } from "./chess/api/analysisApi";
import { fetchProgramFeatures, terminateBackend, terminateDevelopmentFrontend } from "./chess/api/programApi";

import { sameLiveEvaluationPosition } from "./chess/evaluation/liveEvaluationUtils";
import { createDefaultGameSettings } from "./chess/game/gameDefaults";
import { mergeAuthoritativeMoveRows } from "./chess/game/moveListUtils";
import AnalysisReplayContent from "./chess/analysis/AnalysisReplayContent";
import { useAnalysisController } from "./chess/analysis/useAnalysisController";
import {
  useBoardInteraction,
  type AnalysisInteractionContext,
} from "./chess/board/useBoardInteraction";
export const ChessBoard: React.FC = () => {
  const { t } = useI18n();
  const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>(() => {
    if (typeof window === "undefined") return "white";
    return normalizeBoardOrientation(
      window.localStorage.getItem(BOARD_ORIENTATION_STORAGE_KEY)
    );
  });

  const [pieces, setPieces] = useState<Piece[]>(() => createInitialPieces());
  const [moves, setMoves] = useState<MoveRow[]>([]);
  const latestMovePlyRef = useRef(0);
  const moveListReconcilePromiseRef =
    useRef<Promise<LiveEvaluationPosition | null> | null>(null);
  const liveEvaluationPositionRef = useRef<LiveEvaluationPosition | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);
  const [hoverAnnotationText, setHoverAnnotationText] = useState<string | null>(null);
  const [isLoadingMoves, setIsLoadingMoves] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(
      BOARD_ORIENTATION_STORAGE_KEY,
      boardOrientation
    );
  }, [boardOrientation]);

  function flipBoardOrientation() {
    setBoardOrientation((current) =>
      current === "white" ? "black" : "white"
    );
    resetBoardInteraction();
    setHoverPreview(null);
    setHoverAnnotationText(null);
  }

  const [engineEval, setEngineEval] = useState<EngineEvaluation | null>(null);
  const [liveEvaluationBar, setLiveEvaluationBar] = useState<number | null>(null);
  const [isLoadingEval, setIsLoadingEval] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [engineAutoUpdate, setEngineAutoUpdateState] = useState<boolean>(false);
  const engineAutoUpdateRef = useRef<boolean>(false);
  const liveEvaluationControllerRef = useRef<LiveEvaluationController | null>(null);
  if (liveEvaluationControllerRef.current === null) {
    liveEvaluationControllerRef.current = new LiveEvaluationController({
      backendSource: new BackendLiveEvaluationSource(),
      createBrowserSource: async () => {
        const { BrowserLiveEvaluationSource } = await import(
          "./chess/evaluation/BrowserLiveEvaluationSource"
        );
        return new BrowserLiveEvaluationSource();
      },
    });
  }
  const [showEngineConfig, setShowEngineConfig] = useState<boolean>(false);
  const [engineConfigOverview, setEngineConfigOverview] = useState<EngineConfigOverview | null>(null);
  const [engineConfigLoadError, setEngineConfigLoadError] = useState<string | null>(null);
  const [showEngineManager, setShowEngineManager] = useState<boolean>(false);
  const [showChessDatabaseDialog, setShowChessDatabaseDialog] = useState<boolean>(false);
  const [isTerminatingProgram, setIsTerminatingProgram] = useState<boolean>(false);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [uciAnalysisLoaded, setUciAnalysisLoadedState] = useState<boolean>(false);
  const uciAnalysisLoadedRef = useRef<boolean>(false);
  const uciFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchProgramFeatures()
      .then((features) => {
        if (!cancelled) {
          setDebugMode(features.debugMode);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDebugMode(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [clock, setClock] = useState<ClockState | null>(null);
  const [clockError, setClockError] = useState<string | null>(null);
  const [showGameEndDialog, setShowGameEndDialog] = useState<boolean>(false);
  const [gameEndState, setGameEndStateState] = useState<string | null>(null);
  const gameEndStateRef = useRef<string | null>(null);
  const [showGameSettingsDialog, setShowGameSettingsDialog] = useState<boolean>(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>(() => createDefaultGameSettings());
  const [isStartingNewGame, setIsStartingNewGame] = useState<boolean>(false);
  const [gameSettingsError, setGameSettingsError] = useState<string | null>(null);

  const soundCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const analysisInteractionRef = useRef<AnalysisInteractionContext>({
    replayActive: false, replayActiveCurrent: false, replayFinished: false,
    selectedPosition: null, variationMoveCount: 0, variationGameState: null, replayRunning: false,
  });


  const {
    whiteComputerEnabled,
    blackComputerEnabled,
    isComputerThinking,
    isSideComputerControlled,
    updateWhiteComputerEnabled,
    updateBlackComputerEnabled,
    disablePlayerEngines,
    requestComputerMoveIfEnabled,
  } = useComputerMoves({
    currentSideToMove: clock?.sideToMove,
    onMove: handleComputerMove,
    onGameEnd: handleGameEndState,
    onRefreshClock: async () => { await loadClock(); },
    onSynchronize: synchronizeAfterMoveSequence,
    onError: setLoadError,
    onRecoverAfterSequenceError: async () => {
      await loadBoardFromBackend();
      await loadClock();
    },
  });

  const boardInteraction = useBoardInteraction({
    pieces, boardOrientation, clock, uciAnalysisLoaded, isLoadingMoves, isComputerThinking,
    isSideComputerControlled, getAnalysisContext: () => analysisInteractionRef.current,
    loadPossibleMoves, performBoardMove, performMove, animateMoveLocally, loadBoardFromBackend,
  });
  const {
    selectedSquare, setSelectedSquare, dragState, boardContainerRef, possibleTargets,
    updatePossibleTargets, promotionContext, setPromotionContext, resetBoardInteraction,
    handlePiecePointerDown, handlePiecePointerMove, handlePiecePointerUp,
    handlePiecePointerCancel, handleSquareClick,
  } = boardInteraction;

  const analysis = useAnalysisController({
    engineConfigOverview,
    engineEval,
    setEngineEval,
    setPieces,
    setLastMove,
    moves,
    clock,
    uciAnalysisLoaded,
    whiteComputerEnabled,
    blackComputerEnabled,
    disablePlayerEngines,
    stopLiveEvaluation,
    setEngineAutoUpdate,
    setLiveEvaluationBar,
    setShowGameEndDialog,
    setShowEngineConfig,
    showGameSettingsDialog,
    showEngineConfig,
    showEngineManager,
    showChessDatabaseDialog,
    setSelectedSquare,
    updatePossibleTargets,
    resetBoardInteraction,
    setHoverPreview,
    setPromotionContext,
    promotionContext,
    setIsLoadingMoves,
    setLoadError,
    animateMoveLocally,
    playGameSound,
  });
  const {
    showAnalysisSettingsDialog, setShowAnalysisSettingsDialog,
    analysisSettings, setAnalysisSettings, analysisReplayActive, analysisReplayActiveRef,
    isAnalysisReplayRunning, analysisReplayStatus, analysisReplayError, analysisReplayFinished,
    analysisProfile, analysisTotalPlies, analysisSelectedPosition, analysisDetailsTab, setAnalysisDetailsTab,
    gameAnnotations, annotationsDirty, annotationsSaving, annotationSaveError,
    analysisEngineView, setAnalysisEngineView, analysisSelectedLineIndex, setAnalysisSelectedLineIndex,
    analysisLineAnimationIndex, setAnalysisLineAnimationIndex, analysisWhitePlayerName, setAnalysisWhitePlayerName,
    analysisBlackPlayerName, setAnalysisBlackPlayerName, analysisEvaluationEnabled, analysisEvaluation,
    analysisEvaluationError, analysisEvaluationKeyRef, analysisVariationMoves,
    analysisVariationMovesRef, analysisVariationGameState, analysisEngineProfiles, selectedAnalysisProfile,
    selectedAnalysisEngine, moveAnnotations, selectedBoardAnnotations,
    resetAnalysisState, resetAnnotations,
    stopAnalysisEvaluation, toggleAnalysisEvaluation, selectAnalysisPosition, selectAnalysisPositionByPly,
    restoreAnalysisReplayAfterReload, openAnalysisSettingsDialog, startAnalysisReplay, cancelAnalysisReplay,
    updateGameAnnotation, persistGameAnnotations, saveAnalysisPgn, performAnalysisVariationMove,
    restoreAnnotations, setImportedPlayers,
  } = analysis;

  analysisInteractionRef.current = {
    replayActive: analysisReplayActive,
    replayActiveCurrent: analysisReplayActiveRef.current,
    replayFinished: analysisReplayFinished,
    selectedPosition: analysisSelectedPosition,
    variationMoveCount: analysisVariationMovesRef.current.length,
    variationGameState: analysisVariationGameState,
    replayRunning: isAnalysisReplayRunning,
  };

  function setUciAnalysisLoaded(value: boolean) {
    uciAnalysisLoadedRef.current = value;
    setUciAnalysisLoadedState(value);
  }

  async function playGameSound(sound: GameSound) {
    const sources = GAME_SOUND_SOURCES[sound] ?? [];
    for (const source of sources) {
      let audio = soundCacheRef.current.get(source);
      if (!audio) {
        audio = new Audio(source);
        audio.preload = "auto";
        soundCacheRef.current.set(source, audio);
      }
      try {
        audio.pause();
        audio.currentTime = 0;
        await audio.play();
        return;
      } catch (error) {
        console.warn(`[playGameSound] could not play ${source}`, error);
      }
    }
  }

  function playMoveResultSound(result: MoveResult) {
    const san = result.san ?? "";
    const sound: GameSound = /[x+#]/.test(san) ? "capture" : "move";
    void playGameSound(sound);
    if (result.gameState) {
      window.setTimeout(() => { void playGameSound("notify"); }, 160);
    }
  }

  function setEngineAutoUpdate(value: boolean | ((previous: boolean) => boolean)) {
    const nextValue = typeof value === "function" ? value(engineAutoUpdateRef.current) : value;
    engineAutoUpdateRef.current = nextValue;
    setEngineAutoUpdateState(nextValue);
  }

  function setGameEndState(value: string | null) {
    gameEndStateRef.current = value;
    setGameEndStateState(value);
  }

  async function loadBoardFromBackend() {
    try {
      const data = await fetchBoard();
      const targetPieces = mapBackendPiecesToLocalPieces(data.pieces ?? []);
      setPieces((previousPieces) =>
        reconcilePieceSnapshot(previousPieces, targetPieces)
      );
    } catch (e) {
      console.error("[loadBoardFromBackend] error:", e);
      setLoadError(t("game.boardLoadFailed"));
    }
  }

  async function loadCurrentGameSnapshot() {
    try {
      const snapshot = await fetchGameSnapshot();
      const game = snapshot.game;
      const restoredMoves = game.moves ?? [];
      liveEvaluationPositionRef.current =
        createLiveEvaluationPosition(restoredMoves);

      restoreAnnotations(game.annotations);
      latestMovePlyRef.current = restoredMoves.reduce(
        (maxPly, move) => Math.max(maxPly, Number.isFinite(move.ply) ? move.ply : 0),
        0
      );
      setMoves(mapImportedUciMovesToRows(restoredMoves));
      if (game.position && game.position.length === 64) {
        setPieces(mapPositionStringToLocalPieces(game.position));
      }

      const lastRestoredMove = restoredMoves[restoredMoves.length - 1];
      setLastMove(lastRestoredMove?.uci && lastRestoredMove.uci.length >= 4
        ? { from: lastRestoredMove.uci.substring(0, 2), to: lastRestoredMove.uci.substring(2, 4) }
        : null);

      const imported = Boolean(snapshot.importedAnalysisGame);
      setUciAnalysisLoaded(imported);
      if (imported) {
        setClock(null);
        setEngineAutoUpdate(false);
        setEngineEval(null);
        setLiveEvaluationBar(null);
        setImportedPlayers(
          formatPlayerDisplayName(game.whitePlayerName, "White"),
          formatPlayerDisplayName(game.blackPlayerName, "Black"),
          game.totalPlies ?? restoredMoves.length,
        );
      }

      await restoreAnalysisReplayAfterReload(restoredMoves);
      return snapshot;
    } catch (e) {
      console.error("[loadCurrentGameSnapshot] error", e);
      setLoadError(t("game.restoreFailed"));
      await loadBoardFromBackend();
      return null;
    }
  }

  async function loadGameSettings() {
    try {
      const data = await fetchGameSettings();
      setGameSettings(data);
      setGameSettingsError(null);
    } catch (e) {
      console.error("[loadGameSettings] error", e);
      setGameSettingsError(t("game.settingsLoadFailed"));
    }
  }

  async function loadClock(): Promise<ClockState | null> {
    if (uciAnalysisLoadedRef.current) return null;
    try {
      const data = await fetchClock();
      setClock(data);
      if (data.gameState) {
        setGameEndState(data.gameState);
        if (!analysisReplayActiveRef.current) setShowGameEndDialog(true);
      } else {
        setGameEndState(null);
      }
      setClockError(null);
      return data;
    } catch (e) {
      console.error("[loadClock] error", e);
      setClockError(t("game.clockLoadFailed"));
      return null;
    }
  }

  useEffect(() => {
    loadEngineConfigs();
    loadGameSettings();
    void loadCurrentGameSnapshot().then((snapshot) => {
      if (!snapshot?.importedAnalysisGame) void loadClock();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (uciAnalysisLoaded) return;
    const intervalId = window.setInterval(() => { loadClock(); }, 500);
    return () => window.clearInterval(intervalId);
  }, [uciAnalysisLoaded]);

  async function loadPossibleMoves(from: string): Promise<string[]> {
    try {
      setIsLoadingMoves(true);
      setLoadError(null);
      const data = analysisReplayActiveRef.current && analysisReplayFinished && analysisSelectedPosition
        ? await fetchAnalysisPossibleMoves({
            anchorPly: analysisSelectedPosition.ply,
            moves: [...analysisVariationMovesRef.current],
            from,
          })
        : await fetchPossibleMoves(from);
      const targets = data.targets ?? [];
      updatePossibleTargets(targets);
      return targets;
    } catch (e) {
      console.error("[loadPossibleMoves] failed to load possible moves:", e);
      setLoadError(t("game.possibleMovesFailed"));
      updatePossibleTargets([]);
      return [];
    } finally {
      setIsLoadingMoves(false);
    }
  }

  useEffect(() => {
    const controller = liveEvaluationControllerRef.current;
    if (!controller) return;

    return controller.subscribe((event) => {
      switch (event.type) {
        case "evaluation":
          setEngineEval(event.evaluation);
          break;
        case "bar":
          setLiveEvaluationBar(event.bar);
          break;
        case "loading":
          setIsLoadingEval(event.loading);
          break;
        case "error":
          if (event.error === null) {
            setEvalError(null);
          } else {
            console.error("[loadEvaluation] error", event.error);
            setEvalError(t("evaluation.failed"));
          }
          break;
      }
    });
  }, [t]);

  useEffect(() => {
    const controller = liveEvaluationControllerRef.current;
    if (!controller) return;

    if (engineAutoUpdate && !analysisReplayActive && !uciAnalysisLoaded && !clock?.gameState) {
      void ensureLiveEvaluationPosition().then((position) => {
        if (!position
            || !engineAutoUpdateRef.current
            || analysisReplayActiveRef.current
            || uciAnalysisLoadedRef.current
            || gameEndStateRef.current) {
          return;
        }
        void controller.start(position);
      });
    } else {
      controller.suspend();
      setLiveEvaluationBar(null);
    }

    return () => {
      controller.suspend();
    };
  }, [engineAutoUpdate, analysisReplayActive, uciAnalysisLoaded, clock?.gameState]);

  useEffect(() => {
    const controller = liveEvaluationControllerRef.current;
    return () => {
      controller?.dispose();
    };
  }, []);

  async function stopLiveEvaluation() {
    try {
      await liveEvaluationControllerRef.current?.stop();
    } catch (e) {
      console.warn("[stopLiveEvaluation] evaluation stop failed", e);
    }
  }

  function toggleEngineAutoUpdate() {
    const nextValue = !engineAutoUpdateRef.current;
    setEngineAutoUpdate(nextValue);
    setLiveEvaluationBar(null);
    if (!nextValue) {
      setEngineEval(null);
      setEvalError(null);
      setIsLoadingEval(false);
      void stopLiveEvaluation();
      return;
    }

  }

  async function loadEngineConfigs() {
    try {
      const data = await fetchEngineConfigOverview();
      setEngineConfigOverview(data);
      setEngineConfigLoadError(null);
      return data;
    } catch (e) {
      console.error("[loadEngineConfigs] error", e);
      setEngineConfigLoadError(t("settings.loadFailed"));
      return null;
    }
  }

  function handleEngineConfigOverviewChange(data: EngineConfigOverview) {
    setEngineConfigOverview(data);
    setEngineConfigLoadError(null);
    setAnalysisSettings((prev) => {
      if (data.profiles.some((profile) => profile.id === prev.engineProfileId)) return prev;
      const preferred = data.profiles.find((profile) => profile.id === data.defaults.deepAnalysisProfileId);
      return { ...prev, engineProfileId: preferred?.id ?? data.profiles[0]?.id ?? null };
    });
    setEngineEval(null);
    setLiveEvaluationBar(null);
    if (engineAutoUpdateRef.current) {
      void ensureLiveEvaluationPosition().then((position) => {
        if (position && engineAutoUpdateRef.current) {
          void liveEvaluationControllerRef.current?.reselect(position);
        }
      });
    }
  }

  function openGameSettingsDialog() {
    setGameSettingsError(null);
    setShowGameEndDialog(false);
    setShowGameSettingsDialog(true);
  }

  async function terminateProgram() {
    const confirmed = window.confirm(
      "Terminate Program?\n\nThe chess server and, in development mode, the frontend server will be stopped."
    );
    if (!confirmed) return;
    setIsTerminatingProgram(true);
    setLoadError(null);
    try {
      await terminateBackend();
      if (import.meta.env.DEV) {
        try {
          await terminateDevelopmentFrontend();
        } catch (error) {
          console.warn("[terminateProgram] frontend dev server termination failed", error);
        }
      }
      window.setTimeout(() => window.location.replace("about:blank"), 100);
    } catch (error) {
      console.error("[terminateProgram] error", error);
      setIsTerminatingProgram(false);
      setLoadError(t("program.terminateFailed"));
    }
  }

  async function saveUciGame() {
    try {
      setLoadError(null);
      const blob = await exportPgn(whiteComputerEnabled, blackComputerEnabled);
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
      setLoadError(t("game.savePgnFailed"));
    }
  }

  function openUciFilePicker() { uciFileInputRef.current?.click(); }

  async function applyImportedGame(imported: UciGameResponse | ChessDatabaseLoadedGame) {
    setIsLoadingMoves(true);
    try {
      setLoadError(null);
      setShowGameEndDialog(false);
      setShowGameSettingsDialog(false);
      setShowAnalysisSettingsDialog(false);
      setSelectedSquare(null);
      updatePossibleTargets([]);
      setPromotionContext(null);
      setHoverPreview(null);
      await disablePlayerEngines();
      await stopLiveEvaluation();
      await stopAnalysisEvaluation();
      setEngineAutoUpdate(false);
      setEngineEval(null);
      setLiveEvaluationBar(null);
      resetAnalysisState();
      const importedMoves = imported.moves ?? [];
      liveEvaluationPositionRef.current =
        createLiveEvaluationPosition(importedMoves);
      const moveRows = mapImportedUciMovesToRows(importedMoves);
      latestMovePlyRef.current = importedMoves.reduce(
        (maxPly, move) => Math.max(maxPly, Number.isFinite(move.ply) ? move.ply : 0),
        0
      );
      restoreAnnotations(imported.annotations);
      setUciAnalysisLoaded(true);
      setMoves(moveRows);
      setImportedPlayers(
        formatPlayerDisplayName(imported.whitePlayerName, "White"),
        formatPlayerDisplayName(imported.blackPlayerName, "Black"),
        imported.totalPlies ?? importedMoves.length,
      );
      setGameEndState(null);
      setShowGameEndDialog(false);
      setPieces(imported.position && imported.position.length === 64
        ? mapPositionStringToLocalPieces(imported.position)
        : createInitialPieces());
      const lastImportedMove = importedMoves[importedMoves.length - 1];
      setLastMove(lastImportedMove?.uci && lastImportedMove.uci.length >= 4
        ? { from: lastImportedMove.uci.substring(0, 2), to: lastImportedMove.uci.substring(2, 4) }
        : null);
      setShowAnalysisSettingsDialog(true);
    } finally {
      setIsLoadingMoves(false);
    }
  }

  async function handleUciFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const hadImportedGame = uciAnalysisLoadedRef.current;
    event.target.value = "";
    if (!file) return;
    try {
      setIsLoadingMoves(true);
      setLoadError(null);
      const content = await file.text();
      const imported = await importPgn(content);
      await applyImportedGame(imported);
    } catch (error) {
      console.error("[handleUciFileSelected] error", error);
      setUciAnalysisLoaded(hadImportedGame);
      setLoadError(error instanceof Error ? error.message : t("game.loadPgnFailed"));
    } finally {
      setIsLoadingMoves(false);
    }
  }

  async function startNewGame(settings: GameSettings) {
    try {
      setIsLoadingMoves(true);
      setIsStartingNewGame(true);
      setLoadError(null);
      setGameSettingsError(null);
      await disablePlayerEngines();
      await stopAnalysisEvaluation();
      resetAnalysisState();
      setAnalysisWhitePlayerName(null);
      setAnalysisBlackPlayerName(null);
      resetAnnotations();
      const appliedSettings = await createNewGame(settings);
      setGameSettings(appliedSettings);
      setUciAnalysisLoaded(false);
      setPieces(createInitialPieces());
      latestMovePlyRef.current = 0;
      liveEvaluationPositionRef.current = { uciMoves: [] };
      setMoves([]);
      setLastMove(null);
      setSelectedSquare(null);
      updatePossibleTargets([]);
      setPromotionContext(null);
      setHoverPreview(null);
      setShowGameEndDialog(false);
      setGameEndState(null);
      setShowGameSettingsDialog(false);
      setEngineEval(null);
      setLiveEvaluationBar(null);
      setClock({
        whiteTime: appliedSettings.timeForEachPlayerSeconds,
        blackTime: appliedSettings.timeForEachPlayerSeconds,
        sideToMove: "white",
        whiteRunning: false,
        blackRunning: false,
        gameState: null,
        timeControl: formatTimeControlFromSettings(appliedSettings),
        whitePlayerName: null,
        blackPlayerName: null,
        whitePlayerEngineName: null,
        blackPlayerEngineName: null,
      });
      await requestComputerMoveIfEnabled("white");
      await synchronizeAfterMoveSequence();
    } catch (e) {
      console.error("[startNewGame] error", e);
      setGameSettingsError(t("game.startFailed"));
    } finally {
      setIsStartingNewGame(false);
      setIsLoadingMoves(false);
    }
  }

  function animateMoveLocally(
    from: string,
    to: string,
    requestedPromotion?: PieceType | null,
    resultingPosition?: string | null
  ) {
    setPieces((previousPieces) =>
      applyLocalMoveTransition(
        previousPieces,
        from,
        to,
        requestedPromotion,
        resultingPosition
      )
    );
  }

  async function ensureLiveEvaluationPosition(): Promise<LiveEvaluationPosition | null> {
    if (liveEvaluationPositionRef.current) {
      return liveEvaluationPositionRef.current;
    }

    try {
      const snapshot = await fetchGameSnapshot();
      const position = createLiveEvaluationPosition(snapshot.game.moves ?? []);
      liveEvaluationPositionRef.current = position;
      if (snapshot.importedAnalysisGame) {
        return null;
      }
      return position;
    } catch (error) {
      console.warn(
        "[ensureLiveEvaluationPosition] could not load authoritative position",
        error,
      );
      setEvalError(t("evaluation.failed"));
      return null;
    }
  }

  function reconcileMoveListFromBackend(): Promise<LiveEvaluationPosition | null> {
    if (uciAnalysisLoadedRef.current) {
      return Promise.resolve(liveEvaluationPositionRef.current);
    }
    if (moveListReconcilePromiseRef.current) return moveListReconcilePromiseRef.current;

    const reconciliation = (async (): Promise<LiveEvaluationPosition | null> => {
      try {
        const snapshot = await fetchGameSnapshot();
        if (snapshot.importedAnalysisGame) return null;
        const authoritativeMoves = snapshot.game.moves ?? [];
        const position = createLiveEvaluationPosition(authoritativeMoves);
        liveEvaluationPositionRef.current = position;
        const authoritativeRows = mapImportedUciMovesToRows(authoritativeMoves);
        const authoritativePly = authoritativeMoves.reduce(
          (maxPly, move) => Math.max(maxPly, Number.isFinite(move.ply) ? move.ply : 0),
          0
        );
        latestMovePlyRef.current = Math.max(latestMovePlyRef.current, authoritativePly);
        setMoves((current) => mergeAuthoritativeMoveRows(current, authoritativeRows));
        return position;
      } catch (error) {
        console.warn("[reconcileMoveListFromBackend] could not refresh move list", error);
        return null;
      }
    })().finally(() => {
      if (moveListReconcilePromiseRef.current === reconciliation) {
        moveListReconcilePromiseRef.current = null;
      }
    });

    moveListReconcilePromiseRef.current = reconciliation;
    return reconciliation;
  }

  async function synchronizeLiveEvaluationAfterCommittedMove(
    result: MoveResult,
  ): Promise<void> {
    let position = appendCanonicalMoveToLiveEvaluationPosition(
      liveEvaluationPositionRef.current,
      result.ply,
      result.uci,
    );

    if (position === null) {
      position = await reconcileMoveListFromBackend();
    } else {
      liveEvaluationPositionRef.current = position;
    }

    if (
      !position
      || !engineAutoUpdateRef.current
      || gameEndStateRef.current
      || result.gameState
    ) {
      return;
    }

    setLiveEvaluationBar(null);
    try {
      await liveEvaluationControllerRef.current?.updatePosition(position);
    } catch (error) {
      console.warn(
        "[synchronizeLiveEvaluationAfterCommittedMove] evaluation update failed",
        error,
      );
      setEvalError(t("evaluation.failed"));
    }
  }

  function addMoveToMoveList(result: MoveResult): boolean {
    const sanText = result.san && result.san.trim().length > 0 ? result.san : `${result.from}-${result.to}`;
    const position = result.position ?? undefined;
    const resultPly = typeof result.ply === "number" && Number.isInteger(result.ply) && result.ply > 0
      ? result.ply
      : null;

    if (resultPly != null) {
      const previousPly = latestMovePlyRef.current;
      const gapDetected = resultPly > previousPly + 1;
      latestMovePlyRef.current = Math.max(previousPly, resultPly);
      const moveNumber = Math.ceil(resultPly / 2);

      setMoves((current) => {
        const copy = current.map((row) => ({ ...row }));
        let row = copy.find((candidate) => candidate.moveNumber === moveNumber);
        if (!row) {
          row = { moveNumber };
          copy.push(row);
        }
        const uci = result.uci?.trim() || `${result.from}${result.to}`;
        if (resultPly % 2 === 1) {
          row.white = sanText;
          row.whiteUci = uci;
          row.whitePosition = position;
        } else {
          row.black = sanText;
          row.blackUci = uci;
          row.blackPosition = position;
        }
        return copy.sort((a, b) => a.moveNumber - b.moveNumber);
      });
      return gapDetected;
    }

    const moverSide = result.sideToMove === "white"
      ? "black"
      : result.sideToMove === "black"
        ? "white"
        : null;
    setMoves((current) => {
      const copy = current.map((row) => ({ ...row }));
      const last = copy[copy.length - 1];

      const uci = result.uci?.trim() || `${result.from}${result.to}`;

      if (moverSide === "white") {
        const moveNumber = last ? last.moveNumber + 1 : 1;
        copy.push({ moveNumber, white: sanText, whiteUci: uci, whitePosition: position });
        return copy;
      }

      if (moverSide === "black") {
        if (last && last.white && !last.black) {
          last.black = sanText;
          last.blackUci = uci;
          last.blackPosition = position;
          return copy;
        }
        const moveNumber = last ? last.moveNumber + 1 : 1;
        copy.push({ moveNumber, black: sanText, blackUci: uci, blackPosition: position });
        return copy;
      }

      if (!last || last.black) {
        copy.push({
          moveNumber: last ? last.moveNumber + 1 : 1,
          white: sanText,
          whiteUci: uci,
          whitePosition: position,
        });
      } else {
        last.black = sanText;
        last.blackUci = uci;
        last.blackPosition = position;
      }
      return copy;
    });
    return false;
  }

  function showMovePreview(event: React.MouseEvent<HTMLElement>, position: string | undefined) {
    if (!position || position.length !== 64) return;
    setHoverPreview({ position, x: event.clientX, y: event.clientY });
  }
  function moveMovePreview(event: React.MouseEvent<HTMLElement>) {
    setHoverPreview((prev) => prev ? { ...prev, x: event.clientX, y: event.clientY } : prev);
  }
  function hidePreview() {
    setHoverPreview(null);
    setHoverAnnotationText(null);
  }
  function showAnnotationTooltip(text: string) {
    setHoverAnnotationText(text);
  }
  function hideAnnotationTooltip() {
    setHoverAnnotationText(null);
  }

  function handleGameEndState(gameState: string | null | undefined) {
    if (!gameState) return false;
    setGameEndState(gameState);
    setEngineAutoUpdate(false);
    setLiveEvaluationBar(null);
    void stopLiveEvaluation();
    setClock((prev) => prev ? { ...prev, gameState, whiteRunning: false, blackRunning: false } : prev);
    setShowGameEndDialog(true);
    return true;
  }

  async function handleComputerMove(data: MoveResult): Promise<void> {
    if (!data.from || !data.to) return;
    animateMoveLocally(data.from, data.to, null, data.position);
    setLastMove({ from: data.from, to: data.to });
    addMoveToMoveList(data);
    playMoveResultSound(data);
    await synchronizeLiveEvaluationAfterCommittedMove(data);
  }

  async function synchronizeAfterMoveSequence() {
    const previousPosition = liveEvaluationPositionRef.current;
    const position = await reconcileMoveListFromBackend();
    await loadBoardFromBackend();
    await loadClock();
    if (
      position
      && engineAutoUpdateRef.current
      && !gameEndStateRef.current
      && !sameLiveEvaluationPosition(previousPosition, position)
    ) {
      setLiveEvaluationBar(null);
      await liveEvaluationControllerRef.current?.updatePosition(position);
    }
  }

  async function performMove(from: string, to: string, promotion?: PieceType, options?: PerformMoveOptions) {
    try {
      setIsLoadingMoves(true);
      setLoadError(null);
      const result = await submitMove({ from, to, promotion: promotion ?? null });
      const data = result.data;
      if (!result.ok || !data.success) {
        if (handleGameEndState(data.gameState)) { await loadClock(); return; }
        setLoadError(data.message || `HTTP ${result.status}`);
        return;
      }
      if (!options?.localMoveAlreadyApplied) {
        animateMoveLocally(from, to, promotion, data.position);
      }
      setLastMove({ from, to });
      setSelectedSquare(null);
      updatePossibleTargets([]);
      addMoveToMoveList(data);
      playMoveResultSound(data);
      await synchronizeLiveEvaluationAfterCommittedMove(data);
      if (handleGameEndState(data.gameState)) { await synchronizeAfterMoveSequence(); return; }
      await requestComputerMoveIfEnabled(data.sideToMove);
      setIsLoadingMoves(false);
      await synchronizeAfterMoveSequence();
    } catch (e) {
      console.error("[performMove] move execution failed:", e);
      setLoadError(t("game.moveFailed"));
    } finally {
      setIsLoadingMoves(false);
    }
  }

  async function performBoardMove(from: string, to: string, promotion?: PieceType) {
    if (analysisReplayActiveRef.current && analysisReplayFinished && analysisSelectedPosition) {
      await performAnalysisVariationMove(from, to, promotion);
      return;
    }
    await performMove(from, to, promotion);
  }

  const analysisContent = (
    <AnalysisReplayContent
      state={{ boardOrientation, analysisProfile, analysisTotalPlies, analysisSelectedPosition,
        analysisReplayStatus, isAnalysisReplayRunning, analysisReplayError, analysisEvaluationError,
        moves, analysisSelectedLineIndex, analysisLineAnimationIndex, analysisDetailsTab, engineEval,
        analysisEvaluation, analysisEvaluationEnabled, analysisVariationMoves, analysisEngineView,
        evaluationKey: analysisEvaluationKeyRef.current, gameAnnotations, moveAnnotations,
        annotationsDirty, annotationsSaving, annotationSaveError }}
      actions={{ selectPositionByPly: selectAnalysisPositionByPly, cancelAnalysisReplay,
        selectLine: (index) => { setAnalysisSelectedLineIndex(index); setAnalysisLineAnimationIndex(0); },
        setDetailsTab: setAnalysisDetailsTab, setEngineView: setAnalysisEngineView,
        updateGameAnnotation, persistGameAnnotations }}
    />
  );

  return (
    <ChessBoardView
      headerProps={{ analysisReplayActive, analysisReplayRunning: isAnalysisReplayRunning,
        analysisReplayFinished, debugMode, uciAnalysisLoaded, terminatingProgram: isTerminatingProgram,
        onCancelAnalysis: () => void cancelAnalysisReplay(), onOpenAnalysis: openAnalysisSettingsDialog,
        onExportAnalysisPgn: saveAnalysisPgn, onNewGame: openGameSettingsDialog,
        onExportCurrentGame: () => void saveUciGame(), onImportNewGame: openUciFilePicker,
        onOpenDatabase: () => setShowChessDatabaseDialog(true), onTerminateProgram: () => void terminateProgram(),
        onToggleEngineSettings: () => setShowEngineConfig((prev) => !prev),
        onOpenEngineManager: () => setShowEngineManager(true) }}
      movePanelProps={{ state: { moves,
        whitePlayerName: analysisReplayActive ? getAnalysisWhitePlayerName(clock, analysisWhitePlayerName)
          : uciAnalysisLoaded ? analysisWhitePlayerName || "White" : getDisplayedWhitePlayerName(clock, whiteComputerEnabled),
        blackPlayerName: analysisReplayActive ? getAnalysisBlackPlayerName(clock, analysisBlackPlayerName)
          : uciAnalysisLoaded ? analysisBlackPlayerName || "Black" : getDisplayedBlackPlayerName(clock, blackComputerEnabled),
        whiteActive: !uciAnalysisLoaded && clock?.sideToMove === "white",
        blackActive: !uciAnalysisLoaded && clock?.sideToMove === "black", selectedPly: analysisSelectedPosition?.ply ?? null,
        loadingMoves: isLoadingMoves, computerThinking: isComputerThinking, error: loadError,
        annotations: analysisReplayActive ? moveAnnotations : {}, storedAnnotations: gameAnnotations },
        actions: { showPreview: showMovePreview, movePreview: moveMovePreview, hidePreview,
          showAnnotationTooltip, hideAnnotationTooltip, flipBoard: flipBoardOrientation,
          selectPosition: selectAnalysisPosition } }}
      boardProps={{ pieces, selectedSquare, lastMove, possibleTargets, dragState,
        annotations: selectedBoardAnnotations, orientation: boardOrientation, boardContainerRef,
        onSquareClick: handleSquareClick, onPiecePointerDown: handlePiecePointerDown,
        onPiecePointerMove: handlePiecePointerMove, onPiecePointerUp: handlePiecePointerUp,
        onPiecePointerCancel: handlePiecePointerCancel }}
      showEngineManager={showEngineManager} closeEngineManager={() => setShowEngineManager(false)}
      showChessDatabaseDialog={showChessDatabaseDialog} closeChessDatabaseDialog={() => setShowChessDatabaseDialog(false)}
      onDatabaseGameLoaded={async (game) => { await applyImportedGame(game); }}
      uciFileInputRef={uciFileInputRef} onUciFileSelected={handleUciFileSelected}
      analysisReplayActive={analysisReplayActive} uciAnalysisLoaded={uciAnalysisLoaded} clock={clock} clockError={clockError}
      whiteComputerEnabled={whiteComputerEnabled} blackComputerEnabled={blackComputerEnabled}
      toggleWhiteComputer={() => updateWhiteComputerEnabled(!whiteComputerEnabled)}
      toggleBlackComputer={() => updateBlackComputerEnabled(!blackComputerEnabled)}
      engine={{ showEngineConfig, engineConfigOverview, engineConfigLoadError, analysisReplayActive,
        analysisReplayFinished, uciAnalysisLoaded, engineAutoUpdate, liveEvaluationBar,
        analysisEvaluationEnabled, analysisSelectedPosition, analysisVariationMoves, analysisEvaluation,
        engineEval, evalError, isLoadingEval, boardOrientation, clock, analysisContent }}
      engineActions={{ toggleEngineAutoUpdate, toggleAnalysisEvaluation,
        onEngineConfigOverviewChange: handleEngineConfigOverviewChange,
        closeEngineConfig: () => setShowEngineConfig(false) }}
      hoverPreview={hoverPreview} hoverAnnotationText={hoverAnnotationText}
      dialogs={{ promotionContext, showGameSettingsDialog, gameSettings, gameSettingsError,
        isStartingNewGame, showAnalysisSettingsDialog, analysisSettings, analysisEngineProfiles,
        selectedAnalysisProfile, selectedAnalysisEngine, analysisReplayError, isAnalysisReplayRunning,
        showGameEndDialog, gameEndState, clock }}
      dialogActions={{ clearPromotion: () => setPromotionContext(null), performPromotion: performBoardMove,
        setGameSettings, closeGameSettings: () => setShowGameSettingsDialog(false), startNewGame,
        setAnalysisSettings, closeAnalysisSettings: () => setShowAnalysisSettingsDialog(false), startAnalysisReplay,
        saveUciGame, openUciFilePicker, openGameSettingsDialog, openAnalysisSettingsDialog }}
    />
  );
};