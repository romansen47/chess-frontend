import { useRef } from "react";
import { useComputerMoves } from "./chess/game/useComputerMoves";
import { useAnalysisController } from "./chess/analysis/useAnalysisController";
import { useBoardInteraction } from "./chess/board/useBoardInteraction";
import type { AnalysisInteractionContext } from "./chess/board/boardInteractionTypes";
import { useChessBoardState } from "./chess/board/useChessBoardState";
import { useChessEngineState } from "./chess/board/useChessEngineState";
import { useChessGameState } from "./chess/board/useChessGameState";
import { useChessLiveEvaluation } from "./chess/board/useChessLiveEvaluation";
import { useChessMoveFlow } from "./chess/board/useChessMoveFlow";
import { useChessGameLifecycle } from "./chess/board/useChessGameLifecycle";
import ChessBoardContainer from "./chess/board/ChessBoardContainer";
import type { ClockState, MoveResult, PerformMoveOptions, PieceType } from "./chess/types";

interface MoveRuntime {
  playGameSound: (sound: "move" | "capture" | "notify") => Promise<void>;
  animateMoveLocally: (from: string, to: string, promotion?: PieceType | null, position?: string | null) => void;
  loadBoardFromBackend: () => Promise<void>;
  loadPossibleMoves: (from: string) => Promise<string[]>;
  handleGameEndState: (state: string | null | undefined) => boolean;
  handleComputerMove: (data: MoveResult) => Promise<void>;
  synchronizeAfterMoveSequence: () => Promise<void>;
  performMove: (from: string, to: string, promotion?: PieceType, options?: PerformMoveOptions) => Promise<void>;
  performBoardMove: (from: string, to: string, promotion?: PieceType) => Promise<void>;
}

const EMPTY_MOVE_RUNTIME: MoveRuntime = {
  playGameSound: async () => undefined,
  animateMoveLocally: () => undefined,
  loadBoardFromBackend: async () => undefined,
  loadPossibleMoves: async () => [],
  handleGameEndState: () => false,
  handleComputerMove: async () => undefined,
  synchronizeAfterMoveSequence: async () => undefined,
  performMove: async () => undefined,
  performBoardMove: async () => undefined,
};

export const ChessBoard: React.FC = () => {
  const board = useChessBoardState();
  const engine = useChessEngineState();
  const game = useChessGameState();

  const moveRuntimeRef = useRef<MoveRuntime>(EMPTY_MOVE_RUNTIME);
  const liveRuntimeRef = useRef<{ stopLiveEvaluation: () => Promise<void> }>({
    stopLiveEvaluation: async () => undefined,
  });
  const lifecycleRuntimeRef = useRef({ loadClock: async (): Promise<ClockState | null> => null });
  const analysisInteractionRef = useRef<AnalysisInteractionContext>({
    replayActive: false,
    replayActiveCurrent: false,
    replayFinished: false,
    selectedPosition: null,
    variationMoveCount: 0,
    variationGameState: null,
    replayRunning: false,
  });

  const computer = useComputerMoves({
    currentSideToMove: game.clock?.sideToMove,
    onMove: (data) => moveRuntimeRef.current.handleComputerMove(data),
    onGameEnd: (state) => moveRuntimeRef.current.handleGameEndState(state),
    onRefreshClock: async () => { await lifecycleRuntimeRef.current.loadClock(); },
    onSynchronize: () => moveRuntimeRef.current.synchronizeAfterMoveSequence(),
    onError: board.setLoadError,
    onRecoverAfterSequenceError: async () => {
      await moveRuntimeRef.current.loadBoardFromBackend();
      await lifecycleRuntimeRef.current.loadClock();
    },
  });

  const interaction = useBoardInteraction({
    pieces: board.pieces,
    boardOrientation: board.boardOrientation,
    clock: game.clock,
    uciAnalysisLoaded: board.uciAnalysisLoaded,
    isLoadingMoves: board.isLoadingMoves,
    isComputerThinking: computer.isComputerThinking,
    isSideComputerControlled: computer.isSideComputerControlled,
    getAnalysisContext: () => analysisInteractionRef.current,
    loadPossibleMoves: (from) => moveRuntimeRef.current.loadPossibleMoves(from),
    performBoardMove: (from, to, promotion) => moveRuntimeRef.current.performBoardMove(from, to, promotion),
    performMove: (from, to, promotion, options) => moveRuntimeRef.current.performMove(from, to, promotion, options),
    animateMoveLocally: (from, to, promotion, position) => moveRuntimeRef.current.animateMoveLocally(from, to, promotion, position),
    loadBoardFromBackend: () => moveRuntimeRef.current.loadBoardFromBackend(),
  });

  const analysis = useAnalysisController({
    engineConfigOverview: engine.engineConfigOverview,
    engineRuntimeAssignments: engine.engineRuntimeAssignments,
    engineEval: engine.engineEval,
    setEngineEval: engine.setEngineEval,
    setPieces: board.setPieces,
    setLastMove: board.setLastMove,
    moves: board.moves,
    clock: game.clock,
    uciAnalysisLoaded: board.uciAnalysisLoaded,
    whiteComputerEnabled: computer.whiteComputerEnabled,
    blackComputerEnabled: computer.blackComputerEnabled,
    disablePlayerEngines: computer.disablePlayerEngines,
    stopLiveEvaluation: () => liveRuntimeRef.current.stopLiveEvaluation(),
    setEngineAutoUpdate: engine.setEngineAutoUpdate,
    setLiveEvaluationBar: engine.setLiveEvaluationBar,
    setShowGameEndDialog: game.setShowGameEndDialog,
    setShowSettings: engine.setShowSettings,
    showGameSettingsDialog: game.showGameSettingsDialog,
    showSettings: engine.showSettings,
    showChessDatabaseDialog: engine.showChessDatabaseDialog,
    setSelectedSquare: interaction.setSelectedSquare,
    updatePossibleTargets: interaction.updatePossibleTargets,
    resetBoardInteraction: interaction.resetBoardInteraction,
    setHoverPreview: board.setHoverPreview,
    setPromotionContext: interaction.setPromotionContext,
    promotionContext: interaction.promotionContext,
    setIsLoadingMoves: board.setIsLoadingMoves,
    setLoadError: board.setLoadError,
    animateMoveLocally: (from, to, promotion, position) => moveRuntimeRef.current.animateMoveLocally(from, to, promotion, position),
    playGameSound: (sound) => moveRuntimeRef.current.playGameSound(sound),
  });

  analysisInteractionRef.current = {
    replayActive: analysis.analysisReplayActive,
    replayActiveCurrent: analysis.analysisReplayActiveRef.current,
    replayFinished: analysis.analysisReplayFinished,
    selectedPosition: analysis.analysisSelectedPosition,
    variationMoveCount: analysis.analysisVariationMovesRef.current.length,
    variationGameState: analysis.analysisVariationGameState,
    replayRunning: analysis.isAnalysisReplayRunning,
  };

  const live = useChessLiveEvaluation({
    board,
    engine,
    game,
    analysisReplayActive: analysis.analysisReplayActive,
    analysisReplayActiveRef: analysis.analysisReplayActiveRef,
    setAnalysisSettings: analysis.setAnalysisSettings,
  });
  liveRuntimeRef.current = live;

  const move = useChessMoveFlow({
    board,
    engine,
    game,
    analysis: {
      replayActiveRef: analysis.analysisReplayActiveRef,
      replayFinished: analysis.analysisReplayFinished,
      selectedPosition: analysis.analysisSelectedPosition,
      variationMovesRef: analysis.analysisVariationMovesRef,
      performVariationMove: analysis.performAnalysisVariationMove,
    },
    requestComputerMoveIfEnabled: computer.requestComputerMoveIfEnabled,
    loadClock: () => lifecycleRuntimeRef.current.loadClock(),
    setSelectedSquare: interaction.setSelectedSquare,
    updatePossibleTargets: interaction.updatePossibleTargets,
    stopLiveEvaluation: live.stopLiveEvaluation,
  });
  moveRuntimeRef.current = move;

  const lifecycle = useChessGameLifecycle({
    board,
    engine,
    game,
    analysis: {
      replayActiveRef: analysis.analysisReplayActiveRef,
      restoreAnnotations: analysis.restoreAnnotations,
      restoreReplayAfterReload: analysis.restoreAnalysisReplayAfterReload,
      setImportedPlayers: analysis.setImportedPlayers,
      setShowSettingsDialog: analysis.setShowAnalysisSettingsDialog,
      stopEvaluation: analysis.stopAnalysisEvaluation,
      resetState: analysis.resetAnalysisState,
      resetAnnotations: analysis.resetAnnotations,
      setWhitePlayerName: analysis.setAnalysisWhitePlayerName,
      setBlackPlayerName: analysis.setAnalysisBlackPlayerName,
    },
    whiteComputerEnabled: computer.whiteComputerEnabled,
    blackComputerEnabled: computer.blackComputerEnabled,
    disablePlayerEngines: computer.disablePlayerEngines,
    requestComputerMoveIfEnabled: computer.requestComputerMoveIfEnabled,
    stopLiveEvaluation: live.stopLiveEvaluation,
    loadEngineConfigs: live.loadEngineConfigs,
    synchronizeAfterMoveSequence: move.synchronizeAfterMoveSequence,
    resetBoardInteraction: interaction.resetBoardInteraction,
    loadBoardFromBackend: move.loadBoardFromBackend,
  });
  lifecycleRuntimeRef.current = lifecycle;

  function flipBoardOrientation() {
    board.setBoardOrientation((current) => current === "white" ? "black" : "white");
    interaction.resetBoardInteraction();
    board.setHoverPreview(null);
    board.setHoverAnnotationText(null);
  }

  return <ChessBoardContainer
    board={board}
    engine={engine}
    game={game}
    analysis={analysis}
    interaction={interaction}
    live={live}
    move={move}
    lifecycle={lifecycle}
    computer={computer}
    flipBoardOrientation={flipBoardOrientation}
  />;
};
