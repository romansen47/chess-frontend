import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import EngineManager from "./EngineManager";
import EngineConfigManager from "./EngineConfigManager";
import { fetchEngineConfigOverview } from "./engineConfig";
import type { EngineConfigOverview } from "./engineConfig";
import ChessDatabaseDialog, { type ChessDatabaseLoadedGame } from "./ChessDatabaseDialog";
import AnalysisDatabasePanel from "./AnalysisDatabasePanel";
import type {
  AnalysisPositionSelection,
  AnalysisProfilePoint,
  AnalysisReplaySettings,
  AnalysisReplayStep,
  AnalysisVariationRequest,
  ClockState,
  DragState,
  EngineEvaluation,
  EngineLine,
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
import ChessHeader from "./chess/header/ChessHeader";
import NewGameDialog from "./chess/game/NewGameDialog";
import MovePanel from "./chess/game/MovePanel";
import AnalysisSettingsDialog from "./chess/analysis/AnalysisSettingsDialog";
import AnalysisEngineTabs, { type AnalysisEngineView } from "./chess/analysis/AnalysisEngineTabs";
import LiveEvaluationView from "./chess/analysis/LiveEvaluationView";
import { GAME_SOUND_SOURCES } from "./chess/game/gameSounds";
import {
  createInitialPieces,
  getCastlingSquares,
  getPieceSymbol,
  getRankFromSquare,
  getSquareCoords,
  squareName,
} from "./chess/board/boardUtils";
import {
  getPieceSymbolFromPositionChar,
  getPromotionTypeForLocalMove,
  isWhitePositionPiece,
  mapBackendPiecesToLocalPieces,
  mapPositionStringToLocalPieces,
} from "./chess/board/positionUtils";
import {
  formatClockTime,
  formatGameState,
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
import { fetchEvaluation, openEvaluationStream, stopEvaluation } from "./chess/api/evaluationApi";
import {
  cancelAnalysisReplayRequest,
  fetchAnalysisEvaluation as fetchAnalysisEvaluationRequest,
  fetchAnalysisPossibleMoves,
  fetchAnalysisVariationEvaluation,
  fetchNextAnalysisReplayStep,
  startAnalysisReplayRequest,
  stopAnalysisEvaluationRequest,
  submitAnalysisVariationMove,
} from "./chess/api/analysisApi";
import { terminateBackend, terminateDevelopmentFrontend } from "./chess/api/programApi";

const LIVE_EVALUATION_FAST_POLL_MS = 250;
const LIVE_EVALUATION_NORMAL_POLL_MS = 2000;

function formatEngineScore(evaluation: number): string {
  if (Math.abs(evaluation) >= 99) {
    return evaluation > 0 ? "Mate for White" : "Mate for Black";
  }

  return `Eval ${evaluation.toFixed(2)}`;
}

function formatEngineLineScore(line: EngineLine): string {
  if (line.mateDistance !== undefined && line.mateDistance !== null) {
    const winner = line.eval > 0 ? "White" : "Black";
    const distance = Math.abs(line.mateDistance);
    return distance > 0 ? `Mate für ${winner} in ${distance}` : `Mate für ${winner}`;
  }

  return formatEngineScore(line.eval);
}

function createDefaultGameSettings(): GameSettings {
  return {
    timeForEachPlayerSeconds: 5 * 60,
    incrementForWhiteSeconds: 0,
    incrementForBlackSeconds: 0,
    additionalTimeAfter40MovesSeconds: 0,
    startingColor: "WHITE",
    version: 0,
  };
}

function createDefaultAnalysisReplaySettings(): AnalysisReplaySettings {
  return { engineProfileId: null, depth: 0, moveTimeSeconds: 5 };
}

export const ChessBoard: React.FC = () => {
  const [pieces, setPieces] = useState<Piece[]>(() => createInitialPieces());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [moves, setMoves] = useState<MoveRow[]>([]);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);
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

  const [engineEval, setEngineEval] = useState<EngineEvaluation | null>(null);
  const [liveEvaluationBar, setLiveEvaluationBar] = useState<number | null>(null);
  const [isLoadingEval, setIsLoadingEval] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [engineAutoUpdate, setEngineAutoUpdateState] = useState<boolean>(true);
  const engineAutoUpdateRef = useRef<boolean>(true);
  const [liveEvaluationFastPolling, setLiveEvaluationFastPolling] = useState<boolean>(true);
  const liveEvaluationRequestInFlightRef = useRef<boolean>(false);
  const [showEngineConfig, setShowEngineConfig] = useState<boolean>(false);
  const [engineConfigOverview, setEngineConfigOverview] = useState<EngineConfigOverview | null>(null);
  const [engineConfigLoadError, setEngineConfigLoadError] = useState<string | null>(null);
  const [showEngineManager, setShowEngineManager] = useState<boolean>(false);
  const [showChessDatabaseDialog, setShowChessDatabaseDialog] = useState<boolean>(false);
  const [isTerminatingProgram, setIsTerminatingProgram] = useState<boolean>(false);
  const [uciAnalysisLoaded, setUciAnalysisLoadedState] = useState<boolean>(false);
  const uciAnalysisLoadedRef = useRef<boolean>(false);
  const uciFileInputRef = useRef<HTMLInputElement | null>(null);

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
  const [analysisDetailsTab, setAnalysisDetailsTab] = useState<"engine" | "database">("engine");
  const [analysisEngineView, setAnalysisEngineView] = useState<AnalysisEngineView>("deep");
  const [analysisSelectedLineIndex, setAnalysisSelectedLineIndex] = useState<number | null>(null);
  const [analysisLineAnimationIndex, setAnalysisLineAnimationIndex] = useState<number>(0);
  const [analysisWhitePlayerName, setAnalysisWhitePlayerName] = useState<string | null>(null);
  const [analysisBlackPlayerName, setAnalysisBlackPlayerName] = useState<string | null>(null);
  const analysisReplayCancelledRef = useRef<boolean>(false);
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

  function analysisEvaluationKey(ply: number, variationMoves: string[]): string {
    return variationMoves.length > 0
      ? `variation:${ply}:${variationMoves.join(" ")}`
      : `ply:${ply}`;
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
      setPieces(mapBackendPiecesToLocalPieces(data.pieces ?? []));
    } catch (e) {
      console.error("[loadBoardFromBackend] error:", e);
      setLoadError("Could not load the board from the server.");
    }
  }

  async function loadCurrentGameSnapshot() {
    try {
      const snapshot = await fetchGameSnapshot();
      const game = snapshot.game;
      const restoredMoves = game.moves ?? [];

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

      return snapshot;
    } catch (e) {
      console.error("[loadCurrentGameSnapshot] error", e);
      setLoadError("Could not restore the current game after reload.");
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
      setGameSettingsError("Game settings could not be loaded.");
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
      setClockError("Could not load the clock.");
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
      setLoadError("Failed to load possible moves.");
      updatePossibleTargets([]);
      return [];
    } finally {
      setIsLoadingMoves(false);
    }
  }

  async function loadEvaluation() {
    if (!engineAutoUpdateRef.current || liveEvaluationRequestInFlightRef.current) return;
    liveEvaluationRequestInFlightRef.current = true;
    try {
      setIsLoadingEval(true);
      setEvalError(null);
      const data = await fetchEvaluation();
      if (!engineAutoUpdateRef.current) return;
      const hasLines = Boolean(data.lines && data.lines.length > 0);
      setLiveEvaluationFastPolling(!hasLines);
      if (hasLines) setEngineEval(data);
    } catch (e) {
      console.error("[loadEvaluation] error", e);
      setEvalError("Failed to load the engine evaluation.");
      setLiveEvaluationFastPolling(false);
    } finally {
      liveEvaluationRequestInFlightRef.current = false;
      setIsLoadingEval(false);
    }
  }

  useEffect(() => {
    if (!engineAutoUpdate || analysisReplayActive || uciAnalysisLoaded || clock?.gameState) {
      setLiveEvaluationBar(null);
      return;
    }

    const source = openEvaluationStream();

    const handleReady = () => {
      void loadEvaluation();
    };

    const handleBar = (event: Event) => {
      try {
        const data = JSON.parse((event as MessageEvent<string>).data) as {
          eval?: number;
          bar?: number;
          depth?: number;
        };
        if (!engineAutoUpdateRef.current || analysisReplayActiveRef.current
            || uciAnalysisLoadedRef.current || gameEndStateRef.current) return;
        if (typeof data.bar !== "number" || !Number.isFinite(data.bar)) return;
        setLiveEvaluationBar(Math.max(0, Math.min(1, data.bar)));
      } catch (error) {
        console.warn("[liveEvaluationBar] invalid SSE update", error);
      }
    };

    source.addEventListener("ready", handleReady);
    source.addEventListener("bar", handleBar);
    source.onerror = () => {
      console.debug("[liveEvaluationBar] SSE connection interrupted; waiting for reconnect");
    };

    return () => {
      source.removeEventListener("ready", handleReady);
      source.removeEventListener("bar", handleBar);
      source.close();
    };
  }, [engineAutoUpdate, analysisReplayActive, uciAnalysisLoaded, clock?.gameState]);

  async function stopLiveEvaluation() {
    try {
      await stopEvaluation();
    } catch (e) {
      console.warn("[stopLiveEvaluation] backend stop failed", e);
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
        setAnalysisEvaluationError("Failed to load the analysis evaluation.");
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
    setLiveEvaluationFastPolling(true);
    if (!nextValue) {
      setEngineEval(null);
      setEvalError(null);
      setIsLoadingEval(false);
      void stopLiveEvaluation();
      return;
    }
    void loadEvaluation();
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
      setEngineConfigLoadError("Engine settings could not be loaded.");
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
    setLiveEvaluationFastPolling(true);
    if (engineAutoUpdateRef.current) void loadEvaluation();
  }

  useEffect(() => {
    if (!engineAutoUpdate || clock?.gameState) return;
    const intervalId = window.setInterval(
      () => { void loadEvaluation(); },
      liveEvaluationFastPolling ? LIVE_EVALUATION_FAST_POLL_MS : LIVE_EVALUATION_NORMAL_POLL_MS,
    );
    return () => window.clearInterval(intervalId);
  }, [engineAutoUpdate, clock?.gameState, liveEvaluationFastPolling]);

  useEffect(() => { setAnalysisLineAnimationIndex(0); }, [analysisSelectedPosition?.ply, analysisSelectedLineIndex]);

  useEffect(() => {
    if (!analysisReplayActive || !analysisSelectedPosition || analysisVariationMoves.length > 0) return;
    const selectedPoint = analysisProfile.find((point) => point.ply === analysisSelectedPosition.ply);
    const lines = selectedPoint?.lines ?? [];
    if (lines.length === 0) return;
    const lineIndex = getEffectiveAnalysisLineIndex(selectedPoint, lines);
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
    if (variationSnapshot.length === 0) setAnalysisEvaluation(null);
    setAnalysisEvaluationError(null);
    void loadAnalysisEvaluation(ply, variationSnapshot);
    const intervalId = window.setInterval(() => { void loadAnalysisEvaluation(ply, variationSnapshot); }, 2000);
    return () => window.clearInterval(intervalId);
  }, [analysisReplayActive, analysisReplayFinished, analysisEvaluationEnabled, analysisSelectedPosition?.ply, analysisVariationMoves]);

  function openAnalysisSettingsDialog() {
    setAnalysisReplayError(null);
    setAnalysisReplayStatus(null);
    if (engineConfigOverview?.defaults.deepAnalysisProfileId) {
      setAnalysisSettings((prev) => ({ ...prev, engineProfileId: engineConfigOverview.defaults.deepAnalysisProfileId }));
    }
    setShowGameEndDialog(false);
    setShowAnalysisSettingsDialog(true);
  }

  function reopenGameEndDialog() {
    if (!gameEndStateRef.current) return;
    setAnalysisReplayError(null);
    setShowAnalysisSettingsDialog(false);
    setShowGameEndDialog(true);
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
      setAnalysisReplayError("Analysis replay failed.");
    } finally {
      setIsAnalysisReplayRunning(false);
    }
  }

  async function startAnalysisReplay() {
    try {
      if (!analysisSettings.engineProfileId) throw new Error("No deep analysis engine profile is available.");
      setAnalysisReplayError(null);
      setAnalysisReplayStatus("Preparing analysis…");
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
        : getDisplayedWhitePlayerName(clock, whiteComputerEnabledRef.current));
      setAnalysisBlackPlayerName(uciAnalysisLoaded
        ? analysisBlackPlayerName || "Black"
        : getDisplayedBlackPlayerName(clock, blackComputerEnabledRef.current));
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
      setAnalysisReplayError("Could not start analysis replay.");
      setAnalysisReplayFinished(false);
      setAnalysisReplayActive(false);
      setIsAnalysisReplayRunning(false);
    }
  }

  async function cancelAnalysisReplay() {
    analysisReplayCancelledRef.current = true;
    setIsAnalysisReplayRunning(false);
    setAnalysisReplayFinished(true);
    setAnalysisReplayStatus("Analysis canceled.");
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
      setLoadError("Could not terminate the program.");
    }
  }

  async function saveUciGame() {
    try {
      setLoadError(null);
      const blob = await exportPgn(whiteComputerEnabledRef.current, blackComputerEnabledRef.current);
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
      setLoadError("Could not save the PGN file.");
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
      setAnalysisReplayActive(false);
      setIsAnalysisReplayRunning(false);
      setAnalysisReplayStatus(null);
      setAnalysisReplayError(null);
      setAnalysisReplayFinished(false);
      setAnalysisSelectedPosition(null);
      setAnalysisSelectedLineIndex(null);
      setAnalysisLineAnimationIndex(0);
      setAnalysisDetailsTab("engine");
      setAnalysisProfile([{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }]);
      const importedMoves = imported.moves ?? [];
      const moveRows = mapImportedUciMovesToRows(importedMoves);
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
      setLoadError(error instanceof Error ? error.message : "Could not load the PGN file.");
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
      setAnalysisReplayActive(false);
      setIsAnalysisReplayRunning(false);
      setAnalysisReplayStatus(null);
      setAnalysisReplayError(null);
      setAnalysisReplayFinished(false);
      setAnalysisTotalPlies(0);
      setAnalysisSelectedPosition(null);
      setAnalysisSelectedLineIndex(null);
      setAnalysisLineAnimationIndex(0);
      setAnalysisWhitePlayerName(null);
      setAnalysisBlackPlayerName(null);
      setAnalysisProfile([{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }]);
      const appliedSettings = await createNewGame(settings);
      setGameSettings(appliedSettings);
      setUciAnalysisLoaded(false);
      setPieces(createInitialPieces());
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
      setGameSettingsError("Failed to start a new game.");
    } finally {
      setIsStartingNewGame(false);
      setIsLoadingMoves(false);
    }
  }

  function animateMoveLocally(from: string, to: string, requestedPromotion?: PieceType | null, resultingPosition?: string | null) {
    const targetCoords = getSquareCoords(to);
    if (!targetCoords) return;
    setPieces((prev) => {
      const movingPiece = prev.find((p) => squareName(p.file, p.rank) === from);
      const promotionType = getPromotionTypeForLocalMove(movingPiece, to, requestedPromotion, resultingPosition);
      const castlingSquares = getCastlingSquares(movingPiece, from, to);
      if (castlingSquares) {
        const kingToCoords = getSquareCoords(castlingSquares.kingTo);
        const rookToCoords = getSquareCoords(castlingSquares.rookTo);
        if (!kingToCoords || !rookToCoords) return prev;
        return prev.map((p) => {
          const currentSquare = squareName(p.file, p.rank);
          if (currentSquare === from) return { ...p, file: kingToCoords.file, rank: kingToCoords.rank };
          if (currentSquare === castlingSquares.rookFrom) return { ...p, file: rookToCoords.file, rank: rookToCoords.rank };
          return p;
        });
      }
      const withoutCaptured = prev.filter((p) => squareName(p.file, p.rank) !== to);
      return withoutCaptured.map((p) => squareName(p.file, p.rank) === from
        ? { ...p, type: promotionType ?? p.type, file: targetCoords.file, rank: targetCoords.rank }
        : p);
    });
  }

  function addMoveToMoveList(result: MoveResult) {
    const sanText = result.san && result.san.trim().length > 0 ? result.san : `${result.from}-${result.to}`;
    const position = result.position ?? undefined;
    setMoves((prev) => {
      if (prev.length === 0 || prev[prev.length - 1].black) {
        return [...prev, { moveNumber: prev.length + 1, white: sanText, whitePosition: position }];
      }
      const copy = [...prev];
      copy[copy.length - 1] = { ...copy[copy.length - 1], black: sanText, blackPosition: position };
      return copy;
    });
  }

  function showMovePreview(event: React.MouseEvent<HTMLElement>, position: string | undefined) {
    if (!position || position.length !== 64) return;
    setHoverPreview({ position, x: event.clientX, y: event.clientY });
  }
  function moveMovePreview(event: React.MouseEvent<HTMLElement>) {
    setHoverPreview((prev) => prev ? { ...prev, x: event.clientX, y: event.clientY } : prev);
  }
  function hidePreview() { setHoverPreview(null); }

  function selectAnalysisPosition(position: string | undefined, san: string | undefined, ply: number) {
    if (!analysisReplayActiveRef.current || !position || position.length !== 64) return;
    const hadVariation = analysisVariationMovesRef.current.length > 0;
    if (hadVariation) void stopAnalysisEvaluation();
    resetAnalysisVariation();
    const moveLabel = san ? ` · ${san}` : "";
    analysisEvaluationPlyRef.current = ply;
    analysisEvaluationKeyRef.current = `ply:${ply}`;
    setAnalysisEvaluation(null);
    setAnalysisEvaluationError(null);
    setAnalysisSelectedPosition({ position, label: `Ply ${ply}${moveLabel}`, ply });
    setAnalysisSelectedLineIndex(null);
    setAnalysisLineAnimationIndex(0);
    setPieces(mapPositionStringToLocalPieces(position));
    setLastMove(null);
  }

  function getAnalysisMoveSelectionForPly(ply: number): { position: string | undefined; san: string | undefined; ply: number } | null {
    if (ply <= 0) return null;
    const moveNumber = Math.ceil(ply / 2);
    const row = moves.find((candidate) => candidate.moveNumber === moveNumber);
    if (!row) return null;
    return ply % 2 === 1
      ? { position: row.whitePosition, san: row.white, ply }
      : { position: row.blackPosition, san: row.black, ply };
  }

  function selectAnalysisPositionByPly(ply: number) {
    const selection = getAnalysisMoveSelectionForPly(ply);
    if (selection) selectAnalysisPosition(selection.position, selection.san, selection.ply);
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

  function handleComputerMove(data: MoveResult) {
    if (!data.from || !data.to) return;
    animateMoveLocally(data.from, data.to, null, data.position);
    setLastMove({ from: data.from, to: data.to });
    addMoveToMoveList(data);
    playMoveResultSound(data);
  }

  async function synchronizeAfterMoveSequence() {
    await loadBoardFromBackend();
    await loadClock();
    if (engineAutoUpdateRef.current && !gameEndStateRef.current) {
      setLiveEvaluationBar(null);
      setLiveEvaluationFastPolling(true);
      void loadEvaluation();
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
      if (!options?.localMoveAlreadyApplied) animateMoveLocally(from, to, promotion, data.position);
      setLastMove({ from, to });
      setSelectedSquare(null);
      updatePossibleTargets([]);
      addMoveToMoveList(data);
      playMoveResultSound(data);
      if (handleGameEndState(data.gameState)) { await synchronizeAfterMoveSequence(); return; }
      await requestComputerMoveIfEnabled(data.sideToMove);
      setIsLoadingMoves(false);
      await synchronizeAfterMoveSequence();
    } catch (e) {
      console.error("[performMove] move execution failed:", e);
      setLoadError("Failed to execute the move.");
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
      setPieces(mapPositionStringToLocalPieces(data.position));
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
      setLoadError("Failed to execute the analysis variation move.");
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
    const x = clientX - boardRect.left;
    const y = clientY - boardRect.top;
    if (x < 0 || y < 0 || x >= boardRect.width || y >= boardRect.height) return null;
    const file = Math.floor(x / 80) + 1;
    const rank = 8 - Math.floor(y / 80);
    if (file < 1 || file > 8 || rank < 1 || rank > 8) return null;
    return squareName(file, rank);
  }

  async function handlePiecePointerDown(event: React.PointerEvent<HTMLDivElement>, piece: Piece) {
    if (event.button !== 0) return;
    const analysisInteractive = analysisBoardInteractive();
    if ((!analysisInteractive && (analysisReplayActive || uciAnalysisLoaded))
      || isLoadingMoves || isComputerThinking || promotionContext
      || (!analysisInteractive && clock?.gameState)) return;
    const from = squareName(piece.file, piece.rank);
    if (!analysisInteractive && isPieceComputerControlled(piece)) return;

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
      if (clickedPiece && (analysisInteractive || !isPieceComputerControlled(clickedPiece))) {
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
    if (clickedPiece && (analysisInteractive || !isPieceComputerControlled(clickedPiece))) {
      setSelectedSquare(square);
      await loadPossibleMoves(square);
      return;
    }
    setSelectedSquare(null); updatePossibleTargets([]);
  };

  const renderBoardSquares = () => {
    const squares: ReactElement[] = [];
    for (let rank = 8; rank >= 1; rank--) {
      for (let file = 1; file <= 8; file++) {
        const name = squareName(file, rank);
        const squareClasses = [
          "square",
          (file + rank) % 2 !== 0 ? "square-light" : "square-dark",
          selectedSquare === name ? "square-selected" : "",
          lastMove && (lastMove.from === name || lastMove.to === name) ? "square-last-move" : "",
          possibleTargets.includes(name) ? "square-possible" : "",
        ].filter(Boolean).join(" ");
        squares.push(
          <div key={name} className={squareClasses} onClick={() => handleSquareClick(name)}>
            <span className="square-label">{name}</span>
          </div>
        );
      }
    }
    return squares;
  };

  const renderHoverBoard = () => {
    if (!hoverPreview) return null;
    const previewSize = 240;
    const offset = 18;
    const left = Math.max(offset, Math.min(hoverPreview.x + offset, window.innerWidth - previewSize - offset));
    const top = Math.max(offset, Math.min(hoverPreview.y + offset, window.innerHeight - previewSize - offset));
    const squares: ReactElement[] = [];
    for (let i = 0; i < 64; i++) {
      const rankFromTop = Math.floor(i / 8);
      const fileFromLeft = i % 8;
      const pieceChar = hoverPreview.position.charAt(i);
      const pieceSymbol = getPieceSymbolFromPositionChar(pieceChar);
      const isLight = (rankFromTop + fileFromLeft) % 2 === 0;
      squares.push(
        <div key={i} className={["hover-board-square", isLight ? "hover-board-square-light" : "hover-board-square-dark"].join(" ")}>
          {pieceSymbol && <span className={["hover-board-piece", isWhitePositionPiece(pieceChar) ? "hover-board-piece-white" : "hover-board-piece-black"].join(" ")}>{pieceSymbol}</span>}
        </div>
      );
    }
    return <div className="hover-board" style={{ left, top }}>{squares}</div>;
  };

  const renderAnalysisProfile = () => {
    const width = 860;
    const height = 560;
    const paddingX = 12;
    const paddingY = 18;
    const maxAbsEval = 5;
    const points = analysisProfile.length > 0 ? analysisProfile : [{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }];
    const analyzedPoints = points.filter((point) => point.ply > 0);
    const analyzedPointMap = new Map<number, AnalysisProfilePoint>(analyzedPoints.map((point) => [point.ply, point]));
    const totalPly = Math.max(1, analysisTotalPlies, analyzedPoints[analyzedPoints.length - 1]?.ply ?? 0);
    const toY = (evaluation: number) => {
      const clamped = Math.max(-maxAbsEval, Math.min(maxAbsEval, evaluation));
      const normalized = (maxAbsEval - clamped) / (maxAbsEval * 2);
      return paddingY + normalized * (height - paddingY * 2);
    };
    const zeroY = toY(0);
    const latest = analyzedPoints[analyzedPoints.length - 1] ?? points[points.length - 1];
    const availableWidth = width - paddingX * 2;
    const slotWidth = availableWidth / totalPly;
    const barWidth = slotWidth;
    const chartPoints = Array.from({ length: totalPly }, (_, index) => analyzedPointMap.get(index + 1) ?? {
      ply: index + 1, from: null, to: null, san: null, evaluation: 0, bar: 0.5, depth: 0,
    });
    const formatEvaluation = (point: AnalysisProfilePoint) => {
      const san = point.san ? `${point.san} · ` : "";
      const depth = point.depth ? ` · depth ${point.depth}` : "";
      return `Ply ${point.ply} · ${san}${formatEngineScore(point.evaluation)}${depth}`;
    };
    return (
      <div className="analysis-profile-panel">
        <div className="analysis-profile-header">
          <strong>Analysis history</strong>
          <span>{latest?.ply ?? 0} plies · {formatEngineScore(latest?.evaluation ?? 0)}{latest?.depth ? ` · depth ${latest.depth}` : ""}</span>
        </div>
        <svg className="analysis-profile-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Evaluation history of the analyzed game">
          <line className="analysis-profile-zero-line" x1={paddingX} y1={zeroY} x2={width - paddingX} y2={zeroY} />
          {chartPoints.map((point) => {
            const x = paddingX + (point.ply - 1) * slotWidth;
            const y = toY(point.evaluation);
            const top = Math.min(y, zeroY);
            const barHeight = Math.max(1.5, Math.abs(zeroY - y));
            const isPositive = point.evaluation > 0;
            const isLatest = point.ply === latest?.ply;
            const isSelected = point.ply === analysisSelectedPosition?.ply;
            const hasMoveSelection = !!getAnalysisMoveSelectionForPly(point.ply)?.position;
            return (
              <rect
                key={point.ply}
                className={`analysis-profile-bar ${isPositive ? "analysis-profile-bar-positive" : "analysis-profile-bar-negative"}${isLatest ? " analysis-profile-bar-latest" : ""}${isSelected ? " analysis-profile-bar-selected" : ""}${hasMoveSelection ? " analysis-profile-bar-clickable" : ""}`}
                x={x} y={top} width={barWidth} height={barHeight} rx={0}
                role={hasMoveSelection ? "button" : undefined}
                tabIndex={hasMoveSelection ? 0 : undefined}
                onClick={hasMoveSelection ? () => selectAnalysisPositionByPly(point.ply) : undefined}
                onKeyDown={hasMoveSelection ? (event) => {
                  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectAnalysisPositionByPly(point.ply); }
                } : undefined}
              ><title>{formatEvaluation(point)}</title></rect>
            );
          })}
        </svg>
        <div className="analysis-profile-footer">
          <span>{analysisReplayStatus ?? "Analysis mode"}</span>
          {isAnalysisReplayRunning && <button className="analysis-cancel-button" onClick={cancelAnalysisReplay}>Cancel</button>}
        </div>
        {analysisReplayError && <div className="analysis-profile-error">{analysisReplayError}</div>}
        {analysisEvaluationError && <div className="analysis-profile-error">{analysisEvaluationError}</div>}
      </div>
    );
  };

  function getDefaultAnalysisLineIndex(point: AnalysisProfilePoint | undefined, lines: EngineLine[]): number {
    if (!point || lines.length === 0) return 0;
    const whiteToMove = point.ply % 2 === 0;
    let bestIndex = 0;
    let bestEval = lines[0]?.eval ?? 0;
    for (let index = 1; index < lines.length; index++) {
      const lineEval = lines[index]?.eval ?? 0;
      if (whiteToMove ? lineEval > bestEval : lineEval < bestEval) { bestEval = lineEval; bestIndex = index; }
    }
    return bestIndex;
  }

  function getEffectiveAnalysisLineIndex(point: AnalysisProfilePoint | undefined, lines: EngineLine[]): number {
    if (lines.length === 0) return 0;
    if (analysisSelectedLineIndex != null && analysisSelectedLineIndex >= 0 && analysisSelectedLineIndex < lines.length) return analysisSelectedLineIndex;
    return getDefaultAnalysisLineIndex(point, lines);
  }

  function getSelectedAnalysisPoint(): AnalysisProfilePoint | undefined {
    if (!analysisSelectedPosition) return undefined;
    return analysisProfile.find((point) => point.ply === analysisSelectedPosition.ply);
  }

  function splitAnalysisMoveText(movesText: string): string[] {
    if (!movesText || !movesText.trim()) return [];
    const tokens = movesText.trim().split(/\s+/);
    const result: string[] = [];
    for (const token of tokens) {
      if (token === "e.p." && result.length > 0) result[result.length - 1] = `${result[result.length - 1]} ${token}`;
      else result.push(token);
    }
    return result;
  }

  function getHighlightedAnalysisMoveIndex(line: EngineLine, isSelected: boolean): number {
    if (!isSelected) return -1;
    const positions = line.positions ?? [];
    if (positions.length <= 1) return -1;
    const currentPositionIndex = analysisLineAnimationIndex % positions.length;
    return currentPositionIndex > 0 ? currentPositionIndex - 1 : -1;
  }

  function renderAnalysisLineMoves(line: EngineLine, isSelected: boolean): ReactElement | string {
    const lineMoves = splitAnalysisMoveText(line.moves);
    if (lineMoves.length === 0) return "—";
    const highlightedMoveIndex = getHighlightedAnalysisMoveIndex(line, isSelected);
    return <>{lineMoves.map((move, moveIndex) => (
      <span key={`${moveIndex}-${move}`} className={moveIndex === highlightedMoveIndex ? "analysis-line-move analysis-line-move-current" : "analysis-line-move"}>{move}</span>
    ))}</>;
  }

  function getAnimatedAnalysisPosition(): string | null {
    const selectedPoint = getSelectedAnalysisPoint();
    const lines = selectedPoint?.lines ?? [];
    if (!analysisSelectedPosition) return null;
    if (analysisDetailsTab === "database" || lines.length === 0) return analysisSelectedPosition.position;
    const lineIndex = getEffectiveAnalysisLineIndex(selectedPoint, lines);
    const positions = lines[lineIndex]?.positions ?? [];
    if (positions.length === 0) return analysisSelectedPosition.position;
    return positions[analysisLineAnimationIndex % positions.length] ?? analysisSelectedPosition.position;
  }

  const renderAnalysisPositionBoard = () => {
    const animatedPosition = getAnimatedAnalysisPosition();
    if (!animatedPosition) return <div className="analysis-detail-placeholder">Click a move in the move list to play an engine continuation.</div>;
    const squares: ReactElement[] = [];
    for (let i = 0; i < 64; i++) {
      const rankFromTop = Math.floor(i / 8);
      const fileFromLeft = i % 8;
      const pieceChar = animatedPosition.charAt(i);
      const pieceSymbol = getPieceSymbolFromPositionChar(pieceChar);
      const isLight = (rankFromTop + fileFromLeft) % 2 === 0;
      squares.push(
        <div key={i} className={["analysis-position-square", isLight ? "analysis-position-square-light" : "analysis-position-square-dark"].join(" ")}>
          {pieceSymbol && <span className={["analysis-position-piece", isWhitePositionPiece(pieceChar) ? "analysis-position-piece-white" : "analysis-position-piece-black"].join(" ")}>{pieceSymbol}</span>}
        </div>
      );
    }
    return <div className="analysis-position-board">{squares}</div>;
  };

  const renderAnalysisLinesForSelection = () => {
    if (!analysisSelectedPosition) return <div className="analysis-detail-placeholder">Select a move to show the stored engine variations here.</div>;
    const selectedPoint = getSelectedAnalysisPoint();
    if (!selectedPoint) return <div className="analysis-detail-placeholder">No evaluation is available for this ply yet.</div>;
    const lines = selectedPoint.lines ?? [];
    if (lines.length === 0) return <div className="analysis-detail-placeholder">No engine variations were provided for this position.</div>;
    const effectiveLineIndex = getEffectiveAnalysisLineIndex(selectedPoint, lines);
    return <>
      <div className="engine-lines-summary"><span>{engineEval?.engineName || "Analysis engine"}</span><span>depth {lines[0].depth}</span></div>
      <div className="analysis-lines-list">{lines.map((line, index) => {
        const isSelected = index === effectiveLineIndex;
        return (
          <button type="button" className={["analysis-line-card", isSelected ? "analysis-line-card-selected" : ""].filter(Boolean).join(" ")}
            key={`${index}-${line.moves}`} onClick={() => { setAnalysisSelectedLineIndex(index); setAnalysisLineAnimationIndex(0); }}>
            <div className="analysis-line-header"><strong>#{index + 1}</strong><span>{formatEngineLineScore(line)}</span></div>
            <div className="analysis-line-moves">{renderAnalysisLineMoves(line, isSelected)}</div>
          </button>
        );
      })}</div>
    </>;
  };

  const renderAnalysisSourceTabs = () => {
    const databaseTabActive = analysisDetailsTab === "database";
    return (
      <div className="analysis-detail-tabs" role="tablist" aria-label="Analysis source">
        <button type="button" role="tab" aria-selected={!databaseTabActive} className={["analysis-detail-tab", !databaseTabActive ? "analysis-detail-tab-active" : ""].filter(Boolean).join(" ")} onClick={() => setAnalysisDetailsTab("engine")}>Engine</button>
        <button type="button" role="tab" aria-selected={databaseTabActive} className={["analysis-detail-tab", databaseTabActive ? "analysis-detail-tab-active" : ""].filter(Boolean).join(" ")} onClick={() => setAnalysisDetailsTab("database")}>Database</button>
      </div>
    );
  };

  const renderAnalysisDetails = () => {
    const databaseTabActive = analysisDetailsTab === "database";
    return (
      <div className="analysis-detail-row">
        <div className="analysis-position-panel">
          <div className="analysis-detail-title">{databaseTabActive
            ? analysisSelectedPosition ? `Database position after ${analysisSelectedPosition.label}` : "Database position"
            : analysisSelectedPosition ? `Engine continuation from ${analysisSelectedPosition.label}` : "Engine continuation"}</div>
          {renderAnalysisPositionBoard()}
        </div>
        <div className="analysis-lines-panel">
          <div className="analysis-detail-title">{databaseTabActive ? "Database continuations" : "Engine variations"}</div>
          {databaseTabActive ? <AnalysisDatabasePanel ply={analysisSelectedPosition?.ply ?? null} /> : renderAnalysisLinesForSelection()}
        </div>
      </div>
    );
  };


  const renderAnalysisReplayContent = () => {
    const variationMode = analysisVariationMoves.length > 0;
    const liveViewActive = variationMode || analysisEngineView === "live";
    const evaluationKey = analysisEvaluationKeyRef.current;

    return (
      <div className="analysis-replay-content">
        {renderAnalysisProfile()}
        {!variationMode && renderAnalysisSourceTabs()}
        {variationMode ? (
          <>
            <AnalysisEngineTabs activeView="live" showDeepAnalysis={false} onChange={setAnalysisEngineView} />
            <LiveEvaluationView
              evaluation={analysisEvaluation}
              evaluationKey={evaluationKey}
              activePly={analysisSelectedPosition?.ply ?? null}
              variationMode
            />
          </>
        ) : analysisDetailsTab === "database" ? (
          renderAnalysisDetails()
        ) : (
          <>
            <AnalysisEngineTabs activeView={analysisEngineView} showDeepAnalysis onChange={setAnalysisEngineView} />
            {liveViewActive ? (
              <LiveEvaluationView
                evaluation={analysisEvaluation}
                evaluationKey={evaluationKey}
                activePly={analysisSelectedPosition?.ply ?? null}
                variationMode={false}
              />
            ) : renderAnalysisDetails()}
          </>
        )}
      </div>
    );
  };

  const renderPieces = () => pieces.map((piece) => {
    const x = (piece.file - 1) * 80;
    const y = (8 - piece.rank) * 80;
    const isDragging = dragState?.pieceId === piece.id;
    const renderX = isDragging ? dragState.x : x;
    const renderY = isDragging ? dragState.y : y;
    const classes = ["piece", piece.color === "white" ? "piece-white" : "piece-black", isDragging ? "piece-dragging" : ""].filter(Boolean).join(" ");
    return (
      <div key={piece.id} className={classes} style={{ transform: `translate(${renderX}px, ${renderY}px)` }}
        onPointerDown={(event) => handlePiecePointerDown(event, piece)} onPointerMove={handlePiecePointerMove}
        onPointerUp={handlePiecePointerUp} onPointerCancel={handlePiecePointerCancel}>
        {getPieceSymbol(piece)}
      </div>
    );
  });

  return (
    <>
      <ChessHeader
        analysisReplayActive={analysisReplayActive}
        analysisReplayRunning={isAnalysisReplayRunning}
        analysisReplayFinished={analysisReplayFinished}
        gameEnded={Boolean(gameEndState)}
        uciAnalysisLoaded={uciAnalysisLoaded}
        terminatingProgram={isTerminatingProgram}
        onCancelAnalysis={() => void cancelAnalysisReplay()}
        onOpenOptions={reopenGameEndDialog}
        onOpenAnalysis={openAnalysisSettingsDialog}
        onNewGame={openGameSettingsDialog}
        onExportCurrentGame={() => void saveUciGame()}
        onImportNewGame={openUciFilePicker}
        onOpenDatabase={() => setShowChessDatabaseDialog(true)}
        onTerminateProgram={() => void terminateProgram()}
        onToggleEngineSettings={() => setShowEngineConfig((prev) => !prev)}
        onOpenEngineManager={() => setShowEngineManager(true)}
      />

      {showEngineManager && <EngineManager onClose={() => setShowEngineManager(false)} />}
      {showChessDatabaseDialog && (
        <ChessDatabaseDialog onClose={() => setShowChessDatabaseDialog(false)} onGameLoaded={async (game) => { await applyImportedGame(game); }} />
      )}
      <input ref={uciFileInputRef} type="file" accept=".pgn,.txt,application/x-chess-pgn,text/plain" style={{ display: "none" }} onChange={handleUciFileSelected} />

      <main className="app-main">
        <div className="board-layout">
          <MovePanel
            state={{
              moves,
              whitePlayerName: analysisReplayActive
                ? getAnalysisWhitePlayerName(clock, analysisWhitePlayerName)
                : uciAnalysisLoaded ? analysisWhitePlayerName || "White" : getDisplayedWhitePlayerName(clock, whiteComputerEnabled),
              blackPlayerName: analysisReplayActive
                ? getAnalysisBlackPlayerName(clock, analysisBlackPlayerName)
                : uciAnalysisLoaded ? analysisBlackPlayerName || "Black" : getDisplayedBlackPlayerName(clock, blackComputerEnabled),
              whiteActive: !uciAnalysisLoaded && clock?.sideToMove === "white",
              blackActive: !uciAnalysisLoaded && clock?.sideToMove === "black",
              selectedPly: analysisSelectedPosition?.ply ?? null,
              loadingMoves: isLoadingMoves,
              computerThinking: isComputerThinking,
              error: loadError,
            }}
            actions={{ showPreview: showMovePreview, movePreview: moveMovePreview, hidePreview, selectPosition: selectAnalysisPosition }}
          />

          <section className="board-column">
            <div className="board-wrapper">
              <div className="board-container" ref={boardContainerRef}>
                <div className="board">{renderBoardSquares()}</div>
                <div className="pieces-layer">{renderPieces()}</div>
              </div>
            </div>
            {!analysisReplayActive && !uciAnalysisLoaded && (
              <div className="clock-area">
                <button type="button" className={["clock-box", clock?.sideToMove === "white" ? "clock-active" : "", clock?.whiteRunning ? "clock-running" : "", whiteComputerEnabled ? "clock-computer-enabled" : ""].filter(Boolean).join(" ")}
                  onClick={() => updateWhiteComputerEnabled(!whiteComputerEnabled)} aria-pressed={whiteComputerEnabled}
                  title={whiteComputerEnabled ? "Disable White player engine" : "Enable White player engine"}>
                  <div className="clock-time">{formatClockTime(clock?.whiteTime)}</div>
                </button>
                <button type="button" className={["clock-box", clock?.sideToMove === "black" ? "clock-active" : "", clock?.blackRunning ? "clock-running" : "", blackComputerEnabled ? "clock-computer-enabled" : ""].filter(Boolean).join(" ")}
                  onClick={() => updateBlackComputerEnabled(!blackComputerEnabled)} aria-pressed={blackComputerEnabled}
                  title={blackComputerEnabled ? "Disable Black player engine" : "Enable Black player engine"}>
                  <div className="clock-time">{formatClockTime(clock?.blackTime)}</div>
                </button>
                {clockError && <div className="clock-error">{clockError}</div>}
              </div>
            )}
          </section>

          <section className="engine-panel">
            <div className="engine-panel-main">
              {!analysisReplayActive && !uciAnalysisLoaded && (
                <button type="button" className={["engine-bar-wrapper", engineAutoUpdate ? "engine-bar-enabled" : "engine-bar-disabled"].join(" ")}
                  onClick={toggleEngineAutoUpdate} aria-pressed={engineAutoUpdate}
                  aria-label={engineAutoUpdate ? "Disable evaluation engine" : "Enable evaluation engine"}
                  title={engineAutoUpdate ? "Disable evaluation engine" : "Enable evaluation engine · evaluation 0.0"}>
                  <div className="engine-bar-white" style={{ height: `${(engineAutoUpdate && liveEvaluationBar != null ? liveEvaluationBar : 0.5) * 100}%` }} />
                  <div className="engine-bar-black" style={{ height: `${(1 - (engineAutoUpdate && liveEvaluationBar != null ? liveEvaluationBar : 0.5)) * 100}%` }} />
                </button>
              )}
              {analysisReplayActive && analysisReplayFinished && (
                <button type="button" className={["engine-bar-wrapper", analysisEvaluationEnabled ? "engine-bar-enabled" : "engine-bar-disabled"].join(" ")}
                  onClick={toggleAnalysisEvaluation} aria-pressed={analysisEvaluationEnabled} disabled={!analysisSelectedPosition}
                  aria-label={analysisEvaluationEnabled ? "Disable analysis evaluation" : "Enable analysis evaluation"}
                  title={!analysisSelectedPosition ? "Select a move to use the evaluation engine"
                    : analysisEvaluationEnabled ? "Disable evaluation engine"
                    : analysisVariationMoves.length > 0 ? "Enable the evaluation engine for the current variation" : "Enable the evaluation engine for the selected move"}>
                  <div className="engine-bar-white" style={{ height: `${(analysisEvaluationEnabled && analysisEvaluation ? analysisEvaluation.bar : 0.5) * 100}%` }} />
                  <div className="engine-bar-black" style={{ height: `${(1 - (analysisEvaluationEnabled && analysisEvaluation ? analysisEvaluation.bar : 0.5)) * 100}%` }} />
                </button>
              )}
              <div className="engine-content-column">
                {showEngineConfig && <>
                  <EngineConfigManager overview={engineConfigOverview} onOverviewChange={handleEngineConfigOverviewChange} onClose={() => setShowEngineConfig(false)} />
                  {engineConfigLoadError && <div className="engine-error">{engineConfigLoadError}</div>}
                </>}
                {analysisReplayActive ? renderAnalysisReplayContent() : <>
                  {evalError && <div className="engine-error">Error: {evalError}</div>}
                  {engineAutoUpdate && engineEval && !clock?.gameState && (
                    <div className="engine-lines">
                      {engineEval.lines.length > 0 && <div className="engine-lines-summary"><span>{engineEval.engineName || "Evaluation engine"}</span><span>depth {engineEval.lines[0].depth}</span></div>}
                      {engineEval.lines.length === 0 && <div className="engine-empty">No engine lines.</div>}
                      {engineEval.lines.map((line, idx) => <div key={idx} className="engine-line"><div className="engine-line-header">#{idx + 1} · {formatEngineLineScore(line)}</div><div className="engine-line-moves">{line.moves}</div></div>)}
                    </div>
                  )}
                  {engineAutoUpdate && !engineEval && !isLoadingEval && !evalError && !clock?.gameState && <div className="engine-placeholder-text">Engine output will appear here.</div>}
                </>}
              </div>
            </div>
          </section>

          {renderHoverBoard()}

          {promotionContext && (
            <div className="promotion-dialog">
              <div className="promotion-dialog-content">
                <p>Promotion for {promotionContext.color === "white" ? "white" : "black"} pawn ({promotionContext.from} → {promotionContext.to}):</p>
                <div className="promotion-options">
                  {(["queen", "rook", "bishop", "knight"] as PieceType[]).map((ptype) => (
                    <button key={ptype} className="promotion-button" onClick={async () => {
                      const ctx = promotionContext;
                      if (!ctx) return;
                      setPromotionContext(null);
                      await performBoardMove(ctx.from, ctx.to, ptype);
                    }}>{ptype.toUpperCase()}</button>
                  ))}
                </div>
                <button className="promotion-cancel-button" onClick={() => setPromotionContext(null)}>Cancel</button>
              </div>
            </div>
          )}

          {showGameSettingsDialog && <NewGameDialog settings={gameSettings} error={gameSettingsError} starting={isStartingNewGame}
            onSettingsChange={setGameSettings} onCancel={() => setShowGameSettingsDialog(false)} onStart={(settings) => void startNewGame(settings)} />}

          {showAnalysisSettingsDialog && <AnalysisSettingsDialog settings={analysisSettings} profiles={analysisEngineProfiles}
            selectedProfile={selectedAnalysisProfile} selectedEngine={selectedAnalysisEngine} error={analysisReplayError}
            running={isAnalysisReplayRunning} onSettingsChange={setAnalysisSettings} onCancel={() => setShowAnalysisSettingsDialog(false)}
            onStart={() => void startAnalysisReplay()} />}

          {showGameEndDialog && gameEndState && (
            <div className="game-end-dialog"><div className="game-end-dialog-content">
              <h2>Game Over</h2><p>{formatGameState(gameEndState, clock)}</p>
              <div className="game-end-dialog-actions">
                <button className="game-end-dialog-button" onClick={saveUciGame}>Save PGN</button>
                <button className="game-end-dialog-button" onClick={openUciFilePicker}>Load PGN</button>
                <button className="game-end-dialog-button" onClick={openGameSettingsDialog}>New Game</button>
                <button className="game-end-dialog-button" onClick={openAnalysisSettingsDialog}>Analyze</button>
              </div>
            </div></div>
          )}
        </div>
      </main>
    </>
  );
};
