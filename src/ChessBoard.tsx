import { useEffect, useMemo, useRef, useState } from "react";
import { fetchEngineConfigOverview } from "./engineConfig";
import type { EngineConfigOverview } from "./engineConfig";
import { useI18n } from "./i18n/I18nProvider";
import type { ChessDatabaseLoadedGame } from "./ChessDatabaseDialog";
import type {
  AnalysisPositionSelection,
  AnalysisProfilePoint,
  AnalysisReplaySettings,
  AnalysisReplayStep,
  AnalysisVariationRequest,
  ClockState,
  DragState,
  EngineEvaluation,
  GameAnnotation,
  GameSettings,
  GameSound,
  HoverPreview,
  LastMove,
  MoveResult,
  MoveRow,
  PerformMoveOptions,
  Piece,
  PieceType,
  PromotionContext,
  UciGameResponse,
} from "./chess/types";
import type { AnalysisEngineView } from "./chess/analysis/AnalysisEngineTabs";
import AnalysisReplayContent, { type AnalysisDetailsTab } from "./chess/analysis/AnalysisReplayContent";
import { buildMoveAnnotations } from "./chess/analysis/moveAnnotations";
import { buildSelectedBoardAnnotations } from "./chess/analysis/analysisBoardAnnotations";
import { getAnalysisMoveSelectionForPly, getAnalysisSideToMove, getEffectiveAnalysisLineIndex } from "./chess/analysis/analysisSelectionUtils";
import { useMoveAnnotationTooltip } from "./chess/analysis/useMoveAnnotationTooltip";
import { buildDiagnosticAnalysisPgn } from "./chess/analysis/analysisPgnExport";
import ChessBoardView from "./chess/board/ChessBoardView";
import { GAME_SOUND_SOURCES } from "./chess/game/gameSounds";
import { createInitialPieces, getRankFromSquare, getSquareCoords, squareName } from "./chess/board/boardUtils";
import {
  BOARD_ORIENTATION_STORAGE_KEY,
  boardPointToSquare,
  normalizeBoardOrientation,
  type BoardOrientation,
} from "./chess/board/boardOrientation";
import {
  mapBackendPiecesToLocalPieces,
  mapPositionStringToLocalPieces,
} from "./chess/board/positionUtils";
import {
  applyLocalMoveTransition,
  piecesMatchPosition,
  reconcilePieceSnapshot,
  transitionBoardPosition,
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
  saveGameAnnotations,
} from "./chess/api/gameApi";
import { useComputerMoves } from "./chess/game/useComputerMoves";
import { BackendLiveEvaluationSource } from "./chess/evaluation/BackendLiveEvaluationSource";
import { LiveEvaluationController } from "./chess/evaluation/LiveEvaluationController";
import type { LiveEvaluationPosition } from "./chess/evaluation/LiveEvaluationSource";
import {
  appendCanonicalMoveToLiveEvaluationPosition,
  createLiveEvaluationPosition,
} from "./chess/evaluation/liveEvaluationPosition";
import {
  cancelAnalysisReplayRequest,
  fetchAnalysisEvaluation as fetchAnalysisEvaluationRequest,
  fetchAnalysisPossibleMoves,
  fetchAnalysisVariationEvaluation,
  fetchAnalysisReplayState,
  fetchNextAnalysisReplayStep,
  startAnalysisReplayRequest,
  stopAnalysisEvaluationRequest,
  submitAnalysisVariationMove,
} from "./chess/api/analysisApi";
import { fetchProgramFeatures, terminateBackend, terminateDevelopmentFrontend } from "./chess/api/programApi";

import { sameLiveEvaluationPosition } from "./chess/evaluation/liveEvaluationUtils";
import { createDefaultGameSettings } from "./chess/game/gameDefaults";
import { mergeAuthoritativeMoveRows } from "./chess/game/moveListUtils";
import { analysisEvaluationKey, createDefaultAnalysisReplaySettings } from "./chess/analysis/analysisUtils";
import { gameAnnotationRecord, isEmptyGameAnnotation } from "./chess/analysis/annotationUtils";
export const ChessBoard: React.FC = () => {
  const { t } = useI18n();
  const getMoveAnnotationTooltip = useMoveAnnotationTooltip();
  const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>(() => {
    if (typeof window === "undefined") return "white";
    return normalizeBoardOrientation(
      window.localStorage.getItem(BOARD_ORIENTATION_STORAGE_KEY)
    );
  });

  const [pieces, setPieces] = useState<Piece[]>(() => createInitialPieces());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [moves, setMoves] = useState<MoveRow[]>([]);
  const latestMovePlyRef = useRef(0);
  const moveListReconcilePromiseRef =
    useRef<Promise<LiveEvaluationPosition | null> | null>(null);
  const liveEvaluationPositionRef = useRef<LiveEvaluationPosition | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);
  const [hoverAnnotationText, setHoverAnnotationText] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const possibleTargetsRef = useRef<string[]>([]);
  const [possibleTargets, setPossibleTargets] = useState<string[]>([]);
  const [isLoadingMoves, setIsLoadingMoves] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [promotionContext, setPromotionContext] = useState<PromotionContext | null>(null);

  function updatePossibleTargets(targets: string[]) {
    possibleTargetsRef.current = targets;
    setPossibleTargets(targets);
  }

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
    setDragState(null);
    setSelectedSquare(null);
    updatePossibleTargets([]);
    setPromotionContext(null);
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

  const [showAnalysisSettingsDialog, setShowAnalysisSettingsDialog] = useState<boolean>(false);
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisReplaySettings>(() => createDefaultAnalysisReplaySettings());
  const [analysisReplayActive, setAnalysisReplayActiveState] = useState<boolean>(false);
  const analysisReplayActiveRef = useRef<boolean>(false);
  const [isAnalysisReplayRunning, setIsAnalysisReplayRunning] = useState<boolean>(false);
  const [analysisReplayStatus, setAnalysisReplayStatus] = useState<string | null>(null);
  const [analysisReplayError, setAnalysisReplayError] = useState<string | null>(null);
  const [analysisReplayFinished, setAnalysisReplayFinished] = useState<boolean>(false);
  const [analysisProfile, setAnalysisProfile] = useState<AnalysisProfilePoint[]>([
    { ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 },
  ]);
  const [analysisTotalPlies, setAnalysisTotalPlies] = useState<number>(0);
  const [analysisSelectedPosition, setAnalysisSelectedPosition] = useState<AnalysisPositionSelection | null>(null);
  const analysisSelectedPlyRef = useRef<number | null>(null);
  const [analysisDetailsTab, setAnalysisDetailsTab] = useState<AnalysisDetailsTab>("engine");
  const [gameAnnotations, setGameAnnotations] = useState<Record<number, GameAnnotation>>({});
  const [annotationsDirty, setAnnotationsDirty] = useState<boolean>(false);
  const [annotationsSaving, setAnnotationsSaving] = useState<boolean>(false);
  const [annotationSaveError, setAnnotationSaveError] = useState<string | null>(null);
  const [analysisEngineView, setAnalysisEngineView] = useState<AnalysisEngineView>("deep");
  const [analysisSelectedLineIndex, setAnalysisSelectedLineIndex] = useState<number | null>(null);
  const [analysisLineAnimationIndex, setAnalysisLineAnimationIndex] = useState<number>(0);
  const [analysisWhitePlayerName, setAnalysisWhitePlayerName] = useState<string | null>(null);
  const [analysisBlackPlayerName, setAnalysisBlackPlayerName] = useState<string | null>(null);
  const analysisReplayCancelledRef = useRef<boolean>(false);
  const analysisReplayResumeRef = useRef<AnalysisReplayStep | null>(null);
  const [analysisEvaluationEnabled, setAnalysisEvaluationEnabledState] = useState<boolean>(false);
  const analysisEvaluationEnabledRef = useRef<boolean>(false);
  const [analysisEvaluation, setAnalysisEvaluation] = useState<EngineEvaluation | null>(null);
  const [analysisEvaluationError, setAnalysisEvaluationError] = useState<string | null>(null);
  const analysisEvaluationPlyRef = useRef<number | null>(null);
  const analysisEvaluationKeyRef = useRef<string | null>(null);
  const [analysisVariationMoves, setAnalysisVariationMovesState] = useState<string[]>([]);
  const analysisVariationMovesRef = useRef<string[]>([]);
  const [analysisVariationGameState, setAnalysisVariationGameState] = useState<string | null>(null);
  const soundCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const {
    whiteComputerEnabled,
    blackComputerEnabled,
    isComputerThinking,
    isSideComputerControlled,
    updateWhiteComputerEnabled,
    updateBlackComputerEnabled,
    disablePlayerEngines,
    requestComputerMoveIfEnabled,
    runComputerMoveSequence,
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

  const analysisEngineProfiles = useMemo(() => engineConfigOverview?.profiles ?? [], [engineConfigOverview]);
  const selectedAnalysisProfile = useMemo(
    () => analysisEngineProfiles.find((profile) => profile.id === analysisSettings.engineProfileId) ?? null,
    [analysisEngineProfiles, analysisSettings.engineProfileId]
  );
  const selectedAnalysisEngine = useMemo(
    () => (engineConfigOverview?.engines ?? []).find((engine) => engine.id === selectedAnalysisProfile?.engineId) ?? null,
    [engineConfigOverview, selectedAnalysisProfile?.engineId]
  );
  const moveAnnotations = useMemo(
    () => buildMoveAnnotations(analysisProfile),
    [analysisProfile]
  );

  const selectedBoardAnnotations = useMemo(
    () => buildSelectedBoardAnnotations({
      analysisReplayActive,
      analysisReplayFinished,
      analysisSelectedPosition,
      analysisProfile,
      analysisVariationMoves,
      analysisEvaluationEnabled,
      analysisEvaluation,
      moveAnnotations,
      gameAnnotations,
      savedAnnotationLabel: t("annotations.savedAnnotation"),
      getMoveAnnotationTooltip,
    }),
    [
      analysisReplayActive, analysisReplayFinished, analysisSelectedPosition,
      analysisProfile, analysisVariationMoves, analysisEvaluationEnabled,
      analysisEvaluation, moveAnnotations, gameAnnotations,
      getMoveAnnotationTooltip, t,
    ]
  );

  const squareToPieceMap = useMemo(() => {
    const map = new Map<string, Piece>();
    for (const p of pieces) map.set(squareName(p.file, p.rank), p);
    return map;
  }, [pieces]);

  function setUciAnalysisLoaded(value: boolean) {
    uciAnalysisLoadedRef.current = value;
    setUciAnalysisLoadedState(value);
  }

  function setAnalysisVariationMoves(value: string[]) {
    const next = [...value];
    analysisVariationMovesRef.current = next;
    setAnalysisVariationMovesState(next);
  }

  function analysisBoardInteractive(): boolean {
    return Boolean(
      analysisReplayActiveRef.current
      && analysisReplayFinished
      && analysisSelectedPosition
      && !isAnalysisReplayRunning
      && !analysisVariationGameState
    );
  }

  function selectablePiece(piece: Piece, analysisInteractive: boolean): boolean {
    const sideToMove = analysisInteractive
      ? getAnalysisSideToMove(analysisSelectedPosition?.ply, analysisVariationMovesRef.current.length)
      : clock?.sideToMove === "white" || clock?.sideToMove === "black"
        ? clock.sideToMove
        : null;

    if (sideToMove && piece.color !== sideToMove) return false;
    return analysisInteractive || !isPieceComputerControlled(piece);
  }

  function resetAnalysisVariation() {
    setAnalysisVariationMoves([]);
    setAnalysisVariationGameState(null);
    setDragState(null);
    setSelectedSquare(null);
    updatePossibleTargets([]);
    setPromotionContext(null);
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

  function setAnalysisReplayActive(value: boolean) {
    analysisReplayActiveRef.current = value;
    setAnalysisReplayActiveState(value);
  }

  function setAnalysisEvaluationEnabled(value: boolean) {
    analysisEvaluationEnabledRef.current = value;
    setAnalysisEvaluationEnabledState(value);
  }

  function isPieceComputerControlled(piece: Piece | null | undefined): boolean {
    return !!piece && isSideComputerControlled(piece.color);
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

  async function restoreAnalysisReplayAfterReload(
    restoredMoves: UciGameResponse["moves"]
  ) {
    const replayState = await fetchAnalysisReplayState();
    if (!replayState) return;

    const hasReplayState =
      replayState.active
      || replayState.totalPlies > 0
      || (replayState.profile?.length ?? 0) > 1;
    if (!hasReplayState) return;

    setAnalysisReplayActive(true);
    setAnalysisReplayFinished(Boolean(replayState.done));
    setIsAnalysisReplayRunning(false);
    setAnalysisReplayError(null);
    setAnalysisEvaluationEnabled(false);
    setAnalysisEvaluation(null);
    setAnalysisEvaluationError(null);
    analysisEvaluationPlyRef.current = null;
    analysisEvaluationKeyRef.current = null;
    resetAnalysisVariation();
    setAnalysisDetailsTab("engine");
    setEngineAutoUpdate(false);
    setLiveEvaluationBar(null);
    applyAnalysisReplayStep(replayState);

    const currentPly = Math.max(
      0,
      Math.min(replayState.currentPly ?? 0, restoredMoves.length)
    );
    const selectedMove = currentPly > 0
      ? restoredMoves.find((move) => move.ply === currentPly)
        ?? restoredMoves[currentPly - 1]
      : null;

    if (selectedMove?.position && selectedMove.position.length === 64) {
      const moveLabel = selectedMove.san ? ` · ${selectedMove.san}` : "";
      analysisSelectedPlyRef.current = currentPly;
      setAnalysisSelectedPosition({
        position: selectedMove.position,
        label: `Ply ${currentPly}${moveLabel}`,
        ply: currentPly,
      });
      setPieces(mapPositionStringToLocalPieces(selectedMove.position));
      setLastMove(
        selectedMove.uci && selectedMove.uci.length >= 4
          ? {
              from: selectedMove.uci.substring(0, 2),
              to: selectedMove.uci.substring(2, 4),
            }
          : null
      );
    } else if (replayState.board?.pieces) {
      analysisSelectedPlyRef.current = null;
      setAnalysisSelectedPosition(null);
      setPieces(mapBackendPiecesToLocalPieces(replayState.board.pieces));
      setLastMove(null);
    }

    const progressText = `${replayState.currentPly} / ${replayState.totalPlies}`;
    setAnalysisReplayStatus(
      replayState.done
        ? `Analysis complete (${progressText}).`
        : `Analyzing ${progressText}…`
    );

    analysisReplayResumeRef.current =
      replayState.active && !replayState.done ? replayState : null;
  }

  async function loadCurrentGameSnapshot() {
    try {
      const snapshot = await fetchGameSnapshot();
      const game = snapshot.game;
      const restoredMoves = game.moves ?? [];
      liveEvaluationPositionRef.current =
        createLiveEvaluationPosition(restoredMoves);

      setGameAnnotations(gameAnnotationRecord(game.annotations));
      setAnnotationsDirty(false);
      setAnnotationSaveError(null);
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
        setAnalysisWhitePlayerName(formatPlayerDisplayName(game.whitePlayerName, "White"));
        setAnalysisBlackPlayerName(formatPlayerDisplayName(game.blackPlayerName, "Black"));
        setAnalysisTotalPlies(Math.max(0, game.totalPlies ?? restoredMoves.length));
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

  useEffect(() => {
    const replayState = analysisReplayResumeRef.current;
    if (!replayState || !analysisReplayActive || moves.length === 0) return;

    analysisReplayResumeRef.current = null;
    void runAnalysisReplayLoop(replayState);
  }, [analysisReplayActive, moves.length]);

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

  async function stopAnalysisEvaluation() {
    try {
      await stopAnalysisEvaluationRequest();
    } catch (e) {
      console.warn("[stopAnalysisEvaluation] backend stop failed", e);
    }
  }

  async function loadAnalysisEvaluation(ply: number, variationMoves: string[] = analysisVariationMovesRef.current) {
    const key = analysisEvaluationKey(ply, variationMoves);
    if (!analysisEvaluationEnabledRef.current || analysisEvaluationKeyRef.current !== key) return;

    try {
      setAnalysisEvaluationError(null);
      const data = variationMoves.length > 0
        ? await fetchAnalysisVariationEvaluation(ply, variationMoves)
        : await fetchAnalysisEvaluationRequest(ply);
      const hasUsableLines = Boolean(data.lines && data.lines.length > 0);
      const isTerminalPosition = Math.abs(data.eval ?? 0) >= 99
        || (variationMoves.length > 0 && Boolean(analysisVariationGameState));
      if (analysisEvaluationEnabledRef.current && analysisEvaluationKeyRef.current === key
          && (hasUsableLines || isTerminalPosition)) {
        setAnalysisEvaluation(data);
      }
    } catch (e) {
      console.error("[loadAnalysisEvaluation] error", e);
      if (analysisEvaluationKeyRef.current === key) {
        setAnalysisEvaluationError(t("evaluation.analysisFailed"));
      }
    }
  }

  function toggleAnalysisEvaluation() {
    if (!analysisReplayFinished || !analysisSelectedPosition) return;
    const nextValue = !analysisEvaluationEnabledRef.current;
    setAnalysisEvaluationEnabled(nextValue);
    setAnalysisEvaluation(null);
    setAnalysisEvaluationError(null);
    if (!nextValue) {
      analysisEvaluationKeyRef.current = null;
      void stopAnalysisEvaluation();
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
      setAnalysisSettings((prev) => {
        if (data.profiles.some((profile) => profile.id === prev.engineProfileId)) return prev;
        const preferred = data.profiles.find((profile) => profile.id === data.defaults.deepAnalysisProfileId);
        return { ...prev, engineProfileId: preferred?.id ?? data.profiles[0]?.id ?? null };
      });
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

  useEffect(() => { setAnalysisLineAnimationIndex(0); }, [analysisSelectedPosition?.ply, analysisSelectedLineIndex]);

  useEffect(() => {
    if (!analysisReplayActive || !analysisSelectedPosition || analysisVariationMoves.length > 0) return;
    const selectedPoint = analysisProfile.find((point) => point.ply === analysisSelectedPosition.ply);
    const lines = selectedPoint?.lines ?? [];
    if (lines.length === 0) return;
    const lineIndex = getEffectiveAnalysisLineIndex(selectedPoint, lines, analysisSelectedLineIndex);
    const positions = lines[lineIndex]?.positions ?? [];
    if (positions.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setAnalysisLineAnimationIndex((prev) => (prev + 1) % positions.length);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [analysisReplayActive, analysisSelectedPosition?.ply, analysisSelectedLineIndex, analysisProfile, analysisVariationMoves.length]);

  useEffect(() => {
    if (!analysisReplayActive || !analysisReplayFinished || !analysisEvaluationEnabled || !analysisSelectedPosition) return;
    const ply = analysisSelectedPosition.ply;
    const variationSnapshot = [...analysisVariationMoves];
    const key = analysisEvaluationKey(ply, variationSnapshot);
    analysisEvaluationPlyRef.current = ply;
    analysisEvaluationKeyRef.current = key;
    setAnalysisEvaluation(null);
    setAnalysisEvaluationError(null);
    void loadAnalysisEvaluation(ply, variationSnapshot);
    const intervalId = window.setInterval(() => { void loadAnalysisEvaluation(ply, variationSnapshot); }, 2000);
    return () => window.clearInterval(intervalId);
  }, [analysisReplayActive, analysisReplayFinished, analysisEvaluationEnabled, analysisSelectedPosition?.ply, analysisVariationMoves]);

  useEffect(() => {
    if (
      !analysisReplayActive
      || !analysisReplayFinished
      || !analysisEvaluationEnabled
      || !analysisSelectedPosition
      || analysisVariationMoves.length > 0
      || !analysisEvaluation?.moveAnnotationReady
    ) {
      return;
    }

    const ply = analysisSelectedPosition.ply;
    const liveAnnotation = analysisEvaluation.moveAnnotation ?? null;

    setAnalysisProfile((previous) => {
      let changed = false;
      const next = previous.map((point) => {
        if (point.ply !== ply) return point;

        const current = point.annotation ?? null;
        const sameAnnotation =
          current === liveAnnotation
          || (
            current !== null
            && liveAnnotation !== null
            && current.symbol === liveAnnotation.symbol
            && current.kind === liveAnnotation.kind
            && current.winChanceLoss === liveAnnotation.winChanceLoss
            && current.bestEvaluation === liveAnnotation.bestEvaluation
            && current.secondBestEvaluation === liveAnnotation.secondBestEvaluation
            && current.extraordinaryReason === liveAnnotation.extraordinaryReason
            && current.materialInvestment === liveAnnotation.materialInvestment
            && current.sacrificeType === liveAnnotation.sacrificeType
            && current.shortTermMaterialCompensated === liveAnnotation.shortTermMaterialCompensated
            && current.materialCompensationPlies === liveAnnotation.materialCompensationPlies
            && current.forcedMateDistance === liveAnnotation.forcedMateDistance
            && current.earlyDepth === liveAnnotation.earlyDepth
            && current.earlyRank === liveAnnotation.earlyRank
            && current.finalDepth === liveAnnotation.finalDepth
            && current.finalRank === liveAnnotation.finalRank
            && current.givesCheck === liveAnnotation.givesCheck
            && current.earlyRegret === liveAnnotation.earlyRegret
            && current.earlyStrength === liveAnnotation.earlyStrength
            && current.finalStrength === liveAnnotation.finalStrength
          );

        if (sameAnnotation) return point;
        changed = true;
        return { ...point, annotation: liveAnnotation };
      });

      return changed ? next : previous;
    });
  }, [
    analysisReplayActive,
    analysisReplayFinished,
    analysisEvaluationEnabled,
    analysisSelectedPosition,
    analysisVariationMoves.length,
    analysisEvaluation,
  ]);

  function openAnalysisSettingsDialog() {
    setAnalysisReplayError(null);
    setAnalysisReplayStatus(null);
    if (engineConfigOverview?.defaults.deepAnalysisProfileId) {
      setAnalysisSettings((prev) => ({ ...prev, engineProfileId: engineConfigOverview.defaults.deepAnalysisProfileId }));
    }
    setShowGameEndDialog(false);
    setShowAnalysisSettingsDialog(true);
  }

  function applyAnalysisReplayStep(step: AnalysisReplayStep) {
    if (step.board?.pieces && !analysisReplayActiveRef.current) setPieces(mapBackendPiecesToLocalPieces(step.board.pieces));
    if (step.from && step.to && !analysisReplayActiveRef.current) setLastMove({ from: step.from, to: step.to });
    setAnalysisTotalPlies(Math.max(0, step.totalPlies ?? 0));
    setAnalysisProfile(step.profile?.length ? step.profile : [
      { ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 },
    ]);
    const latestProfilePoint = step.profile?.[step.profile.length - 1];
    setEngineEval({
      eval: step.evaluation ?? 0,
      bar: step.bar ?? 0.5,
      engineName: step.engineName ?? null,
      lines: latestProfilePoint?.lines ?? [],
    });
  }

  async function runAnalysisReplayLoop(initialStep: AnalysisReplayStep) {
    setIsAnalysisReplayRunning(true);
    analysisReplayCancelledRef.current = false;
    let currentStep = initialStep;
    try {
      while (!analysisReplayCancelledRef.current) {
        if (currentStep.currentPly < currentStep.totalPlies) {
          const activePly = currentStep.currentPly + 1;
          selectAnalysisPositionByPly(activePly);
          setAnalysisReplayStatus(`Analyzing ${activePly} / ${currentStep.totalPlies}…`);
        }
        const step = await fetchNextAnalysisReplayStep();
        applyAnalysisReplayStep(step);
        currentStep = step;
        const progressText = `${step.currentPly} / ${step.totalPlies}`;
        if (step.done) {
          setAnalysisReplayStatus(`Analysis complete (${progressText}).`);
          setAnalysisReplayFinished(true);
          break;
        }
      }
    } catch (error) {
      console.error("[runAnalysisReplayLoop] error", error);
      setAnalysisReplayError(t("analysis.failed"));
    } finally {
      setIsAnalysisReplayRunning(false);
    }
  }

  async function startAnalysisReplay() {
    try {
      if (!analysisSettings.engineProfileId) throw new Error(t("analysis.noDeepProfile"));
      analysisReplayResumeRef.current = null;
      setAnalysisReplayError(null);
      setAnalysisReplayStatus(t("analysis.preparing"));
      setAnalysisReplayFinished(false);
      setIsAnalysisReplayRunning(true);
      setShowAnalysisSettingsDialog(false);
      setShowGameEndDialog(false);
      setShowEngineConfig(false);
      setSelectedSquare(null);
      updatePossibleTargets([]);
      setHoverPreview(null);
      setPromotionContext(null);
      setAnalysisWhitePlayerName(uciAnalysisLoaded
        ? analysisWhitePlayerName || "White"
        : getDisplayedWhitePlayerName(clock, whiteComputerEnabled));
      setAnalysisBlackPlayerName(uciAnalysisLoaded
        ? analysisBlackPlayerName || "Black"
        : getDisplayedBlackPlayerName(clock, blackComputerEnabled));
      setAnalysisReplayActive(true);
      setAnalysisEvaluationEnabled(false);
      setAnalysisEvaluation(null);
      setAnalysisEvaluationError(null);
      analysisEvaluationPlyRef.current = null;
      analysisEvaluationKeyRef.current = null;
      resetAnalysisVariation();
      await stopAnalysisEvaluation();
      await stopLiveEvaluation();
      await disablePlayerEngines();
      setShowGameEndDialog(false);
      setEngineAutoUpdate(false);
      setLiveEvaluationBar(null);
      setAnalysisTotalPlies(0);
      analysisSelectedPlyRef.current = null;
      setAnalysisSelectedPosition(null);
      setAnalysisSelectedLineIndex(null);
      setAnalysisLineAnimationIndex(0);
      setAnalysisProfile([{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }]);
      const step = await startAnalysisReplayRequest(analysisSettings);
      applyAnalysisReplayStep(step);
      setAnalysisReplayStatus(`Analyzing 0 / ${step.totalPlies}…`);
      await runAnalysisReplayLoop(step);
    } catch (error) {
      console.error("[startAnalysisReplay] error", error);
      setAnalysisReplayError(t("analysis.startFailed"));
      setAnalysisReplayFinished(false);
      setAnalysisReplayActive(false);
      setIsAnalysisReplayRunning(false);
    }
  }

  async function cancelAnalysisReplay() {
    analysisReplayCancelledRef.current = true;
    setIsAnalysisReplayRunning(false);
    setAnalysisReplayFinished(true);
    setAnalysisReplayStatus(t("analysis.cancelled"));
    try {
      await cancelAnalysisReplayRequest();
    } catch (error) {
      console.warn("[cancelAnalysisReplay] backend cancel failed", error);
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

  function updateGameAnnotation(annotation: GameAnnotation) {
    setGameAnnotations((previous) => {
      const next = { ...previous };
      if (isEmptyGameAnnotation(annotation)) {
        delete next[annotation.ply];
      } else {
        next[annotation.ply] = {
          ...annotation,
          variations: [...(annotation.variations ?? [])],
        };
      }
      return next;
    });
    setAnnotationsDirty(true);
    setAnnotationSaveError(null);
  }

  async function persistGameAnnotations() {
    if (!annotationsDirty || annotationsSaving) return;

    setAnnotationsSaving(true);
    setAnnotationSaveError(null);
    try {
      const annotations = Object.values(gameAnnotations)
        .filter((annotation) => !isEmptyGameAnnotation(annotation))
        .sort((left, right) => left.ply - right.ply);
      const saved = await saveGameAnnotations(
        annotations,
        whiteComputerEnabled,
        blackComputerEnabled
      );
      setGameAnnotations(gameAnnotationRecord(saved));
      setAnnotationsDirty(false);
    } catch (error) {
      console.error("[persistGameAnnotations] error", error);
      setAnnotationSaveError(
        error instanceof Error ? error.message : t("annotations.saveFailed")
      );
    } finally {
      setAnnotationsSaving(false);
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

  function saveAnalysisPgn() {
    try {
      setLoadError(null);
      const diagnosticPgn = buildDiagnosticAnalysisPgn({
        profile: analysisProfile,
        whitePlayerName: getAnalysisWhitePlayerName(clock, analysisWhitePlayerName),
        blackPlayerName: getAnalysisBlackPlayerName(clock, analysisBlackPlayerName),
        engineName: engineEval?.engineName ?? null,
      });
      const blob = new Blob([diagnosticPgn], {
        type: "application/x-chess-pgn;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "analysis-diagnostic.pgn";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[saveAnalysisPgn] error", error);
      setLoadError(t("analysis.exportPgnFailed"));
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
      setAnalysisEvaluationEnabled(false);
      setAnalysisEvaluation(null);
      setAnalysisEvaluationError(null);
      analysisEvaluationPlyRef.current = null;
      analysisEvaluationKeyRef.current = null;
      resetAnalysisVariation();
      analysisReplayCancelledRef.current = true;
      analysisReplayResumeRef.current = null;
      setAnalysisReplayActive(false);
      setIsAnalysisReplayRunning(false);
      setAnalysisReplayStatus(null);
      setAnalysisReplayError(null);
      setAnalysisReplayFinished(false);
      analysisSelectedPlyRef.current = null;
      setAnalysisSelectedPosition(null);
      setAnalysisSelectedLineIndex(null);
      setAnalysisLineAnimationIndex(0);
      setAnalysisDetailsTab("engine");
      setAnalysisProfile([{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }]);
      const importedMoves = imported.moves ?? [];
      liveEvaluationPositionRef.current =
        createLiveEvaluationPosition(importedMoves);
      const moveRows = mapImportedUciMovesToRows(importedMoves);
      latestMovePlyRef.current = importedMoves.reduce(
        (maxPly, move) => Math.max(maxPly, Number.isFinite(move.ply) ? move.ply : 0),
        0
      );
      setGameAnnotations(gameAnnotationRecord(imported.annotations));
      setAnnotationsDirty(false);
      setAnnotationSaveError(null);
      setUciAnalysisLoaded(true);
      setMoves(moveRows);
      setAnalysisWhitePlayerName(formatPlayerDisplayName(imported.whitePlayerName, "White"));
      setAnalysisBlackPlayerName(formatPlayerDisplayName(imported.blackPlayerName, "Black"));
      setAnalysisTotalPlies(Math.max(0, imported.totalPlies ?? importedMoves.length));
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
      setAnalysisEvaluationEnabled(false);
      setAnalysisEvaluation(null);
      setAnalysisEvaluationError(null);
      analysisEvaluationPlyRef.current = null;
      analysisEvaluationKeyRef.current = null;
      resetAnalysisVariation();
      analysisReplayCancelledRef.current = true;
      analysisReplayResumeRef.current = null;
      setAnalysisReplayActive(false);
      setIsAnalysisReplayRunning(false);
      setAnalysisReplayStatus(null);
      setAnalysisReplayError(null);
      setAnalysisReplayFinished(false);
      setAnalysisTotalPlies(0);
      analysisSelectedPlyRef.current = null;
      setAnalysisSelectedPosition(null);
      setAnalysisSelectedLineIndex(null);
      setAnalysisLineAnimationIndex(0);
      setAnalysisWhitePlayerName(null);
      setAnalysisBlackPlayerName(null);
      setGameAnnotations({});
      setAnnotationsDirty(false);
      setAnnotationSaveError(null);
      setAnalysisProfile([{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }]);
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

  function selectAnalysisPosition(
    position: string | undefined,
    san: string | undefined,
    ply: number,
    options?: { updateBoard?: boolean }
  ) {
    if (!analysisReplayActiveRef.current || !position || position.length !== 64) return;
    const hadVariation = analysisVariationMovesRef.current.length > 0;
    if (hadVariation) void stopAnalysisEvaluation();
    resetAnalysisVariation();
    const moveLabel = san ? ` · ${san}` : "";
    analysisEvaluationPlyRef.current = ply;
    analysisEvaluationKeyRef.current = `ply:${ply}`;
    setAnalysisEvaluation(null);
    setAnalysisEvaluationError(null);
    analysisSelectedPlyRef.current = ply;
    setAnalysisSelectedPosition({ position, label: `Ply ${ply}${moveLabel}`, ply });
    setAnalysisSelectedLineIndex(null);
    setAnalysisLineAnimationIndex(0);
    if (options?.updateBoard !== false) {
      setPieces(mapPositionStringToLocalPieces(position));
    }
    setLastMove(null);
  }

  function selectAnalysisPositionByPly(ply: number) {
    const selection = getAnalysisMoveSelectionForPly(moves, ply);
    if (selection) {
      selectAnalysisPosition(selection.position, selection.san, selection.ply);
    }
  }

  function animateAnalysisNavigationMove(
    moveFrom: string,
    moveTo: string,
    sourcePosition: string,
    targetPosition: string,
    reverse: boolean
  ) {
    setPieces((previousPieces) => {
      if (!piecesMatchPosition(previousPieces, sourcePosition)) {
        console.warn(
          "[analysis-navigation] board/source mismatch; snapping to target position",
          {
            currentPly: analysisSelectedPlyRef.current,
            moveFrom,
            moveTo,
            reverse,
          }
        );
      }

      return transitionBoardPosition(previousPieces, {
        moveFrom,
        moveTo,
        sourcePosition,
        targetPosition,
        reverse,
      });
    });
  }

  function navigateAnalysisPositionByKeyboard(targetPly: number) {
    const currentPly = analysisSelectedPlyRef.current;
    if (
      currentPly == null
      || Math.abs(targetPly - currentPly) !== 1
      || analysisVariationMovesRef.current.length > 0
    ) {
      selectAnalysisPositionByPly(targetPly);
      return;
    }

    const sourceSelection = getAnalysisMoveSelectionForPly(moves, currentPly);
    const targetSelection = getAnalysisMoveSelectionForPly(moves, targetPly);
    if (
      !sourceSelection?.position
      || sourceSelection.position.length !== 64
      || !targetSelection?.position
      || targetSelection.position.length !== 64
    ) {
      selectAnalysisPositionByPly(targetPly);
      return;
    }

    const reverse = targetPly < currentPly;
    const moveSelection = reverse ? sourceSelection : targetSelection;
    const uci = moveSelection.uci;

    if (!uci || uci.length < 4) {
      console.warn(
        "[navigateAnalysisPositionByKeyboard] missing UCI move for ply",
        reverse ? currentPly : targetPly
      );
      selectAnalysisPosition(
        targetSelection.position,
        targetSelection.san,
        targetSelection.ply
      );
      return;
    }

    animateAnalysisNavigationMove(
      uci.substring(0, 2),
      uci.substring(2, 4),
      sourceSelection.position,
      targetSelection.position,
      reverse
    );
    selectAnalysisPosition(
      targetSelection.position,
      targetSelection.san,
      targetSelection.ply,
      { updateBoard: false }
    );
  }

  useEffect(() => {
    function handleAnalysisArrowNavigation(event: KeyboardEvent) {
      if (
        !analysisReplayActive
        || !analysisReplayFinished
        || analysisTotalPlies <= 0
        || showAnalysisSettingsDialog
        || showGameSettingsDialog
        || showEngineConfig
        || showEngineManager
        || showChessDatabaseDialog
        || promotionContext
      ) {
        return;
      }

      if (
        (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
        || event.repeat
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const currentPly = analysisSelectedPlyRef.current
        ?? (event.key === "ArrowRight" ? 0 : analysisTotalPlies + 1);
      const nextPly = currentPly + (event.key === "ArrowRight" ? 1 : -1);
      if (nextPly < 1 || nextPly > analysisTotalPlies) {
        return;
      }

      event.preventDefault();
      navigateAnalysisPositionByKeyboard(nextPly);
    }

    window.addEventListener("keydown", handleAnalysisArrowNavigation);
    return () => window.removeEventListener("keydown", handleAnalysisArrowNavigation);
  }, [
    analysisReplayActive,
    analysisReplayFinished,
    analysisSelectedPosition?.ply,
    analysisTotalPlies,
    showAnalysisSettingsDialog,
    showGameSettingsDialog,
    showEngineConfig,
    showEngineManager,
    showChessDatabaseDialog,
    promotionContext,
    moves,
  ]);

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

  async function performAnalysisVariationMove(from: string, to: string, promotion?: PieceType) {
    if (!analysisSelectedPosition) return;
    const previousMoves = [...analysisVariationMovesRef.current];
    const request: AnalysisVariationRequest = {
      anchorPly: analysisSelectedPosition.ply,
      moves: previousMoves,
      from,
      to,
      promotion: promotion ?? null,
    };
    try {
      setIsLoadingMoves(true);
      setLoadError(null);
      const result = await submitAnalysisVariationMove(request);
      const data = result.data;
      if (!result.ok || !data.success || !data.uci || !data.position) {
        setLoadError(data.message || `HTTP ${result.status}`);
        return;
      }
      const nextMoves = [...previousMoves, data.uci];
      setAnalysisVariationMoves(nextMoves);
      setAnalysisVariationGameState(data.gameState ?? null);
      animateMoveLocally(from, to, promotion, data.position);
      setLastMove({ from, to });
      setSelectedSquare(null);
      updatePossibleTargets([]);
      setAnalysisSelectedLineIndex(null);
      setAnalysisLineAnimationIndex(0);
      setAnalysisEngineView("live");
      setAnalysisEvaluationError(null);
      analysisEvaluationKeyRef.current = analysisEvaluationKey(analysisSelectedPosition.ply, nextMoves);
      void playGameSound(data.gameState ? "notify" : "move");
    } catch (e) {
      console.error("[performAnalysisVariationMove] failed", e);
      setLoadError(t("analysis.variationMoveFailed"));
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

  function getSquareFromClientPoint(clientX: number, clientY: number): string | null {
    const boardRect = boardContainerRef.current?.getBoundingClientRect();
    if (!boardRect) return null;
    return boardPointToSquare(
      clientX - boardRect.left,
      clientY - boardRect.top,
      boardRect.width,
      boardRect.height,
      boardOrientation
    );
  }

  async function handlePiecePointerDown(event: React.PointerEvent<HTMLDivElement>, piece: Piece) {
    if (event.button !== 0) return;
    const analysisInteractive = analysisBoardInteractive();
    if ((!analysisInteractive && (analysisReplayActive || uciAnalysisLoaded))
      || isLoadingMoves || isComputerThinking || promotionContext
      || (!analysisInteractive && clock?.gameState)) return;
    const from = squareName(piece.file, piece.rank);

    if (selectedSquare && selectedSquare !== from && possibleTargets.includes(from)) {
      event.preventDefault();
      const movingPiece = squareToPieceMap.get(selectedSquare);
      const targetRank = getRankFromSquare(from);
      const isPromotionMove = movingPiece && movingPiece.type === "pawn" &&
        ((movingPiece.color === "white" && targetRank === 8) || (movingPiece.color === "black" && targetRank === 1));
      if (isPromotionMove && movingPiece) {
        setPromotionContext({ from: selectedSquare, to: from, color: movingPiece.color });
        setSelectedSquare(null);
        updatePossibleTargets([]);
        return;
      }
      const sourceSquare = selectedSquare;
      setSelectedSquare(null);
      updatePossibleTargets([]);
      await performBoardMove(sourceSquare, from);
      return;
    }

    if (!selectablePiece(piece, analysisInteractive)) return;

    const boardRect = boardContainerRef.current?.getBoundingClientRect();
    const pieceRect = event.currentTarget.getBoundingClientRect();
    if (!boardRect) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const offsetX = event.clientX - pieceRect.left;
    const offsetY = event.clientY - pieceRect.top;
    setSelectedSquare(from);
    updatePossibleTargets([]);
    setDragState({
      pieceId: piece.id, from, pointerId: event.pointerId, offsetX, offsetY,
      boardLeft: boardRect.left, boardTop: boardRect.top,
      x: event.clientX - boardRect.left - offsetX,
      y: event.clientY - boardRect.top - offsetY,
      startClientX: event.clientX, startClientY: event.clientY, hasMoved: false,
    });
    await loadPossibleMoves(from);
  }

  function handlePiecePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;
    const hasMoved = dragState.hasMoved || Math.sqrt(deltaX * deltaX + deltaY * deltaY) > 4;
    setDragState((prev) => prev && prev.pointerId === event.pointerId
      ? { ...prev, x: event.clientX - prev.boardLeft - prev.offsetX, y: event.clientY - prev.boardTop - prev.offsetY, hasMoved }
      : prev);
  }

  async function handlePiecePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    const finishedDrag = {
      ...dragState,
      x: event.clientX - dragState.boardLeft - dragState.offsetX,
      y: event.clientY - dragState.boardTop - dragState.offsetY,
    };
    if (!finishedDrag.hasMoved) { setDragState(null); return; }
    const targetSquare = getSquareFromClientPoint(event.clientX, event.clientY);
    if (!targetSquare || targetSquare === finishedDrag.from || !possibleTargetsRef.current.includes(targetSquare)) {
      setDragState(null); setSelectedSquare(null); updatePossibleTargets([]); return;
    }
    const movingPiece = squareToPieceMap.get(finishedDrag.from);
    const targetRank = getRankFromSquare(targetSquare);
    const isPromotionMove = movingPiece && movingPiece.type === "pawn" &&
      ((movingPiece.color === "white" && targetRank === 8) || (movingPiece.color === "black" && targetRank === 1));
    if (isPromotionMove && movingPiece) {
      setDragState(null);
      setPromotionContext({ from: finishedDrag.from, to: targetSquare, color: movingPiece.color });
      setSelectedSquare(null); updatePossibleTargets([]); return;
    }
    setSelectedSquare(null);
    updatePossibleTargets([]);

    if (analysisReplayActiveRef.current && analysisReplayFinished && analysisSelectedPosition) {
      setDragState(null);
      await performAnalysisVariationMove(finishedDrag.from, targetSquare);
      return;
    }

    setDragState(finishedDrag);
    window.requestAnimationFrame(() => {
      animateMoveLocally(finishedDrag.from, targetSquare);
      setDragState(null);
      performMove(finishedDrag.from, targetSquare, undefined, { localMoveAlreadyApplied: true }).catch(async (error) => {
        console.error("[handlePiecePointerUp] optimistic drag-and-drop move failed:", error);
        await loadBoardFromBackend();
      });
    });
  }

  function handlePiecePointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    setDragState(null); setSelectedSquare(null); updatePossibleTargets([]);
  }

  const handleSquareClick = async (square: string) => {
    const analysisInteractive = analysisBoardInteractive();
    if ((!analysisInteractive && (analysisReplayActive || uciAnalysisLoaded)) || isLoadingMoves || isComputerThinking) return;
    if (promotionContext || (!analysisInteractive && clock?.gameState)) return;
    const clickedPiece = squareToPieceMap.get(square);
    if (!selectedSquare) {
      if (clickedPiece && selectablePiece(clickedPiece, analysisInteractive)) {
        setSelectedSquare(square);
        await loadPossibleMoves(square);
      }
      return;
    }
    if (selectedSquare === square) {
      setSelectedSquare(null); updatePossibleTargets([]); return;
    }
    if (possibleTargets.includes(square)) {
      const from = selectedSquare;
      const movingPiece = squareToPieceMap.get(from);
      const targetRank = getRankFromSquare(square);
      const isPromotionMove = movingPiece && movingPiece.type === "pawn" &&
        ((movingPiece.color === "white" && targetRank === 8) || (movingPiece.color === "black" && targetRank === 1));
      if (isPromotionMove && movingPiece) {
        setPromotionContext({ from, to: square, color: movingPiece.color });
        updatePossibleTargets([]);
        return;
      }
      await performBoardMove(from, square);
      return;
    }
    if (clickedPiece && selectablePiece(clickedPiece, analysisInteractive)) {
      setSelectedSquare(square);
      await loadPossibleMoves(square);
      return;
    }
    setSelectedSquare(null); updatePossibleTargets([]);
  };

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